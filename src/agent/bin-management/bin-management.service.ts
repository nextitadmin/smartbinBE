import { UserRole } from '@models/types';
import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '@src/resident/dto/resident.dto';
import { AgentBinApplicationFilter } from '@src/smart-bin/dto/binAppDto';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';

@Injectable()
export class AgentSmartbinService {
  constructor(private readonly smartbinService: SmartBinService) {}

  async getAgentBinApplications(
    filter: AgentBinApplicationFilter,
  ): Promise<any> {
    return this.smartbinService.getAgentBinApplication(filter);
  }

  async createResidentBinApplication(body: CreateApplicationDto) {
    return this.smartbinService.createBinApplication({
      accountId: body.residentId,
      accountType: body.residentId ? UserRole.Resident : UserRole.Corporate,
      applicationData: body,
    });
  }

  async createCorporateBinApplication({ agentId, body }) {
    return this.smartbinService.createBinApplication({
      accountId: body.corporateId,
      accountType: body.residentId ? UserRole.Resident : UserRole.Corporate,
      applicationData: body,
    });
  }

  async getApplicationById(id: string) {
    return this.smartbinService.getBinApplicationById(id);
  }

  async trackApplicationById(id: string) {
    return this.smartbinService.getOrderTimeline(id);
  }

  async deleteBinApplication(applicationId: string) {
    return this.smartbinService.deleteBinApplication(applicationId);
  }
}
