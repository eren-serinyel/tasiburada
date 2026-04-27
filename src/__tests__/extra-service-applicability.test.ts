import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { testApp } from './helpers/testApp';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { ExtraService, ExtraServiceApplicability, ExtraServiceLoadType } from '../domain/entities';
import { ConverterService } from '../application/services/ConverterService';
import { Carrier } from '../domain/entities/Carrier';

const { reconcileSelectedExtraServiceIds } = require('../../shadcn-ui/src/lib/extraServices');

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('extra service applicability', () => {
  beforeAll(async () => {
    if (skipDB()) return;
    await seedExtraServices();
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

  test('shipment create OFFICE loadType icin gecersiz extra service secimini reddeder', async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    const token = login.body.data?.token;
    expect(token).toBeTruthy();

    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: 'Trabzon, Ortahisar',
        destination: 'Samsun, Atakum',
        loadDetails: 'Ofis mobilyalari ve evrak klasorleri tasinacak.',
        shipmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentCategory: 'OFFICE_MOVE',
        extraServices: ['Beyaz Eşya Kurulumu'],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
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
        origin: 'Balıkesir, Karesi',
        destination: 'Kocaeli, İzmit',
        loadDetails: 'Beyaz esya ve mutfak urunleri tasinacak.',
        shipmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentCategory: 'HOME_MOVE',
        extraServices: ['Beyaz Eşya Kurulumu'],
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
});
