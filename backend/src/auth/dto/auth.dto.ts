import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  pseudo?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  wilaya?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class VerifyDeviceDto {
  @IsString()
  verificationCode: string; // Code 6 chiffres

  @IsString()
  deviceFingerprint: string;

  @IsOptional()
  @IsString()
  deviceName?: string; // "Mon iPhone", "PC Bureau", etc
}

export class TrustDeviceResponseDto {
  id: string;
  deviceName: string;
  deviceFingerprint: string;
  lastUsedAt: Date;
  isActive: boolean;
}
