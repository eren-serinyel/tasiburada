import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import { NotificationService } from '../application/services/NotificationService';
import {
  Admin,
  Carrier,
  Customer,
  Notification,
  NotificationRecipientRole,
  NotificationStatus,
} from '../domain/entities';
import { testApp } from './helpers/testApp';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';
const BASE = '/api/v1';

const CUSTOMER_LOGIN = { email: 'ahmet.yilmaz0@gmail.com', password: 'Maviface2141' };
const CARRIER_LOGIN = { email: 'info@silenakliyat.com', password: 'Maviface2141' };
const ADMIN_LOGIN = { email: 'admin@tasiburadan.com', password: 'Maviface2141' };

describe('Notification Phase 1 contract foundation', () => {
  const service = new NotificationService();
  const createdIds = new Set<string>();

  let customerToken = '';
  let carrierToken = '';
  let adminToken = '';

  let customerId = '';
  let carrierId = '';
  let adminId = '';

  beforeAll(async () => {
    if (skipDB()) return;

    const [customerLogin, carrierLogin, adminLogin] = await Promise.all([
      request(testApp).post(`${BASE}/customers/login`).send(CUSTOMER_LOGIN),
      request(testApp).post(`${BASE}/carriers/login`).send(CARRIER_LOGIN),
      request(testApp).post(`${BASE}/admin/login`).send(ADMIN_LOGIN),
    ]);

    customerToken = customerLogin.body.data?.token || '';
    carrierToken = carrierLogin.body.data?.token || '';
    adminToken = adminLogin.body.data?.token || '';

    const [customer, carrier, admin] = await Promise.all([
      AppDataSource.getRepository(Customer).findOne({ where: { email: CUSTOMER_LOGIN.email } }),
      AppDataSource.getRepository(Carrier).findOne({ where: { email: CARRIER_LOGIN.email } }),
      AppDataSource.getRepository(Admin).findOne({ where: { email: ADMIN_LOGIN.email } }),
    ]);

    customerId = customer?.id || '';
    carrierId = carrier?.id || '';
    adminId = admin?.id || '';
  });

  afterEach(async () => {
    if (skipDB() || createdIds.size === 0) return;
    const ids = Array.from(createdIds);
    createdIds.clear();
    await AppDataSource.getRepository(Notification)
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('id IN (:...ids)', { ids })
      .execute();
  });

  test('legacy row listelenebilir ve alias alanlari dondurulur', async () => {
    if (skipDB() || !customerId || !customerToken) return;

    const repo = AppDataSource.getRepository(Notification);
    const legacyRow = await repo.save(repo.create({
      userId: customerId,
      userType: 'customer',
      type: `legacy.phase1a.${Date.now()}`,
      title: '[PHASE1A] Legacy row',
      message: 'legacy-message',
      isRead: false,
      relatedId: randomUUID(),
    }));
    createdIds.add(legacyRow.id);

    const res = await request(testApp)
      .get(`${BASE}/notifications`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const item = (res.body.data || []).find((n: any) => n.id === legacyRow.id);
    expect(item).toBeTruthy();
    expect(item.body).toBeTruthy();
    expect(item.message).toBe(item.body);
    expect(typeof item.isRead).toBe('boolean');
    expect(item.relatedId).toBe(item.entityId || item.relatedId);
  });

  test('legacy mojibake bildirim metni api cevabinda duzeltilir', async () => {
    if (skipDB() || !carrierId || !carrierToken) return;

    const brokenBody = 'Ankara â‡ Ardahan arasÄ±nda yeni bir taÅŸÄ±ma talebi var. Teklif vermek iÃ§in inceleyin.';
    const repo = AppDataSource.getRepository(Notification);
    const legacyRow = await repo.save(repo.create({
      userId: carrierId,
      userType: 'carrier',
      recipientUserId: carrierId,
      recipientRole: NotificationRecipientRole.CARRIER,
      type: `legacy.mojibake.${Date.now()}`,
      title: 'Yeni Uygun Talep',
      message: brokenBody,
      isRead: false,
      relatedId: randomUUID(),
      entityType: 'shipment',
      entityId: randomUUID(),
    }));
    createdIds.add(legacyRow.id);

    const res = await request(testApp)
      .get(`${BASE}/notifications`)
      .set('Authorization', `Bearer ${carrierToken}`);

    expect(res.status).toBe(200);
    const item = (res.body.data || []).find((n: any) => n.id === legacyRow.id);
    expect(item).toBeTruthy();
    expect(item.body).toContain('Ankara → Ardahan arasında yeni bir taşıma talebi var. Teklif vermek için inceleyin.');
    expect(item.message).toBe(item.body);
    expect(item.body).not.toMatch(/Ã|Â|â|Ä|Å/);
  });

  test('createFromEvent customer.offer_received kaydi olusturur', async () => {
    if (skipDB() || !customerId) return;

    const entityId = randomUUID();
    const created = await service.createFromEvent('customer.offer_received', {
      recipientUserId: customerId,
      entityId,
      offerId: randomUUID(),
      carrierId,
      carrierName: 'Test Carrier',
      offeredPrice: 1500,
    });
    createdIds.add(created.id);

    expect(created.type).toBe('customer.offer_received');
    expect(created.recipientRole || created.userType).toBe('customer');
    expect(created.entityType).toBe('shipment');
    expect(created.entityId).toBe(entityId);
    expect(created.body || created.message).toContain('taşımanız için teklif verdi');
    expect(created.body || created.message).not.toMatch(/Ã|Â|â/);
  });

  test('createFromEvent duplicate cagri tek kayit dondurur', async () => {
    if (skipDB() || !customerId) return;

    const offerId = randomUUID();
    const entityId = randomUUID();
    const payload = {
      recipientUserId: customerId,
      entityId,
      offerId,
      carrierId,
      carrierName: 'Duplicate Carrier',
      offeredPrice: 2500,
    };

    const a = await service.createFromEvent('customer.offer_received', payload);
    const b = await service.createFromEvent('customer.offer_received', payload);
    createdIds.add(a.id);

    expect(a.id).toBe(b.id);
    expect(a.dedupeKey).toBeTruthy();

    const count = await AppDataSource.getRepository(Notification).count({ where: { dedupeKey: a.dedupeKey! } as any });
    expect(count).toBe(1);
  });

  test('metadata whitelist calisir ve pii disarida kalir', async () => {
    if (skipDB() || !customerId) return;

    const created = await service.createFromEvent('customer.offer_received', {
      recipientUserId: customerId,
      entityId: randomUUID(),
      offerId: randomUUID(),
      carrierId,
      carrierName: 'Carrier Name',
      offeredPrice: 990,
      phone: '05551234567',
      email: 'secret@example.com',
      freeText: 'kullanici notu',
    } as any);
    createdIds.add(created.id);

    const metadata = created.metadataJson || {};
    expect(metadata.offerId).toBeTruthy();
    expect(metadata.carrierName).toBe('Carrier Name');
    expect((metadata as any).phone).toBeUndefined();
    expect((metadata as any).email).toBeUndefined();
    expect((metadata as any).freeText).toBeUndefined();
  });

  test('unread count status bazli calisir', async () => {
    if (skipDB() || !customerId) return;

    const unread = await service.createNotification({
      recipientUserId: customerId,
      recipientRole: 'customer',
      type: 'customer.shipment_in_transit',
      title: 'u',
      body: 'u',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.UNREAD,
    });
    const read = await service.createNotification({
      recipientUserId: customerId,
      recipientRole: 'customer',
      type: 'customer.shipment_completed',
      title: 'r',
      body: 'r',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
    createdIds.add(unread.id);
    createdIds.add(read.id);

    const count = await service.getUnreadCount(customerId, 'customer');
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('markRead idempotent ve markAllRead idempotent', async () => {
    if (skipDB() || !customerId) return;

    const notification = await service.createNotification({
      recipientUserId: customerId,
      recipientRole: 'customer',
      type: 'customer.shipment_completed',
      title: 'idempotent',
      body: 'idempotent',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.UNREAD,
    });
    createdIds.add(notification.id);

    await service.markRead(notification.id, customerId, 'customer');
    await service.markRead(notification.id, customerId, 'customer');

    await service.markAllRead(customerId, 'customer');
    await service.markAllRead(customerId, 'customer');

    const updated = await service.findById(notification.id);
    expect(updated).toBeTruthy();
    const status = updated?.status || (updated?.isRead ? 'read' : 'unread');
    expect(status).toBe('read');
  });

  test('customer baska carrier notificationini okuyamaz', async () => {
    if (skipDB() || !customerToken || !carrierId) return;

    const carrierNotification = await service.createNotification({
      recipientUserId: carrierId,
      recipientRole: 'carrier',
      type: 'carrier.offer_accepted',
      title: 'carrier-only',
      body: 'carrier-only',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.UNREAD,
    });
    createdIds.add(carrierNotification.id);

    const res = await request(testApp)
      .patch(`${BASE}/notifications/${carrierNotification.id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  test('admin recipientRole desteklenir', async () => {
    if (skipDB() || !adminId || !adminToken) return;

    const adminNotification = await service.createFromEvent('admin.carrier_submitted_for_approval', {
      recipientUserId: adminId,
      entityId: randomUUID(),
      companyName: 'Admin Test Carrier',
      approvalVersion: 1,
      resubmissionCount: 0,
    });
    createdIds.add(adminNotification.id);

    const listRes = await request(testApp)
      .get(`${BASE}/notifications`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const found = (listRes.body.data || []).find((n: any) => n.id === adminNotification.id);
    expect(found).toBeTruthy();
    expect(found.type).toBe('admin.carrier_submitted_for_approval');
  });

  test('PUT read route geriye uyumludur ve PATCH read route calisir', async () => {
    if (skipDB() || !customerId || !customerToken) return;

    const n1 = await service.createNotification({
      recipientUserId: customerId,
      recipientRole: 'customer',
      type: 'customer.offer_received',
      title: 'put-route',
      body: 'put-route',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.UNREAD,
    });
    const n2 = await service.createNotification({
      recipientUserId: customerId,
      recipientRole: 'customer',
      type: 'customer.shipment_in_transit',
      title: 'patch-route',
      body: 'patch-route',
      entityType: 'shipment',
      entityId: randomUUID(),
      status: NotificationStatus.UNREAD,
    });
    createdIds.add(n1.id);
    createdIds.add(n2.id);

    const putRes = await request(testApp)
      .put(`${BASE}/notifications/${n1.id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(putRes.status).toBe(200);

    const patchRes = await request(testApp)
      .patch(`${BASE}/notifications/${n2.id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(patchRes.status).toBe(200);
  });
});
