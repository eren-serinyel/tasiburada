import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExtraService } from './ExtraService';
import { ExtraServiceLoadType } from './ExtraServiceLoadType';
export { ExtraServiceLoadType } from './ExtraServiceLoadType';

@Entity('extra_service_applicability')
@Index('UQ_extra_service_applicability_service_load_type', ['extraServiceId', 'loadType'], { unique: true })
export class ExtraServiceApplicability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'extra_service_id', type: 'varchar', length: 36 })
  extraServiceId: string;

  @ManyToOne(() => ExtraService, (extraService) => extraService.applicabilityRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'extra_service_id' })
  extraService: ExtraService;

  @Column({ name: 'load_type', type: 'enum', enum: ExtraServiceLoadType })
  loadType: ExtraServiceLoadType;

  @Column({ name: 'is_default_visible', type: 'boolean', default: true })
  isDefaultVisible: boolean;

  @Column({ name: 'is_recommended_by_converter', type: 'boolean', default: false })
  isRecommendedByConverter: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
