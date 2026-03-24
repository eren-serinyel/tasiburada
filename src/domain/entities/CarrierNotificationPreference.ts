import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

@Entity('carrier_notification_preferences')
@Unique(['carrierId'])
export class CarrierNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  /**
   * JSON array of notification preference entries.
   * Each entry: { notificationKey: string, channels: { email: boolean, sms: boolean, push: boolean } }
   */
  @Column({ type: 'json' })
  preferences: Array<{
    notificationKey: string;
    channels: Record<string, boolean>;
  }>;

  @Column({ type: 'boolean', default: false })
  quietMode: boolean;

  @Column({ type: 'boolean', default: true })
  dailySummary: boolean;

  @Column({ type: 'int', default: 5 })
  smsDailyLimit: number;

  @Column({ type: 'varchar', length: 5, default: '09:00' })
  timeWindowStart: string;

  @Column({ type: 'varchar', length: 5, default: '20:00' })
  timeWindowEnd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Carrier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
