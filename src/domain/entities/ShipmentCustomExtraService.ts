import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Shipment } from './Shipment';
import { CarrierCustomExtraService } from './CarrierCustomExtraService';

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => value == null ? null : Number(value),
};

@Entity('shipment_custom_extra_services')
export class ShipmentCustomExtraService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'varchar', length: 36 })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.customExtraServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'custom_extra_service_id', type: 'varchar', length: 36, nullable: true })
  customExtraServiceId: string | null;

  @ManyToOne(() => CarrierCustomExtraService, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'custom_extra_service_id' })
  customExtraService: CarrierCustomExtraService | null;

  @Column({ name: 'carrier_id', type: 'char', length: 36, nullable: true })
  carrierId: string | null;

  @Column({ name: 'name_snapshot', type: 'varchar', length: 255, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  nameSnapshot: string;

  @Column({
    name: 'price_snapshot',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  priceSnapshot: number | null;
}
