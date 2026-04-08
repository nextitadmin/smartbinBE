import {
  IsOptional,
  IsEnum,
  IsString,
  IsObject,
  IsDateString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsEmail
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType } from '@models/report.model';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Frequency } from '@models/report.model';

export enum CustomerType {
  Corporate = 'Corporate',
  Resident = 'Resident',
}


export class CreateAutoReportDto {
  @ApiProperty({
    enum: ReportType,
    enumName: 'ReportType',
    description: 'Type of report to generate',
  })
  type: ReportType; 

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reportName: string; 

  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  isAuto: boolean; 

  @ApiProperty({
    enum: Frequency,
    enumName: 'Frequency',
    description: 'Frequency of the auto report',
  })
  @IsEnum(Frequency)
  frequency?: Frequency;


  @ApiPropertyOptional({
    description: 'Day of the week for weekly reports (e.g., Monday)',
  })
  @IsString()
  @IsOptional()
  day: string; 

  @ApiProperty()
  @IsString()
  time: string; 

  @ApiProperty()
  @IsEmail()
  primaryEmail: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @IsEmail({}, { each: true })
  secondaryEmails?: string[];


  @ApiProperty()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class CreateAdminReportDto {
  @ApiProperty()
  @IsString()
  reportName: string;

  @ApiProperty({
    enum: ReportType,
    enumName: 'ReportType',
    description: 'Type of report to generate',
  })
  type: ReportType;

  @ApiPropertyOptional()
  @IsOptional()
  lga?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  reportName: string;

  @ApiPropertyOptional({
    enum: CustomerType,
    enumName: 'CustomerType',
    description: 'Type of customer',
  })
  @IsEnum(CustomerType, { message: 'Invalid customer type' })
  @IsOptional()
  @IsString()
  customerType?: CustomerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({
    enum: ReportType,
    enumName: 'ReportType',
    description: 'Type of report to generate',
  })
  type: ReportType;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Optional filters like startDate, endDate, branch, etc.',
  })
  @ApiProperty({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class GetReportsDto {
  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType, { message: 'Invalid report type' })
  type?: ReportType;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
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

export class ReportResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the report generation task.',
  })
  id: string;

  @ApiProperty({
    enum: ReportType,
    description: 'The type of the generated report.',
  })
  type: ReportType;

  @ApiProperty({
    description: 'The email of the user who generated the report.',
  })
  generatedBy: string;

  @ApiProperty({ description: 'The timestamp when the report was generated.' })
  generatedAt: Date;

  @ApiProperty({
    description: 'The total number of records in the generated report.',
  })
  totalRecords: number;
}

export class FullReportResponseDto {
  @ApiProperty({ description: 'The unique identifier of the report.' })
  id: string;

  @ApiProperty({ enum: ReportType, description: 'The type of the report.' })
  type: ReportType;

  @ApiProperty({ description: 'The timestamp when the report was generated.' })
  generatedAt: Date;

  @ApiProperty({
    type: Object,
    description: 'The filters used to generate the report.',
  })
  filters: Record<string, any>;

  @ApiProperty({
    type: [Object],
    description: 'The data contained in the report.',
  })
  data: any[];
}
