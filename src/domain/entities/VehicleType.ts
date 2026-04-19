import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CarrierVehicleType } from './CarrierVehicleType';
import { CarrierVehicle } from './CarrierVehicle';

@Entity('vehicle_types')
export class VehicleType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'int' })
  defaultCapacityKg: number;

  @Column({ type: 'int' })
  defaultCapacityM3: number;

  @Column({ name: 'status', type: 'enum', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'capacity_kg', type: 'int', nullable: true })
  capacityKg: number | null;

  @OneToMany(() => CarrierVehicleType, link => link.vehicleType)
  carrierLinks: CarrierVehicleType[];

  @OneToMany(() => CarrierVehicle, cv => cv.vehicleType)
  carrierVehicles: CarrierVehicle[];
}
