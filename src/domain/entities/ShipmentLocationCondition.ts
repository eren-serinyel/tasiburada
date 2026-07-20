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
import type {
  ElevatorTypeCode,
  LocationSideCode,
  VehicleAccessDistanceCode,
} from '../shipments/ShipmentOperationalCodes';
import { Shipment } from './Shipment';

@Entity('shipment_location_conditions')
@Index(
  'UQ_shipment_location_conditions_shipment_side',
  ['shipmentId', 'sideCode'],
  { unique: true },
)
@Index(
  'IDX_shipment_location_conditions_shipment_id',
  ['shipmentId'],
)
export class ShipmentLocationCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'shipment_id',
    type: 'varchar',
    length: 36,
  })
  shipmentId: string;

  @ManyToOne(
    () => Shipment,
    shipment => shipment.locationConditions,
    {
      onDelete: 'CASCADE',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({
    name: 'side_code',
    type: 'varchar',
    length: 16,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  sideCode: LocationSideCode;

  @Column({
    name: 'floor_number',
    type: 'smallint',
    nullable: true,
  })
  floorNumber: number | null;

  @Column({
    name: 'elevator_type_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  elevatorTypeCode: ElevatorTypeCode | null;

  @Column({
    name: 'vehicle_access_distance_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  vehicleAccessDistanceCode:
    VehicleAccessDistanceCode | null;

  @Column({
    name: 'has_narrow_street',
    type: 'boolean',
    nullable: true,
  })
  hasNarrowStreet: boolean | null;

  @Column({
    name: 'has_site_entry_restriction',
    type: 'boolean',
    nullable: true,
  })
  hasSiteEntryRestriction: boolean | null;

  @Column({
    name: 'has_time_restriction',
    type: 'boolean',
    nullable: true,
  })
  hasTimeRestriction: boolean | null;

  @Column({
    name: 'restriction_note',
    type: 'varchar',
    length: 500,
    nullable: true,
    select: false,
  })
  restrictionNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
