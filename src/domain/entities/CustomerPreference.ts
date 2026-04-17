import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Customer } from './Customer';

export enum DefaultOfferSort {
  PRICE_ASC = 'PRICE_ASC',
  RATING_DESC = 'RATING_DESC',
  BALANCED = 'BALANCED'
}

@Entity('customer_preferences')
export class CustomerPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', unique: true })
  customerId: string;

  @OneToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'prefer_verified_carriers', type: 'boolean', default: false })
  preferVerifiedCarriers: boolean;

  @Column({ name: 'default_offer_sort', type: 'enum', enum: DefaultOfferSort, default: DefaultOfferSort.PRICE_ASC })
  defaultOfferSort: DefaultOfferSort;

  @Column({ name: 'reuse_saved_addresses', type: 'boolean', default: true })
  reuseSavedAddresses: boolean;

  @Column({ name: 'show_guided_tips', type: 'boolean', default: true })
  showGuidedTips: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
