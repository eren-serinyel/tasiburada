import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Carrier } from "./Carrier";

@Entity("carrier_stats")
export class CarrierStats {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
    carrierId: string;

    @OneToOne(() => Carrier)
    @JoinColumn({ name: "carrierId" })
    carrier: Carrier;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    totalEarnings: number;

    @Column({ type: "int", default: 0 })
    totalJobs: number; // completed jobs

    @Column({ type: "int", default: 0 })
    activeJobs: number; // pending or in-progress

    @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
    averageRating: number;

    @Column({ type: "int", default: 0 })
    totalReviews: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
