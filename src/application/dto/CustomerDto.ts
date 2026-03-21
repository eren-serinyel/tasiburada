import { IsString, IsEmail, IsPhoneNumber, IsOptional, Length, IsBoolean } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Length(2, 100)
  firstName: string;

  @IsString()
  @Length(2, 100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(10, 15)
  phone: string;

  @IsString()
  @Length(10, 500)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  addressLine2?: string;

  @IsString()
  @Length(2, 100)
  city: string;

  @IsString()
  @Length(2, 100)
  district: string;

  @IsString()
  @Length(6, 255)
  password: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  district?: string;
}

export class CustomerResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  isActive: boolean;
  isVerified: boolean;
  fullName: string;
  fullAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(6, 255)
  newPassword: string;
}