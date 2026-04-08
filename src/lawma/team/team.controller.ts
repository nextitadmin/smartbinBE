import {
  AdminAuth,
  AuthenticatedAdmin,
} from '@common/decorators/auth.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { AdminUser } from '@common/types';
import { PaginatedSuccessResponse, SuccessResponse } from '@common/http';
import { CreateLawmaTeamDto, UpdateLawmaTeamStatusDto, UpdateTeamMemberDetailsDto } from './dto/team.dto';
import { IdParamDTO } from '@src/agent/dto/agent.dto';

@ApiTags('Lawma - Team')
@Controller({
  path: 'lawma/teams',
  version: '1',
})
@AdminAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async getTeams() {
    const teams = await this.teamService.getTeams();
    return new PaginatedSuccessResponse(
      'Teams fetched successfully',
      teams.data,
      teams.paging,
    );
  }

  @Get('/roles')
  async getTeamRoles(){
    const roles = await this.teamService.getTeamRoles();
    return new SuccessResponse('Team roles fetched successfully', roles);
  }

  @Post()
  async createTeam(@Body() team: CreateLawmaTeamDto) {
    const newTeam = await this.teamService.createTeam(team);
    return new SuccessResponse('Team created successfully', newTeam);
  }

@Patch(':id')
async updateTeamDetails(
  @Param() { id }: IdParamDTO,
  @Body() team: UpdateTeamMemberDetailsDto,
) {
  const updatedTeam = await this.teamService.updateTeamDetails(id, team);
  return new SuccessResponse('Team details updated successfully', updatedTeam);
}

  @Put(':id/status')
  async updateTeam(
    @Param() { id }: IdParamDTO,
    @Body() team: UpdateLawmaTeamStatusDto,
  ) {
    const updatedTeam = await this.teamService.updateTeam(id, team);
    return new SuccessResponse('Team updated successfully', updatedTeam);
  }

  @Delete(':id')
  async deleteTeam(@Param() { id }: IdParamDTO) {
    const deletedTeam = await this.teamService.deleteTeam(id);
    return new SuccessResponse('Team deleted successfully', deletedTeam);
  }
}
