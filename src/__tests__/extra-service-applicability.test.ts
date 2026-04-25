import request from 'supertest';
import { AppDataSource } from '../infrastructure/database/data-source';
import { testApp } from './helpers/testApp';
import { seedExtraServices } from '../database/seed/seeders/extraServiceSeeder';
import { ExtraService, ExtraServiceApplicability, ExtraServiceLoadType } from '../domain/entities';
import { ConverterService } from '../application/services/ConverterService';

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
        { itemCode: 'box_medium', quantity: 8 },
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
});
