import { CorporateTeam } from '@models/corporate-team.model';
import { UserRole } from '@models/types';
import {
  AddressVerificationStatus,
  AgencyInformationStatus,
  SignatoryVerificationStatus,
  UserKyc,
} from '@models/user-kyc.model';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { KycService } from '@src/kyc/kyc.service';
import { Model } from 'mongoose';
import { IdVerificationStatus } from 'src/shared/constants';

@Injectable()
export class KycFlowService {
  constructor(
    private readonly kycService: KycService
  ) {}

  async getAllApplications(
    page: number,
    limit: number,
    status: string = 'pending',
  ) {

    const statusType = status === "pending" ? IdVerificationStatus.SUBMITTED : status
    
    return this.kycService.getAllApplications(page, limit, statusType);
  }

  async getApplicationDetails(applicationId: string): Promise<{
    data: Record<string, any>;
    message: string;
  }> {

    return this.kycService.getKycApplicationDetails(applicationId);

  }

  async approveApplication(applicationId: string) {

    return this.kycService.approveApplication(applicationId);

  }

  async verifyNin(applicationId: string) {

    return this.kycService.verifyApplicationNin(applicationId);

  }

  async rejectApplication(applicationId: string, reason?: string) {

    return this.kycService.rejectApplication(applicationId, reason);

  }
}
