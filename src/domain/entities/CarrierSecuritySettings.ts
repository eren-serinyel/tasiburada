import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

@Entity('carrier_security_settings')
@Unique(['carrierId'])
export class CarrierSecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  suspiciousLoginAlertsEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Carrier, carrier => carrier.securitySettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
