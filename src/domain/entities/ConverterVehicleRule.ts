import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value == null ? null : Number(value)),
};

@Entity('converter_vehicle_rules')
export class ConverterVehicleRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_converter_vehicle_code', { unique: true })
  @Column({ name: 'vehicle_code', type: 'varchar', length: 100 })
  vehicleCode: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({
    name: 'volume_min',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  volumeMin: number;

  @Column({
    name: 'volume_max',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  volumeMax: number;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'special_item_override', type: 'boolean', default: true })
  specialItemOverride: boolean;

  @Column({ name: 'near_threshold_override', type: 'boolean', default: true })
  nearThresholdOverride: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
