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
import { Carrier } from './Carrier';

export interface CarrierAvailableDateTimeRange {
  startTime?: string | null;
  endTime?: string | null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const timeToMinutes = (time: string, isEndTime = false): number | null => {
  const match = String(time).trim().match(TIME_PATTERN);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const total = hours * 60 + minutes;

  return isEndTime && total === 0 ? 24 * 60 : total;
};

export const isValidCarrierAvailableDateTimeRange = (
  range: CarrierAvailableDateTimeRange,
): boolean => {
  const start = range.startTime?.trim();
  const end = range.endTime?.trim();

  if (!start && !end) return true;
  if (!start || !end) return false;

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end, true);

  return startMinutes !== null && endMinutes !== null && startMinutes < endMinutes;
};

@Entity('carrier_available_dates')
@Index('UQ_carrier_available_dates_carrier_date', ['carrierId', 'date'], { unique: true })
export class CarrierAvailableDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  carrierId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Carrier, (carrier) => carrier.availableDateOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrierId' })
  carrier: Carrier;
}
