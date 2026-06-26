import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('messages')
@Index('IDX_messages_shipment_id', ['shipmentId'])
@Index('IDX_messages_sender', ['senderType', 'senderId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'varchar', length: 36 })
  shipmentId: string;

  @Column({ name: 'sender_type', type: 'enum', enum: ['customer', 'carrier'] })
  senderType: 'customer' | 'carrier';

  @Column({ name: 'sender_id', type: 'varchar', length: 36 })
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
