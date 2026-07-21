import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierDocument, CarrierDocumentStatus, CarrierDocumentType } from '../domain/entities/CarrierDocument';
import { CarrierEarnings } from '../domain/entities/CarrierEarnings';
import { CarrierServiceType } from '../domain/entities/CarrierServiceType';
import { CarrierVehicleType } from '../domain/entities/CarrierVehicleType';
import { ServiceType } from '../domain/entities/ServiceType';
import { VehicleType } from '../domain/entities/VehicleType';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const VALID_IBAN = 'TR330006100519786457841326';
const REQUIRED_DOCUMENT_TYPES = [
  CarrierDocumentType.AUTHORIZATION_CERT,
  CarrierDocumentType.SRC_CERT,
  CarrierDocumentType.VEHICLE_LICENSE,
  CarrierDocumentType.TAX_PLATE,
];

describe('Carrier payment profile flow', () => {
  let carrierId = '';
  let token = '';

  beforeAll(async () => {
    if (skipDB()) return;
    const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const register = await request(testApp)
      .post('/api/v1/carriers/register')
      .send({
        companyName: `Payment Profile ${unique}`,
        taxNumber: unique.slice(-10),
        email: `payment-profile-${unique}@example.com`,
        phone: `05${unique.slice(-9)}`,
        contactName: 'Payment Profile',
        password: 'Guvenli123A',
        foundedYear: new Date().getFullYear(),
      });
    expect(register.status).toBe(201);
    carrierId = register.body.data.carrier.id;
    token = register.body.data.token;
  });

  afterAll(async () => {
    if (skipDB() || !carrierId) return;
    await AppDataSource.getRepository(Carrier).delete(carrierId);
  });

  test('invalid Turkish IBAN returns a clear 400 and is not persisted', async () => {
    if (skipDB() || !token) return;
    const response = await request(testApp)
      .put('/api/v1/carriers/me/earnings')
      .set('Authorization', `Bearer ${token}`)
      .send({ bankName: 'Test Bankası', iban: 'TR123', accountHolder: 'Test Nakliyat' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('IBAN TR ile başlamalı ve toplam 26 karakter olmalıdır.');
    expect(await AppDataSource.getRepository(CarrierEarnings).findOneBy({ carrierId })).toBeNull();
  });

  test('valid payment information persists and advances the checklist percentage', async () => {
    if (skipDB() || !token) return;
    const before = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.data.sections.earningsCompleted).toBe(false);
    expect(before.body.data.overallPercentage).toBe(17);

    const response = await request(testApp)
      .put('/api/v1/carriers/me/earnings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankName: '  Test Bankası  ',
        iban: 'TR33 0006 1005 1978 6457 8413 26',
        accountHolder: '  Test Nakliyat A.Ş.  ',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.iban).toBe(VALID_IBAN);

    const row = await AppDataSource.getRepository(CarrierEarnings).findOneBy({ carrierId });
    expect(row).toMatchObject({
      bankName: 'Test Bankası',
      iban: VALID_IBAN,
      accountHolder: 'Test Nakliyat A.Ş.',
    });

    const after = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.data.sections.earningsCompleted).toBe(true);
    expect(after.body.data.completedSections).toContain('earnings');
    expect(after.body.data.overallPercentage).toBe(33);

    const reload = await request(testApp)
      .get('/api/v1/carriers/me')
      .set('Authorization', `Bearer ${token}`);
    expect(reload.status).toBe(200);
    expect(reload.body.data.earnings).toMatchObject({
      bankName: 'Test Bankası',
      iban: VALID_IBAN,
      accountHolder: 'Test Nakliyat A.Ş.',
    });
  });

  test('approval submission uses the same six-section readiness including payment information', async () => {
    if (skipDB() || !token) return;
    await AppDataSource.getRepository(CarrierEarnings).delete({ carrierId });

    const vehicleType = await AppDataSource.getRepository(VehicleType).findOne({ where: {} });
    const serviceType = await AppDataSource.getRepository(ServiceType).findOne({ where: {} });
    expect(vehicleType).toBeTruthy();
    expect(serviceType).toBeTruthy();

    await AppDataSource.getRepository(CarrierActivity).save({
      carrierId,
      city: 'İstanbul',
      district: 'Kadıköy',
      serviceAreasJson: ['İstanbul'],
    });
    await AppDataSource.getRepository(CarrierVehicleType).save({
      carrierId,
      vehicleTypeId: vehicleType!.id,
      capacityKg: vehicleType!.defaultCapacityKg,
    });
    await AppDataSource.getRepository(CarrierServiceType).save({
      carrierId,
      serviceTypeId: serviceType!.id,
    });
    await AppDataSource.getRepository(CarrierDocument).save(
      REQUIRED_DOCUMENT_TYPES.map(type => ({
        carrierId,
        type,
        fileUrl: `/uploads/documents/payment-readiness-${type}.pdf`,
        isRequired: true,
        status: CarrierDocumentStatus.PENDING,
        isApproved: false,
        uploadedAt: new Date(),
      })),
    );

    const status = await request(testApp)
      .put('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${token}`);
    expect(status.body.data.sections.earningsCompleted).toBe(false);
    expect(status.body.data.overallPercentage).toBe(83);

    const blockedSubmit = await request(testApp)
      .post('/api/v1/carriers/me/submit-for-approval')
      .set('Authorization', `Bearer ${token}`);
    expect(blockedSubmit.status).toBe(400);
    expect(blockedSubmit.body.code).toBe('CARRIER_APPROVAL_INCOMPLETE');
    expect(blockedSubmit.body.missingSections).toEqual(['paymentInfo']);

    const payment = await request(testApp)
      .put('/api/v1/carriers/me/earnings')
      .set('Authorization', `Bearer ${token}`)
      .send({ bankName: 'Test Bankası', iban: VALID_IBAN, accountHolder: 'Test Nakliyat A.Ş.' });
    expect(payment.status).toBe(200);

    const completedStatus = await request(testApp)
      .get('/api/v1/carriers/me/profile-status')
      .set('Authorization', `Bearer ${token}`);
    expect(completedStatus.body.data.overallPercentage).toBe(100);

    const submit = await request(testApp)
      .post('/api/v1/carriers/me/submit-for-approval')
      .set('Authorization', `Bearer ${token}`);
    expect(submit.status).toBe(200);
    expect(submit.body.success).toBe(true);
    expect(submit.body.data.approvalState).toBe('SUBMITTED');
  });
});

describe('Carrier payment profile frontend contract', () => {
  const payout = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/components/profile/PayoutSection.tsx'),
    'utf8',
  );
  const profile = fs.readFileSync(
    path.resolve(process.cwd(), 'shadcn-ui/src/pages/Profile.tsx'),
    'utf8',
  );

  test('profile exposes payment information using the existing profile section pattern', () => {
    expect(profile).toContain('<Item id="payouts" label="Ödeme Bilgileri"');
    expect(payout).toContain('>Ödeme Bilgileri</h2>');
    expect(payout).toContain('Banka Adı');
    expect(payout).toContain('Hesap Sahibi Adı / Ünvanı');
    expect(payout).toContain('IBAN');
  });

  test('client validation blocks invalid IBAN and success requires a persisted response', () => {
    expect(payout).toContain('/^TR\\d{24}$/i');
    expect(payout).toContain('IBAN TR ile başlamalı ve toplam 26 karakter olmalıdır.');
    expect(payout).toContain('!response.ok || !json?.success || !json?.data?.id');
    expect(profile).not.toContain('if (profileCompletion < 100)');
  });
});
