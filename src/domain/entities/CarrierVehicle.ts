import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Carrier } from './Carrier';
import { VehicleType } from './VehicleType';

@Entity('carrier_vehicles')
export class CarrierVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'carrier_id', type: 'varchar', length: 36 })
  carrierId: string;

  @ManyToOne(() => Carrier, carrier => carrier.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrier_id' })
  carrier: Carrier;

  @Column({ name: 'vehicle_type_id', type: 'varchar', length: 36 })
  vehicleTypeId: string;

  @ManyToOne(() => VehicleType, vt => vt.carrierVehicles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_type_id' })
  vehicleType: VehicleType;

  @Column({ name: 'brand', type: 'varchar', length: 50, nullable: true })
  brand: string | null;

  @Column({ name: 'model', type: 'varchar', length: 50, nullable: true })
  model: string | null;

  @Column({ name: 'year', type: 'int', nullable: true })
  year: number | null;

  @Column({ name: 'plate', type: 'varchar', length: 20, nullable: true })
  plate: string | null;

  @Column({ name: 'capacity_kg', type: 'int', nullable: false })
  capacityKg: number;

  @Column({ name: 'capacity_m3', type: 'decimal', precision: 5, scale: 1, nullable: true })
  capacityM3: number | null;

  @Column({ name: 'photo_urls', type: 'json', nullable: true })
  photos: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
