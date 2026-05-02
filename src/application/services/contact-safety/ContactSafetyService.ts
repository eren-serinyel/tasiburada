import { createHash } from 'crypto';
import {
  ContactFilterAction,
  ContactFilterLog,
  ContactFilterReviewStatus,
  ContactFilterSeverity,
  ContactFilterSurface,
} from '../../../domain/entities/ContactFilterLog';
import { AppDataSource } from '../../../infrastructure/database/data-source';
import { ContactRule, analyzeContactInfo } from '../../../utils/security';

export type ContactSafetyActorType = 'customer' | 'carrier' | 'admin' | 'system';
export type ContactSafetyPolicy = 'block' | 'flag' | 'log_only';

export type ContactSafetyInput = {
  actorType: ContactSafetyActorType;
  actorId?: string | null;
  surface: ContactFilterSurface;
  entityType?: string | null;
  entityId?: string | null;
  shipmentId?: string | null;
  offerId?: string | null;
  text?: string | null;
  policy: ContactSafetyPolicy;
  metadata?: Record<string, unknown> | null;
};

export type ContactSafetyResult = {
  isViolation: boolean;
  matchedRules: ContactRule[];
  severity: ContactFilterSeverity;
  riskScore: number;
  action: ContactFilterAction;
  userMessage: string;
};

const HARD_BLOCK_MESSAGE =
  'Guvenliginiz icin telefon, e-posta, link veya platform disi iletisim yonlendirmesi paylasilamaz.';

const SOFT_WARNING_MESSAGE =
  'Mesajiniz platform disi iletisim cagrisimi iceriyor olabilir. Lutfen iletisimi platform icinde tutun.';

export class ContactSafetyService {
  analyze(text?: string | null): ContactSafetyResult {
    const analysis = analyzeContactInfo(text ?? '');
    if (!analysis.hasContactInfo) {
      return {
        isViolation: false,
        matchedRules: [],
        severity: ContactFilterSeverity.LOW,
        riskScore: 0,
        action: ContactFilterAction.FLAGGED,
        userMessage: '',
      };
    }

    const matchedRules = analysis.rules;
    const hasHighConfidence = matchedRules.some((rule) =>
      rule === 'phone' || rule === 'email' || rule === 'url',
    );
    const hasMediumConfidence = matchedRules.some((rule) =>
      rule === 'messaging_app_keyword' || rule === 'direct_contact_keyword' || rule === 'turkish_digit_words',
    );

    let severity = ContactFilterSeverity.LOW;
    if (hasHighConfidence) {
      severity = ContactFilterSeverity.HIGH;
    } else if (hasMediumConfidence) {
      severity = ContactFilterSeverity.MEDIUM;
    }

    const riskScore =
      severity === ContactFilterSeverity.HIGH
        ? 85
        : severity === ContactFilterSeverity.MEDIUM
          ? 60
          : 30;

    return {
      isViolation: true,
      matchedRules,
      severity,
      riskScore,
      action: ContactFilterAction.BLOCKED,
      userMessage: this.buildUserMessage('block', severity),
    };
  }

  async enforce(input: ContactSafetyInput): Promise<ContactSafetyResult> {
    const result = this.analyze(input.text);
    if (!result.isViolation) return result;

    const action = input.policy === 'block' ? ContactFilterAction.BLOCKED : ContactFilterAction.FLAGGED;

    await this.writeLog({
      ...input,
      action,
      severity: result.severity,
      riskScore: result.riskScore,
      matchedRules: result.matchedRules,
    });

    return {
      ...result,
      action,
      userMessage: this.buildUserMessage(input.policy, result.severity),
    };
  }

  async flag(input: Omit<ContactSafetyInput, 'policy'>): Promise<ContactSafetyResult> {
    return this.enforce({ ...input, policy: 'flag' });
  }

  buildUserMessage(policy: ContactSafetyPolicy, severity: ContactFilterSeverity): string {
    if (policy === 'block') return HARD_BLOCK_MESSAGE;
    if (severity === ContactFilterSeverity.HIGH) return HARD_BLOCK_MESSAGE;
    return SOFT_WARNING_MESSAGE;
  }

  private async writeLog(input: {
    actorType: ContactSafetyActorType;
    actorId?: string | null;
    surface: ContactFilterSurface;
    entityType?: string | null;
    entityId?: string | null;
    shipmentId?: string | null;
    offerId?: string | null;
    text?: string | null;
    action: ContactFilterAction;
    severity: ContactFilterSeverity;
    riskScore: number;
    matchedRules: ContactRule[];
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const text = input.text ?? '';
      const analysis = analyzeContactInfo(text);
      const textHash = createHash('sha256').update(text).digest('hex');
      const normalizedHash = createHash('sha256').update(analysis.normalizedText ?? '').digest('hex');

      const repo = AppDataSource.getRepository(ContactFilterLog);
      const log = repo.create({
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        surface: input.surface,
        shipmentId: input.shipmentId ?? null,
        offerId: input.offerId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        action: input.action,
        severity: input.severity,
        riskScore: input.riskScore,
        reviewStatus: ContactFilterReviewStatus.UNREVIEWED,
        matchedRules: input.matchedRules,
        textHash,
        normalizedHash,
        metadataJson: input.metadata ?? null,
      });
      await repo.save(log);
    } catch (err) {
      console.error('[ContactSafetyService] contact filter log failed:', err);
    }
  }
}
