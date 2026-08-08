import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { KycFlowService } from './kycFlow.service';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { RejectKycDto } from './dto/reject-kyc.dto';


@ApiTags('Admin/Kyc Applications')
@Controller({
  path: 'lawma/kycs',
  version: '1',
})
export class KycFlowController {
  constructor(private readonly kycService: KycFlowService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['pending', 'approved', 'rejected'],
  })
  getApplications(
    @Query('page') page = '1', 
    @Query('limit') limit = '10',
    @Query('status') status: string,
  ) {
    return this.kycService.getAllApplications(Number(page), Number(limit), status);
  }

  @Get(':id')
  getApplicationDetails(@Param('id') applicationId: string) {
    return this.kycService.getApplicationDetails(applicationId);
  }

  @Patch(':id/approve')
  approveApplication(@Param('id') applicationId: string) {
    return this.kycService.approveApplication(applicationId);
  }

  @Patch(':id/verify-nin')
  verifyNin(@Param('id') applicationId: string) {
    return this.kycService.verifyNin(applicationId);
  }

  @Patch(':id/reject')
  rejectApplication(
    @Param('id') applicationId: string,
    @Body() dto: RejectKycDto,
  ) {
    return this.kycService.rejectApplication(applicationId, dto?.reason);
  }
}
