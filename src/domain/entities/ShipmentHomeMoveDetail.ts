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
import type {
  BoxCountBandCode,
  HouseholdDensityCode,
  ResidenceTypeCode,
  RoomLayoutCode,
} from '../shipments/ShipmentCategoryDetailCodes';
import { Shipment } from './Shipment';
import { ShipmentHomeMoveItem } from './ShipmentHomeMoveItem';

@Entity('shipment_home_move_details')
export class ShipmentHomeMoveDetail {
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

  @Column({
    name: 'residence_type_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  residenceTypeCode: ResidenceTypeCode | null;

  @Column({
    name: 'room_layout_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  roomLayoutCode: RoomLayoutCode | null;

  @Column({
    name: 'household_density_code',
    type: 'varchar',
    length: 48,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  householdDensityCode: HouseholdDensityCode | null;

  @Column({
    name: 'box_count_band_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  boxCountBandCode: BoxCountBandCode | null;

  @OneToMany(
    () => ShipmentHomeMoveItem,
    item => item.homeMoveDetail,
  )
  items: ShipmentHomeMoveItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
