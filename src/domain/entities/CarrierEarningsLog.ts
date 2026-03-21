import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Carrier } from "./Carrier";

@Entity("carrier_earnings_log")
export class CarrierEarningsLog {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    carrierId: string;

    @ManyToOne(() => Carrier)
    @JoinColumn({ name: "carrierId" })
    carrier: Carrier;

    @Column()
    shipmentId: string;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    amount: number;

    @CreateDateColumn()
    earnedAt: Date;
}
