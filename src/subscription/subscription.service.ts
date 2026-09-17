import { AuthUser } from '@common/types';
import { SubscriptionPlan } from '@models/subscription-plan.model';
import { Subscription, SubscriptionStatus } from '@models/subscription.model';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscribePlanDTO } from './dto/subscription.dto';
import { Transaction, TransactionStatus } from '@models/transaction.model';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(SubscriptionPlan.name)
    private readonly subscriptionPlans: Model<SubscriptionPlan>,
    @InjectModel(Subscription.name)
    private readonly subscriptions: Model<Subscription>,
    @InjectModel(Transaction.name)
    private readonly transactions: Model<Transaction>,
  ) {}

  async getPlans() {
    return this.subscriptionPlans.find().select('name price interval duration');
  }

  async getStatus(user: AuthUser) {
    return this.subscriptions
      .findOne({ userId: user.id })
      .sort({ startDate: -1 })
      .populate('plan', 'name price interval duration')
      .select('plan status startDate endDate');
  }

  async expireOverdueSubscriptions() {
    const startedAt = Date.now();
    const now = new Date();

    const result = await this.subscriptions.updateMany(
      {
        status: SubscriptionStatus.ACTIVE,
        endDate: { $lte: now },
      },
      {
        $set: { status: SubscriptionStatus.EXPIRED },
      },
    );

    return {
      matchedCount: result.matchedCount,
      expiredCount: result.modifiedCount,
      durationMs: Date.now() - startedAt,
      expiredAt: now,
    };
  }

  async subscribe({ user, dto }: { user: AuthUser; dto: SubscribePlanDTO }) {
    const existingSubscription = await this.subscriptions.findOne({
      userId: user.id,
      status: SubscriptionStatus.ACTIVE,
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has a subscription');
    }

    const plan = await this.subscriptionPlans.findById(dto.plan);
    if (!plan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    const transaction = await this.transactions.findOne({
      transactionReference: dto.transactionReference,
      userId: user.id,
      status: TransactionStatus.Successful,
    });
    if (!transaction) {
      throw new BadRequestException('Invalid transaction reference');
    }

    // Get end date based on plan interval and duration
    const endDate = new Date();
    if (plan.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + plan.duration);
    } else {
      endDate.setFullYear(endDate.getFullYear());
    }

    console.log(
      'Creating new subscription for user:',
      user.id,
      'with plan:',
      plan._id,
    );

    await this.subscriptions.create({
      userId: user.id,
      plan: dto.plan,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate,
    });
  }
}
