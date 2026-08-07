import { forwardRef, Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from '../models/wallet.model';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { Payer, PayerSchema } from '@models/users/payer.model';
import { AgentService } from '@src/agent/agent.service';
import { ResidentService } from '@src/resident/resident.service';
import { Corporate, CorporateSchema } from '@models/users/corporate.model';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { Agent, AgentSchema } from '@models/users/agent.model';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import { FacilityManagerService } from '@src/facility-manager/facility-manager.service';
import { CorporateService } from '@src/corporate/corporate.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBin, SmartBinSchema } from '@models/smart-bin.model';
import { Bill, BillSchema } from '@models/bill.model';
import { TransactionModule } from '@src/transaction/transaction.module';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { Branch, BranchSchema } from '@models/branch.model';
import { WalletController } from './wallet.controller';
import { PayerService } from '@src/payer/payer.service';
import { Pickup, PickupSchema } from '@models/pickup';
import { Facility, FacilitySchema } from '@models/facilities';
import { TeamMember, TeamMemberSchema } from '@models/team.model';
import { Lga, LgaSchema } from '@models/lgas.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Payer.name, schema: PayerSchema },
      { name: Corporate.name, schema: CorporateSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: FacilityManager.name, schema: FacilityManagerSchema },
      { name: SmartBin.name, schema: SmartBinSchema },
      { name: Bill.name, schema: BillSchema },
      { name: UserKyc.name, schema: UserKycSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Pickup.name, schema: PickupSchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: TeamMember.name, schema: TeamMemberSchema },
      { name: Lga.name, schema: LgaSchema },
    ]),
    forwardRef(() => TransactionModule),
  ],
  providers: [
    WalletService,
    ResidentService,
    CorporateService,
    FacilityManagerService,
    AgentService,
    SmartBinService,
    PayerService,
  ],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
