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

const decimalToNumberTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) => (value == null ? null : Number(value)),
};

export enum ConverterConfidence {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ConverterRecommendedVehicle {
  PANELVAN = 'panelvan',
  SHORT_CHASSIS_VAN = 'short_chassis_van',
  LONG_CHASSIS_VAN = 'long_chassis_van',
  SMALL_TRUCK = 'small_truck',
  LARGE_TRUCK = 'large_truck',
}

@Entity('converter_results')
export class ConverterResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  sessionId: string;

  @OneToOne(() => ConverterSession, (session) => session.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ConverterSession;

  @Column({
    name: 'estimated_volume_min',
    type: 'decimal',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  estimatedVolumeMin: number | null;

  @Column({
    name: 'estimated_volume_max',
    type: 'decimal',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  estimatedVolumeMax: number | null;

  @Column({ name: 'recommended_vehicle', type: 'enum', enum: ConverterRecommendedVehicle, nullable: true })
  recommendedVehicle: ConverterRecommendedVehicle | null;

  @Column({ type: 'enum', enum: ConverterConfidence, nullable: true })
  confidence: ConverterConfidence | null;

  @Column({ name: 'warnings_json', type: 'json', nullable: true })
  warningsJson: string[] | null;

  @Column({ name: 'summary_text', type: 'varchar', length: 500, nullable: true })
  summaryText: string | null;

  @Column({ name: 'manual_review_recommended', type: 'boolean', default: false })
  manualReviewRecommended: boolean;

  @Column({ name: 'applied_to_shipment_at', type: 'datetime', nullable: true })
  appliedToShipmentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
