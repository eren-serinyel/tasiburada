import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';
import { VehicleType } from './VehicleType';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  vehicleTypeId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: false })
  capacityKg: number; // Taşıma kapasitesi (kg)

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  capacityM3: number; // Hacim kapasitesi (m3)

  @Column({ type: 'varchar', length: 20, nullable: true })
  licensePlate?: string; // Plaka (opsiyonel hızlı kayıt için)

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string; // Marka

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string; // Model

  @Column({ type: 'int', nullable: true })
  year: number; // Üretim yılı

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  hasInsurance: boolean;

  @Column({ type: 'date', nullable: true })
  insuranceExpiry: Date;

  @Column({ type: 'boolean', default: false })
  hasTrackingDevice: boolean; // GPS takip cihazı var mı

  // Foreign Key
  @Column({ type: 'uuid', nullable: false })
  carrierId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // İlişkiler
  @ManyToOne(() => Carrier, carrier => carrier.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;

  @ManyToOne(() => VehicleType, vt => vt.vehicles, { eager: true })
  @JoinColumn({ name: 'vehicleTypeId' })
  vehicleType: VehicleType;

  // Helper methods
  get vehicleInfo(): string {
    if (this.brand && this.model && this.year) {
      return `${this.brand} ${this.model} (${this.year})`;
    }
    const vt = this.vehicleType?.name || 'Araç';
    return `${vt} - ${this.licensePlate || 'Plaka Yok'}`;
  }

  get isInsuranceValid(): boolean {
    if (!this.hasInsurance || !this.insuranceExpiry) return false;
    return new Date(this.insuranceExpiry) > new Date();
  }
}