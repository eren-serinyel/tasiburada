import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierScopeOfWork } from '../domain/entities/CarrierScopeOfWork';
import { CarrierVehicle } from '../domain/entities/CarrierVehicle';
import { CarrierVehicleType } from '../domain/entities/CarrierVehicleType';
import { VehicleType } from '../domain/entities/VehicleType';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Carrier onboarding multi-vehicle flow', () => {
  let carrierId = '';
  let token = '';

  beforeAll(async () => {
    if (skipDB()) return;
    const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const response = await request(testApp)
      .post('/api/v1/carriers/register')
      .send({
        companyName: `Onboarding Fleet ${unique}`,
        taxNumber: unique.slice(-10),
        email: `onboarding-fleet-${unique}@example.com`,
        phone: `05${unique.slice(-9)}`,
        contactName: 'Onboarding Test',
        password: 'Guvenli123A',
        foundedYear: new Date().getFullYear(),
      });

    expect(response.status).toBe(201);
    carrierId = response.body.data.carrier.id;
    token = response.body.data.token;
  });

  afterAll(async () => {
    if (skipDB() || !carrierId) return;
    await AppDataSource.getRepository(Carrier).delete(carrierId);
  });

  test('two vehicles persist and optional kg/m3 capacities remain null', async () => {
    if (skipDB() || !token) return;
    const vehicleTypes = await AppDataSource.getRepository(VehicleType).find({ take: 2 });
    expect(vehicleTypes.length).toBeGreaterThan(0);
    const firstType = vehicleTypes[0];
    const secondType = vehicleTypes[1] ?? firstType;

    const response = await request(testApp)
      .put('/api/v1/carriers/me/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicles: [
          {
            vehicleTypeId: firstType.id,
            plate: '34 ONB 101',
            brand: 'Ford',
            model: 'Transit',
            year: 2022,
            capacityKg: 3500,
            capacityM3: 15,
          },
          {
            vehicleTypeId: secondType.id,
            plate: '34 ONB 102',
            brand: 'Iveco',
            model: 'Daily',
            year: 2021,
            capacityKg: null,
            capacityM3: null,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const saved = await AppDataSource.getRepository(CarrierVehicle).find({
      where: { carrierId },
      order: { plate: 'ASC' },
    });
    expect(saved).toHaveLength(2);
    expect(saved[0].plate).toBe('34 ONB 101');
    expect(Number(saved[0].capacityKg)).toBe(3500);
    expect(Number(saved[0].capacityM3)).toBe(15);
    expect(saved[1].plate).toBe('34 ONB 102');
    expect(saved[1].capacityKg).toBeNull();
    expect(saved[1].capacityM3).toBeNull();

    const derivedTypeLinks = await AppDataSource.getRepository(CarrierVehicleType).find({
      where: { carrierId },
    });
    expect(new Set(derivedTypeLinks.map(link => link.vehicleTypeId))).toEqual(
      new Set([firstType.id, secondType.id]),
    );
  });

  test('work scopes and served provinces persist in separate data stores', async () => {
    if (skipDB() || !token) return;
    const scopeResponse = await request(testApp)
      .put('/api/v1/carriers/me/company-info')
      .set('Authorization', `Bearer ${token}`)
      .send({ scopeOfWorkNames: ['Şehir İçi', 'Şehirler Arası'] });
    expect(scopeResponse.status).toBe(200);

    const activityResponse = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send({
        city: 'İstanbul',
        district: 'Beylikdüzü',
        serviceAreas: ['İstanbul', 'Ankara', 'Bolu'],
      });
    expect(activityResponse.status).toBe(200);
    expect(activityResponse.body.data.serviceAreas).toEqual(['İstanbul', 'Ankara', 'Bolu']);

    const activity = await AppDataSource.getRepository(CarrierActivity).findOneBy({ carrierId });
    expect(activity?.serviceAreasJson).toEqual(['İstanbul', 'Ankara', 'Bolu']);
    expect(activity?.serviceAreasJson).not.toEqual(expect.arrayContaining(['sehirici', 'sehirlerarasi']));

    const scopeLinks = await AppDataSource.getRepository(CarrierScopeOfWork).find({
      where: { carrierId },
      relations: ['scope'],
    });
    expect(scopeLinks.map(link => link.scope.name).sort()).toEqual(['Şehir İçi', 'Şehirler Arası'].sort());

    const profileResponse = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${token}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.activity.serviceAreas).toEqual(['İstanbul', 'Ankara', 'Bolu']);
    expect(profileResponse.body.data.scopeOfWorks.map((link: any) => link.scope.name).sort())
      .toEqual(['Şehir İçi', 'Şehirler Arası'].sort());
  });

  test('activity endpoint rejects scope slugs as province values', async () => {
    if (skipDB() || !token) return;
    const response = await request(testApp)
      .put('/api/v1/carriers/me/activity')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'İstanbul', district: 'Beylikdüzü', serviceAreas: ['sehirici'] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('İş kapsamı değerleri hizmet verilen iller alanına kaydedilemez.');
  });

  test('database schema and migrated activity data keep capacity/scope separation', async () => {
    if (skipDB()) return;
    const columns = await AppDataSource.query(`
      SELECT IS_NULLABLE AS isNullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'carrier_vehicles'
        AND COLUMN_NAME = 'capacity_kg'
    `) as Array<{ isNullable: string }>;
    expect(columns[0]?.isNullable).toBe('YES');

    const activities = await AppDataSource.getRepository(CarrierActivity).find();
    const polluted = activities.filter(activity => (
      Array.isArray(activity.serviceAreasJson)
      && activity.serviceAreasJson.some(value => ['sehirici', 'sehirlerarasi'].includes(String(value).toLowerCase()))
    ));
    expect(polluted).toHaveLength(0);
  });
});

describe('Carrier onboarding/profile frontend contract', () => {
  const onboarding = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/pages/CarrierOnboarding.tsx'),
    'utf8',
  );
  const company = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/components/profile/CompanySection.tsx'),
    'utf8',
  );
  const operations = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/components/profile/OperationsSection.tsx'),
    'utf8',
  );

  test('step one exposes repeatable vehicle cards with plate and optional capacities', () => {
    expect(onboarding).toContain('Başka Araç Ekle');
    expect(onboarding).toContain('setVehicles(current => [...current, createEmptyVehicle()])');
    expect(onboarding).toContain('Plaka');
    expect(onboarding).toContain('Tahmini Ağırlık Kapasitesi (kg)');
    expect(onboarding).toContain("apiClient('/api/v1/carriers/me/vehicles'");
  });

  test('scope and served provinces are separate multi-selects with Turkish labels', () => {
    expect(onboarding).toContain('label="İş Kapsamı"');
    expect(onboarding).toContain('label="Hizmet Verdiği İller"');
    expect(operations).toContain('<Label>İş Kapsamı');
    expect(operations).toContain('<Label>Hizmet Verdiğiniz Bölgeler');
    expect(operations).toContain("'Şehir İçi', 'Şehirler Arası'");
  });

  test('company information no longer owns vehicle type selection', () => {
    expect(company).not.toContain('<Label>Araç Türü</Label>');
    expect(company).not.toContain('vehicleTypeNames');
    expect(company).not.toContain('/carriers/me/vehicles');
  });
});
