import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Shipment } from "./Shipment";
import { Carrier } from "./Carrier";

const decimalToNumberTransformer = {
    to: (value: number | null | undefined) => value,
    from: (value: string | number | null | undefined) => value == null ? value : Number(value)
};

export enum OfferStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    WITHDRAWN = "withdrawn",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}

@Entity("offers")
export class Offer {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    shipmentId: string;

    @ManyToOne(() => Shipment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "shipmentId" })
    shipment: Shipment;

    @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
    carrierId: string;

    @ManyToOne(() => Carrier, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "carrierId" })
    carrier: Carrier;

    @Column({ type: "decimal", precision: 10, scale: 2, transformer: decimalToNumberTransformer })
    price: number;

    @Column({ name: 'base_price', type: "decimal", precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
    basePrice?: number | null;

    @Column({ name: 'extra_services_total', type: "decimal", precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
    extraServicesTotal?: number | null;

    @Column({ name: 'extra_services_breakdown', type: 'json', nullable: true })
    extraServicesBreakdown?: Array<{
        extraServiceId?: string;
        customServiceId?: string;
        name: string;
        price: number;
        source?: 'requested' | 'offered';
    }> | null;

    @Column({ type: 'text', nullable: true })
    message?: string;

    @Column({ type: 'int', nullable: true })
    estimatedDuration?: number;

    @Column({ name: 'valid_until', type: 'datetime', nullable: true })
    validUntil: Date | null;

    @Column({
        type: 'enum',
        enum: OfferStatus,
        default: OfferStatus.PENDING
    })
    status: OfferStatus;

    @Column({ name: 'has_suspicious_content', type: 'boolean', default: false })
    hasSuspiciousContent: boolean;

    @CreateDateColumn()
    offeredAt: Date;
}
