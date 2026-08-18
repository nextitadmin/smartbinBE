import { generateRandomChars } from '@common/utils';
import {
  PostAction,
  ServiceType,
  Transaction,
  TransactionMetadata,
  TransactionStatus,
} from '@models/transaction.model';
import { UserRole } from '@models/types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { AuthUser } from '@common/types';
import { Paging } from '@common/http';
import { toWords } from 'number-to-words';
import { PayerService } from '@src/payer/payer.service';
import { Resident } from '@models/users/resident.model';
import { Agent } from '@models/users/agent.model';
import { Corporate } from '@models/users/corporate.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { WalletService } from '@src/wallet/wallet.service';
import { TransactionCompletedJob } from './dto/transaction-completed.job';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name) private transactions: Model<Transaction>,
    @Inject(forwardRef(() => PayerService))
    private readonly payerService: PayerService,
    @InjectModel('Resident') private readonly residentModel: Model<Resident>,
    @InjectModel('Agent') private readonly agentModel: Model<Agent>,
    @InjectModel('Corporate') private readonly corporateModel: Model<Corporate>,
    @InjectModel('FacilityManager')
    private readonly facilityManagerModel: Model<FacilityManager>,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  private convertToWords(amount: number): string {
    return toWords(amount).replace(/^\w/, (c) => c.toUpperCase());
  }

  async initiateTransaction({
    userId,
    userType,
    amount,
    walletId,
    service,
    reference,
    metadata,
  }: {
    userId: string;
    userType: UserRole;
    amount: number;
    service: ServiceType;
    walletId?: string;
    reference?: string;
    metadata?: TransactionMetadata & Record<string, any>;
  }) {
    if (!reference) {
      reference = `TX-${Date.now()}-${generateRandomChars(
        8,
        'alphanum',
      ).toUpperCase()}`;
    }

    const referenceExists = await this.transactions.exists({ reference });
    if (referenceExists) {
      return {
        success: false,
        message: 'Transaction reference already exists',
      };
    }

    await this.transactions.create({
      userId,
      userType,
      walletId,
      amount,
      transactionReference: reference,
      service,
      status:
        service === ServiceType.WalletCharge
          ? TransactionStatus.Successful
          : TransactionStatus.Abandoned,
      metadata: metadata || {
        postAction: PostAction.None,
      },
    });

    return {
      success: true,
      message: 'Transaction initiated successfully',
      data: {
        reference,
      },
    };
  }

  async mockTransactionPaid(reference: string) {
    const transaction = await this.transactions.findOne({
      transactionReference: reference,
    });

    if (!transaction) {
      throw new BadRequestException('Invalid transaction');
    }

    transaction.status = TransactionStatus.Successful;
    transaction.completedAt = new Date();
    await transaction.save();

    return {
      success: true,
      message: 'Transaction marked as paid successfully',
      data: transaction,
    };
  }

  async getTransactions({
    user,
    paging,
  }: {
    user: AuthUser;
    paging: Partial<Paging>;
  }) {
    const query = {
      userId: new Types.ObjectId(user.id),
      userType: user.role,
    };
    const limit = paging.size || 10;
    const page = paging.page || 1;
    const totalDocuments = await this.transactions.countDocuments(query);
    const transactions = await this.transactions
      .find(query)
      .select('-__v -updatedAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const pagingData = {
      total: totalDocuments,
      page,
      limit,
      pages: Math.ceil(totalDocuments / limit),
    };
    return {
      transactions,
      paging: pagingData,
    };
  }

  async getReceipt(transactionId: string, user: AuthUser) {
    const transaction = await this.transactions
      .findOne({
        _id: new Types.ObjectId(transactionId),
        userId: new Types.ObjectId(user.id),
      })
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found or access denied');
    }
    const userInfo = await this.getUserInfo(user);
    const amount = transaction.amount;
    const receipt = {
      receiptFor: `${userInfo?.firstName ?? ''} ${
        userInfo.lastName ?? ''
      }`.trim(),
      phoneNumber: userInfo.phoneNumber ?? '-',
      paymentId: transaction.transactionReference ?? '-',
      transactionId: transaction._id,
      transactionRef: transaction.transactionReference ?? '-',
      transactionDate: transaction.createdAt,
      description: transaction.description || 'Waste Bin Disposal',
      amount,
      amountInWords: `${this.convertToWords(amount)} Naira Only`,
    };

    return receipt;
  }

  private async getUserInfo(user: AuthUser): Promise<{
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    surname?: string;
  }> {
    if (user.role === 'Resident') {
      return await this.residentModel
        .findById(user.id)
        .select('firstName lastName phoneNumber')
        .lean();
    } else if (user.role === 'Agent') {
      return await this.agentModel
        .findById(user.id)
        .select('firstName lastName phoneNumber')
        .lean();
    } else if (user.role === 'Corporate') {
      return await this.corporateModel
        .findById(user.id)
        .select('firstName lastName phoneNumber')
        .lean();
    } else if (user.role === 'Facility') {
      return await this.facilityManagerModel
        .findById(user.id)
        .select('firstName lastName phoneNumber')
        .lean();
    } else {
      return {};
    }
  }

  async getTransactionByReference(reference: string) {
    const transaction = await this.transactions
      .findOne({
        transactionReference: reference,
      })
      .lean();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async updateTransaction(param: {
    reference: string;
    walletId?: Types.ObjectId;
    status?: TransactionStatus;
  }) {
    return this.transactions.findOneAndUpdate(
      {
        transactionReference: param.reference,
      },
      {
        $set: {
          walletId: param.walletId,
          status: param.status,
        },
      },
      {
        new: true,
        lean: true,
      },
    );
  }

  /**
   * Idempotent completion handler for webhook-driven payments (BullMQ worker).
   * Safe across retries: status update and wallet credit are each guarded.
   */
  async completeFromWebhook(data: TransactionCompletedJob) {
    const existing = await this.transactions
      .findOne({ transactionReference: data.reference })
      .lean();

    if (!existing) {
      this.logger.warn({
        message: 'Transaction not found for completion job',
        reference: data.reference,
        provider: data.provider,
      });
      return;
    }

    let transaction = existing;

    if (existing.status !== TransactionStatus.Successful) {
      const updated = await this.transactions
        .findOneAndUpdate(
          {
            transactionReference: data.reference,
            status: { $ne: TransactionStatus.Successful },
          },
          {
            $set: {
              status: TransactionStatus.Successful,
              completedAt: new Date(),
              gatewayResponse: data.gatewayResponse,
            },
          },
          { new: true },
        )
        .lean();

      if (updated) {
        transaction = updated;
      } else {
        // Race: another worker marked it successful
        transaction = await this.transactions
          .findOne({ transactionReference: data.reference })
          .lean();
        if (!transaction) {
          return;
        }
      }
    } else {
      this.logger.log({
        message: 'Transaction already successful; checking post-actions',
        reference: data.reference,
      });
    }

    if (
      transaction.metadata?.postAction === PostAction.WalletTopUp &&
      transaction.walletId &&
      !transaction.metadata?.walletCredited
    ) {
      // Claim credit slot first so concurrent/retried jobs cannot double-credit.
      const claimed = await this.transactions
        .findOneAndUpdate(
          {
            transactionReference: data.reference,
            'metadata.walletCredited': { $ne: true },
          },
          { $set: { 'metadata.walletCredited': true } },
          { new: true },
        )
        .lean();

      if (!claimed) {
        this.logger.log({
          message: 'Wallet already credited; skipping',
          reference: data.reference,
        });
        return;
      }

      try {
        await this.walletService.creditWalletForTransaction({
          walletId: transaction.walletId,
          amount: transaction.amount,
          transactionReference: transaction.transactionReference,
        });
      } catch (error) {
        await this.transactions.updateOne(
          { transactionReference: data.reference },
          { $unset: { 'metadata.walletCredited': 1 } },
        );
        throw error;
      }
    }
  }
}
