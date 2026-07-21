import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ServiceCategoryCode } from '../shipments/ShipmentV2Codes';
import type {
  ArchiveDensityCode,
  ArchiveUnitCountBandCode,
  OfficeSizeBandCode,
  WorkstationCountBandCode,
} from '../shipments/ShipmentCategoryDetailCodes';
import {
  isValidOfficeDeadline,
} from '../shipments/ShipmentCategoryDetailCodes';
import { Shipment } from './Shipment';

@Entity('shipment_office_move_details')
export class ShipmentOfficeMoveDetail {
  @PrimaryColumn({
    name: 'shipment_id',
    type: 'varchar',
    length: 36,
  })
  shipmentId: string;

  @Column({
    name: 'service_category_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
  })
  serviceCategoryCode: ServiceCategoryCode;

  @ManyToOne(() => Shipment, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([
    { name: 'shipment_id', referencedColumnName: 'id' },
    {
      name: 'service_category_code',
      referencedColumnName: 'serviceCategoryCode',
    },
  ])
  shipment: Shipment;

  @Column({
    name: 'office_size_band_code',
    type: 'varchar',
    length: 40,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  officeSizeBandCode: OfficeSizeBandCode | null;

  @Column({
    name: 'workstation_count_band_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  workstationCountBandCode: WorkstationCountBandCode | null;

  @Column({
    name: 'archive_unit_count_band_code',
    type: 'varchar',
    length: 32,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  archiveUnitCountBandCode: ArchiveUnitCountBandCode | null;

  @Column({
    name: 'archive_density_code',
    type: 'varchar',
    length: 24,
    charset: 'ascii',
    collation: 'ascii_bin',
    nullable: true,
  })
  archiveDensityCode: ArchiveDensityCode | null;

  @Column({
    name: 'has_server_room',
    type: 'boolean',
    nullable: true,
  })
  hasServerRoom: boolean | null;

  @Column({
    name: 'has_sensitive_electronics',
    type: 'boolean',
    nullable: true,
  })
  hasSensitiveElectronics: boolean | null;

  @Column({
    name: 'has_heavy_equipment',
    type: 'boolean',
    nullable: true,
  })
  hasHeavyEquipment: boolean | null;

  @Column({
    name: 'requires_after_hours_move',
    type: 'boolean',
    nullable: true,
  })
  requiresAfterHoursMove: boolean | null;

  @Column({
    name: 'has_fixed_completion_deadline',
    type: 'boolean',
    nullable: true,
  })
  hasFixedCompletionDeadline: boolean | null;

  @Column({
    name: 'completion_deadline_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  completionDeadlineAt: Date | null;

  @Column({
    name: 'must_remain_operational',
    type: 'boolean',
    nullable: true,
  })
  mustRemainOperational: boolean | null;

  @BeforeInsert()
  @BeforeUpdate()
  validateDeadline(): void {
    if (
      !isValidOfficeDeadline(
        this.hasFixedCompletionDeadline,
        this.completionDeadlineAt,
      )
    ) {
      throw new Error(
        'Shipment office completion deadline is invalid',
      );
    }
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
