import {
  AgentAuth,
  AuthenticatedAgent,
} from '@common/decorators/auth.decorator';
import { AgentUser } from '@common/types';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import { CreateApplicationDto } from '@src/resident/dto/resident.dto';
import { AgentSmartbinService } from './bin-management.service';
import { PaginatedSuccessResponse, SuccessResponse } from '@common/http';
import { ApiTags } from '@nestjs/swagger';
import { IdParamDTO } from '../dto/agent.dto';

@Controller({
  path: '/smartbin-applications',
  version: '1',
})
@ApiTags('Agent - Bin Management')
@AgentAuth()
export class AgentSmartbinController {
  constructor(private readonly agentSmartbinService: AgentSmartbinService) {}

  @Get()
  async getAgentSmartbins(
    @AuthenticatedAgent() agent: AgentUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ): Promise<PaginatedSuccessResponse> {
    const response = await this.agentSmartbinService.getAgentBinApplications({
      agentId: agent.id,
      limit: Number(limit),
      page: Number(page),
    });
    return new PaginatedSuccessResponse(
      'fetched',
      response.data,
      response.paging,
    );
  }

  @Post('resident')
  async createResidentApplication(
    @AuthenticatedAgent() agent: AgentUser,
    @Body() body: CreateApplicationDto,
  ) {
    body.agentId = agent.id;
    const response =
      await this.agentSmartbinService.createResidentBinApplication(body);

    return new SuccessResponse('created', response);
  }

  @Post('corporate')
  async createCorporateApplication(
    @AuthenticatedAgent() agent: AgentUser,
    @Body() body: CreateApplicationDto,
  ) {
    const response =
      await this.agentSmartbinService.createCorporateBinApplication({
        agentId: agent.id,
        body,
      });

    return new SuccessResponse('created', response);
  }

  @Get(':id')
  async getBinApplicationById(@Param() { id }: IdParamDTO) {
    const response = await this.agentSmartbinService.getApplicationById(id);
    return new SuccessResponse('fetched', response);
  }

  @Get(':orderId/status-timeline')
  async getOrderTimeline(@Param('orderId') orderId: string) {
    return this.agentSmartbinService.trackApplicationById(orderId);
  }

  @Delete(':id')
  async deleteBinApplication(@Param() { id }: IdParamDTO) {
    const response = await this.agentSmartbinService.deleteBinApplication(id);
    return new SuccessResponse('deleted', response);
  }
}
