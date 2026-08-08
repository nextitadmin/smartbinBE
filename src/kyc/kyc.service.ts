import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resident } from '@models/users/resident.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { UserRole } from '@models/types';
import {
  AddressVerificationStatus,
  AgencyInformationStatus,
  IdVerificationStatus,
  SignatoryVerificationStatus,
  UserKyc,
} from '@models/user-kyc.model';
import {
  AddressVerificationDto,
  CompanyInfoDto,
  CreateAgentKycDto,
  CreateCorporateKycDto,
  CreateFacilityManagerKycDto,
  CreateResidentKycDto,
  IdVerificationDto,
  PersonalInfoDto,
  SignatoriesDto,
  TeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/kyc.dto';
import { CorporateTeam } from '@models/corporate-team.model';
import { TrustpointlyService } from '@src/integrations/trustpointly/trustpointly.service';

@Injectable()
export class KycService {
  constructor(
    @InjectModel(Resident.name) private readonly residentModel: Model<Resident>,
    @InjectModel(FacilityManager.name)
    private readonly facilityModel: Model<FacilityManager>,
    @InjectModel(UserKyc.name) private readonly userKycModel: Model<UserKyc>,
    @InjectModel(CorporateTeam.name)
    private readonly corporateTeamModel: Model<CorporateTeam>,
    private readonly trustpointlyService: TrustpointlyService,
  ) {}

  // Run the NIN check and return only the non-sensitive fields 
   
  private async runNinCheck(nin?: string): Promise<{
    ninVerificationReference?: string;
    ninVerificationProviderStatus?: string;
  }> {
    if (!nin) return {};

    const result = await this.trustpointlyService.verifyNin(nin);

    return {
      ninVerificationReference: result.reference,
      ninVerificationProviderStatus: result.providerStatus ?? result.status,
    };
  }

  //Normalize an AddressVerificationDto 
  private mapAddress(
    address?: AddressVerificationDto,
  ): Record<string, any> {
    if (!address) return {};

    const { localGovernment, ...rest } = address;

    return {
      ...rest,
      ...(localGovernment
        ? { lga: new Types.ObjectId(localGovernment) }
        : {}),
    };
  }

  async createAgentKyc(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: CreateAgentKycDto;
  }) {
    const { personalInformation, agencyInformation, addressDocument } =
      dto.applicationData;

    const ninCheck = await this.runNinCheck(personalInformation?.NinNo);

    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          nationality: personalInformation?.nationality,
          gender: personalInformation?.gender,
          lawmaCustomerType: personalInformation?.lawmaCustomerType,
          NinNo: personalInformation?.NinNo,
          idDocument: personalInformation?.idDocument,
          agencyName: agencyInformation?.agencyName,
          businessRegistrationNumber:
            agencyInformation?.businessRegistrationNumber,
          businessEmailAddress: agencyInformation?.businessEmailAddress,
          businessPhoneNumber: agencyInformation?.businessPhoneNumber,
          branches: agencyInformation?.branches,
          agencyCertificateDocument:
            addressDocument?.agencyCertificateDocument,
          ...ninCheck,
          hasSubmittedPersonalInformation: true,
          hasSubmittedIdentity: true,
          hasSubmittedAgencyDocument: true,
          hasSubmittedAgencyInformation: true,
          hasCompletedKyc: true,
          identityVerificationStatus: IdVerificationStatus.SUBMITTED,
          agencyInformationStatus: AgencyInformationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedPersonalInformation: userKyc.hasSubmittedPersonalInformation,
      hasSubmittedidentity: userKyc.hasSubmittedIdentity,
      identityVerificationStatus: userKyc.identityVerificationStatus,
      addressVerificationStatus: userKyc.addressVerificationStatus,
    };
  }

  // for both resident and facility manager
  async createKyc(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: CreateResidentKycDto | CreateFacilityManagerKycDto;
  }) {
    const ninCheck = await this.runNinCheck(
      dto.applicationData.identityInformation?.NinNo,
    );

    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          ...dto.applicationData.personalInformation,
          ...dto.applicationData.identityInformation,
          ...this.mapAddress(dto.applicationData.addressInformation),
          ...ninCheck,
          hasSubmittedPersonalInformation: true,
          hasSubmittedIdentity: true,
          hasSubmittedAddress: true,
          hasCompletedKyc: true,
          rejectionReason: null,
          identityVerificationStatus: IdVerificationStatus.SUBMITTED,
          addressVerificationStatus: AddressVerificationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedPersonalInformation: userKyc.hasSubmittedPersonalInformation,
      hasSubmittedidentity: userKyc.hasSubmittedIdentity,
      identityVerificationStatus: userKyc.identityVerificationStatus,
      addressVerificationStatus: userKyc.addressVerificationStatus,
    };
  }

  async createCorporateKyc(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: CreateCorporateKycDto;
  }) {
    const { companyInformation, businessRegistrationCertificate } =
      dto.applicationData;

    const signatoryDocs = await this.corporateTeamModel.insertMany(
      dto.applicationData.authorizedSignatories.map((signatory) => ({
        ...signatory,
        userId: dto.userId,
        userType: dto.accountType,
      })),
    );
    const signatoryIds = signatoryDocs.map((s) => s._id);

    const ninCheck = await this.runNinCheck(
      businessRegistrationCertificate?.NinNo,
    );

    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          businessName: companyInformation?.businessName,
          businessRegistrationNumber:
            companyInformation?.businessRegistrationNumber,
          businessEmailAddress: companyInformation?.email,
          businessPhoneNumber: companyInformation?.phoneNumber,
          businessSector: companyInformation?.businessSector,
          address: companyInformation?.address,
          NinNo: businessRegistrationCertificate?.NinNo,
          idDocument: businessRegistrationCertificate?.idDocument,
          signatories: signatoryIds,
          ...ninCheck,
          hasSubmittedPersonalInformation: true,
          hasSubmittedIdentity: true,
          hasSubmittedSignatories: true,
          hasCompletedKyc: true,
          identityVerificationStatus: IdVerificationStatus.SUBMITTED,
          signatoryVerificationStatus: SignatoryVerificationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedCorporateInformation: userKyc.hasSubmittedPersonalInformation,
      hasSubmittedidentity: userKyc.hasSubmittedIdentity,
      hasSubmittedSignatories: userKyc.hasSubmittedSignatories,
      identityVerificationStatus: userKyc.identityVerificationStatus,
      signatoryVerificationStatus: userKyc.signatoryVerificationStatus,
    };
  }

  // For Resident and Facilty Manager
  async submitPersonalInformation(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: PersonalInfoDto | CompanyInfoDto;
  }) {
    if (dto.accountType === UserRole.Resident) {
      await this.residentModel.findByIdAndUpdate(
        new Types.ObjectId(dto.userId),
        { $set: { ...dto.applicationData } },
        { new: true },
      );
    }

    if (dto.accountType === UserRole.Facility) {
      await this.facilityModel.findByIdAndUpdate(
        new Types.ObjectId(dto.userId),
        { $set: { ...dto.applicationData } },
        { new: true },
      );
    }

    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: { ...dto.applicationData, hasSubmittedPersonalInformation: true },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedPersonalInformation: userKyc.hasSubmittedPersonalInformation,
    };
  }

  // For Resident and Facilty Manager
  async idVerification(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: IdVerificationDto;
  }) {
    const ninCheck = await this.runNinCheck(dto.applicationData?.NinNo);

    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          ...dto.applicationData,
          ...ninCheck,
          hasSubmittedIdentity: true,
          identityVerificationStatus: IdVerificationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedIdentity: userKyc.hasSubmittedIdentity,
    };
  }

  // For Resident and Facilty Manager
  async addressVerification(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: AddressVerificationDto;
  }) {
    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          ...this.mapAddress(dto.applicationData),
          hasSubmittedAddress: true,
          addressVerificationStatus: AddressVerificationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedAddress: userKyc.hasSubmittedAddress,
    };
  }

  // for corporate
  async verifyCorporateKycStatus(dto: {
    userId: string;
    accountType: UserRole;
  }) {
    const userKyc = await this.userKycModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      userType: dto.accountType,
    });

    return {
      hasSubmittedCorporateInformation: userKyc.hasSubmittedPersonalInformation,
      identityVerificationStatus: userKyc.identityVerificationStatus,
      signatoryVerificationStatus: userKyc.signatoryVerificationStatus,
      hasSubmittedSignatories: userKyc.hasSubmittedSignatories,
      hasSubmittedIdentity: userKyc.hasSubmittedIdentity,
      rejectionReason: userKyc.rejectionReason ?? null,
    };
  }
  // For Resident and Facilty Manager
  async verifyKycStatus(dto: { userId: string; accountType: UserRole }) {
    const userKyc = await this.userKycModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      userType: dto.accountType,
    });

    return {
      identityVerificationStatus: userKyc.identityVerificationStatus,
      addressVerificationStatus: userKyc.addressVerificationStatus,
      hasSubmittedPersonalInformation: userKyc.hasSubmittedPersonalInformation,
      hasSubmittedAddress: userKyc.hasSubmittedAddress,
      hasSubmittedIdentity: userKyc.hasSubmittedIdentity,
      rejectionReason: userKyc.rejectionReason ?? null,
    };
  }

  async verifyAgentKycStatus(dto: { userId: string; accountType: UserRole }) {
    const userKyc = await this.userKycModel.findOne({
      userId: new Types.ObjectId(dto.userId),
      userType: dto.accountType,
    });

    return {
      identityVerificationStatus: userKyc.identityVerificationStatus,
      addressVerificationStatus: userKyc.addressVerificationStatus,
      hasSubmittedPersonalInformation: userKyc.hasSubmittedPersonalInformation,
      hasSubmittedAddress: userKyc.hasSubmittedAddress,
      hasSubmittedIdentity: userKyc.hasSubmittedIdentity,
      rejectionReason: userKyc.rejectionReason ?? null,
    };
  }

  async addSignatories(dto: {
    userId: string;
    accountType: UserRole;
    applicationData: SignatoriesDto;
  }) {
    const userKyc = await this.userKycModel.findOneAndUpdate(
      { userId: new Types.ObjectId(dto.userId), userType: dto.accountType },
      {
        $set: {
          ...dto.applicationData,
          hasSubmittedSignatories: true,
          signatoryVerificationStatus: SignatoryVerificationStatus.SUBMITTED,
        },
      },
      { upsert: true, new: true },
    );

    return {
      hasSubmittedSignatories: userKyc.hasSubmittedSignatories,
    };
  }

  async addCorporateSignatory(dto: {
    userId: string;
    accountType: UserRole;
    signatoryData: TeamMemberDto;
  }) {
    await this.corporateTeamModel.create({
      ...dto.signatoryData,
      userId: dto.userId,
      userType: dto.accountType,
    });

    return {
      message: 'Team member added successfully',
      data: null,
    };
  }

  // Get all signatories for a corporate user's KYC document
  async getAllSignatories(dto: { userId: string; accountType: UserRole }) {
    const corporateTeam = await this.corporateTeamModel
      .find({
        userId: new Types.ObjectId(dto.userId),
        userType: dto.accountType,
        deletedAt: null,
      })
      .lean();
    return {
      message: 'All team members fetched successfully',
      data: corporateTeam,
    };
  }

  // Get a single signatory by signatoryId
  async getSingleSignatory(dto: {
    userId: string;
    accountType: UserRole;
    teamMemberId: string;
  }) {
    const teamMember = await this.corporateTeamModel.findOne({
      _id: new Types.ObjectId(dto.teamMemberId),
      userId: new Types.ObjectId(dto.userId),
      userType: dto.accountType,
      deletedAt: null,
    });

    return {
      message: 'Team member fetched successfully',
      data: teamMember,
    };
  }

  // Update a single signatory by signatoryId
  async updateSignatory(dto: {
    userId: string;
    accountType: UserRole;
    signatoryData: UpdateTeamMemberDto;
    teamMemberId: string;
  }) {
    const updatedTeamMember = await this.corporateTeamModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dto.teamMemberId),
        userId: new Types.ObjectId(dto.userId),
        userType: dto.accountType,
      },
      {
        $set: { ...dto.signatoryData },
      },
      { new: true },
    );

    return {
      message: 'corporate team member updated successfully',
      data: updatedTeamMember,
    };
  }

  // Remove a single signatory by signatoryId
  async removeSignatory(dto: {
    userId: string;
    accountType: UserRole;
    teamMemberId: string;
  }) {
    await this.corporateTeamModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dto.teamMemberId),
        userId: new Types.ObjectId(dto.userId),
        userType: dto.accountType,
      },
      {
        deletedAt: new Date(),
      },
    );
    return {
      message: 'corporate team member removed successfully',
      data: null,
    };
  }

  //For Admins

  async getAllApplications(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;

    const statusType = status === "pending" ? IdVerificationStatus.SUBMITTED : status

    const filter = { identityVerificationStatus: statusType };

    const [kycRecords, total] = await Promise.all([
      this.userKycModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'userId',
          select: '-password -createdAt -updatedAt -__v',
        })
        .populate('lga')
        .lean(),

      this.userKycModel.countDocuments(filter),
    ]);

    return {
      data: kycRecords,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getKycApplicationDetails(applicationId: string): Promise<{
    data: Record<string, any>;
    message: string;
  }> {
    const application = await this.userKycModel
      .findById(applicationId)
      .populate({
        path: 'userId',
        select: '-password -createdAt -updatedAt -__v',
      })
      .populate('lga')
      .lean();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // If corporate, fetch signatories
    let signatories = [];
    if (application.userType === UserRole.Corporate && Array.isArray(application.signatories)) {
      signatories = await this.corporateTeamModel
        .find({ _id: { $in: application.signatories }, deletedAt: null })
        .lean();
    }

    return {
      data: {
        ...application,
        signatories,
      },
      message: 'Application details fetched successfully',
    };
  }

  //NIN-Verification
  async verifyApplicationNin(applicationId: string) {
    const application = await this.userKycModel.findById(applicationId).lean();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!application.NinNo) {
      throw new NotFoundException('No NIN on file for this application');
    }

    const result = await this.trustpointlyService.verifyNin(
      application.NinNo,
    );

    await this.userKycModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          ninVerificationReference: result.reference,
          ninVerificationProviderStatus:
            result.providerStatus ?? result.status,
        },
      },
      { new: true },
    );

    return {
      data: {
        status: result.status,
        reference: result.reference,
        providerStatus: result.providerStatus ?? result.status,
        identity: result.identity ?? null,
      },
      message: 'NIN verification completed',
    };
  }

  async approveApplication(applicationId: string) {
    const application = await this.userKycModel.findById(applicationId).lean();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    let update: any = {};

    switch (application.userType) {
      case UserRole.Resident:
      case UserRole.Facility:
        update = {
          identityVerificationStatus: IdVerificationStatus.APPROVED,
          addressVerificationStatus: AddressVerificationStatus.APPROVED,
        };
        break;
      case UserRole.Agent:
        update = {
          identityVerificationStatus: IdVerificationStatus.APPROVED,
          agencyInformationStatus: AgencyInformationStatus.APPROVED,
        };
        break;
      case UserRole.Corporate:
        update = {
          identityVerificationStatus: IdVerificationStatus.APPROVED,
          signatoryVerificationStatus: SignatoryVerificationStatus.APPROVED,
        };
        break;
      default:
        throw new NotFoundException('Unknown user type');
    }

    update.rejectionReason = null;

    await this.userKycModel.findByIdAndUpdate(
      applicationId,
      { $set: update },
      { new: true },
    );
    return { data: null, message: 'Kyc application approved' };
  }

  async rejectApplication(applicationId: string, reason?: string) {
    const application = await this.userKycModel.findById(applicationId).lean();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    let update: any = {};

    switch (application.userType) {
      case UserRole.Resident:
      case UserRole.Facility:
        update = {
          identityVerificationStatus: IdVerificationStatus.REJECTED,
          addressVerificationStatus: AddressVerificationStatus.REJECTED,
        };
        break;
      case UserRole.Agent:
        update = {
          identityVerificationStatus: IdVerificationStatus.REJECTED,
          agencyInformationStatus: AgencyInformationStatus.REJECTED,
        };
        break;
      case UserRole.Corporate:
        update = {
          identityVerificationStatus: IdVerificationStatus.REJECTED,
          signatoryVerificationStatus: SignatoryVerificationStatus.REJECTED,
        };
        break;
      default:
        throw new NotFoundException('Unknown user type');
    }

    if (reason !== undefined) {
      update.rejectionReason = reason;
    }

    await this.userKycModel.findByIdAndUpdate(
      applicationId,
      { $set: update },
      { new: true },
    );
    return { data: null, message: 'Kyc application rejected' };
  }
}
