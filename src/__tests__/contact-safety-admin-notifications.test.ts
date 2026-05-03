import { randomUUID } from 'crypto';
import { ValidationError } from '../domain/errors/AppError';
import { NotificationService } from '../application/services/NotificationService';
import { PlatformPolicyService } from '../application/services/PlatformPolicyService';
import { ContactSafetyService } from '../application/services/contact-safety/ContactSafetyService';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Admin } from '../domain/entities/Admin';
import { ContactFilterSurface } from '../domain/entities/ContactFilterLog';
import { Notification } from '../domain/entities/Notification';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('Contact Safety admin notification integration', () => {
  const contactSafetyService = new ContactSafetyService();
  const notificationService = new NotificationService();
  const platformPolicyService = new PlatformPolicyService();

  let activeAdminIds: string[] = [];

  beforeAll(async () => {
    if (skipDB()) return;

    const admins = await AppDataSource.getRepository(Admin).find({
      where: { isActive: true },
      select: ['id'],
    });
    activeAdminIds = admins.map((item) => item.id);
  });

  afterEach(async () => {
    if (skipDB()) return;

    await AppDataSource.getRepository(Notification)
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('type IN (:...types)', {
        types: ['admin.high_risk_contact_filter_log', 'admin.repeated_contact_violation'],
      })
      .execute();

    jest.restoreAllMocks();
  });

  test('high risk contact log admin notification uretir', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const actorId = randomUUID();

    await contactSafetyService.enforce({
      actorType: 'customer',
      actorId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      entityType: 'offer_message',
      entityId: randomUUID(),
      offerId: randomUUID(),
      text: '0555 123 45 67 numarama yazin',
      policy: 'block',
      metadata: { source: 'contact-safety-admin-test' },
    });

    const rows = await AppDataSource.getRepository(Notification).find({
      where: { type: 'admin.high_risk_contact_filter_log' },
    });
    const scoped = rows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    });

    expect(scoped.length).toBe(activeAdminIds.length);
    for (const row of scoped) {
      expect(row.recipientRole || row.userType).toBe('admin');
      expect(activeAdminIds.includes(String(row.recipientUserId || row.userId))).toBe(true);
    }
  });

  test('medium risk notification uretmez', async () => {
    if (skipDB()) return;

    const before = await AppDataSource.getRepository(Notification).count({
      where: { type: 'admin.high_risk_contact_filter_log' },
    });

    await contactSafetyService.enforce({
      actorType: 'customer',
      actorId: randomUUID(),
      surface: ContactFilterSurface.PLATFORM_MESSAGE,
      entityType: 'platform_message',
      entityId: randomUUID(),
      text: 'whatsapp uzerinden yazalim',
      policy: 'block',
    });

    const count = await AppDataSource.getRepository(Notification).count({
      where: { type: 'admin.high_risk_contact_filter_log' },
    });

    expect(count).toBe(before);
  });

  test('repeated actor admin repeated notification uretir', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const actorId = randomUUID();

    for (let i = 0; i < 3; i += 1) {
      await contactSafetyService.enforce({
        actorType: 'customer',
        actorId,
        surface: ContactFilterSurface.OFFER_MESSAGE,
        entityType: 'offer_message',
        entityId: randomUUID(),
        offerId: randomUUID(),
        text: `Telefonum 0532 100 00 0${i}`,
        policy: 'block',
      });
    }

    const rows = await AppDataSource.getRepository(Notification).find({
      where: { type: 'admin.repeated_contact_violation' },
    });
    const scoped = rows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    });

    expect(scoped.length).toBe(activeAdminIds.length);
    scoped.forEach((row) => {
      const metadata = row.metadataJson || {};
      expect((metadata as Record<string, unknown>).actorId).toBe(actorId);
      expect((metadata as Record<string, unknown>).violationCount).toBeGreaterThanOrEqual(3);
    });
  });

  test('duplicate high risk dedupe spam yapmaz', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const payload = {
      recipientUserId: activeAdminIds[0],
      entityId: '123',
      contactFilterLogId: '123',
      actorType: 'customer',
      actorId: randomUUID(),
      surface: 'offer_message',
      action: 'blocked',
      severity: 'high',
      riskScore: 85,
      reasons: ['phone'],
      dedupeScope: activeAdminIds[0],
    };

    const first = await notificationService.createFromEvent('admin.high_risk_contact_filter_log', payload);
    const second = await notificationService.createFromEvent('admin.high_risk_contact_filter_log', payload);

    expect(first.id).toBe(second.id);
  });

  test('duplicate repeated dedupe spam yapmaz', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const actorId = randomUUID();

    for (let i = 0; i < 3; i += 1) {
      await contactSafetyService.enforce({
        actorType: 'carrier',
        actorId,
        surface: ContactFilterSurface.OFFER_MESSAGE,
        entityType: 'offer_message',
        entityId: randomUUID(),
        offerId: randomUUID(),
        text: `0537 200 00 0${i}`,
        policy: 'block',
      });
    }

    const firstRows = await AppDataSource.getRepository(Notification).find({
      where: { type: 'admin.repeated_contact_violation' },
    });
    const firstCount = firstRows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    }).length;

    await contactSafetyService.enforce({
      actorType: 'carrier',
      actorId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      entityType: 'offer_message',
      entityId: randomUUID(),
      offerId: randomUUID(),
      text: '0537 200 00 09',
      policy: 'block',
    });

    const secondRows = await AppDataSource.getRepository(Notification).find({
      where: { type: 'admin.repeated_contact_violation' },
    });
    const secondCount = secondRows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    }).length;

    expect(secondCount).toBe(firstCount);
  });

  test('notification failure contact block akisini bozmaz', async () => {
    if (skipDB()) return;

    const spy = jest
      .spyOn(NotificationService.prototype, 'createFromEvent')
      .mockRejectedValue(new Error('forced-notification-failure'));

    await expect(
      platformPolicyService.enforceNoContactInfo({
        actorType: 'customer',
        actorId: randomUUID(),
        surface: ContactFilterSurface.OFFER_MESSAGE,
        offerId: randomUUID(),
        text: 'telefon 0555 321 11 22',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(spy).toHaveBeenCalled();
  });

  test('raw text metadata icine girmez', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const actorId = randomUUID();
    const rawText = 'Bu mesajda 0555 333 44 55 var';

    await contactSafetyService.enforce({
      actorType: 'customer',
      actorId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      entityType: 'offer_message',
      entityId: randomUUID(),
      offerId: randomUUID(),
      text: rawText,
      policy: 'block',
    });

    const rows = await AppDataSource.getRepository(Notification).find({
      where: { type: 'admin.high_risk_contact_filter_log' },
    });
    const scoped = rows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    });

    expect(scoped.length).toBeGreaterThan(0);

    scoped.forEach((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(metadata, 'text')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(metadata, 'rawText')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(metadata, 'matchedRawValue')).toBe(false);
      expect(JSON.stringify(metadata).includes(rawText)).toBe(false);
    });
  });

  test('non-admin recipient uretilmez', async () => {
    if (skipDB()) return;
    if (activeAdminIds.length === 0) return;

    const actorId = randomUUID();

    await contactSafetyService.enforce({
      actorType: 'customer',
      actorId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      entityType: 'offer_message',
      entityId: randomUUID(),
      offerId: randomUUID(),
      text: 'Bana 0555 888 00 11 numarasindan ulas',
      policy: 'block',
    });

    const rows = await AppDataSource.getRepository(Notification).find({
      where: [
        { type: 'admin.high_risk_contact_filter_log' },
        { type: 'admin.repeated_contact_violation' },
      ],
    });
    const scoped = rows.filter((row) => {
      const metadata = (row.metadataJson || {}) as Record<string, unknown>;
      return metadata.actorId === actorId;
    });

    expect(scoped.length).toBeGreaterThan(0);
    scoped.forEach((row) => {
      expect(row.recipientRole || row.userType).toBe('admin');
      expect(activeAdminIds.includes(String(row.recipientUserId || row.userId))).toBe(true);
    });
  });
});
