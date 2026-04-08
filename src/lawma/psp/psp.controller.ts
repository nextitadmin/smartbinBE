import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PspService } from './psp.service';
import {
  ChangeStatusPspDto,
  CreatePspDTO,
  CreatePspMembersDTO,
} from './dto/psp.dto';
import { SuccessResponse } from '@common/http';
import {
  IdDTO,
  UpdatePspMembersStatusBodyDTO,
  UpdatePspMembersStatusParamDTO,
} from './dto/psp.dto';
import {
  AdminAuth,
  AuthenticatedAdmin,
  AuthenticatedPspUser,
} from '@common/decorators/auth.decorator';
import { AdminUser, PspUser } from '@common/types';
import { AddRoleDto } from '@src/rbac/dto/rbac.dto';
import { Request as UserRequest } from 'express';
import { Public } from '@common/guards/public.guard';

@ApiTags('PSPs')
@Controller({
  path: 'psps',
  version: '1',
})
@AdminAuth()
export class PspController {
  constructor(private readonly pspService: PspService) {}

  @Post()
  async createPsp(
    @Body() psp: CreatePspDTO,
    @AuthenticatedAdmin() admin: AdminUser,
  ) {
    const response = await this.pspService.createPsp(psp, admin);
    return new SuccessResponse('psp created', response);
  }

  // @Post('/:id/members')
  // async createPspMembers(
  //   @Param() param: IdDTO,
  //   @Body() pspMembers: CreatePspMembersDTO,
  // ) {
  //   const response = await this.pspService.createPspMembers({
  //     psp_id: param.id,
  //     ...pspMembers,
  //   });
  //   return new SuccessResponse('psp members created', response);
  // }

  @Get('/lgas')
  async getPspLgas() {
    const response = await this.pspService.getPspLgas();
    return new SuccessResponse('psp lgas fetched', response);
  }

  @Get()
  async getPsps() {
    const response = await this.pspService.getPsps();
    return new SuccessResponse('psps fetched', response);
  }

  @Get(':id')
  async getPsp(@Param() param: IdDTO) {
    const response = await this.pspService.getPsp(param.id);
    return new SuccessResponse('psp fetched', response);
  }

  @Put(':id/change-status')
  async deactivatePsp(@Param() param: IdDTO, @Body() body: ChangeStatusPspDto, @AuthenticatedAdmin() admin: AdminUser) {
    const response = await this.pspService.changePspStatus(
      param.id,
      body.status,
      admin
    );
    return new SuccessResponse('psp deactivated', response);
  }


  @Public()
  @Get('roles')
  async getRoles(@AuthenticatedPspUser() pspUser: PspUser) {
    const roles = await this.pspService.getRoles(pspUser.pspId);
    return new SuccessResponse('roles fetched', roles);
  }

  @Get('permissions')
  async getPermissions(@AuthenticatedPspUser() pspUser: PspUser) {
    const permissions = await this.pspService.getPermissions();
    return new SuccessResponse('permissions fetched', permissions);
  }

  @Post('roles')
  async createRole(
    @AuthenticatedPspUser() pspUser: PspUser,
    @Body() payload: AddRoleDto,
  ) {
    await this.pspService.addRole({
      ...payload,
      createdBy: pspUser.pspId,
    });
    return new SuccessResponse('role add', null);
  }
}
