import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { Pay4ItProvider } from './providers/pay4it.provider';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from '@models/transaction.model';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService<ConfigAttributes>,
    private pay4ItProvider: Pay4ItProvider,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private ee: EventEmitter2,
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
      const [notificationItem] = notification.notificationItems;
      const response = await this.pay4ItProvider.verifyPayment(
        notificationItem.data.reference,
      );
      if (
        response.status === 'success' &&
        response.data.status === 'Successful'
      ) {
        await this.ee.emitAsync(
          'transaction.completed',
          response.data.payments.paymentReference,
          response.data,
        );
        return {
          success: true,
          message: 'Payment verified successfully',
        };
      }
      throw new UnprocessableEntityException(
        'Payment verification failed or not successful',
      );
    }

    this.logger.error({ message: 'Invalid payment provider', paymentProvider });
    throw new BadRequestException('Invalid payment!');
  }

  async tsq(reference: string) {
    const tx = await this.transactionModel
      .findOne({ transactionReference: reference })
      .select('status transactionReference')
      .lean();
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }

    return tx;
  }
}
