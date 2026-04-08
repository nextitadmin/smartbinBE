import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportType } from '@models/report.model';
import { Types } from 'mongoose';
import { AdminReportService } from './report.service';
import {
  CreateAdminReportDto,
  GetReportsDto,
} from '@src/report/dtos/report.dto';
import { SuccessResponse } from '@common/http';
import {PspTeamMemberAuth, AuthenticatedPspTeamMember} from '@common/decorators/auth.decorator';
import {  PspTeamMember } from '@common/types';

@ApiTags('PSP/TeamMember/Report')
@Controller({
  path: 'lawma/psp/team-member/reports',
  version: '1',
})
@PspTeamMemberAuth()
export class PSPTeamReportController {
  constructor(private readonly reportService: AdminReportService) {}

  @Post()
  async createTeamMemberReport(
    @AuthenticatedPspTeamMember() teamMember: PspTeamMember,
    @Body() dto: CreateAdminReportDto,
  ) {
    const data = await this.reportService.generatePspTeamMemberReport(teamMember, dto);
    return data;
}

@Get()
async getTeamMemberReports(
  @AuthenticatedPspTeamMember() teamMember: PspTeamMember,
  @Query() filters: GetReportsDto,
) {
  const reports = await this.reportService.getPspTeamMemberReports(teamMember, filters);
  return new SuccessResponse('Reports retrieved successfully', reports);

}

@Get(':id')
async getTeamMemberReportById(
  @AuthenticatedPspTeamMember() teamMember: PspTeamMember,
  @Param('id') id: string,
) {
  const report = await this.reportService.getPspTeamMemberReportById(id, teamMember);
  return new SuccessResponse('Report retrieved successfully', report);
}

}
