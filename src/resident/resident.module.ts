import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { Payer, PayerSchema } from '@models/users/payer.model';
import { ResidentService } from './resident.service';
import { ResidentController } from './resident.controller';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBinModule } from '@src/smart-bin/smart-bin.module';
import { SmartBin, SmartBinSchema } from '@models/smart-bin.model';
import { Agent, AgentSchema } from '@models/users/agent.model';
import { Corporate, CorporateSchema } from '@models/users/corporate.model';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import { Bill, BillSchema } from '@models/bill.model';
import { Wallet, WalletSchema } from '@models/wallet.model';
import { ResidentBillController } from './bill/bill.controller';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { KycApplicationController } from './kyc-application/kyc-application.controller';
import { KycModule } from '@src/kyc/kyc.module';
import { BillService } from '@src/bill/bill.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardModule } from '@src/dashboard/dashboard.module';
import { CorporateModule } from '@src/corporate/corporate.module';
import { AgentModule } from '@src/agent/agent.module';
import { FacilityManagerModule } from '@src/facility-manager/facility-manager.module';
import { ResidentPaymentController } from './payment/payment.controller';
import { TransactionService } from '@src/transaction/transaction.service';
import { PayerService } from '@src/payer/payer.service';
import { ResidentReportController } from './report.controller';
import { ReportService } from '@src/report/report.service';
import { Report, ReportSchema } from '@models/report.model';
import { Pickup, PickupSchema } from '@models/pickup';
import { Facility, FacilitySchema } from '@models/facilities';
import { PickupModule } from '@src/waste-management/pickup/pickup.module';
import { NotificationModule } from '@src/notification/notification.module';
// import { ResidentotificationSettingsController } from './notifications/notification.controller';

import { WalletModule } from '@src/wallet/wallet.module';
// import { AdminResidentController } from './admin.controller';
import { TeamMember, TeamMemberSchema } from '@models/team.model';
import { Lga, LgaSchema } from '@models/lgas.model';
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Resident.name,
        schema: ResidentSchema,
      },
      {
        name: Payer.name,
        schema: PayerSchema,
      },
      {
        name: SmartBin.name,
        schema: SmartBinSchema,
      },
      {
        name: Agent.name,
        schema: AgentSchema,
      },
      {
        name: Corporate.name,
        schema: CorporateSchema,
      },
      {
        name: FacilityManager.name,
        schema: FacilityManagerSchema,
      },
      {
        name: Bill.name,
        schema: BillSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
      { name: UserKyc.name, schema: UserKycSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Pickup.name, schema: PickupSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      {name: Lga.name, schema:LgaSchema}
    ]),
    SmartBinModule,
    forwardRef(() => KycModule),
    DashboardModule,
    PickupModule,
    WalletModule,
    TeamMember,
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    ResidentController,
    KycApplicationController,
    ResidentBillController,
    DashboardController,
    ResidentPaymentController,
    ResidentReportController,
    // AdminResidentController,
    // ResidentotificationSettingsController,
  ],
  providers: [
    ResidentService,
    SmartBinService,
    BillService,
    TransactionService,
    PayerService,
    ReportService,
  ],
  exports: [ResidentService, SmartBinService, BillService],
})
export class ResidentModule {}
