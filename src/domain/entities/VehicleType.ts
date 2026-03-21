import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Vehicle } from './Vehicle';
import { CarrierVehicleType } from './CarrierVehicleType';

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

  @OneToMany(() => Vehicle, v => v.vehicleType)
  vehicles: Vehicle[];

  @OneToMany(() => CarrierVehicleType, link => link.vehicleType)
  carrierLinks: CarrierVehicleType[];
}
