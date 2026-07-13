import { Resident } from '@models/users/resident.model';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateResidentAccountDto } from '@src/resident/dto/resident.dto';
import { Model } from 'mongoose';
import { ErrorMessages } from '@common/constants';
import { CreateAgentResidentAccountDto } from './dto/resident-management.dto';

@Injectable()
export class ResidentsManagementService {
  constructor(
    @InjectModel(Resident.name)
    private readonly residentModel: Model<Resident>,
  ) { }

  async getResidents({ agentId }: { agentId?: string } = {}) {
    return this.residentModel.find({
      agentId,
    });
  }

  async getResident(id: string) {
    return this.residentModel.findById(id);
  }

  async createResident(
    data: CreateAgentResidentAccountDto & { agentId: string },
  ) {
    const [existingCorporate, existingEmail] = await Promise.all([
      this.residentModel.findOne({ payerId: data.payerId }),
      this.residentModel.findOne({ email: data.email }),
    ]);

    if (existingCorporate) {
      throw new ConflictException('Resident already exists');
    }
    if (existingEmail) {
      throw new ConflictException(ErrorMessages.DUPLICATE_EMAIL);
    }

    return this.residentModel.create({
      ...data,
      agentId: data.agentId,
    });
  }

  async updateResident(
    id: string,
    data: Partial<CreateAgentResidentAccountDto>,
  ) {
    return this.residentModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteResident(id: string) {
    return this.residentModel.findByIdAndDelete(id);
  }
}
