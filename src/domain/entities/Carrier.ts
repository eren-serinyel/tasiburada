import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { CarrierDocument } from './CarrierDocument';
import { CarrierEarnings } from './CarrierEarnings';
import { CarrierVehicle } from './CarrierVehicle';
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

  @Column({ type: 'varchar', length: 500, nullable: true })
  addressLine1?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  activityCity?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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

  @Column({ type: 'text', nullable: true })
  availableDates?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastLogin?: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  resetToken?: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetTokenExpiry?: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  verificationToken?: string | null;

  // İlişkiler
  @OneToMany(() => CarrierVehicleType, link => link.carrier)
  vehicleTypeLinks: CarrierVehicleType[];

  @OneToMany(() => CarrierVehicle, vehicle => vehicle.carrier)
  carrierVehicles: CarrierVehicle[];

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
