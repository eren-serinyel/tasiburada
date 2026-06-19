import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Carrier } from './Carrier';
import { ExtraServiceLoadType } from './ExtraServiceLoadType';

export enum CarrierCustomExtraServicePriceMode {
  NONE = 'NONE',
  FIXED = 'FIXED',
  QUOTE = 'QUOTE',
}

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => value == null ? value : Number(value),
};

@Entity('carrier_custom_extra_services')
@Index('IDX_carrier_custom_extra_services_scope', ['carrierId', 'loadType'])
export class CarrierCustomExtraService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'carrier_id', type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.customExtraServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrier_id' })
  carrier: Carrier;

  @Column({ name: 'load_type', type: 'enum', enum: ExtraServiceLoadType })
  loadType: ExtraServiceLoadType;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 700, nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'price_mode', type: 'enum', enum: CarrierCustomExtraServicePriceMode, default: CarrierCustomExtraServicePriceMode.QUOTE })
  priceMode: CarrierCustomExtraServicePriceMode;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
  basePrice: number | null;

  @Column({ name: 'quote_min_price', type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
  quoteMinPrice: number | null;

  @Column({ name: 'quote_max_price', type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
  quoteMaxPrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
