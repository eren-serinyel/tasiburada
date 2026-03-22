import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Carrier } from "./Carrier";
import { Customer } from "./Customer";
import { Shipment } from "./Shipment";

@Entity("reviews")
export class Review {
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

    @Column()
    customerId: string;

    @ManyToOne(() => Customer)
    @JoinColumn({ name: "customerId" })
    customer: Customer;

    @Column({ type: "int" })
    rating: number; // 1-5

    @Column({ type: "text", nullable: true })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}
