import request from 'supertest';
import bcrypt from 'bcryptjs';
import { In } from 'typeorm';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { CarrierActivity } from '../domain/entities/CarrierActivity';
import { CarrierProfileStatus } from '../domain/entities/CarrierProfileStatus';
import { CarrierScopeOfWork } from '../domain/entities/CarrierScopeOfWork';
import { ScopeOfWork } from '../domain/entities/ScopeOfWork';

const BASE = '/api/v1';
const ADMIN = { email: 'admin@tasiburadan.com', password: 'Maviface2141' };
const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Public carrier trust gate', () => {
  const marker = `TrustGate${Date.now()}`;
  const city = `${marker}City`;
  const password = 'Maviface2141';
  const ids: string[] = [];
  const carrierIds: Partial<Record<'approved' | 'draft' | 'rejected' | 'suspended' | 'inactiveApproved', string>> = {};
  let intercityScopeId: string | undefined;

  const createCarrier = async (
    key: keyof typeof carrierIds,
    approvalState: CarrierApprovalState,
    options: { isActive?: boolean; verifiedByAdmin?: boolean } = {},
  ) => {
    const suffix = `${marker}${key}`;
    const carrier = await AppDataSource.getRepository(Carrier).save(
      AppDataSource.getRepository(Carrier).create({
        companyName: `${marker} ${key}`,
        contactName: 'Trust Gate',
        taxNumber: suffix.slice(0, 32),
        phone: `53${String(ids.length + 1).padStart(9, '0')}`,
        email: `${suffix.toLowerCase()}@example.com`,
        passwordHash: await bcrypt.hash(password, 10),
        foundedYear: 2020,
        isActive: options.isActive ?? true,
        verifiedByAdmin: options.verifiedByAdmin ?? true,
        approvalState,
        rating: 4.8,
        completedShipments: 3,
      }),
    );

    await AppDataSource.getRepository(CarrierActivity).save(
      AppDataSource.getRepository(CarrierActivity).create({
        carrierId: carrier.id,
        city,
        district: 'Gate',
        serviceAreasJson: [city],
        availableDates: JSON.stringify(['2026-06-01']),
      }),
    );

    if (key === 'approved' && intercityScopeId) {
      await AppDataSource.getRepository(CarrierScopeOfWork).save(
        AppDataSource.getRepository(CarrierScopeOfWork).create({
          carrierId: carrier.id,
          scopeId: intercityScopeId,
        }),
      );
    }

    ids.push(carrier.id);
    carrierIds[key] = carrier.id;
  };

  const publicSearchIds = async (query: Record<string, unknown> = {}) => {
    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ searchText: marker, limit: 20, ...query });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    return (res.body.data?.items || []).map((item: any) => item.id);
  };

  beforeAll(async () => {
    if (skipDB() || !AppDataSource.isInitialized) return;

    const scopeRepo = AppDataSource.getRepository(ScopeOfWork);
    const intercityScope = await scopeRepo.findOne({ where: { name: 'Şehirler Arası' } })
      ?? await scopeRepo.save(scopeRepo.create({ name: 'Şehirler Arası' }));
    intercityScopeId = intercityScope.id;

    await createCarrier('approved', CarrierApprovalState.APPROVED);
    await createCarrier('draft', CarrierApprovalState.DRAFT);
    await createCarrier('rejected', CarrierApprovalState.REJECTED);
    await createCarrier('suspended', CarrierApprovalState.SUSPENDED);
    await createCarrier('inactiveApproved', CarrierApprovalState.APPROVED, { isActive: false });
  });

  afterAll(async () => {
    if (!ids.length || !AppDataSource.isInitialized) return;

    await AppDataSource.getRepository(CarrierActivity).delete({ carrierId: In(ids) });
    await AppDataSource.getRepository(CarrierProfileStatus).delete({ carrierId: In(ids) });
    await AppDataSource.getRepository(CarrierScopeOfWork).delete({ carrierId: In(ids) });
    await AppDataSource.getRepository(Carrier).delete({ id: In(ids) });
  });

  test('public/customer search returns APPROVED carrier', async () => {
    if (skipDB() || !carrierIds.approved) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).toContain(carrierIds.approved);
  });

  test('public/customer search accepts working-area scope slugs', async () => {
    if (skipDB() || !carrierIds.approved) return;

    const resultIds = await publicSearchIds({ scopes: 'sehirlerarasi' });
    expect(resultIds).toContain(carrierIds.approved);
  });

  test('public/customer search does not return DRAFT carrier', async () => {
    if (skipDB() || !carrierIds.draft) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.draft);
  });

  test('public/customer search does not return REJECTED carrier', async () => {
    if (skipDB() || !carrierIds.rejected) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.rejected);
  });

  test('public/customer search does not return SUSPENDED carrier', async () => {
    if (skipDB() || !carrierIds.suspended) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.suspended);
  });

  test('public/customer search does not return inactive APPROVED carrier', async () => {
    if (skipDB() || !carrierIds.inactiveApproved) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.inactiveApproved);
  });

  test('public carrier detail/profile only shows trust-gated carriers', async () => {
    if (skipDB() || !carrierIds.approved || !carrierIds.draft || !carrierIds.rejected) return;

    const approvedDetail = await request(testApp).get(`${BASE}/carriers/${carrierIds.approved}/detail`);
    expect(approvedDetail.status).toBe(200);

    const draftDetail = await request(testApp).get(`${BASE}/carriers/${carrierIds.draft}/detail`);
    expect(draftDetail.status).toBe(404);

    const rejectedProfile = await request(testApp).get(`${BASE}/carriers/${carrierIds.rejected}`);
    expect(rejectedProfile.status).toBe(404);
  });

  test('admin carriers endpoint can see all approval states', async () => {
    if (skipDB() || !ids.length) return;

    const login = await request(testApp).post(`${BASE}/admin/login`).send(ADMIN);
    expect(login.status).toBe(200);
    const adminToken = login.body.data?.token;

    const res = await request(testApp)
      .get(`${BASE}/admin/carriers`)
      .query({ search: marker, limit: 20 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const states = (res.body.data?.carriers || []).map((carrier: any) => carrier.approvalState);
    expect(states).toEqual(expect.arrayContaining([
      CarrierApprovalState.APPROVED,
      CarrierApprovalState.DRAFT,
      CarrierApprovalState.REJECTED,
      CarrierApprovalState.SUSPENDED,
    ]));
  });

  test('carrier self endpoint can show own DRAFT profile', async () => {
    if (skipDB() || !carrierIds.draft) return;

    const login = await request(testApp)
      .post(`${BASE}/carriers/login`)
      .send({ email: `${marker}draft@example.com`.toLowerCase(), password });
    expect(login.status).toBe(200);

    const res = await request(testApp)
      .get(`${BASE}/carriers/me`)
      .set('Authorization', `Bearer ${login.body.data?.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data?.carrier?.id).toBe(carrierIds.draft);
    expect(res.body.data?.carrier?.approvalState).toBe(CarrierApprovalState.DRAFT);
  });
});
