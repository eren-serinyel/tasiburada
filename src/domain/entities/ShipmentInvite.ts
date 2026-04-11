import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { Shipment } from './Shipment';
import { Carrier } from './Carrier';

@Entity('shipment_invites')
export class ShipmentInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  shipmentId: string;

  @Column({ type: 'char', length: 36 })
  carrierId: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  })
  status: 'pending' | 'accepted' | 'declined' | 'expired';

  @ManyToOne(() => Shipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipmentId' })
  shipment: Shipment;

  @ManyToOne(() => Carrier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;

  @CreateDateColumn()
  createdAt: Date;
}
