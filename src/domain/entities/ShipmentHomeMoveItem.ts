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
  HomeSpecialItemTypeCode,
} from '../shipments/ShipmentCategoryDetailCodes';
import {
  isValidCategoryItemLabel,
} from '../shipments/ShipmentCategoryDetailCodes';
import { ShipmentHomeMoveDetail } from './ShipmentHomeMoveDetail';

@Entity('shipment_home_move_items')
export class ShipmentHomeMoveItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'shipment_id',
    type: 'varchar',
    length: 36,
  })
  shipmentId: string;

  @ManyToOne(
    () => ShipmentHomeMoveDetail,
    detail => detail.items,
    {
      onDelete: 'CASCADE',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'shipment_id' })
  homeMoveDetail: ShipmentHomeMoveDetail;

  @Column({
    name: 'item_type_code',
    type: 'varchar',
    length: 48,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  itemTypeCode: HomeSpecialItemTypeCode;

  @Column({ type: 'smallint', unsigned: true })
  quantity: number;

  @Column({
    name: 'custom_label',
    type: 'varchar',
    length: 120,
    nullable: true,
    select: false,
  })
  customLabel: string | null;

  @BeforeInsert()
  @BeforeUpdate()
  validateCustomLabel(): void {
    if (
      !isValidCategoryItemLabel(
        this.itemTypeCode,
        this.customLabel,
      )
    ) {
      throw new Error(
        'Shipment home item custom label is invalid',
      );
    }
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
