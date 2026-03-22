import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';
import { ServiceType } from './ServiceType';

@Entity('carrier_service_types')
@Unique(['carrierId', 'serviceTypeId'])
export class CarrierServiceType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @Column({ type: 'uuid' })
  serviceTypeId: string;

  @ManyToOne(() => Carrier, carrier => carrier.serviceTypeLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;

  @ManyToOne(() => ServiceType, serviceType => serviceType.carrierLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceTypeId' })
  serviceType: ServiceType;
}
