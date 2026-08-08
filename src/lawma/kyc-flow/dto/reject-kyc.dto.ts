import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectKycDto {
  @ApiProperty({
    required: false,
    description: 'Reason for rejecting the KYC application, sent to the applicant.',
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}
