import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  PartialItemTypeCode,
  PartialSizeClassCode,
} from '../shipments/ShipmentCategoryDetailCodes';
import {
  isValidCategoryItemLabel,
  isValidPartialItemMeasurements,
} from '../shipments/ShipmentCategoryDetailCodes';
import { ShipmentPartialItemDetail } from './ShipmentPartialItemDetail';

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (
    value: string | number | null | undefined,
  ): number | null =>
    value == null ? null : Number(value),
};

@Entity('shipment_partial_items')
export class ShipmentPartialItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'shipment_id',
    type: 'varchar',
    length: 36,
  })
  shipmentId: string;

  @ManyToOne(
    () => ShipmentPartialItemDetail,
    detail => detail.items,
    {
      onDelete: 'CASCADE',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'shipment_id' })
  partialItemDetail: ShipmentPartialItemDetail;

  @Column({
    name: 'item_type_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  itemTypeCode: PartialItemTypeCode;

  @Column({
    name: 'custom_label',
    type: 'varchar',
    length: 120,
    nullable: true,
    select: false,
  })
  customLabel: string | null;

  @Column({ type: 'smallint', unsigned: true })
  quantity: number;

  @Column({
    name: 'size_class_code',
    type: 'varchar',
    length: 40,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  sizeClassCode: PartialSizeClassCode;

  @Column({
    name: 'is_fragile',
    type: 'boolean',
    nullable: true,
  })
  isFragile: boolean | null;

  @Column({
    name: 'requires_disassembly',
    type: 'boolean',
    nullable: true,
  })
  requiresDisassembly: boolean | null;

  @Column({
    name: 'requires_installation',
    type: 'boolean',
    nullable: true,
  })
  requiresInstallation: boolean | null;

  @Column({
    name: 'requires_packaging',
    type: 'boolean',
    nullable: true,
  })
  requiresPackaging: boolean | null;

  @Column({
    name: 'width_cm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  widthCm: number | null;

  @Column({
    name: 'length_cm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  lengthCm: number | null;

  @Column({
    name: 'height_cm',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  heightCm: number | null;

  @Column({
    name: 'approximate_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  approximateWeightKg: number | null;

  @BeforeInsert()
  @BeforeUpdate()
  validateMutableFacts(): void {
    if (
      !isValidCategoryItemLabel(
        this.itemTypeCode,
        this.customLabel,
      )
    ) {
      throw new Error(
        'Shipment partial item custom label is invalid',
      );
    }
    if (
      !isValidPartialItemMeasurements(
        this.sizeClassCode,
        this.widthCm,
        this.lengthCm,
        this.heightCm,
      )
    ) {
      throw new Error(
        'Shipment partial item measurements are invalid',
      );
    }
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
