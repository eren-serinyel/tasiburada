import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { testApp } from './helpers/testApp';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { withSeedDataSource } from '../database/seed/seedDataSource';
import {
  ExtraService,
  ExtraServiceApplicability,
  ExtraServiceLoadType,
} from '../domain/entities';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('current shipment extra service selection', () => {
  let token = '';
  let sequence = 0;

  beforeAll(async () => {
    if (skipDB()) return;

    await withSeedDataSource(AppDataSource, () => seedExtraServices());
    const login = await request(testApp)
      .post('/api/v1/customers/login')
      .send({ email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' });

    expect(login.status).toBe(200);
    token = login.body.data?.token;
    expect(token).toBeTruthy();
  });

  const findApplicableService = async (loadType: ExtraServiceLoadType): Promise<ExtraService> => {
    const service = await AppDataSource.getRepository(ExtraService)
      .createQueryBuilder('extraService')
      .innerJoinAndSelect('extraService.applicabilityRules', 'applicability')
      .where('extraService.status = :status', { status: 'ACTIVE' })
      .andWhere('applicability.loadType = :loadType', { loadType })
      .getOne();

    expect(service).toBeTruthy();
    return service!;
  };

  const findHomeOnlyService = async (): Promise<ExtraService> => {
    const services = await AppDataSource.getRepository(ExtraService).find({
      where: { status: 'ACTIVE' },
      relations: ['applicabilityRules'],
    });
    const service = services.find((item) => item.applicabilityRules.length > 0
      && item.applicabilityRules.every((rule) => rule.loadType === ExtraServiceLoadType.HOME));

    expect(service).toBeTruthy();
    return service!;
  };

  const shipmentPayload = (
    shipmentCategory: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM',
    extraServices: string[],
    overrides: Record<string, unknown> = {},
  ) => {
    sequence += 1;
    const unique = `${Date.now()}-${sequence}`;
    return {
      origin: `Istanbul, Kadikoy ${unique}`,
      destination: `Ankara, Cankaya ${unique}`,
      originCity: 'Istanbul',
      originDistrict: `Kadikoy ${unique}`,
      destinationCity: 'Ankara',
      destinationDistrict: `Cankaya ${unique}`,
      loadDetails: 'Current shipment catalog extra service selection test payload.',
      shipmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      shipmentCategory,
      extraServices,
      ...overrides,
    };
  };

  test.each([
    ['HOME_MOVE', ExtraServiceLoadType.HOME],
    ['OFFICE_MOVE', ExtraServiceLoadType.OFFICE],
    ['PARTIAL_ITEM', ExtraServiceLoadType.PARTIAL],
  ] as const)('%s shipment carrier secmeden uygulanabilir katalog hizmetini saklar', async (category, loadType) => {
    if (skipDB()) return;

    const service = await findApplicableService(loadType);
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send(shipmentPayload(category, [service.id]));

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data?.extraServices).toEqual([service.name]);

    const rows = await AppDataSource.query(
      'SELECT extra_service_id FROM shipment_extra_services WHERE shipment_id = ?',
      [response.body.data.id],
    );
    expect(rows).toEqual([{ extra_service_id: service.id }]);
  });

  test('carrier capability olmadan legacy katalog secimini kabul eder ve duplicate join yazmaz', async () => {
    if (skipDB()) return;

    const service = await findApplicableService(ExtraServiceLoadType.HOME);
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send(shipmentPayload('HOME_MOVE', [service.id, service.id], {
        requestedCarrierServices: {
          '00000000-0000-4000-8000-000000000001': {
            catalogServiceIds: [service.id, service.id],
            customServiceIds: [],
          },
        },
      }));

    expect(response.status).toBe(201);
    expect(response.body.data?.extraServices).toEqual([service.name]);
    expect(response.body.data.extraServices.every((item: unknown) => typeof item === 'string')).toBe(true);

    const rows = await AppDataSource.query(
      'SELECT COUNT(*) AS relationCount FROM shipment_extra_services WHERE shipment_id = ? AND extra_service_id = ?',
      [response.body.data.id, service.id],
    );
    expect(Number(rows[0]?.relationCount)).toBe(1);
  });

  test('canonical shipment kategorisi client loadType degerinden once gelir', async () => {
    if (skipDB()) return;

    const homeOnlyService = await findHomeOnlyService();
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send(shipmentPayload('HOME_MOVE', [homeOnlyService.id], {
        loadType: ExtraServiceLoadType.OFFICE,
        transportType: 'ofis-tasima',
      }));

    expect(response.status).toBe(201);
    expect(response.body.data?.shipmentCategory).toBe('HOME_MOVE');
    expect(response.body.data?.extraServices).toEqual([homeOnlyService.name]);
  });

  test('bilinmeyen serbest metni 400 ile reddeder ve katalog kaydi olusturmaz', async () => {
    if (skipDB()) return;

    const unknownName = `catalog-disinda-${Date.now()}`;
    const repo = AppDataSource.getRepository(ExtraService);
    const beforeCount = await repo.count({ where: { name: unknownName } });
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send(shipmentPayload('HOME_MOVE', [unknownName]));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Tanimsiz veya bu yuk turu icin gecersiz ek hizmet');
    expect(await repo.count({ where: { name: unknownName } })).toBe(beforeCount);
  });

  test('pasif katalog hizmetini 400 ile reddeder', async () => {
    if (skipDB()) return;

    const serviceRepo = AppDataSource.getRepository(ExtraService);
    const applicabilityRepo = AppDataSource.getRepository(ExtraServiceApplicability);
    const unique = Date.now();
    const inactiveService = await serviceRepo.save(serviceRepo.create({
      code: `INACTIVE_CURRENT_SHIPMENT_${unique}`,
      name: `inactive-current-shipment-service-${unique}`,
      description: 'Inactive test service',
      status: 'INACTIVE',
      sortOrder: 999,
    }));

    try {
      await applicabilityRepo.save(applicabilityRepo.create({
        extraServiceId: inactiveService.id,
        loadType: ExtraServiceLoadType.HOME,
        isDefaultVisible: true,
        isRecommendedByConverter: false,
        sortOrder: 999,
      }));

      const response = await request(testApp)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${token}`)
        .send(shipmentPayload('HOME_MOVE', [inactiveService.id]));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    } finally {
      await serviceRepo.delete({ id: inactiveService.id });
    }
  });

  test('kategoriye uygulanamayan katalog hizmetini 400 ile reddeder', async () => {
    if (skipDB()) return;

    const homeOnlyService = await findHomeOnlyService();
    const response = await request(testApp)
      .post('/api/v1/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send(shipmentPayload('OFFICE_MOVE', [homeOnlyService.id]));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('loadType=OFFICE');
  });
});
