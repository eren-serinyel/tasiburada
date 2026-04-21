import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ContactFilterSurface {
  SHIPMENT_LOAD_DETAILS = 'shipment_load_details',
  SHIPMENT_NOTE = 'shipment_note',
  OFFER_MESSAGE = 'offer_message',
  PLATFORM_MESSAGE = 'platform_message',
}

export enum ContactFilterAction {
  BLOCKED = 'blocked',
  FLAGGED = 'flagged',
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

  @Column({ type: 'enum', enum: ContactFilterAction })
  action: ContactFilterAction;

  @Column({ type: 'json' })
  matchedRules: string[];

  @Column({ type: 'varchar', length: 64 })
  textHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
