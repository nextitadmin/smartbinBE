import {
  BinType,
  LAWMACustomerType,
} from '@models/smart-bin.model';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateCorporateAccountDto {
  @ApiProperty()
  @IsNotEmpty()
  payerId: string;

  @ApiProperty()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lgaId: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

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

export class CorporateLoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class ProfileDto {
  @ApiProperty()
  imageUrl: string;
}

export class CreateApplicationDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  surname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ApiProperty()
  @IsString()
  phoneNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payerId: string;

  @ApiProperty()
  @IsString()
  buildingType?: string;

  @ApiProperty()
  @IsString()
  houseName?: string;

  @ApiProperty()
  @IsString()
  houseNumber?: string;

  @ApiProperty()
  @IsString()
  flatNumber?: string;

  @ApiProperty()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  closestLandmark?: string;

  @ApiProperty()
  @IsString()
  localGovernmentArea?: string;

  @ApiProperty()
  @IsString()
  lawmaCustomerType?: LAWMACustomerType;

  @ApiProperty()
  @IsString()
  binType: BinType;

  @ApiProperty()
  @IsString()
  buildingName?: string;

  @ApiProperty()
  @IsString()
  amount?: string;
}

export class VerifyCorporateLogin {
  @ApiProperty()
  @IsString()
  code: string;
}

export class CorporateForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class CorporateVerifyResetCodeDto {
  @ApiProperty()
  @IsString()
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  confirmPassword: string;
}

export class GetApplicationParamDto {
  @ApiProperty()
  @IsString()
  applicationId: string;
}

export class AddCorporateBranchDto {
  @ApiProperty()
  @IsString({ message: 'Branch name must be a string' })
  @IsNotEmpty({ message: 'Branch name is required' })
  branchName: string;

  @ApiProperty()
  @IsString({ message: 'Branch address must be a string' })
  @IsNotEmpty({ message: 'Branch address is required' })
  branchAddress: string;

  @ApiProperty()
  @IsString({ message: 'Local Government Area must be a string' })
  @IsNotEmpty({ message: 'Local Government Area is required' })
  localGovernmentArea: string;

  @ApiProperty()
  @IsString({ message: 'Closest landmark must be a string' })
  @IsNotEmpty({ message: 'Closest landmark is required' })
  closestLandmark: string;

  @ApiProperty()
  @IsString({ message: 'State must be a string' })
  @IsOptional()
  state: string;

  @ApiProperty({ enum: LAWMACustomerType, required: false })
  @IsOptional()
  @IsEnum(LAWMACustomerType, {
    message: `Lawma Customer Type must be either be '${LAWMACustomerType.New}' or '${LAWMACustomerType.Returning}'`,
  })
  lawmaCustomerType?: LAWMACustomerType;
}
