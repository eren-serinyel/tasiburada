import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './Customer';
import { Shipment } from './Shipment';

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shipmentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  offerId?: string | null;

  @Column()
  customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  carrierId?: string | null;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  platformFee: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  carrierAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'varchar', length: 40, default: 'manual' })
  provider: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CREDIT_CARD })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Shipment, { nullable: true })
  @JoinColumn({ name: 'shipmentId' })
  shipment: Shipment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date | null;
}
