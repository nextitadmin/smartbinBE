import { SuccessResponse } from '@common/http';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ChangeStatusPspTeamDto,
  CreatePspMembersDTO,
  DeletePspMembersParamDTO,
  IdDTO,
  memberIdDTO,
  UpdatePspMembersStatusBodyDTO,
  UpdatePspMembersStatusParamDTO,
} from '../../dto/psp.dto';
import { ApiTags } from '@nestjs/swagger';
import { PspTeamManagement } from './teamManagement.service';
import {
  AuthenticatedPspUser,
  PspUserAuth,
} from '@common/decorators/auth.decorator';
import { PspUser } from '@common/types';

@ApiTags('PSPs Team Management')
@Controller({
  path: 'lawma/psps/team',
  version: '1',
})
@PspUserAuth()
export class PspTeamManagementController {
  constructor(private readonly pspTeamService: PspTeamManagement) {}

  @Post('members')
  async createPspMembers(
    @AuthenticatedPspUser() pspUser: PspUser,
    @Body() pspMembers: CreatePspMembersDTO,
  ) {

    const response = await this.pspTeamService.createPspMembers(pspMembers, pspUser );
    return new SuccessResponse('psp members created', response);
  }

  @Get('members')
  async getPspMembers(@AuthenticatedPspUser() pspAdmin: PspUser) {
    const response = await this.pspTeamService.getPspMembers(pspAdmin.pspId);
    return new SuccessResponse('psp members fetched', response);
  }

  @Put('members/:memberId')
  async updatePspMembersStatus(
    @AuthenticatedPspUser() pspAdmin: PspUser,
    @Param() param: UpdatePspMembersStatusParamDTO,
    @Body() body: UpdatePspMembersStatusBodyDTO,
  ) {
    const response = await this.pspTeamService.updatePspMembersStatus({
      pspId: pspAdmin.pspId,
      memberId: param.memberId,
      status: body.status,
    });
    return new SuccessResponse('psp members updated', response);
  }

  @Delete('members/:memberId')
  async deletePspMember(@Param() param: DeletePspMembersParamDTO) {
    const response = await this.pspTeamService.deletePspMembers(param.memberId);

    return new SuccessResponse('psp member removed successfully', response);
  }

   @Put('members/:memberId/change-status')
    async deactivatePsp(@Param() param: memberIdDTO, @Body() body: ChangeStatusPspTeamDto) {
      const response = await this.pspTeamService.changePspTeamStatus(param.memberId, body.status);
      return new SuccessResponse('psp deactivated', response);
    }
}
