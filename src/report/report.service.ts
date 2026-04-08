import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Report,
  ReportMethod,
  ReportType,
  Frequency,
} from '@models/report.model';
import {
  CreateReportDto,
  CustomerType,
  GetReportsDto,
  CreateAdminReportDto,
  CreateAutoReportDto,
} from './dtos/report.dto';
import { SuccessResponse } from '@common/http';
import { AuthUser, PspUser } from '@common/types';
import { AdminUser } from '@common/types';
import {
  Transaction,
  ServiceType,
  TransactionStatus,
} from '@models/transaction.model';
import { SmartBin, SmartbinStatus } from '@models/smart-bin.model';
import { Pickup, PickupDocument, Status } from '@models/pickup';
import moment from 'moment';
import { Resident } from '@models/users/resident.model';
import { Corporate } from '@models/users/corporate.model';
import { UserRole } from '@models/types';
import { Agent } from '@models/users/agent.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { PspTeamMember, SmartbinPartnerUser } from '@common/types';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(SmartBin.name) private readonly smartBinModel: Model<SmartBin>,
    @InjectModel(Pickup.name)
    private readonly pickupModel: Model<PickupDocument>,
    @InjectModel(Resident.name) private readonly residentModel: Model<Resident>,
    @InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
    @InjectModel(FacilityManager.name)
    private readonly facilityManagerModel: Model<FacilityManager>,
    @InjectModel(Corporate.name)
    private readonly corporateModel: Model<Corporate>,
  ) {}

  // generte report
  async generateReport(
    dto: CreateReportDto,
    user: AuthUser,
  ): Promise<SuccessResponse> {
    const { type, customerType, customerName } = dto;
    if (customerType && customerName) {
      const [firstName, lastName] = customerName.trim().split(' ');

      let customerRecord = null;

      if (customerType === CustomerType.Resident) {
        customerRecord = await this.residentModel
          .findOne({ firstName, lastName })
          .lean();
      } else if (customerType === CustomerType.Corporate) {
        customerRecord = await this.corporateModel
          .findOne({ firstName, lastName })
          .lean();
      }

      if (!customerRecord) {
        throw new NotFoundException(
          `No ${customerType} found with name ${customerName}`,
        );
      }
    }

    let data: any;
    if (type === ReportType.PaymentHistory) {
      data = await this.generatePaymentHistory(user, dto);
    } else if (type === ReportType.WastePickup) {
      data = await this.generateWastePickup(user, dto);
    } else if (type === ReportType.SmartBinRequest) {
      data = await this.generateSmartBinReport(user, dto);
    }

    const report = await this.reportModel.create({
      reportName: dto.reportName,
      type,
      filters: dto.filters,
      customerType: dto.customerType,
      customerName: dto.customerName,
      data,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: {
        from: moment(dto.startDate).format('DD/MM'),
        to: moment(dto.endDate).format('DD/MM'),
      },
      userId: new Types.ObjectId(user.id),
    });

    return {
      success: true,
      message: 'Report generated successfully',
      data: {
        id: report._id,
        reportName: report.reportName,
        customerName: report?.customerName,
        reportFor: `Report for ${report?.customerName}`,
        customerType: report?.customerType,
        type: report.type,
        generatedBy: user.email || user.id,
        generatedAt: report.createdAt,
        period: {
          from: moment(dto.startDate).format('DD/MM'),
          to: moment(dto.endDate).format('DD/MM'),
        },
        totalRecords: data.length,
      },
    };
  }

  private async generatePaymentHistory(
    user: AuthUser,
    dto: CreateReportDto,
  ): Promise<{
    records: any[];
    chartSummary: {
      totalPayment: number;
      breakdown: {
        [service: string]: { totalAmount: number; percentage: number };
      };
    };
  }> {
    const { filters, startDate, endDate } = dto;

    const query: any = {
      userId: user.id,
      service: {
        $in: [
          ServiceType.SmartBinPurchase,
          ServiceType.WasteDisposal,
          ServiceType.Subscription,
          ServiceType.WalletTopUp,
        ],
      },
      status: TransactionStatus.Successful,
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (filters?.branch) {
      query['meta.branch'] = filters.branch;
    }

    const transactions = await this.transactionModel.find(query).lean();

    const summaryMap: Record<string, { totalAmount: number }> = {
      [ServiceType.SmartBinPurchase]: { totalAmount: 0 },
      [ServiceType.WasteDisposal]: { totalAmount: 0 },
      [ServiceType.Subscription]: { totalAmount: 0 },
      [ServiceType.WalletTopUp]: { totalAmount: 0 },
    };

    let totalPayment = 0;

    const records = transactions.map((txn) => {
      const { service, amount } = txn;
      if (summaryMap[service]) {
        summaryMap[service].totalAmount += amount;
      }
      totalPayment += amount;

      return {
        transactionId: txn.transactionReference,
        receiptId: txn._id,
        service,
        branch: txn.meta?.branch,
        tenantName: txn.meta?.tenantName,
        businessName: txn.meta?.businessName,
        amount,
        paymentMethod: txn.paymentMethod,
        paidAt: txn.createdAt,
      };
    });

    const chartSummary = {
      totalPayment,
      breakdown: {} as Record<
        string,
        { totalAmount: number; percentage: number }
      >,
    };

    for (const service in summaryMap) {
      const serviceTotal = summaryMap[service].totalAmount;
      chartSummary.breakdown[service] = {
        totalAmount: serviceTotal,
        percentage:
          totalPayment > 0
            ? Math.round((serviceTotal / totalPayment) * 100)
            : 0,
      };
    }

    return {
      records,
      chartSummary,
    };
  }

  // waste pickup report
  private async generateWastePickup(
    user: AuthUser,
    dto: CreateReportDto,
  ): Promise<{
    pickups: any[];
    summary: { totalPickups: number; totalWeight: number };
  }> {
    const { startDate, endDate, filters } = dto;

    const query: any = {
      accountId: new Types.ObjectId(user.id),
    };

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await this.pickupModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
    let totalWeight = 0;

    const pickups = records.map((item, index) => {
      const weight = item.weight || 0;

      totalWeight += weight;

      return {
        sn: index + 1,
        pickupDate: item.pickupDate,
        pickupTime: item.pickupTime,
        customerName: item?.customerName,
        phoneNumber: item?.phoneNumber,
        address: item.address,
        status: item.status,
        weight,
        orderId: item.wasteId,
        branch: item?.branch,
        tenantName: item?.customerName,
        businessName: item?.representative,
      };
    });

    return {
      pickups,
      summary: {
        totalPickups: records.length,
        totalWeight,
      },
    };
  }

  private async generateSmartBinReport(
    user: AuthUser,
    dto: CreateReportDto,
  ): Promise<{ records: any[]; totalApplications: number }> {
    const { filters, startDate, endDate } = dto;

    const query: any = {
      userId: new Types.ObjectId(user.id),
    };

    if (startDate && endDate) {
      query.applicationHistory = {
        $elemMatch: {
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      };
    }

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    const applications = await this.smartBinModel.find(query).lean();

    const records = applications.map((app) => {
      const firstHistory = app.applicationHistory?.[0];
      return {
        orderId: app.transactionReference,
        dateRequested: firstHistory?.timestamp,
        address: app.address,
        branch: app?.branch,
        tenantName: app?.name,
        businessName: app?.businessName,
        status: app.status,
      };
    });

    return {
      records,
      totalApplications: applications.length,
    };
  }

  // report dowmload
  async getReportById(reportId: string, user: AuthUser) {
    const report = await this.reportModel
      .findOne({
        _id: new Types.ObjectId(reportId),
        userId: new Types.ObjectId(user.id),
      })
      .lean();

    if (!report) {
      throw new NotFoundException(
        'Report not found or you do not have permission to access it.',
      );
    }

    return {
      id: report._id,
      type: report.type,
      reportName: report.reportName,
      period: report.period,
      tenantName: report?.tenantName,
      businessName: report?.businessName,
      customerName: report?.customerName,
      customerType: report?.customerType,
      generatedAt: report.createdAt,
      filters: report.filters,
      data: report.data,
    };
  }

  async getReportsByUser(user: AuthUser, filters: GetReportsDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = {
      userId: new Types.ObjectId(user.id),
    };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.reportName = { $regex: filters.search, $options: 'i' };
    }

    const reports = await this.reportModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return {
      reports,
      paging: {
        totalReports: reports.length,
        page: page,
        pages: Math.ceil(reports.length / limit),
        size: limit,
      },
    };
  }

  // admin report
  async generateAdminReport(
    admin: AdminUser,
    dto: CreateAdminReportDto,
  ): Promise<SuccessResponse> {
    const { type } = dto;

    let data: any;
    if (type === ReportType.Revenue) {
      data = await this.adminRevenueReport(dto);
    } else if (type === ReportType.WastePickup) {
      data = await this.adminWasteDisposalReport(dto);
    } else if (type === ReportType.SmartBinRequest) {
      data = await this.adminSmartbinReport(dto);
    } else if (type === ReportType.UserRegistration) {
      data = await this.adminUserRegistrationReport(dto);
    } else if (type === ReportType.UnpaidBills) {
      // TODO
    } else {
      throw new NotFoundException('Unsupported report type for Admin.');
    }

    const report = await this.reportModel.create({
      adminId: admin.id,
      reportName: dto.reportName,
      type,
      lga: dto.lga,
      filters: dto.filters,
      data,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: {
        from: moment(dto.startDate).format('DD/MM'),
        to: moment(dto.endDate).format('DD/MM'),
      },
    });

    return {
      success: true,
      message: 'Report generated successfully',
      data: {
        id: report._id,
        reportName: report.reportName,
        type: report.type,
        generatedBy: report.adminId,
        generatedAt: report.createdAt,
        period: {
          from: moment(dto.startDate).format('DD/MM'),
          to: moment(dto.endDate).format('DD/MM'),
        },
        totalRecords: data.length,
      },
    };
  }

  async adminUserRegistrationReport(dto: CreateAdminReportDto) {
    const { startDate, endDate, filters } = dto;

    const [residents, agents, corporates, facilityManagers, counts] =
      await Promise.all([
        this.residentModel.find().sort({ createdAt: -1 }).lean(),
        this.agentModel.find().sort({ createdAt: -1 }).lean(),
        this.corporateModel.find().sort({ createdAt: -1 }).lean(),
        this.facilityManagerModel.find().sort({ createdAt: -1 }).lean(),
        Promise.all([
          this.residentModel.countDocuments(),
          this.agentModel.countDocuments(),
          this.corporateModel.countDocuments(),
          this.facilityManagerModel.countDocuments(),
        ]),
      ]);

    const mapUser = (user: any, role: UserRole) => ({
      userId: user._id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      userType: role,
      lga: user.localGovernmentArea || null,
      address: user.address || null,
      status: user.status,
      createdAt: user.createdAt,
    });

    const allUsers = [
      ...residents.map((user) => mapUser(user, UserRole.Resident)),
      ...agents.map((user) => mapUser(user, UserRole.Agent)),
      ...corporates.map((user) => mapUser(user, UserRole.Corporate)),
      ...facilityManagers.map((user) => mapUser(user, UserRole.Facility)),
    ];

    return {
      records: allUsers,
      chartSummary: {
        totalRegistrations: allUsers.length,
        totalResidents: counts[0],
        totalAgents: counts[1],
        totalCorporates: counts[2],
        totalFacilityManagers: counts[3],
      },
    };
  }

  async generateSmartbinPartnerReport(
    admin: SmartbinPartnerUser,
    dto: CreateAdminReportDto,
  ): Promise<SuccessResponse> {
    const { type } = dto;

    let data: any;
    if (type === ReportType.SmartBinRequest) {
      data = await this.adminSmartbinReport(dto);
    } else if (type === ReportType.SmartbinDelivered) {
      data = await this.adminDeliveredSmartbinReport(dto);
    } else {
      throw new NotFoundException(
        'Unsupported report type for Smartbin Partners.',
      );
    }

    const report = await this.reportModel.create({
      adminId: admin.id,
      reportName: dto.reportName,
      type,
      lga: dto.lga,
      filters: dto.filters,
      data,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: {
        from: moment(dto.startDate).format('DD/MM'),
        to: moment(dto.endDate).format('DD/MM'),
      },
    });

    return {
      success: true,
      message: 'Report generated successfully',
      data: {
        id: report._id,
        reportName: report.reportName,
        type: report.type,
        generatedBy: report.adminId,
        generatedAt: report.createdAt,
        period: {
          from: moment(dto.startDate).format('DD/MM'),
          to: moment(dto.endDate).format('DD/MM'),
        },
        totalRecords: data.length,
      },
    };
  }

  async generatePspTeamMemberReport(
    teamMember: PspTeamMember,
    dto: CreateAdminReportDto,
  ): Promise<SuccessResponse> {
    const { type } = dto;

    let data: any;
    if (type === ReportType.WasteDisposed) {
      data = await this.pspTeamMemberWasteDisposedReport(teamMember, dto);
    } else {
      throw new NotFoundException(
        'Unsupported report type for PSP Team Member.',
      );
    }

    const report = await this.reportModel.create({
      adminId: teamMember.id,
      reportName: dto.reportName,
      type,
      lga: dto.lga,
      filters: dto.filters,
      data,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: {
        from: moment(dto.startDate).format('DD/MM'),
        to: moment(dto.endDate).format('DD/MM'),
      },
    });

    return {
      success: true,
      message: 'Report generated successfully',
      data: {
        id: report._id,
        reportName: report.reportName,
        type: report.type,
        generatedBy: teamMember.id,
        generatedAt: report.createdAt,
        period: {
          from: moment(dto.startDate).format('DD/MM'),
          to: moment(dto.endDate).format('DD/MM'),
        },
        totalRecords: data.pickups.length,
      },
    };
  }

  async pspTeamMemberWasteDisposedReport(
    teamMember: PspTeamMember,
    dto: CreateAdminReportDto,
  ) {
    const { startDate, endDate, filters } = dto;

    const query: any = {
      status: Status.Completed,
      assignedTo: teamMember.name,
    };

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    if (startDate && endDate) {
      query.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await this.pickupModel
      .aggregate([{ $match: query }])
      .sort({ updatedAt: -1 });

    let totalWeight = 0;

    const binDisposalAnalytics = this.groupDisposalsByMonth(
      records,
      startDate,
      endDate,
    );

    const pickups = records.map((item) => {
      const weight = item.weight || 0;
      totalWeight += weight;
      return {
        wasteId: item._id,
        name: item?.customerName || item?.representative,
        pickupDate: item.pickupDate,
        pickupTime: item.pickupTime,
        address: item.address,
        status: item.status,
        weight,
        assignedTo: item?.assignedTo,
      };
    });
    return {
      binDisposalAnalytics,
      pickups,
      summary: {
        totalPickups: records.length,
        totalWeight,
      },
    };
  }

  async generatePSPReport(
    admin: PspUser,
    dto: CreateAdminReportDto,
  ): Promise<SuccessResponse> {
    const { type } = dto;

    let data: any;
    if (type === ReportType.WasteDisposed) {
      data = await this.pspWasteDisposedReport(admin, dto);
    } else {
      throw new NotFoundException(
        'Unsupported report type for PSP Admin.',
      );
    }

    const report = await this.reportModel.create({
      adminId: admin.id,
      reportName: dto.reportName,
      type,
      lga: dto.lga,
      filters: dto.filters,
      data,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: {
        from: moment(dto.startDate).format('DD/MM'),
        to: moment(dto.endDate).format('DD/MM'),
      },
    });

    return {
      success: true,
      message: 'Report generated successfully',
      data: {
        id: report._id,
        reportName: report.reportName,
        type: report.type,
        generatedBy: report.adminId,
        generatedAt: report.createdAt,
        period: {
          from: moment(dto.startDate).format('DD/MM'),
          to: moment(dto.endDate).format('DD/MM'),
        },
        totalRecords: data.length,
      },
    };
  }

  // helpers
  async adminSmartbinReport(dto: CreateAdminReportDto) {
    const { filters, startDate, endDate } = dto;

    const query: any = {};

    if (startDate && endDate) {
      query.applicationHistory = {
        $elemMatch: {
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      };
    }

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    const applications = await this.smartBinModel
      .find(query)
      .populate('payment')
      .lean();
    const totalAmount = applications.reduce(
      (sum, app) => sum + (app.amount || 0),
      0,
    );
    const applicationsWithUserType = applications.map((app) => ({
      ...app,
      userType: app.customerType,
    }));

    const { users } = await this.inferUsers(applicationsWithUserType);

    const initialStatusCounts = Object.values(SmartbinStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {},
    );

    const statusCounts = applications.reduce((acc, app) => {
      if (app.status && acc.hasOwnProperty(app.status)) {
        acc[app.status]++;
      }
      return acc;
    }, initialStatusCounts);

    const records = applicationsWithUserType.map((app) => {
      const userList = users[app.customerType] || [];
      const user = userList.find(
        (u) => u._id.toString() === app.userId.toString(),
      );
      const name = user ? `${user.firstName} ${user.lastName}` : 'N/A';
      return {
        orderId: app._id,
        name,
        customerType: app.customerType,
        status: app.status,
        amount: app.amount,
        dateRequested: app.applicationHistory?.[0]?.timestamp,
        // LGA: app.localGovernmentArea || 'N/A',
        address: app.address,
        branch: app?.branch,
      };
    });

    return {
      summary: {
        totalApplications: applications.length,
        orderValue: totalAmount,
        ...statusCounts,
      },
      records,
    };
  }

  async adminDeliveredSmartbinReport(dto: CreateAdminReportDto) {
    const { startDate, endDate } = dto;

    const query: any = {
      status: SmartbinStatus.Delivered,
    };

    if (startDate && endDate) {
      query.deliveredOn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const applications = await this.smartBinModel.find(query).lean();

    const applicationsWithUserType = applications.map((app) => ({
      ...app,
      userType: app.customerType,
    }));
    const { users } = await this.inferUsers(applicationsWithUserType);

    const enrichedApplications = applicationsWithUserType.map((app) => {
      const userList = users[app.customerType] || [];
      const user = userList.find(
        (u) => u._id.toString() === app.userId.toString(),
      );
      const name = user ? `${user.firstName} ${user.lastName}` : 'N/A';
      return {
        orderId: app._id,
        name,
        status: app.status,
        dateDelivered: app.deliveredOn,
        // LGA: app.localGovernmentArea || 'N/A',
        address: app.address,
        deliveredBy: app.assignedTo || 'N/A',
      };
    });
    return {
      applications: enrichedApplications,
      totalDeliveredBins: enrichedApplications.length,
    };
  }

  private groupDisposalsByMonth(
    disposals: any[],
    startDate: string | Date,
    endDate: string | Date,
  ) {
    const start = moment(startDate);
    const end = moment(endDate);
    const monthMap = new Map<
      string,
      { month: string; count: number; totalWeight: number }
    >();

    let current = start.clone().startOf('month');
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      const monthKey = current.format('YYYY-MMM');
      monthMap.set(monthKey, {
        month: current.format('MMM'),
        count: 0,
        totalWeight: 0,
      });
      current.add(1, 'month');
    }

    for (const disposal of disposals) {
      const date = moment(disposal.updatedAt);
      const monthKey = date.format('YYYY-MMM');
      if (monthMap.has(monthKey)) {
        const monthData = monthMap.get(monthKey);
        monthData.count += 1;
        monthData.totalWeight += disposal.weight || 0;
      }
    }
    return Array.from(monthMap.values());
  }

  async adminWasteDisposalReport(dto: CreateAdminReportDto, year?: number) {
    const { startDate, endDate, filters } = dto;

    const matchStage: any = {};

    if (filters?.branch) {
      matchStage.branch = filters.branch;
    }

    if (startDate && endDate) {
      matchStage.pickupDateAsDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await this.pickupModel
      .aggregate([
        { $addFields: { pickupDateAsDate: { $toDate: '$pickupDate' } } },
        { $match: matchStage },
      ])
      .sort({ createdAt: -1 });
    let totalWeight = 0;

    const binDisposalAnalytics = this.groupDisposalsByMonth(
      records,
      startDate,
      endDate,
    );

    const pickups = records.map((item) => {
      const weight = item.weight || 0;

      totalWeight += weight;

      return {
        pickupDate: item.pickupDate,
        pickupTime: item.pickupTime,
        customerName: item?.customerName,
        phoneNumber: item?.phoneNumber,
        address: item.address,
        status: item.status,
        weight,
        wasteId: item.id,
        branch: item?.branch,
        tenantName: item?.customerName,
        businessName: item?.representative,
      };
    });

    return {
      pickups,
      summary: {
        totalPickups: records.length,
        totalWeight,
        binDisposalAnalytics,
      },
    };
  }

  // waste disposed
  async adminWasteDisposedReport(dto: CreateAdminReportDto, month?: number) {
    const { startDate, endDate, filters } = dto;

    const query: any = { status: Status.Completed };

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    if (startDate && endDate) {
      query.pickupDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await this.pickupModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
    let totalWeight = 0;

    const binDisposalAnalytics = this.groupDisposalsByMonth(
      records,
      startDate,
      endDate,
    );

    const pickups = records.map((item) => {
      const weight = item.weight || 0;

      totalWeight += weight;

      return {
        wasteId: item.id,
        name: item?.customerName || item?.representative,
        pickupDate: item.pickupDate,
        pickupTime: item.pickupTime,
        address: item.address,
        status: item.status,
        weight,

        assignedTo: item?.assignedTo,
      };
    });
    return {
      binDisposalAnalytics,
      pickups,
      summary: {
        totalPickups: records.length,
        totalWeight,
      },
    };
  }

  async pspWasteDisposedReport(
    psp: PspUser,
    dto: CreateAdminReportDto,
    month?: number,
  ) {
    const { startDate, endDate, filters } = dto;

    const query: any = {
      status: Status.Completed,
      pspId: new Types.ObjectId(psp.id),
    };

    if (filters?.branch) {
      query.branch = filters.branch;
    }

    if (startDate && endDate) {
      query.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await this.pickupModel
      .aggregate([{ $match: query }])
      .sort({ updatedAt: -1 });

    let totalWeight = 0;

    const binDisposalAnalytics = this.groupDisposalsByMonth(
      records,
      startDate,
      endDate,
    );

    const pickups = records.map((item) => {
      const weight = item.weight || 0;

      totalWeight += weight;

      return {
        wasteId: item._id,
        name: item?.customerName || item?.representative,
        pickupDate: item.pickupDate,
        pickupTime: item.pickupTime,
        address: item.address,
        status: item.status,
        weight,

        assignedTo: item?.assignedTo,
      };
    });
    return {
      binDisposalAnalytics,
      pickups,
      summary: {
        totalPickups: records.length,
        totalWeight,
      },
    };
  }

  async adminRevenueReport(dto: CreateAdminReportDto) {
    const { filters, startDate, endDate } = dto;

    const query: any = {
      status: TransactionStatus.Successful,
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (filters?.branch) {
      query['meta.branch'] = filters.branch;
    }

    const transactions = await this.transactionModel.find(query).lean();
    const { users } = await this.inferUsers(transactions);

    const serviceSummary: Record<string, number> = {
      [ServiceType.SmartBinPurchase]: 0,
      [ServiceType.WasteDisposal]: 0,
      [ServiceType.Subscription]: 0,
      [ServiceType.WalletTopUp]: 0,
    };

    const userTypeSummary: Record<string, number> = {
      [UserRole.Resident]: 0,
      [UserRole.Corporate]: 0,
      [UserRole.Agent]: 0,
      [UserRole.Facility]: 0,
    };

    let totalRevenue = 0;

    const records = transactions.map((txn) => {
      const {
        service,
        amount,
        userType,
        userId,
        transactionReference,
        paymentMethod,
        createdAt,
      } = txn;

      if (serviceSummary.hasOwnProperty(service)) {
        serviceSummary[service] += amount;
      }

      if (userTypeSummary.hasOwnProperty(userType)) {
        userTypeSummary[userType] += amount;
      }

      totalRevenue += amount;

      const userList = users[userType] || [];
      const user = userList.find((u) => u._id.toString() === userId.toString());
      const name = user ? `${user.firstName} ${user.lastName}` : 'N/A';

      return {
        name,
        transactionId: transactionReference,
        serviceType: service,
        amount,
        paymentMethod,
        transactionDate: createdAt,
      };
    });
    const summary = {
      totalRevenue,
      byServiceType: Object.entries(serviceSummary).map(
        ([service, totalAmount]) => ({
          service,
          totalAmount,
        }),
      ),
      byUserType: Object.entries(userTypeSummary).map(
        ([type, totalAmount]) => ({
          userType: type,
          totalAmount,
        }),
      ),
    };
    return {
      summary,
      records,
    };
  }

  async inferUsers(txns: any[]) {
    const residentIds = txns
      .filter((txn) => txn.userType === UserRole.Resident)
      .map((txn) => txn.userId);
    const agentIds = txns
      .filter((txn) => txn.userType === UserRole.Agent)
      .map((txn) => txn.userId);
    const corporateIds = txns
      .filter((txn) => txn.userType === UserRole.Corporate)
      .map((txn) => txn.userId);
    const facilityManagerIds = txns
      .filter((txn) => txn.userType === UserRole.Facility)
      .map((txn) => txn.userId);

    const [residents, agents, corporates, facilityManagers] = await Promise.all(
      [
        this.residentModel
          .find({ _id: { $in: residentIds } })
          .select('_id firstName lastName email localGovernmentArea')
          .lean(),
        this.agentModel
          .find({ _id: { $in: agentIds } })
          .select('_id firstName lastName email localGovernmentArea')
          .lean(),
        this.corporateModel
          .find({ _id: { $in: corporateIds } })
          .select('_id firstName lastName email localGovernmentArea')
          .lean(),
        this.facilityManagerModel
          .find({ _id: { $in: facilityManagerIds } })
          .select('_id firstName lastName email localGovernmentArea')
          .lean(),
      ],
    );

    const users = {
      [UserRole.Resident]: residents,
      [UserRole.Agent]: agents,
      [UserRole.Corporate]: corporates,
      [UserRole.Facility]: facilityManagers,
    };

    return { users };
  }

  // Get Report by admin
  async getAdminReports(admin: AdminUser, filters?: GetReportsDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = { adminId: admin.id };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.reportName = { $regex: filters.search, $options: 'i' };
    }

    const [reports, totalReports] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalReports / limit);

    const data = reports.map((report) => ({
      reportId: report._id,
      title: report.reportName,
      reportType: report.type,
      generationDate: report.createdAt,
      period: {
        from: moment(report.startDate).format('DD/MM'),
        to: moment(report.endDate).format('DD/MM'),
      },
    }));
    return {
      reports: data,
      paging: {
        totalReports,
        page: page,
        pages: Math.ceil(totalReports / limit),
        size: limit,
      },
    };
  }

  async getSmartbinPartnerReports(
    admin: SmartbinPartnerUser,
    filters?: GetReportsDto,
  ) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = { adminId: admin.id };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.reportName = { $regex: filters.search, $options: 'i' };
    }

    const [reports, totalReports] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalReports / limit);

    const data = reports.map((report) => ({
      reportId: report._id,
      title: report.reportName,
      reportType: report.type,
      generationDate: report.createdAt,
      period: {
        from: moment(report.startDate).format('DD/MM'),
        to: moment(report.endDate).format('DD/MM'),
      },
    }));
    return {
      reports: data,
      paging: {
        totalReports,
        page: page,
        pages: Math.ceil(totalReports / limit),
        size: limit,
      },
    };
  }

  async getPspReports(admin: PspUser, filters?: GetReportsDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = { adminId: admin.id };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.reportName = { $regex: filters.search, $options: 'i' };
    }

    const [reports, totalReports] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(query),
    ]);

    const data = reports.map((report) => ({
      reportId: report._id,
      title: report.reportName,
      reportType: report.type,
      generationDate: report.createdAt,
      period: {
        from: moment(report.startDate).format('DD/MM'),
        to: moment(report.endDate).format('DD/MM'),
      },
    }));
    return {
      reports: data,
      paging: {
        totalReports,
        page: page,
        pages: Math.ceil(totalReports / limit),
        size: limit,
      },
    };
  }
  async getPspTeamMemberReports(
    teamMember: PspTeamMember,
    filters?: GetReportsDto,
  ) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = { adminId: teamMember.id };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.reportName = { $regex: filters.search, $options: 'i' };
    }

    const [reports, totalReports] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reportModel.countDocuments(query),
    ]);

    const data = reports.map((report) => ({
      reportId: report._id,
      title: report.reportName,
      reportType: report.type,
      generationDate: report.createdAt,
      period: {
        from: moment(report.startDate).format('DD/MM'),
        to: moment(report.endDate).format('DD/MM'),
      },
    }));
    return {
      reports: data,
      paging: {
        totalReports,
        page: page,
        pages: Math.ceil(totalReports / limit),
        size: limit,
      },
    };
  }

  async getPspTeamMemberReportById(
    reportId: string,
    teamMember: PspTeamMember,
  ) {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        adminId: teamMember.id,
      })
      .lean();

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return {
      report,
    };
  }

  async getAdminReportById(reportId: string, admin: AdminUser) {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        adminId: admin.id,
      })
      .lean();

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return {
      report,
    };
  }

  async getSmartbinPartnerReportById(
    reportId: string,
    admin: SmartbinPartnerUser,
  ) {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        adminId: admin.id,
      })
      .lean();

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return {
      report,
    };
  }

  async getPspReportById(reportId: string, admin: PspUser) {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        adminId: admin.id,
      })
      .lean();

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return {
      report,
    };
  }
}
