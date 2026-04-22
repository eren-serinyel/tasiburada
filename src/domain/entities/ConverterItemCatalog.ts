import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value == null ? null : Number(value)),
};

@Entity('converter_item_catalog')
export class ConverterItemCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_converter_item_code', { unique: true })
  @Column({ name: 'item_code', type: 'varchar', length: 100 })
  itemCode: string;

  @Column({ type: 'varchar', length: 150 })
  label: string;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({
    name: 'unit_volume_min',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  unitVolumeMin: number;

  @Column({
    name: 'unit_volume_max',
    type: 'decimal',
    precision: 7,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  unitVolumeMax: number;

  @Column({ name: 'is_special', type: 'boolean', default: false })
  isSpecial: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
