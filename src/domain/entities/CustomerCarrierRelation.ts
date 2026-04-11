import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { Customer } from './Customer';
import { Carrier } from './Carrier';

@Entity('customer_carrier_relations')
@Unique(['customerId', 'carrierId'])
export class CustomerCarrierRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 36 })
  customerId: string;

  @Column({ type: 'char', length: 36 })
  carrierId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => Carrier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;

  /** İlk tamamlanan iş */
  @Column({ type: 'char', length: 36, nullable: true })
  firstShipmentId: string | null;

  /** Son tamamlanan iş */
  @Column({ type: 'char', length: 36, nullable: true })
  lastShipmentId: string | null;

  /** Toplam birlikte tamamlanan iş */
  @Column({ default: 0 })
  completedJobsCount: number;

  /** Müşteri bu firmayı kayıtlı firmalara ekledi mi */
  @Column({ default: false })
  isSaved: boolean;

  /** Tekrar davet gönderilebilir mi */
  @Column({ default: true })
  canInviteAgain: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
