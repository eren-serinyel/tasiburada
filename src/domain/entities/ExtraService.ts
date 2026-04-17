import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('extra_services')
export class ExtraService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'INACTIVE';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
