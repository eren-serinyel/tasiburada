import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Shipment } from './Shipment';
import { ConverterAnswer } from './ConverterAnswer';
import { ConverterResult } from './ConverterResult';

export enum ConverterFlowType {
  HOUSEHOLD = 'household',
}

export enum ConverterSessionStatus {
  DRAFT = 'draft',
  ESTIMATED = 'estimated',
  APPLIED = 'applied',
}

@Entity('converter_sessions')
export class ConverterSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId: string | null;

  @Column({ name: 'shipment_id', type: 'varchar', length: 36, nullable: true })
  shipmentId: string | null;

  @ManyToOne(() => Shipment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment | null;

  @Column({ name: 'flow_type', type: 'enum', enum: ConverterFlowType, default: ConverterFlowType.HOUSEHOLD })
  flowType: ConverterFlowType;

  @Column({ type: 'enum', enum: ConverterSessionStatus, default: ConverterSessionStatus.DRAFT })
  status: ConverterSessionStatus;

  @OneToOne(() => ConverterAnswer, (answer) => answer.session)
  answer: ConverterAnswer;

  @OneToOne(() => ConverterResult, (result) => result.session)
  result: ConverterResult;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
