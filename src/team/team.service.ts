import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TeamMember, TeamMemberDocument } from '@models/team.model';
import { Model, Types } from 'mongoose';
import { ErrorMessages } from '@common/constants';
import { FacilityManagerService } from '@src/facility-manager/facility-manager.service';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from '@src/team/dto/team-member.dto';
import { AuthUser } from '@common/types';
import { UserRole } from '@models/types';
import { Paging } from '@common/http';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(TeamMember.name)
    private readonly teamMemberModel: Model<TeamMemberDocument>,
  ) { }

  async addTeamMember({
    userId,
    accountType,
    dto,
  }: {
    userId: string;
    accountType: UserRole;
    dto: CreateTeamMemberDto;
  }) {
    const existingMember = await this.teamMemberModel.findOne({
      userId: new Types.ObjectId(userId),
      email: dto.email,
    });

    if (existingMember) {
      throw new BadRequestException(ErrorMessages.DUPLICATE_TEAM_EMAIL);
    }

    const teamMember = await this.teamMemberModel.create({
      userId: new Types.ObjectId(userId),
      accountType,
      ...dto,
    });
    return teamMember;
  }

  async getTeamMembersForUser(user: AuthUser) {
    const query = {
      userId: new Types.ObjectId(user.id),
    };
    const totalDocument = await this.teamMemberModel.countDocuments(query);
    const teamMembers = await this.teamMemberModel
      .find(query)
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .lean();

    const pagingMeta: Paging = {
      page: 1,
      pages: Math.ceil(totalDocument / 10),
      size: totalDocument,
      total: totalDocument,
    };

    return {
      data: teamMembers,
      paging: pagingMeta,
    };
  }

  async getTeamMemberById(id: string, userId: string) {
    const teamMember = await this.teamMemberModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!teamMember) {
      throw new NotFoundException(
        'Team member not found or does not belong to you.',
      );
    }
    return teamMember;
  }

  async updateTeamMemberInfo(
    id: string,
    userId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const updatedTeamMember = await this.teamMemberModel.findOneAndUpdate(
      { _id: id, userId: userId },
      { $set: dto },
      { new: true },
    );

    if (!updatedTeamMember) {
      throw new NotFoundException(
        'Team member not found or does not belong to you.',
      );
    }
    return updatedTeamMember;
  }

  async deleteTeamMember(id: string, userId: string) {
    const deletedTeamMember = await this.teamMemberModel.findOneAndDelete({
      _id: id,
      userId: userId,
    });

    if (!deletedTeamMember) {
      throw new NotFoundException(
        'Team member not found or does not belong to you.',
      );
    }
  }
}
