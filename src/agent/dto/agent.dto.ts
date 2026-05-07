import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateAgentAccountDto {
  @ApiProperty()
  @IsString()
  payerId: string;

  @ApiProperty()
  @IsString()
  agencyName: string;

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

export class LoginAgentAccountDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class ProfileDto {
  @ApiProperty()
  imageUrl: string;
}

export class UpdateAgencyProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agencyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class VerifyAgentLogin {
  @ApiProperty()
  @IsString()
  code: string;
}

export class EmailDTO {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}

export class IdParamDTO {
  @ApiProperty({
    required: true,
  })
  @IsString()
  @IsMongoId()
  id: string;
}

export class UploadUserDto {
  @ApiProperty({ enum: ['resident', 'corporate'] })
  customerType: 'resident' | 'corporate';

  @ApiProperty({ required: true })
  @IsString()
  payerId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty()
  @IsString()
  @IsEmail()
  companyEmail?: string;

  @ApiProperty()
  @IsString()
  companyPhoneNumber?: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class UploadUsersRequestDto {
  @ApiProperty({ type: [UploadUserDto] })
  users: UploadUserDto[];
}
