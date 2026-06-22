import request from 'supertest';
import { randomUUID } from 'crypto';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Customer } from '../domain/entities/Customer';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import {
  ContactFilterAction,
  ContactFilterLog,
  ContactFilterReviewStatus,
  ContactFilterSeverity,
  ContactFilterSurface,
} from '../domain/entities/ContactFilterLog';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const BASE = '/api/v1';

describe('Admin offer detail audit view', () => {
  let adminToken = '';
  let customer: Customer | null = null;
  let carrier: Carrier | null = null;
  let shipmentId = '';
  let offerId = '';
  let logId: number | null = null;

  beforeAll(async () => {
    if (skipDB()) return;

    const login = await request(testApp)
      .post(`${BASE}/admin/login`)
      .send({ email: 'admin@tasiburadan.com', password: 'Maviface2141' });
    adminToken = login.body.data?.token || '';

    const suffix = randomUUID();
    const customerRepo = AppDataSource.getRepository(Customer);
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const logRepo = AppDataSource.getRepository(ContactFilterLog);

    customer = await customerRepo.save(customerRepo.create({
      firstName: 'Offer',
      lastName: 'Detail',
      email: `offer-detail-customer-${suffix}@example.com`,
      phone: '5550000000',
      passwordHash: 'secret-customer-hash',
      isActive: true,
      isVerified: true,
    }));

    carrier = await carrierRepo.save(carrierRepo.create({
      companyName: `Offer Detail Carrier ${suffix}`,
      taxNumber: suffix.replace(/-/g, '').slice(0, 32),
      phone: '5551111111',
      email: `offer-detail-carrier-${suffix}@example.com`,
      passwordHash: 'secret-carrier-hash',
      foundedYear: 2021,
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    }));

    shipmentId = randomUUID();
    await AppDataSource.query(
      `INSERT INTO shipments (
        id, customer_id, carrier_id, status, price,
        origin_city, origin_district, destination_city, destination_district,
        load_details, shipment_date, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipmentId,
        customer.id,
        null,
        ShipmentStatus.PENDING,
        null,
        'Istanbul',
        'Kadikoy',
        'Ankara',
        'Cankaya',
        'Admin offer detail fixture',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        JSON.stringify([]),
      ],
    );

    offerId = randomUUID();
    await AppDataSource.query(
      `INSERT INTO offers (
        id, shipmentId, carrierId, price, base_price, extra_services_total,
        extra_services_breakdown, message, status, has_suspicious_content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offerId,
        shipmentId,
        carrier.id,
        1250,
        1000,
        250,
        JSON.stringify([{ name: 'Paketleme', price: 250, source: 'requested' }]),
        'Platform dışı iletişim denemesi',
        OfferStatus.PENDING,
        true,
      ],
    );

    const log = await logRepo.save(logRepo.create({
      actorType: 'carrier',
      actorId: carrier.id,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      shipmentId,
      offerId,
      entityType: 'offer_message',
      entityId: offerId,
      action: ContactFilterAction.BLOCKED,
      severity: ContactFilterSeverity.HIGH,
      riskScore: 90,
      reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
      matchedRules: ['phone'],
      textHash: randomUUID().replace(/-/g, '').padEnd(64, '0').slice(0, 64),
      normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '1').slice(0, 64),
      metadataJson: { source: 'admin-offer-detail-test' },
    }));
    logId = log.id;
  });

  afterAll(async () => {
    if (skipDB()) return;
    if (logId) await AppDataSource.getRepository(ContactFilterLog).delete(logId);
    if (offerId) await AppDataSource.getRepository(Offer).delete(offerId);
    if (shipmentId) await AppDataSource.getRepository(Shipment).delete(shipmentId);
    if (carrier?.id) await AppDataSource.getRepository(Carrier).delete(carrier.id);
    if (customer?.id) await AppDataSource.getRepository(Customer).delete(customer.id);
  });

  test('admin can fetch offer detail with linked contact logs and no credential fields', async () => {
    if (skipDB() || !adminToken || !offerId) return;

    const res = await request(testApp)
      .get(`${BASE}/admin/offers/${offerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.offer.id).toBe(offerId);
    expect(res.body.data.offer.hasSuspiciousContent).toBe(true);
    expect(res.body.data.offer.extraServicesBreakdown).toEqual([
      expect.objectContaining({ name: 'Paketleme', price: 250, source: 'requested' }),
    ]);
    expect(res.body.data.contactLogs).toHaveLength(1);
    expect(res.body.data.contactLogs[0]).toEqual(expect.objectContaining({
      offerId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      matchedRules: ['phone'],
    }));

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('secret-customer-hash');
    expect(body).not.toContain('secret-carrier-hash');
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('resetToken');
    expect(body).not.toContain('verificationToken');
    expect(res.body.data.contactLogs[0]).not.toHaveProperty('textHash');
  });
});
