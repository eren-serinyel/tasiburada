import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { testApp } from './helpers/testApp';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Customer } from '../domain/entities/Customer';
import { Carrier, CarrierApprovalState } from '../domain/entities/Carrier';
import { Shipment, ShipmentStatus } from '../domain/entities/Shipment';
import { Offer, OfferStatus } from '../domain/entities/Offer';
import { Notification, NotificationStatus } from '../domain/entities/Notification';
import { NotificationService } from '../application/services/NotificationService';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true' || !AppDataSource.isInitialized;

describe('Authorization bulk security contract', () => {
  const ids = {
    ownerCustomer: '',
    outsiderCustomer: '',
    assignedCarrier: '',
    unrelatedCarrier: '',
    raceCarriers: [] as string[],
    accessShipment: '',
    raceShipment: '',
    raceOffers: [] as string[],
    notification: '',
  };

  const sign = (payload: Record<string, unknown>) =>
    jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  const customerToken = (id: string) => sign({ customerId: id, email: `${id}@test.local`, type: 'customer' });
  const carrierToken = (id: string) => sign({ carrierId: id, email: `${id}@test.local`, type: 'carrier' });

  beforeAll(async () => {
    if (skipDB()) return;

    const customerRepo = AppDataSource.getRepository(Customer);
    const carrierRepo = AppDataSource.getRepository(Carrier);
    const shipmentRepo = AppDataSource.getRepository(Shipment);
    const offerRepo = AppDataSource.getRepository(Offer);
    const stamp = `${Date.now()}`.slice(-8);

    const owner = await customerRepo.save(customerRepo.create({
      firstName: 'Security', lastName: 'Owner',
      email: `security-owner-${stamp}@test.local`, phone: '05000000101',
      passwordHash: 'hash', isActive: true, isVerified: true,
    }));
    const outsider = await customerRepo.save(customerRepo.create({
      firstName: 'Security', lastName: 'Outsider',
      email: `security-outsider-${stamp}@test.local`, phone: '05000000102',
      passwordHash: 'hash', isActive: true, isVerified: true,
    }));
    ids.ownerCustomer = owner.id;
    ids.outsiderCustomer = outsider.id;

    const createCarrier = async (index: number, label: string) => carrierRepo.save(carrierRepo.create({
      companyName: `Security ${label}`,
      taxNumber: `${index}${stamp}0`,
      contactName: label,
      phone: `0500000020${index}`,
      email: `security-${label.toLowerCase()}-${stamp}@test.local`,
      passwordHash: `secret-${label}`,
      foundedYear: 2020,
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    }));

    const assigned = await createCarrier(1, 'Assigned');
    const unrelated = await createCarrier(2, 'Unrelated');
    const raceA = await createCarrier(3, 'RaceA');
    const raceB = await createCarrier(4, 'RaceB');
    ids.assignedCarrier = assigned.id;
    ids.unrelatedCarrier = unrelated.id;
    ids.raceCarriers = [raceA.id, raceB.id];

    const accessShipment = await shipmentRepo.save(shipmentRepo.create({
      customerId: owner.id,
      carrierId: assigned.id,
      status: ShipmentStatus.MATCHED,
      originCity: 'Istanbul', destinationCity: 'Ankara',
      loadDetails: 'Ownership security shipment',
      shipmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }));
    ids.accessShipment = accessShipment.id;

    const raceShipment = await shipmentRepo.save(shipmentRepo.create({
      customerId: owner.id,
      carrierId: null,
      status: ShipmentStatus.OFFER_RECEIVED,
      originCity: 'Izmir', destinationCity: 'Bursa',
      loadDetails: 'Offer accept race shipment',
      shipmentDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    }));
    ids.raceShipment = raceShipment.id;

    const offers = await offerRepo.save([
      offerRepo.create({
        shipmentId: raceShipment.id, carrierId: raceA.id, price: 1500,
        status: OfferStatus.PENDING, validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
      offerRepo.create({
        shipmentId: raceShipment.id, carrierId: raceB.id, price: 1600,
        status: OfferStatus.PENDING, validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    ]);
    ids.raceOffers = offers.map((offer) => offer.id);

    const notification = await new NotificationService().createNotification({
      recipientUserId: owner.id,
      recipientRole: 'customer',
      type: 'security.notification_owner',
      title: 'Owner notification',
      body: 'Only the owner may read this.',
      entityType: 'shipment',
      entityId: accessShipment.id,
      status: NotificationStatus.UNREAD,
    });
    ids.notification = notification.id;
  });

  afterAll(async () => {
    if (skipDB()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const notificationRepo = AppDataSource.getRepository(Notification);
    if (ids.notification) await notificationRepo.delete(ids.notification);
    if (ids.raceShipment) {
      await notificationRepo.createQueryBuilder().delete().where('entityId = :id', { id: ids.raceShipment }).execute();
    }
    if (ids.raceOffers.length) await AppDataSource.getRepository(Offer).delete(ids.raceOffers);
    if (ids.accessShipment) await AppDataSource.getRepository(Shipment).delete(ids.accessShipment);
    if (ids.raceShipment) await AppDataSource.getRepository(Shipment).delete(ids.raceShipment);
    const carrierIds = [ids.assignedCarrier, ids.unrelatedCarrier, ...ids.raceCarriers].filter(Boolean);
    if (carrierIds.length) await AppDataSource.getRepository(Carrier).delete(carrierIds);
    const customerIds = [ids.ownerCustomer, ids.outsiderCustomer].filter(Boolean);
    if (customerIds.length) await AppDataSource.getRepository(Customer).delete(customerIds);
  });

  test('another user cannot mark the owner notification as read', async () => {
    if (skipDB()) return;
    const response = await request(testApp)
      .patch(`/api/v1/notifications/${ids.notification}/read`)
      .set('Authorization', `Bearer ${customerToken(ids.outsiderCustomer)}`);

    expect(response.status).toBe(403);
    const notification = await AppDataSource.getRepository(Notification).findOneBy({ id: ids.notification });
    expect(notification?.isRead).toBe(false);
    expect(notification?.status).toBe(NotificationStatus.UNREAD);
  });

  test('shipment detail only allows owner, assigned carrier, or admin', async () => {
    if (skipDB()) return;
    const owner = await request(testApp).get(`/api/v1/shipments/${ids.accessShipment}`)
      .set('Authorization', `Bearer ${customerToken(ids.ownerCustomer)}`);
    const outsider = await request(testApp).get(`/api/v1/shipments/${ids.accessShipment}`)
      .set('Authorization', `Bearer ${customerToken(ids.outsiderCustomer)}`);
    const assigned = await request(testApp).get(`/api/v1/shipments/${ids.accessShipment}`)
      .set('Authorization', `Bearer ${carrierToken(ids.assignedCarrier)}`);
    const unrelated = await request(testApp).get(`/api/v1/shipments/${ids.accessShipment}`)
      .set('Authorization', `Bearer ${carrierToken(ids.unrelatedCarrier)}`);
    const admin = await request(testApp).get(`/api/v1/shipments/${ids.accessShipment}`)
      .set('Authorization', `Bearer ${sign({ adminId: randomUUID(), type: 'admin', role: 'admin' })}`);

    expect(owner.status).toBe(200);
    expect(outsider.status).toBe(403);
    expect(assigned.status).toBe(200);
    expect(unrelated.status).toBe(403);
    expect(admin.status).toBe(200);
    expect(JSON.stringify(assigned.body)).not.toContain('passwordHash');
    expect(JSON.stringify(assigned.body)).not.toContain('resetToken');
  });

  test('direct assignCarrier endpoint is not exposed', async () => {
    if (skipDB()) return;
    const response = await request(testApp)
      .put(`/api/v1/shipments/${ids.accessShipment}/assign-carrier`)
      .set('Authorization', `Bearer ${customerToken(ids.ownerCustomer)}`)
      .send({ carrierId: ids.unrelatedCarrier });
    expect(response.status).toBe(404);
  });

  test('concurrent offer accepts produce one success and one clean conflict', async () => {
    if (skipDB()) return;
    const token = customerToken(ids.ownerCustomer);
    const responses = await Promise.all(ids.raceOffers.map((offerId) =>
      request(testApp).put(`/api/v1/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${token}`),
    ));

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const offers = await AppDataSource.getRepository(Offer).findBy({ shipmentId: ids.raceShipment });
    expect(offers.filter((offer) => offer.status === OfferStatus.ACCEPTED)).toHaveLength(1);
    expect(offers.filter((offer) => offer.status === OfferStatus.REJECTED)).toHaveLength(1);
  });

  test('admin routes reject non-admin and forged local tokens server-side', async () => {
    const nonAdmin = await request(testApp).get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customerToken(ids.outsiderCustomer || randomUUID())}`);
    const forgedPayload = Buffer.from(JSON.stringify({ type: 'admin', role: 'superadmin' })).toString('base64url');
    const forged = await request(testApp).get('/api/v1/admin/me')
      .set('Authorization', `Bearer eyJhbGciOiJub25lIn0.${forgedPayload}.`);

    expect(nonAdmin.status).toBe(403);
    expect(forged.status).toBe(401);
  });

  test('all admin routes and the frontend gate use server-side token verification', () => {
    const adminRoutes = fs.readFileSync(path.resolve(process.cwd(), 'src/presentation/routes/adminRoutes.ts'), 'utf8');
    const frontendGate = fs.readFileSync(path.resolve(process.cwd(), 'shadcn-ui/src/components/AdminProtectedRoute.tsx'), 'utf8');

    expect(adminRoutes).toContain('router.use(authenticateAdmin as any)');
    expect(frontendGate).toContain("adminApiClient('/admin/me')");
    expect(frontendGate).not.toMatch(/localStorage[^\n]*(isAdmin|adminAuthenticated)/i);
  });
});
