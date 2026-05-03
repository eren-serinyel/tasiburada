import {
  NotificationRecipientRole,
  NotificationSeverity,
} from '../../../domain/entities/Notification';

export type NotificationEventType =
  | 'customer.offer_received'
  | 'customer.shipment_in_transit'
  | 'customer.shipment_completed'
  | 'carrier.offer_accepted'
  | 'carrier.profile_approved'
  | 'admin.carrier_submitted_for_approval'
  | 'admin.high_risk_contact_filter_log'
  | 'admin.repeated_contact_violation';

export type NotificationEntityType =
  | 'shipment'
  | 'carrier'
  | 'offer'
  | 'carrier_document'
  | 'contact_filter_log'
  | 'actor'
  | 'generic';

export type NotificationEventPayload = Record<string, unknown> & {
  entityId: string;
};

export type NotificationEventDefinition = {
  type: NotificationEventType;
  recipientRole: NotificationRecipientRole;
  severity: NotificationSeverity;
  entityType: NotificationEntityType;
  metadataWhitelist: string[];
  buildTitle: (payload: NotificationEventPayload) => string;
  buildBody: (payload: NotificationEventPayload) => string;
  buildDedupeKey: (payload: NotificationEventPayload) => string;
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  return value.trim() || fallback;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
};

export const NOTIFICATION_EVENT_DEFINITIONS: Record<NotificationEventType, NotificationEventDefinition> = {
  'customer.offer_received': {
    type: 'customer.offer_received',
    recipientRole: NotificationRecipientRole.CUSTOMER,
    severity: NotificationSeverity.HIGH,
    entityType: 'shipment',
    metadataWhitelist: ['offerId', 'carrierId', 'carrierName', 'offeredPrice'],
    buildTitle: () => 'Yeni teklif geldi',
    buildBody: (payload) => {
      const carrierName = asString(payload.carrierName, 'Nakliyeci');
      return `${carrierName} tasimaniz icin teklif verdi.`;
    },
    buildDedupeKey: (payload) => `customer:offer_received:${asString(payload.offerId, asString(payload.entityId))}`,
  },
  'customer.shipment_in_transit': {
    type: 'customer.shipment_in_transit',
    recipientRole: NotificationRecipientRole.CUSTOMER,
    severity: NotificationSeverity.HIGH,
    entityType: 'shipment',
    metadataWhitelist: ['carrierId', 'shipmentStatus'],
    buildTitle: () => 'Tasimaniz basladi',
    buildBody: () => 'Nakliyeci tasimanizi baslatti. Teslimati takip edebilirsiniz.',
    buildDedupeKey: (payload) => `customer:shipment_in_transit:${asString(payload.entityId)}`,
  },
  'customer.shipment_completed': {
    type: 'customer.shipment_completed',
    recipientRole: NotificationRecipientRole.CUSTOMER,
    severity: NotificationSeverity.HIGH,
    entityType: 'shipment',
    metadataWhitelist: ['carrierId', 'shipmentStatus', 'reviewSuggested'],
    buildTitle: () => 'Tasimaniz tamamlandi',
    buildBody: () => 'Esyalariniz teslim edildi. Lutfen nakliyeciyi degerlendirin.',
    buildDedupeKey: (payload) => `customer:shipment_completed:${asString(payload.entityId)}`,
  },
  'carrier.offer_accepted': {
    type: 'carrier.offer_accepted',
    recipientRole: NotificationRecipientRole.CARRIER,
    severity: NotificationSeverity.HIGH,
    entityType: 'shipment',
    metadataWhitelist: ['offerId', 'customerId', 'acceptedPrice'],
    buildTitle: () => 'Teklifiniz kabul edildi',
    buildBody: () => 'Musteri teklifinizi kabul etti. Tasimaya hazirlanin.',
    buildDedupeKey: (payload) => `carrier:offer_accepted:${asString(payload.offerId, asString(payload.entityId))}`,
  },
  'carrier.profile_approved': {
    type: 'carrier.profile_approved',
    recipientRole: NotificationRecipientRole.CARRIER,
    severity: NotificationSeverity.HIGH,
    entityType: 'carrier',
    metadataWhitelist: ['approvalVersion', 'reviewedByAdminId'],
    buildTitle: () => 'Profiliniz onaylandi',
    buildBody: () => 'Basvurunuz onaylandi. Artik aktif olarak teklif verebilirsiniz.',
    buildDedupeKey: (payload) => {
      const approvalVersion = asNumber(payload.approvalVersion);
      return `carrier:profile_approved:${asString(payload.entityId)}:${approvalVersion ?? 'v0'}`;
    },
  },
  'admin.carrier_submitted_for_approval': {
    type: 'admin.carrier_submitted_for_approval',
    recipientRole: NotificationRecipientRole.ADMIN,
    severity: NotificationSeverity.HIGH,
    entityType: 'carrier',
    metadataWhitelist: ['companyName', 'approvalVersion', 'resubmissionCount'],
    buildTitle: () => 'Yeni onay basvurusu',
    buildBody: (payload) => {
      const companyName = asString(payload.companyName, 'Tasiyici');
      return `${companyName} inceleme icin gonderildi.`;
    },
    buildDedupeKey: (payload) => {
      const approvalVersion = asNumber(payload.approvalVersion);
      return `admin:carrier_submitted_for_approval:${asString(payload.entityId)}:${approvalVersion ?? 'v0'}`;
    },
  },
  'admin.high_risk_contact_filter_log': {
    type: 'admin.high_risk_contact_filter_log',
    recipientRole: NotificationRecipientRole.ADMIN,
    severity: NotificationSeverity.HIGH,
    entityType: 'contact_filter_log',
    metadataWhitelist: [
      'contactFilterLogId',
      'actorType',
      'actorId',
      'surface',
      'action',
      'severity',
      'riskScore',
      'reasons',
    ],
    buildTitle: () => 'Yuksek riskli iletisim denemesi',
    buildBody: () => 'Platform disi iletisim denemesi tespit edildi.',
    buildDedupeKey: (payload) => {
      const contactFilterLogId = asString(payload.contactFilterLogId, asString(payload.entityId));
      const dedupeScope = asString(payload.dedupeScope);
      return `admin:high_risk_contact_filter_log:${contactFilterLogId}${dedupeScope ? `:${dedupeScope}` : ''}`;
    },
  },
  'admin.repeated_contact_violation': {
    type: 'admin.repeated_contact_violation',
    recipientRole: NotificationRecipientRole.ADMIN,
    severity: NotificationSeverity.HIGH,
    entityType: 'actor',
    metadataWhitelist: ['actorType', 'actorId', 'windowDays', 'violationCount', 'latestViolationAt'],
    buildTitle: () => 'Tekrarlayan iletisim ihlali',
    buildBody: () => 'Bir kullanici kisa sure icinde birden fazla platform disi iletisim denemesi yapti.',
    buildDedupeKey: (payload) => {
      const actorType = asString(payload.actorType);
      const actorId = asString(payload.actorId, asString(payload.entityId));
      const windowBucket = asString(payload.windowBucket, 'w0');
      const dedupeScope = asString(payload.dedupeScope);
      return `admin:repeated_contact_violation:${actorType}:${actorId}:${windowBucket}${dedupeScope ? `:${dedupeScope}` : ''}`;
    },
  },
};
