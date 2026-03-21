import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Vehicle } from './Vehicle';
import { CarrierDocument } from './CarrierDocument';
import { CarrierEarnings } from './CarrierEarnings';
import { CarrierVehicleType } from './CarrierVehicleType';
import { CarrierProfileStatus } from './CarrierProfileStatus';
import { CarrierActivity } from './CarrierActivity';
import { CarrierSecuritySettings } from './CarrierSecuritySettings';
import { CarrierServiceType } from './CarrierServiceType';
import { CarrierScopeOfWork } from './CarrierScopeOfWork';

@Entity('carriers')
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  companyName: string;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: false })
  taxNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactName?: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ name: 'pictureUrl', type: 'longtext', nullable: true })
  pictureUrl?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  passwordHash: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  profileCompletion: number;

  @Column({ type: 'int', nullable: false })
  foundedYear: number;

  @Column({ type: 'boolean', default: false })
  hasUploadedDocuments: boolean;

  @Column({ type: 'boolean', default: false })
  verifiedByAdmin: boolean;

  @Column({ type: 'int', default: 0 })
  documentCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  completedShipments: number;

  @Column({ type: 'int', default: 0 })
  cancelledShipments: number;

  @Column({ type: 'int', default: 0 })
  totalOffers: number;

  @Column({ type: 'float', default: 0 })
  successRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastLogin?: Date;

  // İlişkiler
  @OneToMany(() => Vehicle, vehicle => vehicle.carrier)
  vehicles: Vehicle[];

  @OneToMany(() => CarrierVehicleType, link => link.carrier)
  vehicleTypeLinks: CarrierVehicleType[];

  @OneToMany(() => CarrierServiceType, link => link.carrier)
  serviceTypeLinks: CarrierServiceType[];

  @OneToMany(() => CarrierScopeOfWork, link => link.carrier)
  scopeLinks: CarrierScopeOfWork[];

  @OneToMany(() => CarrierDocument, doc => doc.carrier)
  documents: CarrierDocument[];

  @OneToOne(() => CarrierEarnings, earnings => earnings.carrier)
  earnings: CarrierEarnings;

  @OneToOne(() => CarrierProfileStatus, status => status.carrier)
  profileStatus: CarrierProfileStatus;

  @OneToOne(() => CarrierActivity, activity => activity.carrier)
  activity: CarrierActivity;

  @OneToOne(() => CarrierSecuritySettings, security => security.carrier)
  securitySettings: CarrierSecuritySettings;
}