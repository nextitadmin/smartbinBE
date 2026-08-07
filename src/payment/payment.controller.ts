import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { SuccessResponse } from '@common/http';
import { PaymentNotificationDTO } from './dto/payment.dto';

@ApiTags('Payments')
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('notification/:paymentProviderKey')
  async handlePaymentNotification(
    @Body() body: Record<string, any>,
    @Param('paymentProviderKey') paymentProviderKey: string,
  ) {
    const response = await this.paymentService.handlePaymentNotification(
      body,
      paymentProviderKey,
    );
    return new SuccessResponse(
      'Payment notification processed successfully',
      response,
    );
  }

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    const response = await this.paymentService.tsq(reference);
    return new SuccessResponse('Payment verified successfully', response);
  }
}
