import {
  BinType,
  LAWMACustomerType,
  RecieverType,
} from '@models/smart-bin.model';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmpty,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { SmartbinStatus } from '@models/smart-bin.model';
import { SmartBinApplicationStatus, UserRole } from '@models/types/index';
import { Types } from 'mongoose';

export class BinAppDto {
  userId: string;
  payerId: string;
  binType: string;
  status: string;
  customerType: string;
  customerName?: string;
  lawmaCustomerType?: string;
  paymentMethod?: string;
  buildingName?: string;
  address?: string;
  businessType?: string;
  branchId?: string;
  email?: string;
  phoneNumber?: string;
  branch?: string;
  closestLandmark?: string;
  name?: string;
  businessName?: string;
  buildingType?: string;
  houseName?: string;
  flatNumber?: string;
  localGovernmentArea?: string;
  approvalDate?: Date;
  deliveredOn?: Date;
  deliveredBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  @IsBoolean()
  useYourAddress?: boolean;

  @ApiProperty()
  @IsString()
  streetName?: string;

  @ApiProperty()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  closestLandmark?: string;

  @ApiProperty()
  @IsString()
  localGovernmentArea?: string;

  @ApiProperty({ enum: LAWMACustomerType, required: false })
  @IsOptional()
  @IsEnum(LAWMACustomerType, {
    message: `Lawma Customer Type must be either '${LAWMACustomerType.New}' or '${LAWMACustomerType.Returning}'`,
  })
  lawmaCustomerType?: LAWMACustomerType;

  @ApiProperty({ enum: BinType, default: BinType.Smart })
  @IsEnum(BinType, {
    message: `Bin Type must be either '${BinType.Smart}' or '${BinType.Non_Smart}'`,
  })
  binType: BinType = BinType.Smart;

  @ApiProperty()
  @IsString()
  buildingName?: string;
}

export class CreateBusinessApplicationDto {
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
  @IsOptional()
  customerName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  tenantName?: string;

  @ApiProperty()
  @IsString()
  phoneNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payerId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  branchId?: string;

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
  branch?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  receiptId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ enum: LAWMACustomerType, required: false })
  @IsOptional()
  @IsEnum(LAWMACustomerType, {
    message: `Lawma Customer Type must be either '${LAWMACustomerType.New}' or '${LAWMACustomerType.Returning}'`,
  })
  lawmaCustomerType?: LAWMACustomerType;

  @ApiProperty({ enum: BinType, default: BinType.Smart })
  @IsEnum(BinType, {
    message: `Bin Type must be either '${BinType.Smart}' or '${BinType.Non_Smart}'`,
  })
  binType: BinType = BinType.Smart;

  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionReference?: string;
}

export class CreateFacilityApplicationDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  tenantName?: string;

  @ApiProperty({ enum: BinType, default: BinType.Smart })
  @IsEnum(BinType, {
    message: `Bin Type must be either '${BinType.Smart}' or '${BinType.Non_Smart}'`,
  })
  binType: BinType = BinType.Smart;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payerId: string;

  @ApiProperty({ enum: LAWMACustomerType, required: false })
  @IsOptional()
  @IsEnum(LAWMACustomerType, {
    message: `Lawma Customer Type must be either '${LAWMACustomerType.New}' or '${LAWMACustomerType.Returning}'`,
  })
  lawmaCustomerType?: LAWMACustomerType;

  @ApiProperty()
  @IsString()
  closestLandmark?: string;

  @ApiProperty()
  @IsString()
  buildingName?: string;

  @ApiProperty()
  @IsString()
  buildingType?: string;

  @ApiProperty()
  @IsString()
  flatNumber?: string;

  @ApiProperty()
  @IsString()
  localGovernmentArea?: string;

  @ApiProperty()
  @IsString()
  address?: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  receiptId?: string;

  @ApiProperty({
    description: 'Facility ID (MongoDB ObjectId)',
    example: '64f8b6d82f2e4c4b1c7e92a1',
  })
  @IsMongoId({ message: 'Facility ID is invalid' })
  @IsOptional()
  facilityId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionReference?: string;
}

export class UpdateSmartBinStatusDto {
  @IsEnum(SmartBinApplicationStatus)
  @IsNotEmpty()
  status: SmartBinApplicationStatus;
}

export interface AgentBinApplicationFilter {
  agentId: string;
  page: number;
  limit: number;
  userType?: UserRole;
}

export class GetApplicationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: BinType;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(UserRole)
  customerType?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SmartbinStatus)
  status?: SmartbinStatus;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

export class GetDeliveredApplicationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: BinType;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(UserRole)
  customerType?: UserRole;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

export class GetApplicationResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  customerType: string;

  @ApiProperty()
  binId: string;

  @ApiProperty()
  binType: BinType;

  @ApiProperty()
  status: SmartbinStatus;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  lawmaCustomerType: LAWMACustomerType;

  @ApiProperty()
  address: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class orderBinsDto {
  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

export class scheduleDeliveryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  applicationId: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teamMemberId: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class GetOverviewDto {
  @ApiPropertyOptional({ description: 'Filter by year' })
  @IsOptional()
  @IsNumberString()
  year?: number;

  @ApiPropertyOptional({ description: 'Filter by bin type', enum: BinType })
  @IsOptional()
  @IsEnum(BinType)
  binType?: BinType;
}

export class DeliveryData {
  @ApiProperty()
  receiverName: string;
  @ApiProperty()
  receiverType: RecieverType;
  @ApiProperty()
  deliveredBy:string;
  @ApiProperty()
  agreeToReceive: boolean;
}


export class GetTeamMemberBinsFilterDto {
  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}