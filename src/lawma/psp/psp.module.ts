import { Module } from '@nestjs/common';
import { PspController } from './psp.controller';
import { PspService } from './psp.service';
import { PSP, PSPSchema } from '@models/psp.model';
import { MongooseModule } from '@nestjs/mongoose';
import { PSPUsers, PSPUsersSchema } from '@models/psp-users.model';
import { Lga, LgaSchema } from '@models/lgas.model';
import {
  Administrator,
  AdministratorSchema,
} from '@models/administrator.model';
import { PspAuthController } from './psp-users/auth/auth.controller';
import { PspAuthService } from './psp-users/auth/auth.service';
import { PspWasteManagementController } from '../waste-management/psp.waste-management.controller';
import { LawmaWasteManagementService } from '../waste-management/waste-management.service';
import { PickupModule } from '@src/waste-management/pickup/pickup.module';
import { PSPReportController } from '../report/psp.controller';
import { AdminReportService } from '../report/report.service';
import { ReportModule } from '@src/report/report.module';
import { AuthService } from '../auth/auth.service';
import { RbacModule } from '@src/rbac/rbac.module';
import { PspTeamManagementController } from './psp-users/team-management/teamManagement.controller';
import { PspTeamManagement } from './psp-users/team-management/teamManagement.service';
import { PSPTeamReportController } from '../report/psp-team.controller';

@Module({
  controllers: [
    PspController,
    PspAuthController,
    PspWasteManagementController,
    PSPReportController,
    PSPTeamReportController,
    PspTeamManagementController
  ],
  providers: [
    PspService,
    PspAuthService,
    LawmaWasteManagementService,
    AdminReportService,
    AuthService,
    PspTeamManagement,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: PSP.name, schema: PSPSchema },
      { name: PSPUsers.name, schema: PSPUsersSchema },
      { name: Administrator.name, schema: AdministratorSchema },
      { name: Lga.name, schema: LgaSchema },
    ]),
    PickupModule,
    ReportModule,
    RbacModule,
  ],
  exports: [PspAuthService, PspService],
})
export class PspModule {}
