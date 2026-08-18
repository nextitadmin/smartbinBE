import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

import { UserRole } from './types';
import { Wallet } from './wallet.model';
import { nanoid } from 'node_modules/nanoid/index.cjs';

export enum TransactionStatus {
  Abandoned = 'abandoned',
  Pending = 'pending',
  Successful = 'successful',
  Failed = 'failed',
}

export enum TransactionAction {
  PayNow = 'pay now',
  Paid = 'paid',
  WalletTopUp = 'wallet_topup',
}

export enum PaymentMethod {
  PaymentGateway = 'Payment Gateway',
  Wallet = 'wallet',
}

export enum ServiceType {
  WasteDisposal = 'Waste Bin Disposal',
  Subscription = 'Subscription',
  SmartBinPurchase = 'Smart Bin Purchase',
  WalletTopUp = 'Wallet Top-Up',
  WalletCharge = 'Wallet Charge',
}

export enum PostAction {
  None = 'NONE',
  WasteDisposal = 'WASTE_BIN_DISPOSAL',
  Subscription = 'SUBSCRIPTION',
  SmartBinPurchase = 'SMART_BIN_PURCHASE',
  WalletTopUp = 'WALLET_TOPUP',
  WalletCharge = 'WALLET_CHARGE',
}

export interface TransactionMetadata {
  postAction?: PostAction;
  [key: string]: any;
}

export interface TransactionAttributes {
  userId: Types.ObjectId;
  transactionId?: string;
  userType: UserRole;
  walletId?: Types.ObjectId;
  amount: number;
  transactionReference: string;
  status: TransactionStatus;
  service: ServiceType;
  paymentMethod: PaymentMethod;
  gatewayResponse?: Record<string, any>;
  metadata?: TransactionMetadata;
  description?: string;
  createdAt?: Date;
  completedAt?: Date;
}

@Schema({ timestamps: true })
export class Transaction implements TransactionAttributes {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
    default: nanoid(16).toUpperCase(),
  })
  transactionId?: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Wallet.name,
  })
  walletId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserRole),
  })
  userType: UserRole;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  transactionReference: string;

  @Prop({
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.Abandoned,
  })
  status: TransactionStatus;

  @Prop({
    type: String,
    enum: Object.values(ServiceType),
    required: true,
  })
  service: ServiceType;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
    default: PaymentMethod.Wallet,
  })
  paymentMethod: PaymentMethod;

  @Prop({ type: Object })
  gatewayResponse?: Record<string, any>;

  @Prop()
  description?: string;

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({
    required: false,
    type: Object,
    default: {
      postAction: PostAction.None,
    },
  })
  metadata: TransactionMetadata;
}

export type TransactionDocument = Transaction & Document;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index(
  {
    userId: 1,
    transactionReference: 1,
    service: 1,
  },
  {
    unique: true,
  },
);

TransactionSchema.pre<TransactionDocument>('find', function (next) {
  const obj = this as any;
  if (obj.userId) {
    obj.userId = new Types.ObjectId(obj.userId);
  }
  next();
});

TransactionSchema.pre<TransactionDocument>('findOne', function (next) {
  const obj = this as any;
  if (obj.userId) {
    obj.userId = new Types.ObjectId(obj.userId);
  }
  next();
});
