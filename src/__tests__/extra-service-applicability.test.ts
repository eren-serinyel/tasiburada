import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { testApp } from './helpers/testApp';
import { restoreSilenCarrierBaseline } from './setup/seedContract';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { withSeedDataSource } from '../database/seed/seedDataSource';
import { ExtraService, ExtraServiceApplicability, ExtraServiceLoadType } from '../domain/entities';
import { PlaceType } from '../domain/entities/Shipment';
import { CarrierCustomExtraService, CarrierCustomExtraServicePriceMode } from '../domain/entities/CarrierCustomExtraService';
import { CarrierExtraServiceCapability } from '../domain/entities/CarrierExtraServiceCapability';
import { ConverterService } from '../application/services/ConverterService';
import { Carrier } from '../domain/entities/Carrier';

const { reconcileSelectedExtraServiceIds } = require('../../shadcn-ui/src/lib/extraServices');

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('extra service applicability', () => {
  beforeAll(async () => {
    if (skipDB()) return;
    await withSeedDataSource(AppDataSource, () => seedExtraServices());
  });

  test('HOME loadType servisleri dogru geliyor', async () => {
    if (skipDB()) return;

    const res = await request(testApp).get('/api/v1/extra-services?loadType=HOME');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.map((item: any) => item.name);
    expect(names).toContain('Asansörlü Taşıma');
    expect(names).toContain('Beyaz Eşya Kurulumu');
    expect(names).not.toContain('Server/IT özel taşıma');
  });

  test('OFFICE loadType servisleri dogru geliyor', async () => {
    if (skipDB()) return;

    const res = await request(testApp).get('/api/v1/extra-services?loadType=OFFICE');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const names = res.body.data.map((item: any) => item.name);
    expect(names).toContain('Server/IT özel taşıma');
    expect(names).toContain('Kurumsal sigorta');
    expect(names).not.toContain('Beyaz Eşya Kurulumu');
  });

  test('carrier detail services loadType parametresine gore filtrelenir', async () => {
    if (skipDB()) return;

    const rows = await AppDataSource.query(`
      SELECT c.id
      FROM carriers c
      INNER JOIN carrier_extra_service_capabilities homeCap
        ON homeCap.carrier_id = c.id
       AND homeCap.load_type = 'HOME'
       AND homeCap.is_active = 1
      INNER JOIN carrier_extra_service_capabilities officeCap
        ON officeCap.carrier_id = c.id
       AND officeCap.load_type = 'OFFICE'
       AND officeCap.is_active = 1
      WHERE c.isActive = 1
        AND c.verifiedByAdmin = 1
        AND c.approval_state = 'APPROVED'
      LIMIT 1
    `);

    if (!rows.length) return;

    const res = await request(testApp).get(`/api/v1/carriers/${rows[0].id}/detail?loadType=HOME`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const services = res.body.data?.services ?? [];
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((group: any) => group.loadType === 'HOME')).toBe(true);
    expect(services.some((group: any) => group.loadType === 'OFFICE')).toBe(false);
  });

  test('loadType degisince frontend helper eski servisleri temizliyor', async () => {
    const validOptions = [
      { id: 'office-1', name: 'Server/IT özel taşıma', loadType: 'OFFICE', isDefaultVisible: true, isRecommendedByConverter: true, sortOrder: 1 },
      { id: 'office-2', name: 'Kurumsal sigorta', loadType: 'OFFICE', isDefaultVisible: true, isRecommendedByConverter: false, sortOrder: 2 },
    ];

    const result = reconcileSelectedExtraServiceIds(['home-1', 'office-1'], validOptions as any);

    expect(result.keptIds).toEqual(['office-1']);
    expect(result.removedIds).toEqual(['home-1']);
  });

  test('converter suggestedExtraServiceIds sadece gecerli loadType servislerinden geliyor', async () => {
    if (skipDB()) return;

    const converterService = new ConverterService();
    const session = await converterService.createSession(null, { flowType: 'household' });
    const estimate = await converterService.estimate(session.sessionId, null, {
      moveType: 'household',
      propertyType: '2+1',
      loadType: 'OFFICE',
      items: [
        { itemCode: 'sofa_3_seat', quantity: 2 },
        { itemCode: 'medium_box', quantity: 8 },
      ],
      originFloor: 6,
      destinationFloor: 5,
      buildingElevator: false,
      externalLift: false,
      specialItems: ['large_tv'],
    });

    expect(estimate.suggestedExtraServiceIds.length).toBeGreaterThan(0);

    const extraRepo = AppDataSource.getRepository(ExtraService);
    const services = await extraRepo.find({
      where: estimate.suggestedExtraServiceIds.map((id) => ({ id })),
      relations: ['applicabilityRules'],
    });

    expect(services.length).toBe(estimate.suggestedExtraServiceIds.length);
    services.forEach((service) => {
      expect(service.applicabilityRules.some((rule) => rule.loadType === ExtraServiceLoadType.OFFICE)).toBe(true);
    });

    const officeOnlyNames = services.map((service) => service.name);
    expect(officeOnlyNames).toContain('Server/IT özel taşıma');
    expect(officeOnlyNames).not.toContain('Beyaz Eşya Kurulumu');
    expect(await AppDataSource.getRepository(ExtraServiceApplicability).count()).toBeGreaterThan(0);
  });

  test('shipment create carrier secimi olmadan uygulanabilir extra service secimini kabul eder', async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    const token = login.body.data?.token;
    expect(token).toBeTruthy();

    const officeService = await AppDataSource.getRepository(ExtraService)
      .createQueryBuilder('extraService')
      .innerJoin('extraService.applicabilityRules', 'applicability', 'applicability.loadType = :loadType', {
        loadType: ExtraServiceLoadType.OFFICE,
      })
      .where('extraService.status = :status', { status: 'ACTIVE' })
      .getOne();
    expect(officeService).toBeTruthy();

    const unique = Date.now();
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: `Trabzon, Ortahisar ${unique}`,
        destination: `Samsun, Atakum ${unique}`,
        loadDetails: 'Ofis mobilyalari ve evrak klasorleri tasinacak.',
        shipmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentCategory: 'OFFICE_MOVE',
        extraServices: [officeService!.id],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.extraServices).toContain(officeService!.name);
  });

  test('shipment create OFFICE loadType ile carrier-scoped aktif extra service secimini kabul eder', async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    const token = login.body.data?.token;
    expect(token).toBeTruthy();

    const carrier = await AppDataSource.getRepository(Carrier).findOne({
      where: { email: 'info@silenakliyat.com' },
    });
    expect(carrier).toBeTruthy();

    const capabilities = await AppDataSource.getRepository(CarrierExtraServiceCapability).find({
      where: {
        carrierId: carrier!.id,
        loadType: ExtraServiceLoadType.OFFICE,
        isActive: true,
      },
      relations: ['extraService'],
    });
    const selectedCapabilities = capabilities
      .filter((capability) => capability.extraService?.status === 'ACTIVE')
      .slice(0, 2);
    expect(selectedCapabilities.length).toBeGreaterThan(0);
    const selectedCatalogIds = selectedCapabilities.map((capability) => capability.extraServiceId);
    const selectedCatalogNames = selectedCapabilities.map((capability) => capability.extraService.name);

    const unique = Date.now();
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: `Bursa, Nilüfer ${unique}`,
        destination: `Eskişehir, Odunpazarı ${unique}`,
        loadDetails: 'Ofis mobilyaları ve server ekipmanları taşınacak.',
        transportType: 'ofis-tasima',
        loadType: 'OFFICE',
        shipmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        extraServices: selectedCatalogIds,
        requestedCarrierServices: {
          [carrier!.id]: {
            catalogServiceIds: selectedCatalogIds,
            customServiceIds: [],
          },
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.extraServices).toEqual(
      expect.arrayContaining(selectedCatalogNames),
    );
  });

  test('shipment create kategoriye uygulanamayan extra service id secilirse reddeder', async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    const token = login.body.data?.token;
    expect(token).toBeTruthy();

    const carrier = await AppDataSource.getRepository(Carrier).findOne({
      where: { email: 'info@silenakliyat.com' },
    });
    const homeOnlyService = await AppDataSource.getRepository(ExtraService).findOne({
      where: { name: 'Beyaz Eşya Kurulumu' },
    });
    expect(carrier).toBeTruthy();
    expect(homeOnlyService).toBeTruthy();

    const unique = Date.now();
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: `İstanbul, Kadıköy ${unique}`,
        destination: `Ankara, Çankaya ${unique}`,
        loadDetails: 'Ofis mobilyaları ve server ekipmanları taşınacak.',
        transportType: 'ofis-tasima',
        loadType: 'OFFICE',
        shipmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        extraServices: [homeOnlyService!.id],
        requestedCarrierServices: {
          [carrier!.id]: {
            catalogServiceIds: [homeOnlyService!.id],
            customServiceIds: [],
          },
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Tanimsiz veya bu yuk turu icin gecersiz ek hizmet');
    expect(response.body.message).toContain('loadType=OFFICE');
  });

  test('shipment create detayli frontend placeType degerlerini enum kategoriye normalize eder', async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    const token = login.body.data?.token;
    expect(token).toBeTruthy();

    const carrier = await AppDataSource.getRepository(Carrier).findOne({
      where: { email: 'info@silenakliyat.com' },
    });
    expect(carrier).toBeTruthy();
    const officeCapabilities = await AppDataSource.getRepository(CarrierExtraServiceCapability).find({
      where: {
        carrierId: carrier!.id,
        loadType: ExtraServiceLoadType.OFFICE,
        isActive: true,
      },
      relations: ['extraService'],
    });
    const selectedOfficeCapabilities = officeCapabilities
      .filter((capability) => capability.extraService?.status === 'ACTIVE')
      .slice(0, 2);
    expect(selectedOfficeCapabilities.length).toBeGreaterThan(0);
    const selectedCatalogIds = selectedOfficeCapabilities.map((capability) => capability.extraServiceId);
    const selectedCatalogNames = selectedOfficeCapabilities.map((capability) => capability.extraService.name);
    const customService = await AppDataSource.getRepository(CarrierCustomExtraService).save({
      carrierId: carrier!.id,
      loadType: ExtraServiceLoadType.OFFICE,
      title: `aadee-test-${Date.now()}`,
      description: 'Test ozel hizmet',
      isActive: true,
      priceMode: CarrierCustomExtraServicePriceMode.FIXED,
      basePrice: 444,
      quoteMinPrice: null,
      quoteMaxPrice: null,
    });

    const unique = Date.now();
    const officeResponse = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: `Ankara, Bala ${unique}`,
        destination: `Aydın, Didim ${unique}`,
        loadDetails: 'ofis-tasima / Orta ofis',
        transportType: 'ofis-tasima',
        loadType: 'OFFICE',
        originPlaceType: 'Orta ofis',
        destinationPlaceType: 'Büyük ofis',
        originAddressText: 'Ankara Bala A Blok 5. kat Daire 12',
        destinationAddressText: 'Aydın Didim B Blok 3. kat Daire 7',
        dateFlexibility: 'PLUS_MINUS_1_DAY',
        shipmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        extraServices: selectedCatalogIds,
        customExtraServices: [customService.id],
        requestedCarrierServices: {
          [carrier!.id]: {
            catalogServiceIds: selectedCatalogIds,
            customServiceIds: [customService.id],
          },
        },
      });

    expect(officeResponse.status).toBe(201);
    expect(officeResponse.body.data?.originPlaceType).toBe(PlaceType.OFIS);
    expect(officeResponse.body.data?.destinationPlaceType).toBe(PlaceType.OFIS);
    expect(officeResponse.body.data?.originAddressText).toBe('Ankara Bala A Blok 5. kat Daire 12');
    expect(officeResponse.body.data?.destinationAddressText).toBe('Aydın Didim B Blok 3. kat Daire 7');
    expect(officeResponse.body.data?.dateFlexibility).toBe('PLUS_MINUS_1_DAY');
    expect(officeResponse.body.data?.extraServices).toEqual(
      expect.arrayContaining([...selectedCatalogNames, customService.title]),
    );

    const carrierLogin = await request(testApp)
      .post('/api/v1/carriers/login')
      .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });
    expect(carrierLogin.status).toBe(200);

    const carrierView = await request(testApp)
      .get(`/api/v1/shipments/${officeResponse.body.data.id}`)
      .set('Authorization', `Bearer ${carrierLogin.body.data?.token}`);

    // The carrier is neither assigned nor invited to this shipment. Catalog
    // compatibility alone must not grant access to the private detail route.
    expect(carrierView.status).toBe(403);

    const homeResponse = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: `İstanbul, Beykoz ${unique}`,
        destination: `Afyonkarahisar, Sultandağı ${unique}`,
        loadDetails: 'evden-eve / 3+1 ev',
        transportType: 'evden-eve',
        loadType: 'HOME',
        originPlaceType: '3+1 ev',
        destinationPlaceType: 'bilinmeyen özel değer',
        shipmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(homeResponse.status).toBe(201);
    expect(homeResponse.body.data?.originPlaceType).toBe(PlaceType.DAIRE);
    expect(homeResponse.body.data?.destinationPlaceType).toBe(PlaceType.DIGER);
  });

  test('carrier capability yoksa teklif veremez', async () => {
    if (skipDB()) return;

    let hasCapabilityTables = true;
    try {
      await AppDataSource.query('SELECT 1 FROM `carrier_load_type_capabilities` LIMIT 1');
      await AppDataSource.query('SELECT 1 FROM `carrier_extra_service_capabilities` LIMIT 1');
    } catch {
      hasCapabilityTables = false;
    }

    if (!hasCapabilityTables) return;

    const customerLogin = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });
    const carrierLogin = await request(testApp)
      .post('/api/v1/carriers/login')
      .send({ email: 'info@silenakliyat.com', password: 'Maviface2141' });

    expect(customerLogin.status).toBe(200);
    expect(carrierLogin.status).toBe(200);

    const customerToken = customerLogin.body.data?.token;
    const carrierToken = carrierLogin.body.data?.token;
    expect(customerToken).toBeTruthy();
    expect(carrierToken).toBeTruthy();

    const carrier = await AppDataSource.getRepository(Carrier).findOne({
      where: { email: 'info@silenakliyat.com' },
    });
    const homeService = await AppDataSource.getRepository(ExtraService).findOne({
      where: { name: 'Beyaz Eşya Kurulumu' },
    });

    expect(carrier).toBeTruthy();
    expect(homeService).toBeTruthy();

    const unique = Date.now();
    await AppDataSource.query(
      'DELETE FROM `carrier_extra_service_capabilities` WHERE `carrier_id` = ? AND `load_type` = ? AND `extra_service_id` = ?',
      [carrier!.id, ExtraServiceLoadType.HOME, homeService!.id],
    );
    await AppDataSource.query(
      'DELETE FROM `carrier_load_type_capabilities` WHERE `carrier_id` = ? AND `load_type` = ?',
      [carrier!.id, ExtraServiceLoadType.HOME],
    );

    const shipmentCreate = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        origin: `Balıkesir, Karesi ${unique}`,
        destination: `Kocaeli, İzmit ${unique}`,
        loadDetails: 'Beyaz esya ve mutfak urunleri tasinacak.',
        shipmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentCategory: 'HOME_MOVE',
      });

    expect(shipmentCreate.status).toBe(201);
    const shipmentId = shipmentCreate.body.data?.id;
    expect(shipmentId).toBeTruthy();

    const offerResponse = await request(testApp)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${carrierToken}`)
      .send({
        shipmentId,
        price: 6500,
        message: 'Planlanan tarihte hizmet verebiliriz.',
      });

    expect(offerResponse.status).toBe(403);
    expect(offerResponse.body.success).toBe(false);
  });

  // Restore Silen baseline after capability mutations to prevent fixture drift
  afterAll(async () => {
    if (skipDB()) return;
    await restoreSilenCarrierBaseline();
  });
});
