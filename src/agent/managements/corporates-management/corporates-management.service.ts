import { Branch } from '@models/branch.model';
import { Corporate } from '@models/users/corporate.model';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorMessages } from '@common/constants';
import { CreateAgentCorporateAccountDto } from './dto/corporates-management.dto';
import { AddCorporateBranchDto } from '@src/corporate/dto/corporate.dto';

@Injectable()
export class CorporatesManagementService {
  constructor(
    @InjectModel(Corporate.name)
    private readonly corporateModel: Model<Corporate>,
    @InjectModel(Branch.name) private readonly branchModel: Model<Branch>, // private readonly corporateService: CorporateService
  ) { }

  async createCorporate(
    payload: CreateAgentCorporateAccountDto & { agentId: string },
  ) {
    const [existingCorporate, existingBusinessName, existingEmail] =
      await Promise.all([
        this.corporateModel.findOne({ payerId: payload.payerId }),
        this.corporateModel.findOne({ businessName: payload.businessName }),
        this.corporateModel.findOne({ email: payload.email }),
      ]);

    if (existingCorporate) {
      throw new ConflictException('Corporate member already exists');
    }
    if (existingBusinessName) {
      throw new ConflictException('Business Name already exists');
    }
    if (existingEmail) {
      throw new ConflictException(ErrorMessages.DUPLICATE_EMAIL);
    }

    const corporate = await this.corporateModel.create({
      ...payload,
      agentId: payload.agentId,
    });

    if (payload.branches.length) {
      await this.addCorporateBranch({
        corporateId: String(corporate._id),
        branchData: payload.branches,
      });
    }
  }

  async getCorporates({ agentId }: { agentId?: string } = {}) {
    return this.corporateModel.find({
      agentId,
    });
  }

  async getCorporate(corporateId: string) {
    return this.corporateModel
      .findById(corporateId)
      .select('-__v -password')
      .lean()
      .then(async (corporate) => {
        if (!corporate) return null;
        const branches = await this.branchModel
          .find({ userId: corporateId })
          .lean();
        return { ...corporate, branches };
      });
  }

  async updateCorporate(
    corporateId: string,
    payload: Partial<CreateAgentCorporateAccountDto>,
  ) {
    return this.corporateModel.findByIdAndUpdate(corporateId, payload, {
      new: true,
    });
  }

  async deleteCorporate(corporateId: string) {
    await this.corporateModel.findByIdAndDelete(corporateId);
    await this.branchModel.deleteMany({ userId: corporateId });
  }

  async getCorporateBranches({ corporateId }: { corporateId: string }) {
    return this.branchModel
      .find({ userId: corporateId })
      .populate('branches')
      .lean();
  }

  async addCorporateBranch({
    corporateId,
    branchData,
  }: {
    corporateId: string;
    branchData: AddCorporateBranchDto[];
  }) {
    return this.branchModel.insertMany(
      branchData.map((data) => ({ ...data, userId: corporateId })),
    );
  }
}
