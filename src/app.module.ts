import { Module } from '@nestjs/common';
import { mongodbConfigOptions } from './config/mongo.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigAttributes, configModuleOpts } from './config';
import { NotificationModule } from './notification/notification.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigOpts } from './config/jwt.config';
import { LoggerModule } from 'nestjs-pino';
import { loggerModuleOpts } from './config/logger.config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CacheModule } from '@nestjs/cache-manager';
import { cacheModuleConfigOpts } from './config/cache.config';
import { exec } from 'child_process';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { TransactionModule } from './transaction/transaction.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentModule } from './agent/agent.module';
import { PayerModule } from './payer/payer.module';
import { BillModule } from './bill/bill.module';
import { AppController } from './app.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { SmartBinModule } from './smart-bin/smart-bin.module';
import { ResidentModule } from './resident/resident.module';

import { APP_GUARD } from '@nestjs/core';
import { AgentAuthGuard } from '@common/guards/agent.guard';
import { ResidentAuthGuard } from '@common/guards/resident.guard';
import { CorporateAuthGuard } from '@common/guards/corporate.guard';
import { FacilityManagerAuthGuard } from '@common/guards/facility-manager.guard';
import { MediaModule } from './media/media.module';
import { FacilityManagerModule } from './facility-manager/facility-manager.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PickupModule } from './waste-management/pickup/pickup.module';
import { UtilityModule } from './utility/utility.module';
import { AuthGuard } from '@common/guards/actor.guard';
import { SupportModule } from './support/support.module';
import { WalletController } from './wallet/wallet.controller';
import { ReportModule } from './report/report.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { WasteManagementModule } from './waste-management/waste-management.module';
import { TeamModule } from './team/team.module';
// import { UsersModule } from './users/users.module';
// import { AppService } from './app.service';
// import { SuperAdminController } from './super-admin/super-admin.controller';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { LawmaModule } from './lawma/lawma.module';
import { RbacModule } from './rbac/rbac.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOpts),
    LoggerModule.forRootAsync(loggerModuleOpts),
    MongooseModule.forRootAsync(mongodbConfigOptions),
    JwtModule.registerAsync(jwtConfigOpts),
    CacheModule.registerAsync(cacheModuleConfigOpts),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    QueuesModule,
    HttpModule,
    NotificationModule,
    PaymentModule,
    TransactionModule,
    PayerModule,
    AgentModule,
    ResidentModule,
    FacilityManagerModule,
    BillModule,
    DashboardModule,
    SmartBinModule,
    MediaModule,
    UtilityModule,
    IntegrationsModule,
    PickupModule,
    SupportModule,
    WalletModule,
    ReportModule,
    SubscriptionModule,
    WasteManagementModule,
    TeamModule,
    SuperAdminModule,
    LawmaModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useValue: AgentAuthGuard,
    },
    {
      provide: APP_GUARD,
      useValue: ResidentAuthGuard,
    },
    {
      provide: APP_GUARD,
      useValue: CorporateAuthGuard,
    },
    {
      provide: APP_GUARD,
      useValue: FacilityManagerAuthGuard,
    },
    {
      provide: APP_GUARD,
      useValue: AuthGuard,
    },
  ],
})
export class AppModule {
  onApplicationBootstrap() {
    exec('npm run copy:assets');
  }
}
