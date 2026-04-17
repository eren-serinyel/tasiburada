import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from "typeorm";
import { Customer } from "./Customer";
import { Carrier } from "./Carrier";
import { VehicleType } from "./VehicleType";
import { ExtraService } from "./ExtraService";
import { CustomerAddress } from "./CustomerAddress";

const decimalToNumberTransformer = {
    to: (value: number | null | undefined) => value,
    from: (value: string | number | null | undefined) => value == null ? null : Number(value)
};

export enum ShipmentStatus {
    PENDING = "pending",
    OFFER_RECEIVED = "offer_received",
    MATCHED = "matched",
    IN_TRANSIT = "in_transit",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}

export enum ShipmentCategory {
    HOME_MOVE = "HOME_MOVE",
    OFFICE_MOVE = "OFFICE_MOVE",
    PARTIAL_ITEM = "PARTIAL_ITEM",
    STORAGE = "STORAGE"
}

export enum PlaceType {
    DAIRE = "Daire",
    APARTMAN_DAIRESI = "Apartman Dairesi",
    SITE_ICI_DAIRE = "Site İçi Daire",
    MUSTAKIL = "Müstakil Ev",
    VILLA = "Villa",
    OFIS = "Ofis",
    PLAZA_OFIS = "Plaza/Ofis",
    DEPO = "Depo",
    DUKKAN = "Dükkan",
    DIGER = "Diğer"
}

export enum InsuranceType {
    NONE = "none",
    STANDARD = "standard",
    COMPREHENSIVE = "comprehensive"
}

export enum LoadProfile {
    STUDIO = "STUDIO",
    HOME_1_1 = "HOME_1_1",
    HOME_2_1 = "HOME_2_1",
    HOME_3_1 = "HOME_3_1",
    HOME_4_PLUS = "HOME_4_PLUS",
    OFFICE_SMALL = "OFFICE_SMALL",
    OFFICE_MEDIUM = "OFFICE_MEDIUM",
    OFFICE_LARGE = "OFFICE_LARGE",
    STORAGE_SMALL = "STORAGE_SMALL",
    STORAGE_MEDIUM = "STORAGE_MEDIUM",
    STORAGE_LARGE = "STORAGE_LARGE"
}

export enum AccessDistance {
    DISTANCE_0_10 = "0-10 m",
    DISTANCE_10_30 = "10-30 m",
    DISTANCE_30_50 = "30-50 m",
    DISTANCE_50_PLUS = "50+ m"
}

export enum DateFlexibility {
    EXACT = "EXACT",
    PLUS_MINUS_1_DAY = "PLUS_MINUS_1_DAY",
    PLUS_MINUS_3_DAYS = "PLUS_MINUS_3_DAYS"
}

