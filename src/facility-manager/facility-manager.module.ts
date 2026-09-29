import { forwardRef, Module } from '@nestjs/common';
import { FacilityManagerService } from './facility-manager.service';
import { FacilityManagerController } from './facility-manager.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import { Payer, PayerSchema } from '@models/users/payer.model';
import { SmartBinController } from './smart-bin/smart-bin.controller';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBinModule } from '@src/smart-bin/smart-bin.module';
import { FacilityController } from './facility/facility.controller';
import { FacilityService } from './facility/facility.service';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { KycApplicationController } from './kyc-application/kyc-application.controller';
import { KycModule } from '@src/kyc/kyc.module';
import { FacilityManagerPaymentController } from './payment/payment.controller';
import { TransactionModule } from '@src/transaction/transaction.module';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { SmartBin, SmartBinSchema } from '@models/smart-bin.model';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { Corporate, CorporateSchema } from '@models/users/corporate.model';
import { Agent, AgentSchema } from '@models/users/agent.model';
import { Wallet, WalletSchema } from '@models/wallet.model';
import { Bill, BillSchema } from '@models/bill.model';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from '@src/dashboard/dashboard.service';
import { WalletService } from '@src/wallet/wallet.service';
import { FacilityManagerWalletController } from './wallet.controller';
import { Pickup, PickupSchema } from '@models/pickup';
import { Facility, FacilitySchema } from '@models/facilities';
import { TeamMember, TeamMemberSchema } from '@models/team.model';
import { ReportService } from '@src/report/report.service';
import { Report, ReportSchema } from '@models/report.model';
import { FacilityManagerReportController } from './report.controller';
import { FacilityUserController } from './user-management/facility-user.controller';
import { FacilityUserService } from './user-management/facility-user.service';
import { FacilityUsers, FacilityUserSchema } from '@models/facility-users.model';
import { BillService } from '@src/bill/bill.service';
import { FacilityManagerBillController } from './bill/bill.controller';
import { Lga,LgaSchema } from '@models/lgas.model';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payer.name, schema: PayerSchema },
      { name: FacilityManager.name, schema: FacilityManagerSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: Corporate.name, schema: CorporateSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: UserKyc.name, schema: UserKycSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: SmartBin.name, schema: SmartBinSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Pickup.name, schema: PickupSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: Report.name, schema: ReportSchema },
      { name: FacilityUsers.name, schema: FacilityUserSchema },
      {name: Lga.name, schema:LgaSchema}
    ]),
    SmartBinModule,
    forwardRef(() => KycModule),
    TransactionModule,
  ],
  controllers: [
    FacilityManagerController,
    DashboardController,
    FacilityManagerWalletController,
    SmartBinController,
    FacilityController,
    KycApplicationController,
    FacilityManagerPaymentController,
    FacilityManagerReportController,
    FacilityUserController,
    FacilityManagerBillController,
  ],
  providers: [
    FacilityManagerService,
    FacilityService,
    DashboardService,
    WalletService,
    ReportService,
    FacilityUserService,
    BillService,
  ],
  exports: [FacilityManagerService, FacilityService],
})
export class FacilityManagerModule {}
