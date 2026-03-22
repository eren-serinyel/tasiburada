import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Shipment } from "./Shipment";
import { Carrier } from "./Carrier";

export enum OfferStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected"
}

@Entity("offers")
export class Offer {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    shipmentId: string;

    @ManyToOne(() => Shipment)
    @JoinColumn({ name: "shipmentId" })
    shipment: Shipment;

    @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
    carrierId: string;

    @ManyToOne(() => Carrier)
    @JoinColumn({ name: "carrierId" })
    carrier: Carrier;

    @Column({ type: "decimal", precision: 10, scale: 2 })
    price: number;

    @Column({
        type: "enum",
        enum: OfferStatus,
        default: OfferStatus.PENDING
    })
    status: OfferStatus;

    @CreateDateColumn()
    offeredAt: Date;
}
