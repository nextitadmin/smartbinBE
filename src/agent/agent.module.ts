import { forwardRef, Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Agent, AgentSchema } from '@models/users/agent.model';
import { Payer, PayerSchema } from '@models/users/payer.model';
import { AgentWalletController } from './agent-wallet.controller';
import { Wallet, WalletSchema } from '@models/wallet.model';
import { WalletService } from '@src/wallet/wallet.service';
import { WalletModule } from '@src/wallet/wallet.module';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { TransactionModule } from '@src/transaction/transaction.module';
import { AgentPaymentController } from './payment/payment.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from '@src/dashboard/dashboard.service';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { SmartBin, SmartBinSchema } from '@models/smart-bin.model';
import { Bill, BillSchema } from '@models/bill.model';
import { Corporate, CorporateSchema } from '@models/users/corporate.model';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { Pickup, PickupSchema } from '@models/pickup';
import { KycApplicationController } from './kyc-application/kyc-application.controller';
import { KycService } from '@src/kyc/kyc.service';
import {
  CorporateTeam,
  CorporateTeamSchema,
} from '@models/corporate-team.model';
import { TeamMember, TeamMemberSchema } from '@models/team.model';
import { ManagementsModule } from './managements/managements.module';
import { ReportService } from '@src/report/report.service';
import { AgentReportController } from './report.controller';
import { Report, ReportSchema } from '@models/report.model';
import { AgentSmartbinController } from './bin-management/bin-management.controller';
import { AgentSmartbinService } from './bin-management/bin-management.service';
import { SmartBinModule } from '@src/smart-bin/smart-bin.module';
import { Lga,LgaSchema } from '@models/lgas.model';
import { TrustpointlyModule } from '@src/integrations/trustpointly/trustpointly.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Agent.name,
        schema: AgentSchema,
      },
      {
        name: Corporate.name,
        schema: CorporateSchema,
      },
      {
        name: Resident.name,
        schema: ResidentSchema,
      },
      {
        name: FacilityManager.name,
        schema: FacilityManagerSchema,
      },
      { name: Transaction.name, schema: TransactionSchema },
      { name: SmartBin.name, schema: SmartBinSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Pickup.name, schema: PickupSchema },
      { name: Report.name, schema: ReportSchema },

      {
        name: Payer.name,
        schema: PayerSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
      {
        name: UserKyc.name,
        schema: UserKycSchema,
      },
      {
        name: CorporateTeam.name,
        schema: CorporateTeamSchema,
      },
      {
        name: TeamMember.name,
        schema: TeamMemberSchema,
      },
      {name: Lga.name, schema:LgaSchema}
    ]),
    forwardRef(() => WalletModule),
    forwardRef(() => TransactionModule),
    forwardRef(() => SmartBinModule),
    ManagementsModule,
    TrustpointlyModule,
  ],
  providers: [
    AgentService,
    WalletService,
    DashboardService,
    KycService,
    ReportService,
    AgentSmartbinService,
  ],
  exports: [AgentService],
  controllers: [
    AgentController,
    DashboardController,
    AgentWalletController,
    AgentPaymentController,
    KycApplicationController,
    AgentReportController,
    AgentSmartbinController,
  ],
})
export class AgentModule {}
