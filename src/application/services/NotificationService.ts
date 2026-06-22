import { Notification } from '../../domain/entities/Notification';
import {
  NotificationRecipientRole,
  NotificationSeverity,
  NotificationStatus,
} from '../../domain/entities/Notification';
import { NotificationRepository } from '../../infrastructure/repositories/NotificationRepository';
import {
  NOTIFICATION_EVENT_DEFINITIONS,
  NotificationEventPayload,
  NotificationEventType,
} from './notifications/notificationEvents';

type RecipientRole = NotificationRecipientRole | 'customer' | 'carrier' | 'admin';

type NotificationInput = {
  recipientUserId: string;
  recipientRole: RecipientRole;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  severity?: NotificationSeverity;
  status?: NotificationStatus;
  readAt?: Date | null;
  metadataJson?: Record<string, unknown> | null;
  dedupeKey?: string | null;
};

type NotificationFilters = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  severity?: string;
};

type CreateFromEventOptions = {
  disableDedupe?: boolean;
};

const PII_PATTERNS: RegExp[] = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/iu,
  /(?:\+?90|0)?\s*\d{3}\s*\d{3}\s*\d{2}\s*\d{2}/u,
  /(https?:\/\/|www\.)/iu,
];

const LEGACY_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['â†’', '→'],
  ['â‡’', '→'],
  ['â‡', '→'],
  ['Ã‡', 'Ç'],
  ['Ã§', 'ç'],
  ['Ã–', 'Ö'],
  ['Ã¶', 'ö'],
  ['Ãœ', 'Ü'],
  ['Ã¼', 'ü'],
  ['Ä°', 'İ'],
  ['Ä±', 'ı'],
  ['Äž', 'Ğ'],
  ['ÄŸ', 'ğ'],
  ['Åž', 'Ş'],
  ['ÅŸ', 'ş'],
  ['Â·', '·'],
  ['Â³', '³'],
  ['â‚º', '₺'],
  ['â€œ', '"'],
  ['â€�', '"'],
  ['â€™', "'"],
  ['â€“', '-'],
  ['â€”', '-'],
];

const repairLegacyMojibake = (value?: string | null): string => {
  let text = value ?? '';
  if (!/[ÃÂâÄÅ]/u.test(text)) return text;

  for (const [broken, fixed] of LEGACY_MOJIBAKE_REPLACEMENTS) {
    text = text.split(broken).join(fixed);
  }

  return text;
};

export class NotificationService {
  private notificationRepository = new NotificationRepository();

  private normalizeRole(role: RecipientRole): NotificationRecipientRole {
    if (role === 'customer') return NotificationRecipientRole.CUSTOMER;
    if (role === 'carrier') return NotificationRecipientRole.CARRIER;
    return NotificationRecipientRole.ADMIN;
  }

  private containsPII(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (!text) return false;
    return PII_PATTERNS.some((pattern) => pattern.test(text));
  }

