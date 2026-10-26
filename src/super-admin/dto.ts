import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DashboardFilterType {
   TODAY = 'today',
   THIS_MONTH = 'thismonth',
   THIS_YEAR = 'thisyear',
   MTD = 'mtd',
   YTD = 'ytd',
}

export class DashboardFiltersDto {
   @ApiPropertyOptional({ enum: DashboardFilterType })
   @IsOptional()
   filter?: DashboardFilterType;

   @ApiPropertyOptional()
   @IsOptional()
   pspId?: string;

   @ApiPropertyOptional()
   @IsOptional()
   lgaId?: string;

   @ApiPropertyOptional()
   @IsOptional()
   year?: number;
}

export class RevenueOverviewDto {
   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   year?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   page?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   limit?: number;
}

export class PaymentDetailsFiltersDto {
   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   page?: number;

   @ApiPropertyOptional()
   @IsOptional()
   @Type(() => Number)
   limit?: number;
}

export class LawmaAdminDashboardFiltersDto {
   @ApiPropertyOptional({ description: 'Filter by year' })
   @IsOptional()
   @Type(() => Number)
   @IsNumber()
   year?: number;
}