@Entity("shipments")
export class Shipment {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ name: 'customer_id' })
    customerId: string;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "customer_id" })
    customer: Customer;

    @Column({ name: 'carrier_id', type: 'char', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci', nullable: true })
    carrierId: string | null;

    @ManyToOne(() => Carrier, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: "carrier_id" })
    carrier: Carrier;

    @Column({
        type: "enum",
        enum: ShipmentStatus,
        default: ShipmentStatus.PENDING
    })
    status: ShipmentStatus;

    @Column({ name: 'shipment_category', type: 'enum', enum: ShipmentCategory, nullable: true })
    shipmentCategory: ShipmentCategory | null;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true, transformer: decimalToNumberTransformer })
    price: number | null;


    @Column({ name: 'origin_city', type: 'varchar', length: 50, nullable: true })
    originCity: string | null;

    @Column({ name: 'origin_district', type: 'varchar', length: 50, nullable: true })
    originDistrict: string | null;

    @Column({ name: 'origin_place_type', type: 'enum', enum: PlaceType, nullable: true })
    originPlaceType: PlaceType | null;

    @Column({ name: 'origin_floor', type: 'tinyint', nullable: true })
    originFloor: number | null;

    @Column({ name: 'origin_has_elevator', type: 'boolean', default: false, nullable: true })
    originHasElevator: boolean | null;

    @Column({ name: 'origin_address_id', type: 'int', nullable: true, select: false, insert: false, update: false })
    originAddressId: number | null;

    @ManyToOne(() => CustomerAddress, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'origin_address_id' })
    originAddress: CustomerAddress | null;

    @Column({ name: 'origin_address_text', type: 'varchar', length: 500, nullable: true, select: false, insert: false, update: false })
    originAddressText: string | null;


    @Column({ name: 'destination_city', type: 'varchar', length: 50, nullable: true })
    destinationCity: string | null;

    @Column({ name: 'destination_district', type: 'varchar', length: 50, nullable: true })
    destinationDistrict: string | null;

    @Column({ name: 'destination_place_type', type: 'enum', enum: PlaceType, nullable: true })
    destinationPlaceType: PlaceType | null;

    @Column({ name: 'destination_floor', type: 'tinyint', nullable: true })
    destinationFloor: number | null;

    @Column({ name: 'destination_has_elevator', type: 'boolean', default: false, nullable: true })
    destinationHasElevator: boolean | null;

    @Column({ name: 'destination_address_id', type: 'int', nullable: true, select: false, insert: false, update: false })
    destinationAddressId: number | null;

    @ManyToOne(() => CustomerAddress, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'destination_address_id' })
    destinationAddress: CustomerAddress | null;

    @Column({ name: 'destination_address_text', type: 'varchar', length: 500, nullable: true, select: false, insert: false, update: false })
    destinationAddressText: string | null;

    @Column({ name: 'load_profile', type: 'enum', enum: LoadProfile, nullable: true, select: false, insert: false, update: false })
    loadProfile: LoadProfile | null;

    @Column({ name: 'origin_access_distance', type: 'enum', enum: AccessDistance, nullable: true, select: false, insert: false, update: false })
    originAccessDistance: AccessDistance | null;

    @Column({ name: 'destination_access_distance', type: 'enum', enum: AccessDistance, nullable: true, select: false, insert: false, update: false })
    destinationAccessDistance: AccessDistance | null;

    @Column({ name: 'load_details' })
    loadDetails: string;

    @Column({ name: 'insurance_type', type: 'enum', enum: InsuranceType, default: InsuranceType.NONE, nullable: true })
    insuranceType: InsuranceType | null;

    @Column({ name: 'time_preference', nullable: true })
    timePreference: string;

    @Column({ name: 'date_flexibility', type: 'enum', enum: DateFlexibility, nullable: true, default: DateFlexibility.EXACT, select: false, insert: false, update: false })
    dateFlexibility: DateFlexibility | null;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    weight: number | null;

    @Column({ name: 'estimated_weight', type: 'int', nullable: true })
    estimatedWeight: number | null;

    @Column({ name: 'shipment_date', type: "date" })
    shipmentDate: Date;

    @Column({ name: 'photo_urls', type: 'json', nullable: true })
    photoUrls: string[];

    @Column({ type: 'varchar', length: 1000, nullable: true })
    note: string;

    @Column({ name: 'vehicle_type_preference_id', type: 'varchar', length: 36, nullable: true })
    vehicleTypePreferenceId: string | null;

    @ManyToOne(() => VehicleType, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'vehicle_type_preference_id' })
    vehicleTypePreference: VehicleType | null;

    @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
    contactPhone: string | null;

    @Column({ name: 'cancellation_reason', type: 'varchar', length: 255, nullable: true })
    cancellationReason: string | null;

    @ManyToMany(() => ExtraService)
    @JoinTable({
        name: 'shipment_extra_services',
        joinColumn: { name: 'shipment_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'extra_service_id', referencedColumnName: 'id' },
    })
    extraServices: ExtraService[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    get origin(): string {
        return this.originDistrict ? `${this.originCity}, ${this.originDistrict}` : (this.originCity || '');
    }

    get destination(): string {
        return this.destinationDistrict ? `${this.destinationCity}, ${this.destinationDistrict}` : (this.destinationCity || '');
    }
}
