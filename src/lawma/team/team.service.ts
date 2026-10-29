import {
  Administrator,
  AdministratorAttributes,
  AdministratorRole,
  AdministratorStatus,
} from '@models/administrator.model';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheKeys } from '@src/shared/constants';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { ErrorMessages } from '@common/constants';
import {
  CreateLawmaTeamDto,
  UpdateLawmaTeamStatusDto,
  UpdateTeamMemberDetailsDto,
} from './dto/team.dto';
import { getHashedPassword } from '@common/utils';
import { Paging } from '@common/http';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(Administrator.name)
    private readonly teamMemberModel: Model<AdministratorAttributes>,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
    private readonly ee: EventEmitter2,
  ) {}

  async getTeams() {
    const teamsQuery = {
      role: { $ne: AdministratorRole.TeamMember },
      // deleted_at: null,
    };
    const totalDocument = await this.teamMemberModel.countDocuments(teamsQuery);
    const pagingMeta: Paging = {
      page: 1,
      pages: Math.ceil(totalDocument / 10),
      size: totalDocument,
      total: totalDocument,
    };
    const teams = await this.teamMemberModel
      .find({
        ...teamsQuery,
      })
      .select('name email phoneNumber role status createdAt')
      .lean();
    return {
      data: teams,
      paging: pagingMeta,
    };
  }

  async createTeam(team: CreateLawmaTeamDto) {
    const teamMember = await this.teamMemberModel.findOne({
      email: team.email,
    });

    if (teamMember) {
      throw new BadRequestException(ErrorMessages.DUPLICATE_TEAM_EMAIL);
    }

    // Random initial password that nobody knows. The member sets their own via the reset link.
    const initialPassword = randomBytes(32).toString('hex');
    const newTeamMember = await this.teamMemberModel.create({
      ...team,
      password: getHashedPassword(initialPassword),
    });

    // Same 5-digit code and email as the user reset flow. The admin FE reads it on /resetpassword.
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    await this.cacheService.set(
      CacheKeys.AdministratorResetPasswordCode(resetCode),
      String(newTeamMember._id),
      10 * 60 * 1000, // 10mins, same expiry as the admin login and reset codes
    );

    this.ee.emit(
      MailNotificationEvents.Account.ForgotPassword,
      new SendEmailEvent({
        to: newTeamMember.email,
        from: '"LAWMA SMARTBIN" <' + process.env.MAIL_FROM + '>',
        subject: 'Password Reset Request',
        context: {
          firstName: newTeamMember.name,
          resetCode,
        },
      }),
    );

    const { password, createdAt, updatedAt, deleted_at, ...memberData } =
      newTeamMember.toObject();

    return memberData;
  }

  async getTeamRoles() {
    const displayNames: Record<string, string> = {
      [AdministratorRole.Admin]: 'Admin',
      [AdministratorRole.TeamMember]: 'Team Member',
      [AdministratorRole.SmartBinPartner]: 'SmartBin Partner',
      [AdministratorRole.PSPAdmin]: 'PSP Admin',
    };
    return Object.values(AdministratorRole)
      .filter((role) => role !== AdministratorRole.SuperAdmin)
      .map((role) => ({ name: role, displayName: displayNames[role] }));
  }

  async updateTeamDetails(id: string, team: UpdateTeamMemberDetailsDto) {
    const teamMember = await this.teamMemberModel
      .findById(id)
      .select('name email phoneNumber role status createdAt');

    if (!teamMember) {
      throw new BadRequestException('Team not found');
    }

    const existingEmail = await this.teamMemberModel.findOne({
      email: team.email,
      _id: { $ne: id },
    });

    if (existingEmail) {
      throw new BadRequestException(ErrorMessages.DUPLICATE_TEAM_EMAIL);
    }

    await this.teamMemberModel.findByIdAndUpdate(id, {
      $set: {
        name: team.name,
        email: team.email,
        phoneNumber: team.phoneNumber,
        role: team.role,
      },
    });
    return teamMember;
  }

  async updateTeam(id: string, team: UpdateLawmaTeamStatusDto) {
    await this.teamMemberModel.findByIdAndUpdate(id, {
      $set: {
        status: team.status,
      },
    });
  }

  async deleteTeam(id: string) {
    await this.teamMemberModel.findByIdAndUpdate(id, {
      $set: {
        status: AdministratorStatus.Inactive,
        deleted_at: new Date(),
      },
    });
  }
}
