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
import { CarrierLoadTypeCapability } from './CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from './CarrierExtraServiceCapability';
import { CarrierCustomExtraService } from './CarrierCustomExtraService';

export enum CarrierApprovalState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

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

  @Column({ name: 'pending_approval', type: 'boolean', default: false })
  pendingApproval: boolean;

  @Column({
    name: 'approval_state',
    type: 'enum',
    enum: CarrierApprovalState,
    default: CarrierApprovalState.DRAFT,
  })
  approvalState: CarrierApprovalState;

  @Column({ name: 'approval_version', type: 'int', default: 0 })
  approvalVersion: number;

  @Column({ name: 'resubmission_count', type: 'int', default: 0 })
  resubmissionCount: number;

  @Column({ name: 'last_rejected_at', type: 'datetime', nullable: true })
  lastRejectedAt: Date | null;

  @Column({ name: 'last_submitted_at', type: 'datetime', nullable: true })
  lastSubmittedAt: Date | null;

  @Column({ name: 'review_lock_admin_id', type: 'varchar', length: 36, nullable: true })
  reviewLockAdminId: string | null;

  @Column({ name: 'review_lock_expires_at', type: 'datetime', nullable: true })
  reviewLockExpiresAt: Date | null;

  @Column({ name: 'review_session_id', type: 'varchar', length: 36, nullable: true })
  reviewSessionId: string | null;

  @Column({ name: 'approval_readiness_cached', type: 'boolean', default: false })
  approvalReadinessCached: boolean;

  @Column({ name: 'approval_readiness_computed_at', type: 'datetime', nullable: true })
  approvalReadinessComputedAt: Date | null;

  @Column({ name: 'draft_revision', type: 'int', default: 0 })
  draftRevision: number;

  @Column({ name: 'last_reviewed_draft_revision', type: 'int', default: 0 })
  lastReviewedDraftRevision: number;

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

  @Column({ type: 'int', default: 0 })
  acceptedOffers: number;

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

  @OneToMany(() => CarrierLoadTypeCapability, capability => capability.carrier)
  loadTypeCapabilities: CarrierLoadTypeCapability[];

  @OneToMany(() => CarrierExtraServiceCapability, capability => capability.carrier)
  extraServiceCapabilities: CarrierExtraServiceCapability[];

  @OneToMany(() => CarrierCustomExtraService, service => service.carrier)
  customExtraServices: CarrierCustomExtraService[];
}
