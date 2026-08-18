import { Controller, Get, Post, Body, Req, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  TopUpWalletDto,
  GetWalletResponseDto,
  WalletMockVerifyDto,
} from './dtos/wallet.dto';
import {
  Auth,
  AuthenticatedUser,
  CorporateAuth,
  ResidentAuth,
} from 'src/common/decorators/auth.decorator';
import { SuccessResponse } from '@common/http';
import { Public } from '@common/guards/public.guard';
import { AuthUser } from '@common/types';

@ApiTags('Wallet')
@Controller({
  path: 'wallets',
  version: '1',
})
@Auth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWalletDetails(@AuthenticatedUser() user: AuthUser) {
    const response = await this.walletService.getWallet(user);
    return new SuccessResponse('wallet fetched', response);
  }

  @Get('mock-verify')
  async mockVerify(@Query() query: WalletMockVerifyDto) {
    await this.walletService.mockWalletCallback(query.reference);
    return new SuccessResponse('Wallet callback URL received', null);
  }

  @Post('topup')
  async topUp(
    @AuthenticatedUser() user: AuthUser,
    @Body() dto: TopUpWalletDto,
  ) {
    const response = await this.walletService.initiateTopUp(user, dto);
    return new SuccessResponse('Wallet topped up successfully', response);
  }

  @Post('charge')
  async chargeWallet(
    @AuthenticatedUser() user: AuthUser,
    @Body() dto: TopUpWalletDto,
  ) {
    const response = await this.walletService.chargeWallet({
      user,
      amount: dto.amount,
      reference: dto.reference,
    });
    return new SuccessResponse('Wallet charged successfully', response);
  }
}
