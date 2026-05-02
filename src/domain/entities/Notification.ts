import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationRecipientRole {
  CUSTOMER = 'customer',
  CARRIER = 'carrier',
  ADMIN = 'admin',
}

export enum NotificationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

@Entity('notifications')
@Index('idx_notifications_recipient_scope_created', ['recipientRole', 'recipientUserId', 'createdAt'])
@Index('idx_notifications_recipient_status', ['recipientRole', 'recipientUserId', 'status'])
@Index('idx_notifications_entity', ['entityType', 'entityId'])
@Index('idx_notifications_type_created', ['type', 'createdAt'])
@Index('uniq_notifications_dedupe_key', ['dedupeKey'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  userType: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', nullable: true })
  relatedId?: string | null;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', nullable: true })
  recipientUserId?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recipientRole?: NotificationRecipientRole | null;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  entityType?: string | null;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', nullable: true })
  entityId?: string | null;

  @Column({ type: 'varchar', length: 10, default: NotificationSeverity.MEDIUM })
  severity: NotificationSeverity;

  @Column({ type: 'varchar', length: 20, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  readAt?: Date | null;

  @Column({ type: 'json', nullable: true })
  metadataJson?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  dedupeKey?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
