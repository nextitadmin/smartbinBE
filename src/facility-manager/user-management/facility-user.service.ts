import {
  FacilityUserDocument,
  FacilityUsers,
} from '@models/facility-users.model';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AssignBinToTenantDto,
  CreateFacilityUserDto,
  UpdateFacilityUserDto,
} from '../dto/facility-user.dto';
import { BinAssignmentStatus, SmartBin, SmartbinStatus } from '@models/smart-bin.model';

@Injectable()
export class FacilityUserService {
  constructor(
    @InjectModel(FacilityUsers.name) private facilityUser: Model<FacilityUsers>,
    @InjectModel(SmartBin.name) private smartBinModel: Model<SmartBin>,
  ) {}

  async createNewFacilityUser(accountId: string, dto: CreateFacilityUserDto) {
    const payload: any = { accountId: accountId, ...dto };
    if ((dto as any).localGovernment) {
      try {
        payload.localGovernmentArea = {
          id: new Types.ObjectId((dto as any).localGovernment),
        };
      } catch (err) {
        // if invalid id, leave as-is; mongoose will report validation error
        console.log('Invalid localGovernment id:', err);
      }
      delete payload.localGovernment;
    }

    const data = await this.facilityUser.create(payload);

    return { message: 'Facility user added successfully', data: data };
  }

  async getFacilityUsers(facilityMgrId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.facilityUser
        .find({
          accountId: new Types.ObjectId(facilityMgrId),
          deativationDate: null,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.facilityUser.countDocuments({
        accountId: new Types.ObjectId(facilityMgrId),
      }),
    ]);

    return {
      data: users,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getFacilityApprovedBins(facilityMgrId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [smartBins, total] = await Promise.all([
      this.smartBinModel
        .find({
          userId: new Types.ObjectId(facilityMgrId),
          customerType: 'Facility',
          status: SmartbinStatus.Approved,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartBinModel.countDocuments({
        userId: new Types.ObjectId(facilityMgrId),
        customerType: 'Facility',
        status: SmartbinStatus.Approved,
      }),
    ]);

    return {
      data: smartBins,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getTenantList(facilityMgrId: string) {
    const tenantList = await this.facilityUser
      .find({ accountId: new Types.ObjectId(facilityMgrId), binStatus: BinAssignmentStatus.Unassigned })

    return { message: 'Tenant list retrived successfully', data: tenantList };
  }

  async assignBinToTenant(facilityMgrId: string, dto: AssignBinToTenantDto) {
    const tenant = await this.facilityUser.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dto.tenantId),
        accountId: new Types.ObjectId(facilityMgrId),
      },
      {
        binStatus:  BinAssignmentStatus.Assigned,
      },
      {
        new: true,
      },
    );

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updatedBin = await this.smartBinModel.findOneAndUpdate(
      { binId: dto.binId },
      {
        assignedTo: `${tenant.firstName} ${tenant.lastName}`,
        assignmentStatus: BinAssignmentStatus.Assigned,
      },

      { new: true },
    );

    return { message: 'Bin assigned to tenant successfully', data: updatedBin };
  }

  async getFacilityUserDetails(facilityUserId: string) {
    const facilityUserDetails = await this.facilityUser.findById(
      facilityUserId,
    );

    return {
      data: facilityUserDetails
    };
  }

  async updateFacilityUser(facilityUserId: string, dto: UpdateFacilityUserDto) {
    const res = await this.facilityUser.findByIdAndUpdate(facilityUserId, {
      ...dto
    });

    return {
      message: 'facility user details updated successfully',
      data: null,
    };
  }

  async deactivateFacilityUser(facilityUserId: string) {
    await this.facilityUser.findByIdAndUpdate(facilityUserId, {
      deativationDate: new Date(),
    });

    return {
      message: 'User deactivated successfully',
    };
  }
}
