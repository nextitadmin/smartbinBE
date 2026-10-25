import {
  AuthenticatedFacilityManager,
  FacilityManagerAuth,
} from '@common/decorators/auth.decorator';
import { SuccessResponse } from '@common/http';
import { FacilityManagerUser } from '@common/types';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KycService } from '@src/kyc/kyc.service';

import {
  AddressVerificationDto,
  CreateFacilityManagerKycDto,
  IdVerificationDto,
  PersonalInfoDto,
} from '@src/kyc/dto/kyc.dto';

@ApiTags('Facility Manager Kyc Application')
@Controller({
  path: 'facility-manager/kyc',
  version: '1',
})
@FacilityManagerAuth()
export class KycApplicationController {
  constructor(private readonly kycService: KycService) {}

  @Post('/')
  async submitFacilityManagerKyc(
    @Body() dto: CreateFacilityManagerKycDto,
    @AuthenticatedFacilityManager() facilityManager: FacilityManagerUser,
  ) {
    const targetUserId = facilityManager.id;
    const targetAccountType = facilityManager.role;

    const response = await this.kycService.createKyc({
      userId: targetUserId,
      accountType: targetAccountType,
      applicationData: dto,
    });
    return new SuccessResponse(
      'Facility manager Kyc Information submitted successfully',
      response,
    );
  }

  @Patch('personal-info')
  async submitPersonalInformation(
    @AuthenticatedFacilityManager() resident: FacilityManagerUser,
    @Body() dto: PersonalInfoDto,
  ) {
    const response = await this.kycService.submitPersonalInformation({
      userId: resident.id,
      accountType: resident.role,
      applicationData: dto,
    });

    return new SuccessResponse(
      'Personal Info submitted successfully',
      response,
    );
  }

  @Patch('id-verification')
  async idVerification(
    @AuthenticatedFacilityManager() facilityManager: FacilityManagerUser,
    @Body() dto: IdVerificationDto,
  ) {
    const response = await this.kycService.idVerification({
      userId: facilityManager.id,
      accountType: facilityManager.role,
      applicationData: dto,
    });

    return new SuccessResponse(
      'Identity Information submitted successfully',
      response,
    );
  }

  @Patch('address')
  async addressVerification(
    @AuthenticatedFacilityManager() facilityManager: FacilityManagerUser,
    @Body() dto: AddressVerificationDto,
  ) {
    const response = await this.kycService.addressVerification({
      userId: facilityManager.id,
      accountType: facilityManager.role,
      applicationData: dto,
    });

    return new SuccessResponse(
      'Address details submitted successfully',
      response,
    );
  }

  @Get('status')
  async getKycApplicationStatus(
    @AuthenticatedFacilityManager() facilityManager: FacilityManagerUser,
  ) {
    const response = await this.kycService.verifyKycStatus({
      userId: facilityManager.id,
      accountType: facilityManager.role,
    });

    return new SuccessResponse('Kyc status retrieved successfully', response);
  }
}
