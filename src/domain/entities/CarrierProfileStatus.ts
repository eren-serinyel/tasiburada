import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

export type CoreCarrierProfileSection = 'company' | 'activity' | 'documents' | 'earnings';
export type AuxiliaryCarrierProfileSection = 'vehicles' | 'security' | 'notifications';
export type CarrierProfileSection = CoreCarrierProfileSection | AuxiliaryCarrierProfileSection;

@Entity('carrier_profile_status')
@Unique(['carrierId'])
export class CarrierProfileStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ type: 'boolean', default: false })
  companyInfoCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  activityInfoCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  vehiclesCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  documentsCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  earningsCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  securityCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  notificationsCompleted: boolean;

  @Column({ type: 'int', default: 0 })
  overallPercentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Carrier, carrier => carrier.profileStatus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
