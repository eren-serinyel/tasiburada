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
import { ExtraService } from './ExtraService';
import { ExtraServiceLoadType } from './ExtraServiceLoadType';

export enum CarrierExtraServicePriceMode {
  NONE = 'NONE',
  FIXED = 'FIXED',
  QUOTE = 'QUOTE',
}

@Entity('carrier_extra_service_capabilities')
@Index('UQ_carrier_extra_service_capabilities_scope', ['carrierId', 'extraServiceId', 'loadType'], { unique: true })
export class CarrierExtraServiceCapability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'carrier_id', type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.extraServiceCapabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrier_id' })
  carrier: Carrier;

  @Column({ name: 'extra_service_id', type: 'varchar', length: 36 })
  extraServiceId: string;

  @ManyToOne(() => ExtraService, (extraService) => extraService.carrierCapabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extra_service_id' })
  extraService: ExtraService;

  @Column({ name: 'load_type', type: 'enum', enum: ExtraServiceLoadType })
  loadType: ExtraServiceLoadType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'price_mode', type: 'enum', enum: CarrierExtraServicePriceMode, nullable: true })
  priceMode: CarrierExtraServicePriceMode | null;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}