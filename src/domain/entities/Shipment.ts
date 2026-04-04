import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Customer } from "./Customer";
import { Carrier } from "./Carrier";

export enum ShipmentStatus {
    PENDING = "pending",
    OFFER_RECEIVED = "offer_received",
    MATCHED = "matched",
    IN_TRANSIT = "in_transit",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}

@Entity("shipments")
export class Shipment {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    customerId: string;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "customerId" })
    customer: Customer;

    @Column({ type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', nullable: true })
    carrierId: string | null;

    @ManyToOne(() => Carrier, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: "carrierId" })
    carrier: Carrier;

    @Column({
        type: "enum",
        enum: ShipmentStatus,
        default: ShipmentStatus.PENDING
    })
    status: ShipmentStatus;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    price?: number; // Agreed price

    @Column()
    origin: string; 

    @Column()
    destination: string;

    @Column()
    loadDetails: string;

    @Column({ nullable: true })
    transportType: string;

    @Column({ nullable: true })
    placeType: string;

    @Column({ type: 'boolean', default: false })
    hasElevator: boolean;

    @Column({ type: 'int', nullable: true })
    floor: number;

    @Column({ default: 'none' })
    insuranceType: string;

    @Column({ nullable: true })
    timePreference: string;

    @Column({ type: 'json', nullable: true })
    extraServices: string[];

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    weight: number;

    @Column({ type: "date" })
    shipmentDate: Date;

    @Column({ type: 'json', nullable: true })
    photoUrls: string[];

    @Column({ type: 'varchar', length: 1000, nullable: true })
    note: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    vehiclePreference: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
