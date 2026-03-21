import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CarrierScopeOfWork } from './CarrierScopeOfWork';

@Entity('scope_of_work')
export class ScopeOfWork {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name: string;

    @CreateDateColumn({ type: 'datetime', precision: 6 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', precision: 6 })
    updatedAt: Date;

    @OneToMany(() => CarrierScopeOfWork, link => link.scope)
    carrierLinks: CarrierScopeOfWork[];
}
