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

@Entity('carrier_load_type_capabilities')
@Index('UQ_carrier_load_type_capabilities_carrier_load_type', ['carrierId', 'loadType'], { unique: true })
export class CarrierLoadTypeCapability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'carrier_id', type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @ManyToOne(() => Carrier, (carrier) => carrier.loadTypeCapabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrier_id' })
  carrier: Carrier;

  @Column({ name: 'load_type', type: 'enum', enum: ExtraServiceLoadType })
  loadType: ExtraServiceLoadType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}