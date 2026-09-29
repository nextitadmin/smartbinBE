import { forwardRef, Module } from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { CorporateController } from './corporate.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Corporate, CorporateSchema } from '@models/users/corporate.model';
import { CorporateWalletController } from './wallet.controller';
import { WalletModule } from '@src/wallet/wallet.module';
import { TransactionService } from '@src/transaction/transaction.service';
import { Payer, PayerSchema } from '@models/users/payer.model';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBin, SmartBinSchema } from '@models/smart-bin.model';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { Agent, AgentSchema } from '@models/users/agent.model';
import { Bill, BillSchema } from '@models/bill.model';
import { Wallet, WalletSchema } from '@models/wallet.model';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { CorporateBillController } from './bill/bill.controller';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import { SmartBinController } from './smart-bin/smart-bin.controller';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { WasteManagementController } from './waste-management/waste-management.controller';
import { PickupModule } from '@src/waste-management/pickup/pickup.module';
import { WasteManagementService } from '@src/waste-management/waste-management.service';
import { PickupService } from '@src/waste-management/pickup/pickup.service';
import { Pickup, PickupSchema } from '@models/pickup';
import { Facility, FacilitySchema } from '@models/facilities';
import { WasteManagementModule } from '@src/waste-management/waste-management.module';
import { BillService } from '@src/bill/bill.service';
import { BillController } from '@src/bill/bill.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardModule } from '@src/dashboard/dashboard.module';
import { Branch, BranchSchema } from '@models/branch.model';
// import { CorporateNotificationSettingsController } from './notifications/notification.controller';
import { NotificationModule } from '@src/notification/notification.module';
import { NotificationSettingsService } from '@src/notification/notification-setting.service';
import { KycApplicationController } from './kyc-application/kyc-application.controller';
import { KycModule } from '@src/kyc/kyc.module';
import { CorporatePaymentController } from './payment/payment.controller';
import { ReportService } from '@src/report/report.service';
import { Report, ReportSchema } from '@models/report.model';
import { PayerService } from '@src/payer/payer.service';
import { TeamMember, TeamMemberSchema } from '@models/team.model';
import { UserKycRepository } from '@models/repository/user-kyc.repository';
import { Lga,LgaSchema } from '@models/lgas.model';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Corporate.name, schema: CorporateSchema },
      { name: Payer.name, schema: PayerSchema },
      { name: SmartBin.name, schema: SmartBinSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: FacilityManager.name, schema: FacilityManagerSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: UserKyc.name, schema: UserKycSchema },
      { name: Pickup.name, schema: PickupSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      {name: Lga.name, schema:LgaSchema}
    ]),
    WalletModule,
    PickupModule,
    DashboardModule,
    forwardRef(() => NotificationModule),
    forwardRef(() => KycModule),
    TeamMember,
  ],

  controllers: [
    CorporateController,
    CorporateWalletController,
    CorporateBillController,
    SmartBinController,
    WasteManagementController,
    DashboardController,
    // CorporateNotificationSettingsController,
    KycApplicationController,
    CorporatePaymentController,
  ],
  providers: [
    CorporateService,
    TransactionService,
    SmartBinService,
    BillService,
    WasteManagementService,
    ReportService,
    PayerService,
  ],
  exports: [CorporateService],
})
export class CorporateModule {}
