import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum MatchCooldownStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  WAIVED = 'waived',
}

@Entity('match_cooldowns')
@Index(['customerId', 'carrierId', 'activeUntil'])
export class MatchCooldown {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 36 })
  customerId: string;

  @Column({ type: 'char', length: 36 })
  carrierId: string;

  @Column({ type: 'char', length: 36 })
  shipmentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'datetime' })
  matchedAt: Date;

  @Column({ type: 'datetime' })
  cancelledAt: Date;

  @Column({ type: 'datetime' })
  activeUntil: Date;

  @Column({ type: 'enum', enum: MatchCooldownStatus, default: MatchCooldownStatus.ACTIVE })
  status: MatchCooldownStatus;

  @CreateDateColumn()
  createdAt: Date;
}
