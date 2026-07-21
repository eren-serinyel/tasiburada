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
import { CarrierProfileStatusService } from '../application/services/carrier/CarrierProfileStatusService';

const BASE = '/api/v1';
const ADMIN = { email: 'admin@tasiburadan.com', password: 'Maviface2141' };
const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const PUBLIC_CARRIER_KEYS = [
  'catalogExtraServiceIds',
  'city',
  'companyName',
  'district',
  'experienceYears',
  'id',
  'isVerified',
  'pictureUrl',
  'rating',
  'recentReviews',
  'reviewCount',
  'scopes',
  'serviceAreas',
  'services',
  'serviceTypes',
  'startingPrice',
  'vehicles',
  'vehicleSummary',
].sort();
const PUBLIC_DENYLIST = new Set([
  'phone',
  'contactphone',
  'email',
  'customer',
  'customerid',
  'customer_id',
  'taxnumber',
  'address',
  'openaddress',
  'street',
  'buildingnumber',
  'apartmentname',
  'doornumber',
  'iban',
  'bankname',
  'accountholder',
  'earnings',
  'balance',
  'password',
  'passwordhash',
  'resettoken',
  'resetpasswordtoken',
  'passwordresettoken',
  'verificationtoken',
  'refreshtoken',
  'securitysettings',
  'documents',
  'fileurl',
  'storagekey',
  'adminnotes',
  'rejectionnotes',
  'revisionnotes',
]);
const OWNER_SECRET_DENYLIST = new Set([
  'password',
  'passwordhash',
  'resettoken',
  'resettokenexpiry',
  'resetpasswordtoken',
  'passwordresettoken',
  'verificationtoken',
  'refreshtoken',
  'reviewlockadminid',
  'reviewsessionid',
  'fileurl',
  'storagekey',
]);

const collectObjectKeys = (value: unknown, keys = new Set<string>()): Set<string> => {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    value.forEach(item => collectObjectKeys(item, keys));
    return keys;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    keys.add(key.toLowerCase());
    collectObjectKeys(nested, keys);
  });
  return keys;
};

const expectNoDeniedKeys = (value: unknown, denylist: Set<string>) => {
  const keys = collectObjectKeys(value);
  denylist.forEach(key => expect(keys).not.toContain(key));
};

const expectCanonicalPublicCarrier = (value: Record<string, unknown>) => {
  expect(Object.keys(value).sort()).toEqual(PUBLIC_CARRIER_KEYS);
  expectNoDeniedKeys(value, PUBLIC_DENYLIST);

  const reviews = Array.isArray(value.recentReviews)
    ? value.recentReviews
    : [];
  reviews.forEach(review => {
    expect(review).toEqual(expect.objectContaining({
      author: expect.any(String),
    }));
    expect((review as { author: string }).author.trim()).toMatch(/\s\S\.$/u);
    expect(review).not.toHaveProperty('customerId');
    expect(review).not.toHaveProperty('customer_id');
    expect(review).not.toHaveProperty('customer');

    const isOwnReview = (review as { isOwnReview?: unknown }).isOwnReview;
    if (isOwnReview !== undefined) {
      expect(typeof isOwnReview).toBe('boolean');
    }
  });
};

