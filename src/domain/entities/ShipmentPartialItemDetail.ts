import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ServiceCategoryCode } from '../shipments/ShipmentV2Codes';
import { Shipment } from './Shipment';
import { ShipmentPartialItem } from './ShipmentPartialItem';

@Entity('shipment_partial_item_details')
export class ShipmentPartialItemDetail {
  @PrimaryColumn({
    name: 'shipment_id',
    type: 'varchar',
    length: 36,
  })
  shipmentId: string;

  @Column({
    name: 'service_category_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  serviceCategoryCode: ServiceCategoryCode;

  @ManyToOne(() => Shipment, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([
    { name: 'shipment_id', referencedColumnName: 'id' },
    {
      name: 'service_category_code',
      referencedColumnName: 'serviceCategoryCode',
    },
  ])
  shipment: Shipment;

  @OneToMany(
    () => ShipmentPartialItem,
    item => item.partialItemDetail,
  )
  items: ShipmentPartialItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
