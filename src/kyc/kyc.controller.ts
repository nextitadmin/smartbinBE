// import { PaginatedSuccessResponse, SuccessResponse } from '@common/http';
import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AuthGuard } from '@common/guards/actor.guard';
import { ApiTags } from '@nestjs/swagger';
import { VerifyNinDto } from './dto/kyc.dto';
import { Auth, AuthenticatedUser } from '@common/decorators/auth.decorator';
import { type AuthUser } from '@common/types';
import { SuccessResponse } from '@common/http';

@ApiTags('Identities')
@Controller({
  path: 'identities',
  version: '1',
})
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('/verify-nin')
  @Auth()
  async verifyNin(
    @Body() body: VerifyNinDto,
    @AuthenticatedUser() user: AuthUser,
  ) {
    const response = await this.kycService.verifyNin({
      ...body,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    return new SuccessResponse('Nin verified successfully', response.status);
  }
}

//   constructor(private readonly kycService: KycService) {}

//   @MessagePattern({ cmd: AdminMessagePatternCommands.KycFlow.GetApplications })
//   async getAllApplications(payload: { page?: string; limit?: string }) {
//     const page = parseInt(payload.page ?? '1', 10);
//     const limit = parseInt(payload.limit ?? '10', 10);

//     const { data: records, paging } = await this.kycService.getAllApplications(
//       page,
//       limit,
//     );
//     return new PaginatedSuccessResponse(
//       'Kyc applications retrieved successfully',
//       records,
//       paging,
//     );
//   }

//   @MessagePattern({
//     cmd: AdminMessagePatternCommands.KycFlow.GetApplicationDetails,
//   })
//   async getApplicationDetails(payload: { applicationId: string }) {
//     const response = await this.kycService.getKycApplicationDetails(
//       payload.applicationId,
//     );
//     return new SuccessResponse(
//       'Kyc application details retrieved successfully',
//       response.data,
//     );
//   }

//   @MessagePattern({
//     cmd: AdminMessagePatternCommands.KycFlow.ApproveApplication,
//   })
//   async approveApplication(payload: { applicationId: string }) {
//     const response = await this.kycService.approveApplication(
//       payload.applicationId,
//     );

//     return new SuccessResponse(
//       'Kyc application approved',
//       response.data
//     );
//   }

//   @MessagePattern({
//     cmd: AdminMessagePatternCommands.KycFlow.RejectApplication,
//   })
//   async rejectApplication(payload: { applicationId: string }) {
//     const response = await this.kycService.rejectApplication(
//       payload.applicationId,
//     );

//     return new SuccessResponse(
//       'Kyc application rejected',
//       response.data,
//     );
//   }
// }