describe('Public carrier trust gate', () => {
  const marker = `TrustGate${Date.now()}`;
  const city = `${marker}City`;
  const password = 'Maviface2141';
  const ids: string[] = [];
  const carrierIds: Partial<Record<
    | 'approved'
    | 'draft'
    | 'submitted'
    | 'inReview'
    | 'rejected'
    | 'suspended'
    | 'inactiveApproved'
    | 'unverifiedApproved',
    string
  >> = {};
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
    await createCarrier('submitted', CarrierApprovalState.SUBMITTED);
    await createCarrier('inReview', CarrierApprovalState.IN_REVIEW);
    await createCarrier('rejected', CarrierApprovalState.REJECTED);
    await createCarrier('suspended', CarrierApprovalState.SUSPENDED);
    await createCarrier('inactiveApproved', CarrierApprovalState.APPROVED, { isActive: false });
    await createCarrier(
      'unverifiedApproved',
      CarrierApprovalState.APPROVED,
      { verifiedByAdmin: false },
    );
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

  test('public search returns the canonical allowlist without nested denylist keys', async () => {
    if (skipDB() || !carrierIds.approved) return;

    const res = await request(testApp)
      .get(`${BASE}/carriers/search`)
      .query({ searchText: marker, limit: 20 });
    const approved = (res.body.data?.items || [])
      .find((item: any) => item.id === carrierIds.approved);

    expect(approved).toBeDefined();
    expectCanonicalPublicCarrier(approved);
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

  test('public/customer search does not return SUBMITTED carrier', async () => {
    if (skipDB() || !carrierIds.submitted) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.submitted);
  });

  test('public/customer search does not return IN_REVIEW carrier', async () => {
    if (skipDB() || !carrierIds.inReview) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.inReview);
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

  test('public/customer search does not return unverified APPROVED carrier', async () => {
    if (skipDB() || !carrierIds.unverifiedApproved) return;

    const resultIds = await publicSearchIds();
    expect(resultIds).not.toContain(carrierIds.unverifiedApproved);
  });

  test('public carrier detail/profile only shows trust-gated carriers', async () => {
    if (
      skipDB()
      || !carrierIds.approved
      || !carrierIds.draft
      || !carrierIds.submitted
      || !carrierIds.inReview
      || !carrierIds.rejected
      || !carrierIds.suspended
      || !carrierIds.inactiveApproved
    ) return;

    const approvedDetail = await request(testApp).get(`${BASE}/carriers/${carrierIds.approved}/detail`);
    expect(approvedDetail.status).toBe(200);

    const hiddenIds = [
      carrierIds.draft,
      carrierIds.submitted,
      carrierIds.inReview,
      carrierIds.rejected,
      carrierIds.suspended,
      carrierIds.inactiveApproved,
      carrierIds.unverifiedApproved,
    ].filter(Boolean);

    for (const carrierId of hiddenIds) {
      const detail = await request(testApp).get(`${BASE}/carriers/${carrierId}/detail`);
      const profile = await request(testApp).get(`${BASE}/carriers/${carrierId}`);
      expect(detail.status).toBe(404);
      expect(profile.status).toBe(404);
    }
  });

  test('public profile and detail return the same canonical allowlist', async () => {
    if (skipDB() || !carrierIds.approved) return;

    const [profile, detail] = await Promise.all([
      request(testApp).get(`${BASE}/carriers/${carrierIds.approved}`),
      request(testApp).get(`${BASE}/carriers/${carrierIds.approved}/detail`),
    ]);

    expect(profile.status).toBe(200);
    expect(detail.status).toBe(200);
    expectCanonicalPublicCarrier(profile.body.data?.carrier);
    expectCanonicalPublicCarrier(detail.body.data);
  });

  test('public profile GET does not update profile completion', async () => {
    if (skipDB() || !carrierIds.approved) return;

    const completionSpy = jest.spyOn(
      CarrierProfileStatusService.prototype,
      'updateProfileCompletion',
    );
    const carrierSaveSpy = jest.spyOn(
      AppDataSource.getRepository(Carrier),
      'save',
    );

    try {
      const profile = await request(testApp)
        .get(`${BASE}/carriers/${carrierIds.approved}`);
      expect(profile.status).toBe(200);
      expect(completionSpy).not.toHaveBeenCalled();
      expect(carrierSaveSpy).not.toHaveBeenCalled();
    } finally {
      completionSpy.mockRestore();
      carrierSaveSpy.mockRestore();
    }
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
    expect(res.body.data?.carrier?.email).toBe(`${marker}draft@example.com`.toLowerCase());
    expect(res.body.data?.carrier?.phone).toBeDefined();
    expect(res.body.data?.carrier?.taxNumber).toBeDefined();
    expect(res.body.data?.status).toBeDefined();
    expect(res.body.data?.documents).toBeInstanceOf(Array);
    expectNoDeniedKeys(res.body.data, OWNER_SECRET_DENYLIST);
  });
});
