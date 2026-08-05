import { IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletStatus } from '@models/wallet.model';

export class GetWalletResponseDto {
  @ApiProperty()
  ledger_balance: number;

  @ApiProperty()
  status: WalletStatus;
}

export class TopUpWalletDto {
  @ApiProperty({ minimum: 100, maximum: 1000000 })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  amount: number;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  reference: string;
}

export class TopUpWalletResponseDto {
  @ApiProperty()
  reference: string;

  @ApiProperty()
  payment_url: string;
}

export class WalletMockVerifyDto {
  @ApiProperty()
  @IsString()
  reference: string;
}

export class VerifyTopUpResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  walletBalance: number;

  @ApiProperty({ type: Object })
  transaction: any;
}
