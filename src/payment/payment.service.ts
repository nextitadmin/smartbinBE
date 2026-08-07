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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Topics } from '@common/topics';
import { TransactionCompletedJob } from '@src/transaction/dto/transaction-completed.job';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService<ConfigAttributes>,
    private pay4ItProvider: Pay4ItProvider,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectQueue(Topics.Queues.Transactions)
    private readonly transactionsQueue: Queue<TransactionCompletedJob>,
  ) {}

  async handlePaymentNotification(
    notification: Record<string, any>,
    paymentProvider: string,
  ): Promise<any> {
    const paymentProviderKey = this.configService.get('paymentProviderKey');
    const environment = this.configService.get('applicationEnvironment');
    if (!paymentProviderKey) {
      this.logger.error({ message: 'Payment provider key is missing' });
      throw new BadRequestException('Invalid payment!');
    }

    const [provider, key] = paymentProviderKey.split(':');
    if (provider === 'PAY4IT') {
      const [notificationItem] = notification.notificationItems;
      const { notificationRequestItem } = notificationItem;
      const reference = notificationRequestItem.data.reference;
      if (environment === 'production') {
        const response = await this.pay4ItProvider.verifyPayment(reference);
        if (
          response.status !== 'success' &&
          response.data.status !== 'Successful'
        ) {
          throw new UnprocessableEntityException(
            'Payment verification failed or not successful',
          );
        }
      }
      return await this.queueTransactionCompleted(
        reference,
        notificationRequestItem,
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

  async queueTransactionCompleted(reference: string, gatewayResponse: any) {
    await this.transactionsQueue.add(
      Topics.Jobs.TransactionCompleted,
      {
        reference,
        gatewayResponse,
        provider: 'PAY4IT',
        receivedAt: new Date().toISOString(),
      },
      {
        jobId: `tx-completed-${reference}`,
      },
    );

    this.logger.log({
      message: 'Enqueued transaction.completed',
      reference,
      provider: 'Pay4It',
    });
  }
}
