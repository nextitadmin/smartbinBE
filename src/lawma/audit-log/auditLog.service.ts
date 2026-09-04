import { AuditLog, AuditLogSchema, UserType } from '@models/audit-log.model';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLogEvents, LogActionEvent } from './dto/event';
import { Administrator } from '@models/administrator.model';
import { AuditLogQueryDto } from './dto/auditLog.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    @InjectModel(Administrator.name) private adminModel: Model<Administrator>,
  ) {}

  @OnEvent(AuditLogEvents.UserActivity)
  async logAction(event: LogActionEvent) {
    const { administrator, action, userType } = event.data;

    return this.auditLogModel.create({
      user: administrator.id,
      name: administrator.name,
      email: administrator.email,
      action: action,
      platform: administrator.userAgent,
      ipAddress: administrator.ipAddress,
      userType: userType,
    });
  }

  async getAllLogs(queryObj: AuditLogQueryDto) {
    const {
      search,
      startdate: startDate,
      enddate: endDate,
      activityType,
      role,
      page = 1,
      limit = 10,
    } = queryObj;
    const query: any = {};
    // Search by action, platform, or ipAddress
    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { platform: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ];
    }
    // Date range filter
    if (startDate || endDate) {
      query['createdAt'] = {};
      if (startDate) query['timestamp']['$gte'] = new Date(startDate);
      if (endDate) query['timestamp']['$lte'] = new Date(endDate);
    }

    if (activityType) {
      query['action'] = activityType;
    }
    if (role) {
      query['role'] = role;
    }
    const skip = (Number(page) - 1) * Number(limit);
    return this.auditLogModel
      .find(query)
      .populate('user', 'name email role')
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
  }

  async getLogDetails(id: string) {
    return this.auditLogModel
      .findById(id)
      .populate('user', 'name email role')
      .lean();
  }
}
