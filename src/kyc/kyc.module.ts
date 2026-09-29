import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resident, ResidentSchema } from '@models/users/resident.model';
import { UserKyc, UserKycSchema } from '@models/user-kyc.model';
import { KycService } from './kyc.service';
import {
  FacilityManager,
  FacilityManagerSchema,
} from '@models/users/facility-manager.model';
import {
  CorporateTeam,
  CorporateTeamSchema,
} from '@models/corporate-team.model';
import { TrustpointlyModule } from '@src/integrations/trustpointly/trustpointly.module';
import { KycController } from './kyc.controller';
import { ResidentModule } from '@src/resident/resident.module';
import { AgentModule } from '@src/agent/agent.module';
import { CorporateModule } from '@src/corporate/corporate.module';
import { FacilityManagerModule } from '@src/facility-manager/facility-manager.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserKyc.name, schema: UserKycSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: FacilityManager.name, schema: FacilityManagerSchema },
      { name: CorporateTeam.name, schema: CorporateTeamSchema },
    ]),
    TrustpointlyModule,
    forwardRef(() => ResidentModule),
    forwardRef(() => AgentModule),
    forwardRef(() => CorporateModule),
    forwardRef(() => FacilityManagerModule),
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