  private sanitizeMetadata(
    payload: NotificationEventPayload,
    whitelist: string[],
  ): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    for (const key of whitelist) {
      if (!(key in payload)) continue;
      const value = payload[key];
      const normalizedKey = key.toLowerCase();
      // Identifier fields are safe by contract and should not be dropped by regex heuristics.
      if (normalizedKey.endsWith('id')) {
        metadata[key] = value;
        continue;
      }
      if (this.containsPII(value)) continue;
      metadata[key] = value;
    }
    return metadata;
  }

  private toApiNotification(notification: Notification): Notification & {
    message: string;
    isRead: boolean;
    relatedId: string | null;
  } {
    const title = repairLegacyMojibake(notification.title ?? 'Bildirim');
    const rawBody = notification.body && notification.body.trim()
      ? notification.body
      : notification.message;
    const body = repairLegacyMojibake(rawBody ?? '');
    const status = notification.status
      ?? (notification.isRead ? NotificationStatus.READ : NotificationStatus.UNREAD);
    const entityId = notification.entityId ?? notification.relatedId ?? null;

    return {
      ...notification,
      title,
      body,
      status,
      message: body,
      isRead: status === NotificationStatus.READ,
      relatedId: entityId,
      entityId,
    };
  }

  async createFromEvent(
    eventType: NotificationEventType,
    payload: NotificationEventPayload,
    options: CreateFromEventOptions = {},
  ): Promise<Notification> {
    const definition = NOTIFICATION_EVENT_DEFINITIONS[eventType];
    if (!definition) {
      throw new Error(`Unknown notification event type: ${eventType}`);
    }

    const recipientUserId = typeof payload.recipientUserId === 'string'
      ? payload.recipientUserId
      : '';
    if (!recipientUserId) {
      throw new Error('recipientUserId is required for createFromEvent.');
    }

    const metadataJson = this.sanitizeMetadata(payload, definition.metadataWhitelist);
    const dedupeKey = definition.buildDedupeKey(payload);

    if (!options.disableDedupe && dedupeKey) {
      const existing = await this.notificationRepository.findByDedupeKey(dedupeKey);
      if (existing) return existing;
    }

    return this.createNotification({
      recipientUserId,
      recipientRole: definition.recipientRole,
      type: definition.type,
      title: definition.buildTitle(payload),
      body: definition.buildBody(payload),
      entityType: definition.entityType,
      entityId: String(payload.entityId),
      severity: definition.severity,
      metadataJson,
      dedupeKey,
      status: NotificationStatus.UNREAD,
    });
  }

  async createNotification(
    inputOrUserId: NotificationInput | string,
    legacyUserType?: 'customer' | 'carrier' | 'admin',
    legacyType?: string,
    legacyTitle?: string,
    legacyMessage?: string,
    legacyRelatedId?: string
  ): Promise<Notification> {
    const input: NotificationInput = typeof inputOrUserId === 'string'
      ? {
          recipientUserId: inputOrUserId,
          recipientRole: legacyUserType || 'customer',
          type: legacyType || 'generic',
          title: legacyTitle || 'Bildirim',
          body: legacyMessage || '',
          entityId: legacyRelatedId,
          entityType: 'generic',
          severity: NotificationSeverity.MEDIUM,
          status: NotificationStatus.UNREAD,
        }
      : inputOrUserId;

    const role = this.normalizeRole(input.recipientRole);
    const status = input.status || NotificationStatus.UNREAD;
    const body = input.body || '';

    return this.notificationRepository.createNotification({
      userId: input.recipientUserId,
      userType: role,
      type: input.type,
      title: input.title,
      message: body,
      relatedId: input.entityId || undefined,
      isRead: status === NotificationStatus.READ,
      recipientUserId: input.recipientUserId,
      recipientRole: role,
      body,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      severity: input.severity || NotificationSeverity.MEDIUM,
      status,
      readAt: input.readAt || (status === NotificationStatus.READ ? new Date() : null),
      metadataJson: input.metadataJson || null,
      dedupeKey: input.dedupeKey || null,
    });
  }

  async listForRecipient(
    recipientUserId: string,
    recipientRole: RecipientRole,
    filters: NotificationFilters = {},
  ) {
    const role = this.normalizeRole(recipientRole);
    const result = await this.notificationRepository.listForRecipient(recipientUserId, role, filters);
    return {
      ...result,
      items: result.items.map((item) => this.toApiNotification(item)),
    };
  }

  async getNotifications(userId: string, userType: 'customer' | 'carrier' | 'admin'): Promise<Notification[]> {
    const result = await this.listForRecipient(userId, userType, { page: 1, limit: 200 });
    return result.items;
  }

  async markRead(
    id: string,
    recipientUserId?: string,
    recipientRole?: RecipientRole,
  ): Promise<void> {
    if (recipientUserId && recipientRole) {
      const existing = await this.findById(id);
      if (!existing) return;
      const normalizedRole = this.normalizeRole(recipientRole);
      const ownerId = existing.recipientUserId || existing.userId;
      const ownerRole = (existing.recipientRole || existing.userType) as NotificationRecipientRole;
      if (ownerId !== recipientUserId || ownerRole !== normalizedRole) {
        throw new Error('Bu bildirime erişim yetkiniz yok.');
      }
    }
    await this.notificationRepository.markAsRead(id);
  }

  async findById(id: string): Promise<import('../../domain/entities/Notification').Notification | null> {
    return this.notificationRepository.findById(id);
  }

  async markAllRead(userId: string, userType: 'customer' | 'carrier' | 'admin'): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId, this.normalizeRole(userType));
  }

  async getUnreadCount(userId: string, userType: 'customer' | 'carrier' | 'admin'): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId, this.normalizeRole(userType));
  }
}
