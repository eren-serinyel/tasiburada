import { IsString, IsEmail, IsOptional, Length, IsArray, IsNumber, IsBoolean, IsUUID, IsIn, ValidateNested, IsInt, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CarrierRegisterDto {
  @IsString()
  @Length(2, 255)
  companyName!: string;

  @IsString()
  @Length(10, 15)
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(11, 11)
  taxNumber!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleTypeIds?: string[];

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  foundedYear!: number;
}

export class CarrierLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;
}

export class CarrierCompanyInfoDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsNumber()
  foundedYear?: number;
}

export class CarrierActivityDto {
  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsArray()
  serviceAreas?: string[];
}

export class CarrierVehicleSelectionDto {
  @IsArray()
  @IsString({ each: true })
  vehicleTypeIds!: string[];
}

export class CarrierVehicleTypeSelectionItemDto {
  @IsString()
  vehicleTypeId!: string;

  @IsOptional()
  @IsNumber()
  capacityKg?: number;
}

export class CarrierVehicleTypeSelectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarrierVehicleTypeSelectionItemDto)
  vehicleTypes!: CarrierVehicleTypeSelectionItemDto[];
}

export class CarrierServiceTypeSelectionDto {
  @IsArray()
  @IsString({ each: true })
  serviceTypeIds!: string[];
}

export class CarrierScopeOfWorkSelectionDto {
  @IsArray()
  @IsString({ each: true })
  scopeIds!: string[];
}

export class CarrierVehicleInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  vehicleTypeId!: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  capacityKg?: number;

  @IsOptional()
  @IsNumber()
  capacityM3?: number;

  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTrackingDevice?: boolean;
}

export class CarrierDocumentUploadDto {
  @IsString()
  @IsIn(['AUTHORIZATION_CERT', 'SRC_CERT', 'VEHICLE_LICENSE', 'TAX_PLATE', 'INSURANCE_POLICY'])
  type!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

export class CarrierDocumentBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CarrierDocumentUploadDto)
  documents!: CarrierDocumentUploadDto[];
}

export class CarrierEarningsDto {
  @IsString()
  bankName!: string;

  @IsString()
  iban!: string;

  @IsString()
  accountHolder!: string;
}

export class CarrierSecuritySettingsDto {
  @IsBoolean()
  twoFactorEnabled!: boolean;

  @IsBoolean()
  suspiciousLoginAlertsEnabled!: boolean;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  newPassword?: string;

  @IsOptional()
  @IsString()
  @Length(6, 128)
  currentPassword?: string;
}

export class NotificationPreferenceToggleDto {
  @IsString()
  notificationKey!: string;

  @IsString()
  channelKey!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class NotificationTimeWindowDto {
  @IsString()
  start!: string;

  @IsString()
  end!: string;
}

export class NotificationPreferenceEntryDto {
  @IsString()
  notificationKey!: string;

  @IsObject()
  channels!: Record<string, boolean>;
}

export class CarrierNotificationPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceEntryDto)
  preferences!: NotificationPreferenceEntryDto[];

  @IsOptional()
  @IsBoolean()
  quietMode?: boolean;

  @IsOptional()
  @IsBoolean()
  dailySummary?: boolean;

  @IsOptional()
  @IsInt()
  smsDailyLimit?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationTimeWindowDto)
  timeWindow?: NotificationTimeWindowDto;
}