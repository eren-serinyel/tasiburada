import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ConverterSession } from './ConverterSession';

export enum ConverterMoveType {
  HOUSEHOLD = 'household',
  PARTIAL_LOAD = 'partial_load',
}

export enum ConverterPropertyType {
  STUDIO = 'studio',
  HOME_1_1 = '1+1',
  HOME_2_1 = '2+1',
  HOME_3_1 = '3+1',
  HOME_4_PLUS = '4+1_plus',
  UNKNOWN = 'unknown',
}

@Entity('converter_answers')
export class ConverterAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId: string;

  @OneToOne(() => ConverterSession, (session) => session.answer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ConverterSession;

  @Column({ name: 'move_type', type: 'enum', enum: ConverterMoveType })
  moveType: ConverterMoveType;

  @Column({ name: 'property_type', type: 'enum', enum: ConverterPropertyType })
  propertyType: ConverterPropertyType;

  @Column({ name: 'origin_floor', type: 'smallint', nullable: true })
  originFloor: number | null;

  @Column({ name: 'destination_floor', type: 'smallint', nullable: true })
  destinationFloor: number | null;

  @Column({ name: 'building_elevator', type: 'boolean', nullable: true })
  buildingElevator: boolean | null;

  @Column({ name: 'external_lift', type: 'boolean', nullable: true })
  externalLift: boolean | null;

  @Column({ name: 'special_items_json', type: 'json', nullable: true })
  specialItemsJson: string[] | null;

  @Column({ name: 'raw_answers_json', type: 'json', nullable: true })
  rawAnswersJson: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
