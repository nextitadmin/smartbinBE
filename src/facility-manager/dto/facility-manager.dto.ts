import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateManagerAccountDto {
  @ApiProperty()
  @IsString()
  payerId: string;

  @ApiProperty()
  @IsString()
  organizationName: string;

  @ApiProperty()
  @IsString()
  phoneNumber: string;
  @ApiProperty()
  @IsString()
  password: string;
  @ApiProperty()
  @IsString()
  confirmPassword: string;

  @ApiProperty()
  @IsString()
  lgaId: string;
}

export class LoginManagerAccountDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class ForgetPasswordManagerAccountDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class VerifyLogin {
  @ApiProperty()
  @IsString()
  code: string;
}

export class UpdatePictureDto {
  @ApiProperty()
  @IsString()
  profilePicture: string;
}

export class UpdateFacilityManagerProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  newPassword: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}
