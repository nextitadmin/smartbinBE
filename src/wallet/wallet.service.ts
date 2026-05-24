import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletStatus } from '@models/wallet.model';
import {
  TopUpWalletDto,
  TopUpWalletResponseDto,
  GetWalletResponseDto,
} from './dtos/wallet.dto';
import * as crypto from 'crypto';
import {
  ServiceType,
  Transaction,
  TransactionStatus,
} from '@models/transaction.model';
import { TransactionService } from '../transaction/transaction.service';
import { SuccessResponse } from '@common/http';
import { UserRole } from '@models/types';
import { generateRandomChars } from '@common/utils';
import { AuthUser } from '@common/types';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { NotificationType } from '@models/notification.model';
import { ApplicationEnvironment, events } from '@common/constants';
import { NotificationEvent } from '@src/notification/dto/notification.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService<ConfigAttributes>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Resident
  async getResidentWallet(
    userId: string,
  ): Promise<SuccessResponse<GetWalletResponseDto>> {
    const wallet = await this.walletModel
      .findOne({ userId, userType: 'Resident' })
      .lean();

    if (!wallet) throw new NotFoundException('Wallet not found');

    return new SuccessResponse('Wallet retrieved successfully', {
      ledger_balance: wallet.ledger_balance,
      status: wallet.status,
    });
  }

  async initiateTopup({
    accountId,
    accountType,
    dto,
  }: {
    accountId: string;
    dto: TopUpWalletDto;
    accountType: UserRole;
  }) {
    const { amount } = dto;

    const shortId = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `ALAT-${shortId}`;

    let wallet = await this.walletModel.findOne({
      userId: accountId,
      userType: accountType,
    });

    if (!wallet) {
      wallet = await this.walletModel.create({
        userId: accountId,
        userType: accountType,
        available_balance: 0,
        ledger_balance: 0,
        status: WalletStatus.Active,
      });
    }

    // await this.transactionService.createTransaction({
    //   userId,
    //   userType: 'Resident',
    //   amount,
    //   transactionReference: reference,
    //   transactionID: reference,
    //   status: 'pending',
    //   action: 'wallet_topup',
    //   service: 'Wallet Top-Up',
    //   paymentMethod: 'Alat By Wema',
    //   description: 'Wallet top-up via AlatPay',
    // });

    return {
      reference,
      ...this.getWalletCallback(reference),
    };
  }

  async chargeWallet({
    user,
    amount,
    reference,
  }: {
    user: AuthUser;
    amount: number;
    reference?: string;
  }) {
    const wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(user.id),
      userType: user.role,
    });

    if (!wallet) {
      throw new NotFoundException('No wallet found for this user');
    }
    let transaction;

    if (reference) {
      const existingTransaction =
        await this.transactionService.getTransactionByReference(reference);
      if (existingTransaction.status === TransactionStatus.Successful) {
        throw new BadRequestException('Transaction already completed');
      }
      amount = existingTransaction.amount;
      transaction = existingTransaction;
    }

    if (wallet.available_balance < amount) {
      throw new BadRequestException(
        'Insufficient wallet balance to complete operation',
      );
    }

    wallet.available_balance -= amount;
    wallet.ledger_balance -= amount;
    await wallet.save();

    await this.transactionService.updateTransaction({
      reference,
      walletId: wallet._id,
      status: TransactionStatus.Successful,
    });

    if (!reference) {
      const newTransaction = await this.transactionService.initiateTransaction({
        userId: user.id,
        userType: user.role,
        amount,
        service: ServiceType.WalletCharge,
        metadata: {
          description: 'Wallet charge operation',
        },
      });
      if (!newTransaction.success) {
        throw new BadRequestException(newTransaction.message);
      }

      reference = transaction.reference;
      return (transaction = newTransaction.data);
    } else {
      await this.transactionService.updateTransaction({
        reference,
        walletId: wallet._id,
        status: TransactionStatus.Successful,
      });
    }
    // 1️⃣ Email notification
    this.eventEmitter.emit(
      MailNotificationEvents.Application.PickupUpdate,
      new SendEmailEvent({
        to: user.email,
        from: `"LAWMA SMARTBIN" <${process.env.MAIL_FROM}}>`,
        subject: 'Wallet Application Status Update',
        context: {
          name: user.firstName,
          status: transaction.status,
          applicationId: transaction._id,
        },
      }),
    );

    // 2️⃣ In-app notification
    this.eventEmitter.emit(
      events.notifications.created,
      new NotificationEvent({
        userId: user.id,
        title: 'Wallet Application',
        text: `Your Wallet application has been charged and status has been updated.`,
        type: NotificationType.WalletUpdate,
      }),
      // new SendInAppEvent({
      //   userId: user.id,
      //   text: `Your SmartBin application status has been updated to ${status}.`,
      //   type: NotificationType.SmartBinUpdate,
      //   isRead: false,
      // }),
    );

    return reference;
  }

  async getWallet(user: AuthUser) {
    let wallet = await this.walletModel
      .findOne({ userId: new Types.ObjectId(user.id) })
      .lean();
    if (!wallet) {
      wallet = await this.walletModel.create({
        userId: new Types.ObjectId(user.id),
        userType: user.role,
        status: WalletStatus.Active,
      });
    }

    return {
      balance: wallet.available_balance,
      status: wallet.status,
    };
  }

  async initiateTopUp(user: AuthUser, dto: TopUpWalletDto) {
    const transactionReference = `ALAT-${generateRandomChars(
      16,
      'alphanum',
    ).toUpperCase()}`;

    let wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(user.id),
    });
    if (!wallet) {
      wallet = await this.walletModel.create({
        userId: user.id,
        userType: user.role,
        status: WalletStatus.Active,
        available_balance: 0,
        ledger_balance: 0,
      });
    }
    //   // create transaction
    const response = await this.transactionService.initiateTransaction({
      userId: user.id,
      userType: user.role,
      amount: dto.amount,
      reference: transactionReference,
      service: ServiceType.WalletTopUp,
      walletId: String(wallet._id),
      metadata: {
        description: 'Wallet top-up via AlatPay',
        paymentMethod: 'Alat By Wema',
      },
    });
    if (!response.success) {
      throw new BadRequestException(response.message);
    }

    return {
      transactionReference,
      callback: this.getWalletCallback(transactionReference),
    };
  }

  async mockWalletCallback(reference: string) {
    if (
      this.configService.get('applicationEnvironment') ===
      ApplicationEnvironment.Development
    ) {
      throw new NotFoundException('Request not found');
    }

    const transaction =
      await this.transactionService.mockTransactionPaid(reference);
    if (transaction.data.walletId) {
      await this.walletModel.findByIdAndUpdate(transaction.data.walletId, {
        $inc: {
          available_balance: transaction.data.amount,
          ledger_balance: transaction.data.amount,
        },
      });
    }

    return {
      message: 'Transaction verified and wallet credited',
    };
  }

  getWalletCallback(reference: string) {
    const payment_url = `/api/wallets/mock-verify?reference=${reference}`;
    return {
      paymentCallbackUrl: payment_url,
      method: 'GET',
    };
  }

  // async verifyTopUp(reference: string) {
  //   const transaction = await verifyAlatTransaction(reference);
  //   if (!transaction) throw new NotFoundException('Transaction not found');

  //   const wallet = await this.walletModel.findOne({ userId: transaction.userId.toString() });
  //   if (!wallet) throw new NotFoundException('Wallet not found');

  //   wallet.available_balance += transaction.amount;
  //   wallet.ledger_balance += transaction.amount;

  //   await wallet.save();

  //   return {
  //     message: 'Transaction verified and wallet credited',
  //     walletBalance: wallet.available_balance,
  //     transaction,
  //   };
  // }
}
