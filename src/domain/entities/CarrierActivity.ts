import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';

@Entity('carrier_activity')
@Unique(['carrierId'])
export class CarrierActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ type: 'varchar', length: 120 })
  city: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  district?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'json', name: 'serviceAreasJson', nullable: true })
  serviceAreasJson?: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Carrier, carrier => carrier.activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
