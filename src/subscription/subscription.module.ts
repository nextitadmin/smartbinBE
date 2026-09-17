import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscribePlanSeed } from './subscription.seed';
import { SubscriptionWorker } from './subscription.worker';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '@models/subscription-plan.model';
import { Subscription, SubscriptionSchema } from '@models/subscription.model';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { ResidentModule } from '@src/resident/resident.module';
import { CorporateModule } from '@src/corporate/corporate.module';
import { FacilityManagerModule } from '@src/facility-manager/facility-manager.module';
import { AgentModule } from '@src/agent/agent.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SubscriptionPlan.name,
        schema: SubscriptionPlanSchema,
      },
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
    ]),
    ResidentModule,
    CorporateModule,
    FacilityManagerModule,
    AgentModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionWorker, SubscribePlanSeed],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
