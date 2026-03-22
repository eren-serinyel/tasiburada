import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { Carrier } from './Carrier';
import { ScopeOfWork } from './ScopeOfWork';

@Entity('carrier_scope_of_work')
@Unique(['carrierId', 'scopeId'])
export class CarrierScopeOfWork {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
    carrierId: string;

    @Column({ type: 'uuid' })
    scopeId: string;

    @ManyToOne(() => Carrier, carrier => carrier.scopeLinks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'carrierId' })
    carrier: Carrier;

    @ManyToOne(() => ScopeOfWork, scope => scope.carrierLinks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'scopeId' })
    scope: ScopeOfWork;
}
