import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

export enum CarrierDocumentType {
  AUTHORIZATION_CERT = 'AUTHORIZATION_CERT',
  SRC_CERT = 'SRC_CERT',
  VEHICLE_LICENSE = 'VEHICLE_LICENSE',
  TAX_PLATE = 'TAX_PLATE',
  INSURANCE_POLICY = 'INSURANCE_POLICY'
}

export enum CarrierDocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

@Entity('carrier_documents')
export class CarrierDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @Column({ type: 'varchar', length: 120 })
  type: CarrierDocumentType;

  @Column({ type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ type: 'varchar', length: 32, default: CarrierDocumentStatus.PENDING })
  status: CarrierDocumentStatus;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'datetime', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' })
  uploadedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt: Date;

  @ManyToOne(() => Carrier, carrier => carrier.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
