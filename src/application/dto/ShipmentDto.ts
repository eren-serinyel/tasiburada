import { IsString, IsOptional, Length, IsEnum, IsNumber, IsDateString, Min, IsBoolean, IsUUID, IsArray } from 'class-validator';
import { ShipmentStatus, PlaceType, LoadProfile, AccessDistance, DateFlexibility } from '../../domain/entities/Shipment';
import { CargoType } from '../../domain/valueObjects/CargoType';

export class CreateShipmentDto {
  @IsString()
  @Length(2, 100)
  originCity: string;

  @IsString()
  @Length(2, 100)
  originDistrict: string;

  @IsString()
  @Length(10, 500)
  originAddress: string;

  @IsString()
  @Length(2, 100)
  destinationCity: string;

  @IsString()
  @Length(2, 100)
  destinationDistrict: string;

  @IsString()
  @Length(10, 500)
  destinationAddress: string;

  @IsDateString()
  shipmentDate: string;

  @IsNumber()
  @Min(0)
  priceRangeMin: number;

  @IsNumber()
  @Min(0)
  priceRangeMax: number;

  @IsEnum(CargoType)
  cargoType: CargoType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @IsOptional()
  @IsBoolean()
  isInsured?: boolean;

  @IsOptional()
  @IsEnum(LoadProfile)
  loadProfile?: LoadProfile;

  @IsOptional()
  @IsEnum(PlaceType)
  originPlaceType?: PlaceType;

  @IsOptional()
  @IsEnum(PlaceType)
  destinationPlaceType?: PlaceType;

  @IsOptional()
  @IsEnum(AccessDistance)
  originAccessDistance?: AccessDistance;

  @IsOptional()
  @IsEnum(AccessDistance)
  destinationAccessDistance?: AccessDistance;

  @IsOptional()
  @IsEnum(DateFlexibility)
  dateFlexibility?: DateFlexibility;

  @IsOptional()
  @IsString()
  timePreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraServices?: string[];
}

export class UpdateShipmentDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  originCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  originDistrict?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  originAddress?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  destinationCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  destinationDistrict?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  destinationAddress?: string;

  @IsOptional()
  @IsDateString()
  shipmentDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceRangeMax?: number;

  @IsOptional()
  @IsEnum(CargoType)
  cargoType?: CargoType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volume?: number;

  @IsOptional()
  @IsBoolean()
  isInsured?: boolean;

  @IsOptional()
  @IsEnum(LoadProfile)
  loadProfile?: LoadProfile;

  @IsOptional()
  @IsEnum(PlaceType)
  originPlaceType?: PlaceType;

  @IsOptional()
  @IsEnum(PlaceType)
  destinationPlaceType?: PlaceType;

  @IsOptional()
  @IsEnum(AccessDistance)
  originAccessDistance?: AccessDistance;

  @IsOptional()
  @IsEnum(AccessDistance)
  destinationAccessDistance?: AccessDistance;

  @IsOptional()
  @IsEnum(DateFlexibility)
  dateFlexibility?: DateFlexibility;

  @IsOptional()
  @IsString()
  timePreference?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  extraServices?: string[];
}

export class ShipmentResponseDto {
  id: string;
  originCity: string;
  originDistrict: string;
  originAddress: string;
  originAddressId?: number | null;
  originAddressText?: string | null;
  destinationCity: string;
  destinationDistrict: string;
  destinationAddress: string;
  destinationAddressId?: number | null;
  destinationAddressText?: string | null;
  shipmentDate: Date;
  priceRangeMin: number;
  priceRangeMax: number;
  status: ShipmentStatus;
  cargoType: CargoType;
  description?: string;
  weight?: number;
  volume?: number;
  isInsured: boolean;
  finalPrice?: number;
  customerId: string;
  carrierId?: string;
  route: string;
  isAssigned: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AssignCarrierDto {
  @IsUUID()
  carrierId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finalPrice?: number;
}

export class ShipmentSearchDto {
  @IsOptional()
  @IsString()
  originCity?: string;

  @IsOptional()
  @IsString()
  destinationCity?: string;

  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsEnum(CargoType)
  cargoType?: CargoType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}