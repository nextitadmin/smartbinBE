import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiQuery,ApiParam } from '@nestjs/swagger';
import { LawmaSmartbinPartnersService } from './smartbin-partners.service';
import { AdminAuth } from '@common/decorators/auth.decorator';
import { SuccessResponse } from '@common/http';
import {
  DeliveryData,
  GetApplicationsDto,
  GetDeliveredApplicationsDto,
  GetTeamMemberBinsFilterDto,
  orderBinsDto,
} from '@src/smart-bin/dto/binAppDto';
import { SmartbinStatus } from '@models/smart-bin.model';

@ApiTags('Admin/Smartbin Partners')
@Controller({
  path: 'lawma/smartbin-partners',
  version: '1',
})
// @AdminAuth()
export class SmartbinPartnersController {
  constructor(
    private readonly smartbinPartnersService: LawmaSmartbinPartnersService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return this.smartbinPartnersService.getSmartBinPartnersDashboard();
  }
  @Get('team-member/:partnerId')
  async getTeamMemberDashboard(@Param('partnerId') partnerId: string) {
    const dashboard =
      await this.smartbinPartnersService.getSmartBinTeamMemberDashboard(
        partnerId,
      );
    return new SuccessResponse('Dashboard retrieved', dashboard);
  }

  @Get('order-management')
  async getApplications(@Query() filters: GetApplicationsDto) {
    const orders = await this.smartbinPartnersService.getAllOrders(filters);
    return new SuccessResponse('Orders retrieved', orders);
  }

  @Get('order/application-details')
  @ApiQuery({ name: 'applicationId', type: String, required: true })
  async getApplicationDetails(@Query('applicationId') applicationId: string) {
    return this.smartbinPartnersService.getOrderDetails(applicationId);
  }

  @Get('order/delivered')
  async getDeliveredApplications(
    @Param() param: { status: string },
    @Query() filters: GetDeliveredApplicationsDto,
  ) {
    return this.smartbinPartnersService.getDeliveredBins(filters);
  }

  @Put('schedule-delivery')
  @ApiQuery({ name: 'applicationId', type: String, required: true })
  @ApiQuery({ name: 'teamMemberId', type: String, required: true })
  @ApiQuery({ name: 'comment', type: String, required: false })
  async scheduleDelivery(
    @Query('applicationId') applicationId: string,
    @Query('teamMemberId') teamMemberId: string,
    @Query('comment') comment = '',
  ) {
    const schedule = await this.smartbinPartnersService.scheduleDelivery({
      applicationId,
      teamMemberId,
      comment,
    });
    return new SuccessResponse('Smartbin Scheduled or deleivery', schedule);
  }

  @Patch(':id/update-status')
  async updateBinApplicationStatus(
    @Param('id') id: string,
    @Body('status') bodyStatus: SmartbinStatus,
    @Query('status') queryStatus: SmartbinStatus,
  ) {
    // The portal sends { status } in the body; the query string is kept for existing callers.
    const status = bodyStatus ?? queryStatus;
    if (!status || !Object.values(SmartbinStatus).includes(status)) {
      throw new BadRequestException(
        `status must be one of: ${Object.values(SmartbinStatus).join(', ')}`,
      );
    }

    const update = await this.smartbinPartnersService.updateOrderStatus(
      id,
      status,
    );

    return new SuccessResponse('Status updated successfully', update);
  }

  @Patch('team=member/:id/deliver')
  async deliverSmartbin(@Param('id') id: string, @Body() data: DeliveryData) {
    const update = await this.smartbinPartnersService.deliverBin(id, data);

    return new SuccessResponse('Status updated successfully', update);
  }

  @Get('team-member/:teamMemberId/delivered')
  @ApiParam({ name: 'teamMemberId', description: 'Team member ID' })
  async getTeamMemberDeliveredBins(
    @Param('teamMemberId') teamMemberId: string,
    @Query() filters: GetTeamMemberBinsFilterDto,
  ) {
    return this.smartbinPartnersService.getTeamMemberDeliveredBins(
      teamMemberId,
      filters,
    );
  }

  @Get('team-member/:teamMemberId/activated')
  @ApiParam({ name: 'teamMemberId', description: 'Team member ID' })
  async getTeamMemberActivatedBins(
    @Param('teamMemberId') teamMemberId: string,
    @Query() filters: GetTeamMemberBinsFilterDto,
  ) {
    return this.smartbinPartnersService.getTeamMemberActivatedBins(
      teamMemberId,
      filters,
    );
  }
}
