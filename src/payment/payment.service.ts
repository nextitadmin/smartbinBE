import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { Pay4ItProvider } from './providers/pay4it.provider';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService<ConfigAttributes>,
    private pay4ItProvider: Pay4ItProvider,
  ) {}

  async handlePaymentNotification(
    notification: Record<string, any>,
    paymentProvider: string,
  ): Promise<any> {
    const paymentProviderKey = this.configService.get('paymentProviderKey');
    if (!paymentProviderKey) {
      this.logger.error({ message: 'Payment provider key is missing' });
      throw new BadRequestException('Invalid payment!');
    }

    const [provider, key] = paymentProviderKey.split(':');
    if (provider === 'PAY4IT') {
      // verify PAY4IT payment
      await this.pay4ItProvider.verifyPayment(key);
      return {
        success: true,
        message: 'Payment verified successfully',
      };
    }

    this.logger.error({ message: 'Invalid payment provider', paymentProvider });
    throw new BadRequestException('Invalid payment!');
  }
}
