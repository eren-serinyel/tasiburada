import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

@Entity('carrier_security_settings')
@Unique(['carrierId'])
export class CarrierSecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
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
