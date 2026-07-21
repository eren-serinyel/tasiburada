import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { withSeedDataSource } from '../database/seed/seedDataSource';
import {
  ExtraService,
  ExtraServiceApplicability,
  ExtraServiceLoadType,
  Shipment,
  ShipmentCustomExtraService,
} from '../domain/entities';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('current shipment extra service update', () => {
  let ownerToken = '';
  let foreignToken = '';
  let sequence = 0;
  let homeOnlyService: ExtraService;
  let officeOnlyService: ExtraService;
  let sharedHomeOfficeService: ExtraService;
  let secondHomeService: ExtraService;
  let inactiveHomeService: ExtraService;
  let sharedHomeStorageService: ExtraService;
  let storageOnlyService: ExtraService;
  let inactiveStorageService: ExtraService;

  beforeAll(async () => {
    if (skipDB()) return;

    await withSeedDataSource(AppDataSource, () => seedExtraServices());
    const [ownerLogin, foreignLogin] = await Promise.all([
      request(testApp)
        .post('/api/v1/customers/login')
        .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' }),
      request(testApp)
        .post('/api/v1/customers/login')
        .send({ email: 'ayse.kaya1@gmail.com', password: 'Maviface2141' }),
    ]);
    expect(ownerLogin.status).toBe(200);
    expect(foreignLogin.status).toBe(200);
    ownerToken = ownerLogin.body.data?.token;
    foreignToken = foreignLogin.body.data?.token;
    expect(ownerToken).toBeTruthy();
    expect(foreignToken).toBeTruthy();

    const services = await AppDataSource.getRepository(ExtraService).find({
      where: { status: 'ACTIVE' },
      relations: ['applicabilityRules'],
    });
    const appliesTo = (service: ExtraService, loadType: ExtraServiceLoadType) =>
      service.applicabilityRules.some((rule) => rule.loadType === loadType);

    homeOnlyService = services.find((service) => appliesTo(service, ExtraServiceLoadType.HOME)
      && service.applicabilityRules.every((rule) => rule.loadType === ExtraServiceLoadType.HOME))!;
    officeOnlyService = services.find((service) => appliesTo(service, ExtraServiceLoadType.OFFICE)
      && !appliesTo(service, ExtraServiceLoadType.HOME))!;
    sharedHomeOfficeService = services.find((service) => appliesTo(service, ExtraServiceLoadType.HOME)
      && appliesTo(service, ExtraServiceLoadType.OFFICE))!;
    secondHomeService = services.find((service) => appliesTo(service, ExtraServiceLoadType.HOME)
      && service.id !== homeOnlyService?.id
      && service.id !== sharedHomeOfficeService?.id)!;
    expect(homeOnlyService).toBeTruthy();
    expect(officeOnlyService).toBeTruthy();
    expect(sharedHomeOfficeService).toBeTruthy();
    expect(secondHomeService).toBeTruthy();

    const extraRepo = AppDataSource.getRepository(ExtraService);
    const inactiveHomeUnique = Date.now();
    inactiveHomeService = await extraRepo.save(extraRepo.create({
      code: `INACTIVE_UPDATE_${inactiveHomeUnique}`,
      name: `inactive-update-service-${inactiveHomeUnique}`,
      description: 'Inactive update test service',
      status: 'INACTIVE',
      sortOrder: 999,
    }));
    await AppDataSource.getRepository(ExtraServiceApplicability).save({
      extraServiceId: inactiveHomeService.id,
      loadType: ExtraServiceLoadType.HOME,
      isDefaultVisible: true,
      isRecommendedByConverter: false,
      sortOrder: 999,
    });

    const createStorageTestService = async (
      namePrefix: string,
      status: 'ACTIVE' | 'INACTIVE',
      loadTypes: ExtraServiceLoadType[],
    ) => {
      sequence += 1;
      const unique = `${Date.now()}_${sequence}`;
      const service = await extraRepo.save(extraRepo.create({
        code: `STORAGE_UPDATE_${status}_${unique}`,
        name: `${namePrefix}-${unique}`,
        description: 'Storage update test service',
        status,
        sortOrder: 999,
      }));
      const applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);
      await applicabilityRepo.save(loadTypes.map((loadType) => applicabilityRepo.create({
        extraServiceId: service.id,
        loadType,
        isDefaultVisible: true,
        isRecommendedByConverter: false,
        sortOrder: 999,
      })));
      return service;
    };

    sharedHomeStorageService = await createStorageTestService(
      'shared-home-storage-update-service',
      'ACTIVE',
      [ExtraServiceLoadType.HOME, ExtraServiceLoadType.STORAGE],
    );
    storageOnlyService = await createStorageTestService(
      'storage-only-update-service',
      'ACTIVE',
      [ExtraServiceLoadType.STORAGE],
    );
    inactiveStorageService = await createStorageTestService(
      'inactive-storage-update-service',
      'INACTIVE',
      [ExtraServiceLoadType.STORAGE],
    );
  });

  afterAll(async () => {
    if (skipDB() || !inactiveHomeService) return;
    await AppDataSource.getRepository(ExtraService).delete([
      inactiveHomeService.id,
      sharedHomeStorageService.id,
      storageOnlyService.id,
      inactiveStorageService.id,
    ]);
  });

  const createShipment = async (
    shipmentCategory: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM',
    extraServices: string[],
  ): Promise<any> => {
    sequence += 1;
    const unique = `${Date.now()}-${sequence}`;
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        origin: `Istanbul, Kadikoy ${unique}`,
        destination: `Ankara, Cankaya ${unique}`,
        originCity: 'Istanbul',
        originDistrict: `Kadikoy ${unique}`,
        destinationCity: 'Ankara',
        destinationDistrict: `Cankaya ${unique}`,
        loadDetails: 'Current shipment extra service update test payload.',
        shipmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentCategory,
        extraServices,
      });
    expect(response.status).toBe(201);
    return response.body.data;
  };

  const updateShipment = (shipmentId: string, payload: Record<string, unknown>, token = ownerToken) =>
    request(testApp)
      .put(`/api/v1/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  const readState = async (shipmentId: string) => {
    const shipment = await AppDataSource.getRepository(Shipment).findOne({
      where: { id: shipmentId },
      relations: ['extraServices', 'customExtraServices'],
    });
    expect(shipment).toBeTruthy();
    return {
      shipmentCategory: shipment!.shipmentCategory,
      originDistrict: shipment!.originDistrict,
      extraServiceIds: shipment!.extraServices.map((service) => service.id).sort(),
      customServiceIds: shipment!.customExtraServices.map((service) => service.id).sort(),
    };
  };

  test('extraServices omit edildiginde mevcut katalog iliskisini korur', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const response = await updateShipment(created.id, { originFloor: 4 });

    expect(response.status).toBe(200);
    expect(response.body.data?.extraServices).toEqual([homeOnlyService.name]);
    expect((await readState(created.id)).extraServiceIds).toEqual([homeOnlyService.id]);
  });

  test('explicit bos liste mevcut katalog iliskilerini temizler', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const response = await updateShipment(created.id, { extraServices: [] });

    expect(response.status).toBe(200);
    expect(response.body.data?.extraServices).toEqual([]);
    expect((await readState(created.id)).extraServiceIds).toEqual([]);
  });

  test('carrier secmeden explicit liste exact replace ve dedupe yapar, response string array kalir', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id, sharedHomeOfficeService.id]);
    const response = await updateShipment(created.id, {
      extraServices: [sharedHomeOfficeService.id, secondHomeService.id, secondHomeService.id],
    });

    expect(response.status).toBe(200);
    expect(response.body.data?.extraServices.sort()).toEqual([
      sharedHomeOfficeService.name,
      secondHomeService.name,
    ].sort());
    expect(response.body.data.extraServices.every((item: unknown) => typeof item === 'string')).toBe(true);
    expect((await readState(created.id)).extraServiceIds).toEqual([
      sharedHomeOfficeService.id,
      secondHomeService.id,
    ].sort());
  });

  test.each(['unknown', 'inactive', 'inapplicable'] as const)(
    '%s katalog girdisini 400 ile atomik olarak reddeder',
    async (invalidKind) => {
      if (skipDB()) return;

      const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
      const before = await readState(created.id);
      const unknownName = `unknown-update-service-${Date.now()}-${sequence}`;
      const invalidValue = invalidKind === 'unknown'
        ? unknownName
        : invalidKind === 'inactive'
          ? inactiveHomeService.id
          : officeOnlyService.id;
      const response = await updateShipment(created.id, {
        originDistrict: `Mutated ${invalidKind}`,
        extraServices: [invalidValue],
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(await readState(created.id)).toEqual(before);
      if (invalidKind === 'unknown') {
        expect(await AppDataSource.getRepository(ExtraService).count({ where: { name: unknownName } })).toBe(0);
      }
    },
  );

  test('canonical hedef kategori client loadType degerini ezer ve explicit valid listeyle atomik degisir', async () => {
    if (skipDB()) return;

    const created = await createShipment('OFFICE_MOVE', [officeOnlyService.id]);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'HOME_MOVE',
      loadType: 'OFFICE',
      originDistrict: 'Canonical target district',
      extraServices: [homeOnlyService.id],
    });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('HOME_MOVE');
    expect(response.body.data?.originDistrict).toBe('Canonical target district');
    expect(response.body.data?.extraServices).toEqual([homeOnlyService.name]);
    const state = await readState(created.id);
    expect(state.shipmentCategory).toBe('HOME_MOVE');
    expect(state.extraServiceIds).toEqual([homeOnlyService.id]);
  });

  test('kategori degisimi ve omit invalid mevcut serviste tum mutationlari reddeder', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const before = await readState(created.id);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'OFFICE_MOVE',
      originDistrict: 'Must not persist',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await readState(created.id)).toEqual(before);
  });

  test('kategori degisimi ve omit tum servisler target icin validse iliskileri korur', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [sharedHomeOfficeService.id]);
    const response = await updateShipment(created.id, { shipmentCategory: 'OFFICE_MOVE' });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('OFFICE_MOVE');
    expect(response.body.data?.extraServices).toEqual([sharedHomeOfficeService.name]);
    expect((await readState(created.id)).extraServiceIds).toEqual([sharedHomeOfficeService.id]);
  });

  test('STORAGE kategori degisimi ve omit tum mevcut hizmetler validse iliskileri korur', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [sharedHomeStorageService.id]);
    const response = await updateShipment(created.id, { shipmentCategory: 'STORAGE' });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('STORAGE');
    expect(response.body.data?.extraServices).toEqual([sharedHomeStorageService.name]);
    const state = await readState(created.id);
    expect(state.shipmentCategory).toBe('STORAGE');
    expect(state.extraServiceIds).toEqual([sharedHomeStorageService.id]);
  });

  test('STORAGE kategori degisimi ve omit uygulanamayan mevcut hizmette tum mutationlari reddeder', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const before = await readState(created.id);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'STORAGE',
      originDistrict: 'Must not persist for storage',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await readState(created.id)).toEqual(before);
  });

  test('STORAGE kategori degisimi ve omit pasif mevcut hizmette tum mutationlari reddeder', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', []);
    await AppDataSource.createQueryBuilder()
      .relation(Shipment, 'extraServices')
      .of(created.id)
      .add(inactiveStorageService.id);
    const before = await readState(created.id);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'STORAGE',
      originDistrict: 'Must not persist for inactive storage service',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await readState(created.id)).toEqual(before);
  });

  test('STORAGE kategori degisimi ve omit mevcut secim yoksa bos iliskiyle devam eder', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', []);
    const response = await updateShipment(created.id, { shipmentCategory: 'STORAGE' });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('STORAGE');
    expect(response.body.data?.extraServices).toEqual([]);
    expect((await readState(created.id)).extraServiceIds).toEqual([]);
  });

  test('STORAGE explicit bos listeyle kategori degisir ve tum katalog secimleri temizlenir', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'STORAGE',
      extraServices: [],
    });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('STORAGE');
    expect(response.body.data?.extraServices).toEqual([]);
    const state = await readState(created.id);
    expect(state.shipmentCategory).toBe('STORAGE');
    expect(state.extraServiceIds).toEqual([]);
  });

  test('STORAGE explicit valid listeyi exact replacement ve dedupe olarak uygular', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'STORAGE',
      extraServices: [storageOnlyService.id, storageOnlyService.id],
    });

    expect(response.status).toBe(200);
    expect(response.body.data?.shipmentCategory).toBe('STORAGE');
    expect(response.body.data?.extraServices).toEqual([storageOnlyService.name]);
    const state = await readState(created.id);
    expect(state.shipmentCategory).toBe('STORAGE');
    expect(state.extraServiceIds).toEqual([storageOnlyService.id]);
  });

  test('STORAGE hedef kategori client HOME loadType ile override edilemez', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const before = await readState(created.id);
    const response = await updateShipment(created.id, {
      shipmentCategory: 'STORAGE',
      loadType: 'HOME',
      originDistrict: 'Must not persist for client load type override',
      extraServices: [homeOnlyService.id],
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await readState(created.id)).toEqual(before);
  });

  test('katalog update shipment custom extra service snapshotini degistirmez', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const customRepo = AppDataSource.getRepository(ShipmentCustomExtraService);
    const customSnapshot = await customRepo.save(customRepo.create({
      shipmentId: created.id,
      customExtraServiceId: null,
      carrierId: null,
      nameSnapshot: `Custom snapshot ${Date.now()}`,
      priceSnapshot: 125,
    }));
    const response = await updateShipment(created.id, { extraServices: [sharedHomeOfficeService.id] });

    expect(response.status).toBe(200);
    expect(response.body.data?.extraServices).toEqual(expect.arrayContaining([
      sharedHomeOfficeService.name,
      customSnapshot.nameSnapshot,
    ]));
    expect((await readState(created.id)).customServiceIds).toEqual([customSnapshot.id]);
  });

  test('foreign owner shipment extra service update yapamaz', async () => {
    if (skipDB()) return;

    const created = await createShipment('HOME_MOVE', [homeOnlyService.id]);
    const before = await readState(created.id);
    const response = await updateShipment(created.id, { extraServices: [] }, foreignToken);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(await readState(created.id)).toEqual(before);
  });
});
