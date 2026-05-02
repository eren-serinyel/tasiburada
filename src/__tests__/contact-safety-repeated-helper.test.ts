import { randomUUID } from 'crypto';
import { AppDataSource } from '../infrastructure/database/data-source';
import {
  ContactFilterAction,
  ContactFilterLog,
  ContactFilterReviewStatus,
  ContactFilterSeverity,
  ContactFilterSurface,
} from '../domain/entities/ContactFilterLog';
import { ContactSafetyService } from '../application/services/contact-safety/ContactSafetyService';

const skipDB = () => process.env.SKIP_DB_TESTS === 'true';

describe('ContactSafetyService repeated violation helper', () => {
  const service = new ContactSafetyService();
  const seededIds: number[] = [];

  const seedBlockedLog = async (
    input: {
      actorType: 'customer' | 'carrier' | 'admin' | 'system';
      actorId: string | null;
      createdAt: Date;
    },
  ) => {
    const repo = AppDataSource.getRepository(ContactFilterLog);
    const row = await repo.save(repo.create({
      actorType: input.actorType,
      actorId: input.actorId,
      surface: ContactFilterSurface.OFFER_MESSAGE,
      shipmentId: randomUUID(),
      offerId: randomUUID(),
      entityType: 'offer_message',
      entityId: randomUUID(),
      action: ContactFilterAction.BLOCKED,
      severity: ContactFilterSeverity.HIGH,
      riskScore: 85,
      reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
      matchedRules: ['phone'],
      textHash: randomUUID().replace(/-/g, '').padEnd(64, '1').slice(0, 64),
      normalizedHash: randomUUID().replace(/-/g, '').padEnd(64, '2').slice(0, 64),
      metadataJson: { source: 'repeated-helper-test' },
      createdAt: input.createdAt,
    }));
    seededIds.push(row.id);
  };

  afterAll(async () => {
    if (skipDB() || seededIds.length === 0) return;
    await AppDataSource.getRepository(ContactFilterLog).delete(seededIds);
  });

  test('blocked>=3 aynı actor için repeated true olmalı', async () => {
    if (skipDB()) return;
    const repeatedActorId = randomUUID();
    const now = new Date();

    await seedBlockedLog({ actorType: 'customer', actorId: repeatedActorId, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'customer', actorId: repeatedActorId, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'customer', actorId: repeatedActorId, createdAt: new Date(now) });

    const repeated = await service.getRepeatedViolations({
      windowDays: 7,
      threshold: 3,
      actorType: 'customer',
    });

    const row = repeated.find((item) => item.actorId === repeatedActorId);
    expect(row).toBeTruthy();
    expect(row?.isRepeatedViolator).toBe(true);
    expect(row?.blockedCountLast7d).toBeGreaterThanOrEqual(3);
  });

  test('actorId null kayıtlar repeated hesabına dahil edilmemeli', async () => {
    if (skipDB()) return;
    const now = new Date();

    await seedBlockedLog({ actorType: 'admin', actorId: null, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'admin', actorId: null, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'admin', actorId: null, createdAt: new Date(now) });

    const repeated = await service.getRepeatedViolations({
      windowDays: 7,
      threshold: 3,
      actorType: 'admin',
    });

    expect(repeated.some((item) => item.actorId === '')).toBe(false);
  });

  test('actorType system repeated hesabından dışlanmalı', async () => {
    if (skipDB()) return;
    const systemActorId = randomUUID();
    const now = new Date();

    await seedBlockedLog({ actorType: 'system', actorId: systemActorId, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'system', actorId: systemActorId, createdAt: new Date(now) });
    await seedBlockedLog({ actorType: 'system', actorId: systemActorId, createdAt: new Date(now) });

    const repeated = await service.getRepeatedViolations({
      windowDays: 7,
      threshold: 3,
    });

    expect(repeated.some((item) => item.actorId === systemActorId)).toBe(false);
  });
});
