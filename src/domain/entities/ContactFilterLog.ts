import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ContactFilterSurface {
  SHIPMENT_LOAD_DETAILS = 'shipment_load_details',
  SHIPMENT_NOTE = 'shipment_note',
  OFFER_MESSAGE = 'offer_message',
  PLATFORM_MESSAGE = 'platform_message',
  REVIEW_COMMENT = 'review_comment',
}

export enum ContactFilterAction {
  BLOCKED = 'blocked',
  FLAGGED = 'flagged',
}

export enum ContactFilterSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ContactFilterReviewStatus {
  UNREVIEWED = 'unreviewed',
  FALSE_POSITIVE = 'false_positive',
  CONFIRMED = 'confirmed',
  IGNORED = 'ignored',
}

@Entity('contact_filter_logs')
export class ContactFilterLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  actorType: 'customer' | 'carrier' | 'admin' | 'system';

  @Column({ type: 'char', length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: 'enum', enum: ContactFilterSurface })
  surface: ContactFilterSurface;

  @Column({ type: 'char', length: 36, nullable: true })
  shipmentId: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  offerId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  entityId: string | null;

  @Column({ type: 'enum', enum: ContactFilterAction })
  action: ContactFilterAction;

  @Column({ type: 'enum', enum: ContactFilterSeverity, default: ContactFilterSeverity.MEDIUM })
  severity: ContactFilterSeverity;

  @Column({ type: 'int', default: 0 })
  riskScore: number;

  @Column({ type: 'enum', enum: ContactFilterReviewStatus, default: ContactFilterReviewStatus.UNREVIEWED })
  reviewStatus: ContactFilterReviewStatus;

  @Column({ type: 'json' })
  matchedRules: string[];

  @Column({ type: 'varchar', length: 64 })
  textHash: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  normalizedHash: string | null;

  @Column({ type: 'json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
