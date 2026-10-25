import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DashboardFilterType } from '@src/super-admin/dto';

export class ReconciliationFilterDto {
  @ApiPropertyOptional({ enum: DashboardFilterType })
  @IsOptional()
  @IsEnum(DashboardFilterType)
  filter?: DashboardFilterType;

  @ApiPropertyOptional({ description: 'Year used by THIS_YEAR and YTD' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Matches bill ID, customer name or service',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
