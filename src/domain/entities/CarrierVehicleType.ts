import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';
import { VehicleType } from './VehicleType';

@Entity('carrier_vehicle_types')
@Unique(['carrierId', 'vehicleTypeId'])
export class CarrierVehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @Column({ type: 'uuid' })
  vehicleTypeId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacityKg?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Carrier, carrier => carrier.vehicleTypeLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;

  @ManyToOne(() => VehicleType, vehicleType => vehicleType.carrierLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleTypeId' })
  vehicleType: VehicleType;
}
