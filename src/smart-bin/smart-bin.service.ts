import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BinType,
  DEFAULT_SMART_BIN_AMOUNT,
  SmartBin,
  SmartBinAttributes,
  SmartbinDocument,
  SmartbinStatus,
} from '@models/smart-bin.model';
import { Resident } from '@models/users/resident.model';
import { Agent } from '@models/users/agent.model';
import { Corporate } from '@models/users/corporate.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { Bill } from '@models/bill.model';
import { Wallet } from '@models/wallet.model';
import {
  ServiceType,
  Transaction,
  TransactionAttributes,
  TransactionStatus,
} from '@models/transaction.model';
import { AuthUser } from '@common/types';
import {
  AgentBinApplicationFilter,
  BinAppDto,
  CreateApplicationDto,
  CreateBusinessApplicationDto,
  CreateFacilityApplicationDto,
  DeliveryData,
  GetApplicationsDto,
  GetDeliveredApplicationsDto,
  GetTeamMemberBinsFilterDto,
  orderBinsDto,
  scheduleDeliveryDto,
} from './dto/binAppDto';
import { SmartBinApplicationStatus, UserRole } from '@models/types';
import { generateRandomChars } from '@common/utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  InAppNotificationEvents,
  SendInAppEvent,
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { NotificationType } from '@models/notification.model';
import { events } from '@common/constants';
import { NotificationEvent } from '@src/notification/dto/notification.event';
import { Facility } from '@models/facilities';
import { CustomerType } from '@models/report.model';
import { Paging } from '@common/http';
import { TeamMember } from '@models/team.model';
import { LAGOS_LGAS } from '@src/utility/utility.constants';
import { timestamp } from 'rxjs';
import { IsPhoneNumber } from 'class-validator';
import { Lga } from '@models/lgas.model';

@Injectable()
export class SmartBinService {
  constructor(
    @InjectModel(SmartBin.name) private readonly smartbinModel: Model<SmartBin>,
    @InjectModel(Resident.name) private readonly residentModel: Model<Resident>,
    @InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
    @InjectModel(Corporate.name)
    private readonly corporateModel: Model<Corporate>,
    @InjectModel(FacilityManager.name)
    private readonly facilityModel: Model<FacilityManager>,
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(Facility.name) private readonly facility: Model<Facility>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly eventEmitter: EventEmitter2,
    @InjectModel(TeamMember.name)
    private readonly teamMemberModel: Model<TeamMember>,
    @InjectModel(Lga.name) private readonly lgaModel: Model<Lga>,
  ) {}

  async getResidentBinApplication(residentId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find({
          userId: new Types.ObjectId(residentId),
          customerType: UserRole.Resident,
        })
        .populate('payment')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments({
        userId: new Types.ObjectId(residentId),
        customerType: UserRole.Resident,
      }),
    ]);

    return {
      data: applications,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async createBinApplication({
    accountId,
    accountType,
    applicationData,
  }: {
    accountId: string;
    accountType: UserRole;
    applicationData: CreateBusinessApplicationDto;
  }) {
    if (applicationData.transactionReference) {
      const successfulCharge = await this.transactionModel.exists({
        transactionReference: applicationData.transactionReference,
        userId: accountId,
        userType: accountType,
        status: TransactionStatus.Successful,
      });

      if (!successfulCharge) {
        throw new BadRequestException(
          'Invalid transaction reference. Please ensure the transaction was successful.',
        );
      }
    }

    const generateTransactionRef = generateRandomChars(10, 'alphanum');
    const newBinApplication = await Promise.all([
      this.smartbinModel.create({
        userId: String(accountId),
        customerType: accountType,
        transactionReference:
          applicationData.transactionReference || generateTransactionRef,
        branchId: applicationData.branchId,
        ...applicationData,
        applicationHistory: [
          {
            timestamp: new Date(),
            status: SmartBinApplicationStatus.Pending,
            description: 'Application successful awaiting approval',
          },
        ],
      }),
      this.transactionModel.create({
        userId: String(accountId),
        transactionReference: generateTransactionRef,
        userType: accountType,
        amount: DEFAULT_SMART_BIN_AMOUNT,
        service: ServiceType.SmartBinPurchase,
        status: applicationData.transactionReference
          ? TransactionStatus.Successful
          : TransactionStatus.Pending,
        meta: {
          branch: applicationData?.branch,
          customerName: applicationData?.customerName,
          tenantName: applicationData?.tenantName,
          receiptId: applicationData.receiptId,
        },
      }),
    ]);

    return {
      application: newBinApplication,
      transactionReference: generateTransactionRef,
    };
  }

  // For FAcilityManager
  async getFacilityManagerBinApplication(facilityManagerId: string) {
    const [applications] = await Promise.all([
      this.smartbinModel
        .find({
          userId: new Types.ObjectId(facilityManagerId),
          customerType: UserRole.Facility,
        })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    return applications;
  }
  async getFacilityBinApplication(facilityMgrId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find({
          userId: new Types.ObjectId(facilityMgrId),
          customerType: UserRole.Facility,
        })
        .populate('payment')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments({
        userId: new Types.ObjectId(facilityMgrId),
        customerType: UserRole.Facility,
      }),
    ]);

    return {
      data: applications,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }
  async createFacilityBinApplication({
    accountId,
    accountType,
    applicationData,
  }: {
    accountId: string;
    accountType: UserRole;
    applicationData: CreateFacilityApplicationDto;
  }) {
    const facilty = await this.facility.findOne({
      _id: applicationData.facilityId,
      userId: accountId,
    });
    if (!facilty) {
      throw new NotFoundException('Facility not found');
    }

    if (applicationData.transactionReference) {
      const successfulCharge = await this.transactionModel.exists({
        transactionReference: applicationData.transactionReference,
        userId: accountId,
        userType: accountType,
        status: TransactionStatus.Successful,
      });

      if (!successfulCharge) {
        throw new BadRequestException(
          'Invalid transaction reference. Please ensure the transaction was successful.',
        );
      }
    }

    const generateTransactionRef = generateRandomChars(10, 'alphanum');
    const newBinApplication = await Promise.all([
      this.smartbinModel.create({
        userId: String(accountId),
        customerType: accountType,
        transactionReference:
          applicationData.transactionReference || generateTransactionRef,
        facilityId: facilty._id,
        binId: `#${generateRandomChars(4, 'number')}`,
        ...applicationData,
        applicationHistory: [
          {
            timestamp: new Date(),
            status: SmartBinApplicationStatus.Pending,
            description: 'Application successful awaiting approval',
          },
        ],
      }),
      this.transactionModel.create({
        userId: String(accountId),
        transactionReference: generateTransactionRef,
        userType: accountType,
        amount: DEFAULT_SMART_BIN_AMOUNT,
        service: ServiceType.SmartBinPurchase,
        status: applicationData.transactionReference
          ? TransactionStatus.Successful
          : TransactionStatus.Pending,
        meta: {
          receiptId: applicationData.receiptId,
          buildingName: facilty.buildingName,
        },
      }),
    ]);

    return {
      application: newBinApplication,
      transactionReference: generateTransactionRef,
    };
  }

  async getAgentBinApplication(
    filter: AgentBinApplicationFilter,
  ): Promise<any> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const skip = (page - 1) * limit;

    const query = { agentId: new Types.ObjectId(filter.agentId) };

    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find(query)
        .populate('payment')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(query),
    ]);

    const data = await Promise.all(
      applications.map(async (app) => {
        let customerName = app.name || app.businessName;
        if (!customerName && app.userId) {
          if (app.customerType === 'Resident') {
            const user = await this.residentModel
              .findById(app.userId, 'firstName lastName')
              .lean();
            customerName = `${user.firstName} ${user.lastName}`;
          } else if (app.customerType === 'Corporate') {
            const corp = await this.corporateModel
              .findById(app.userId, 'businessName')
              .lean();
            customerName = corp?.businessName;
          }
        }

        return {
          customerName,
          ...app,
        };
      }),
    );

    return {
      data,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getCorporateBinApplication(corporateId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find({
          userId: new Types.ObjectId(corporateId),
          customerType: UserRole.Corporate,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments({
        userId: new Types.ObjectId(corporateId),
        customerType: UserRole.Corporate,
      }),
    ]);

    return {
      data: applications,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getBinApplicationsByUserId(userId: string, userType: string) {
    const smartbins = await this.smartbinModel
      .find({ userId: userId, customerType: userType })
      .sort({ createdAt: -1 })
      .lean();
    if (!smartbins || smartbins.length === 0) {
      throw new NotFoundException('No bin applications found for this user');
    }
    return smartbins;
  }

  private estimateAnnualSubscription(bills: Bill[]): number {
    const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
    return total * 12; // Assuming the bills are monthly
  }

  async getSmartBinOverview(filters?: { year?: number; binType?: BinType }) {
    const matchStage: any = {};

    if (filters?.year) {
      const year = Number(filters.year);
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      matchStage.createdAt = { $gte: startDate, $lt: endDate };
    }

    if (filters?.binType) {
      matchStage.binType = filters.binType;
    }

    const totalApplications =
      await this.smartbinModel.countDocuments(matchStage);
    const allLgas = await this.lgaModel.find().select('_id name').lean();
    const smartbinUsersByLGAFromDB = await this.smartbinModel.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: '$lga_id',
          count: { $sum: 1 },
        },
      },
    ]);
    const lgaCounts = new Map(
      smartbinUsersByLGAFromDB.map((item) => [String(item._id), item.count]),
    );
    const smartbinUsersByLGA = allLgas.map((lga) => ({
      lga_id: String(lga._id),
      lgaName: lga.name,
      count: lgaCounts.get(String(lga._id)) || 0,
    }));

    smartbinUsersByLGA.sort((a, b) => b.count - a.count);

    const recentRecords = await this.smartbinModel
      .find(matchStage)
      .populate('lga_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const records = await Promise.all(
      recentRecords.map(async (app) => {
        const customerName = await this.inferCustomerName(
          app.userId as Types.ObjectId,
          app.customerType as UserRole,
        );

        const statusDates = this.extractStatusDates(app.applicationHistory);

        return {
          id: String(app._id),
          customerName,
          deliveredBy: app?.assignedTo || null,
          date: app.deliveredOn || app.createdAt,
          address: app.address,
          binType: app.binType,
          binId: app.binId,
          quantity: app.quantity || 1,
          lga: (app?.lga_id as any)?.name || null,
          status: app.status,
          dateAssigned:
            statusDates[SmartbinStatus.ScheduledForDelivery] || null,
          dateDelivered:
            statusDates[SmartbinStatus.Delivered] || app?.deliveredOn || null,
        };
      }),
    );

    return {
      totalApplications,
      smartbinUsersByLGA,
      records,
    };
  }

  async getAdminSmartbinOverview(filters?: {
    year?: number;
    binType?: BinType;
  }) {
    const query: any = {};

    if (filters?.year) {
      const year = Number(filters.year);
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    if (filters?.binType) {
      query.binType = filters.binType;
    }

    const [totalSmartbinUsers, smartbinRequests, deliveredSmartbins] =
      await Promise.all([
        this.smartbinModel.distinct('userId').then((ids) => ids.length),
        this.smartbinModel.countDocuments(query),
        this.smartbinModel.countDocuments({
          ...query,
          status: SmartbinStatus.Delivered,
        }),
      ]);

    const allLgas = await this.lgaModel.find().select('_id name').lean();

    const smartbinUsersByLGAFromDB = await this.smartbinModel.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: '$lga_id',
          count: { $sum: 1 },
        },
      },
    ]);

    const lgaCounts = new Map(
      smartbinUsersByLGAFromDB.map((item) => [String(item._id), item.count]),
    );

    // Map all LGAs with their counts (0 if no applications)
    const smartbinUsersByLGA = allLgas.map((lga) => ({
      lga_id: String(lga._id),
      lgaName: lga.name,
      count: lgaCounts.get(String(lga._id)) || 0,
    }));

    // Sort by count descending for better chart display
    smartbinUsersByLGA.sort((a, b) => b.count - a.count);

    return {
      totalSmartbinUsers,
      smartbinRequests,
      deliveredSmartbins,
      smartbinUsersByLGA,
    };
  }

  // delivered bins
  async getDeliveredSmartBins(filters: GetDeliveredApplicationsDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = { status: SmartbinStatus.Delivered };
    if (filters.type) {
      query.binType = filters.type;
    }

    if (filters.customerType) {
      query.customerType = filters.customerType;
    }

    if (filters.startDate && filters.endDate) {
      query.deliveredOn = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };

      const [residentUsers, corporateUsers, agentUsers, facilityUsers] =
        await Promise.all([
          this.residentModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
          this.corporateModel.find({ businessName: searchRegex }),
          this.agentModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
          this.facilityModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
        ]);

      const userIds = [
        ...residentUsers.map((u) => u._id),
        ...corporateUsers.map((u) => u._id),
        ...agentUsers.map((u) => u._id),
        ...facilityUsers.map((u) => u._id),
      ];

      query.$or = [
        { userId: { $in: userIds } },
        { customerType: searchRegex },
        { address: searchRegex },
        { binType: searchRegex },
      ];
    }
    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(query),
    ]);

    const records = await Promise.all(
      applications.map(async (app) => {
        const customerName = await this.inferCustomerName(
          app.userId as Types.ObjectId,
          app.customerType as UserRole,
        );
        return {
          id: String(app._id),
          customerName,
          assignedTo: app?.assignedTo,
          customerType: app?.customerType,
          date: app.deliveredOn,
          address: app.address,
          binType: app.binType,
          status: app.status,
          // lga: app.localGovernmentArea?.name || 'N/A',
        };
      }),
    );

    return {
      records,
      totalApplications: applications.length,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getAllApplications(filters: GetApplicationsDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.type) {
      query.binType = filters.type;
    }

    if (filters.customerType) {
      query.customerType = filters.customerType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      query.deliveredOn = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' };

      const [residentUsers, corporateUsers, agentUsers, facilityUsers] =
        await Promise.all([
          this.residentModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
          this.corporateModel.find({ businessName: searchRegex }),
          this.agentModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
          this.facilityModel.find({
            $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
          }),
        ]);

      const userIds = [
        ...residentUsers.map((u) => u._id),
        ...corporateUsers.map((u) => u._id),
        ...agentUsers.map((u) => u._id),
        ...facilityUsers.map((u) => u._id),
      ];

      query.$or = [
        { userId: { $in: userIds } },
        { customerType: searchRegex },
        { address: searchRegex },
        { binType: searchRegex },
      ];
    }
    const [applications, total] = await Promise.all([
      this.smartbinModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(query),
    ]);

    const records = await Promise.all(
      applications.map(async (app) => {
        const customerName = await this.inferCustomerName(
          app.userId as Types.ObjectId,
          app.customerType as UserRole,
        );
        return {
          id: String(app._id),
          customerName,
          assignedTo: app?.assignedTo,
          customerType: app?.customerType,
          date: app.createdAt,
          address: app.address,
          binType: app.binType,
          // lga: app.localGovernmentArea,
          status: app.status,
        };
      }),
    );

    return {
      records,
      totalApplications: applications.length,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  //get All bin Orders
  async getAllBinOrders(filters?: orderBinsDto) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;
    const [totalOrders, orderValueAgg, ongoingOrders, completedOrders] =
      await Promise.all([
        this.smartbinModel.countDocuments(),
        this.transactionModel.aggregate([
          {
            $match: {
              service: ServiceType.SmartBinPurchase,
              status: TransactionStatus.Successful,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        this.smartbinModel.countDocuments({
          status: { $in: [SmartbinStatus.Pending, SmartbinStatus.Approved] },
        }),
        this.smartbinModel.countDocuments({ status: SmartbinStatus.Delivered }),
      ]);

    const [orders, total] = await Promise.all([
      this.smartbinModel
        .find()
        .populate('payment')
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(),
    ]);

    const orderValue = orderValueAgg.length > 0 ? orderValueAgg[0].total : 0;

    const records = orders.map((order) => ({
      id: String(order._id),
      orderId: order.binId,
      name: order?.name,
      phoneNumber: order?.phoneNumber,
      // lga: order?.localGovernmentArea,
      orderDate: order.createdAt,
      status: order.status,
    }));

    return {
      summary: {
        totalOrders,
        orderValue,
        ongoingOrders,
        completedOrders,
      },
      orders: records,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  // Assign team member to schedule delivery
  async scheduleDelivery(filters: scheduleDeliveryDto) {
    const smartbin = await this.smartbinModel.findById(filters.applicationId);
    if (!smartbin) {
      throw new NotFoundException('Bin application not found');
    }

    if (smartbin.status === SmartbinStatus.Delivered) {
      throw new BadRequestException(
        'This SmartBin has already been delivered.',
      );
    }

    const teamMember = await this.teamMemberModel.findById(
      filters.teamMemberId,
    );
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    smartbin.status = SmartbinStatus.ScheduledForDelivery;
    smartbin.assignedTo = teamMember._id;
    smartbin.applicationHistory.push({
      timestamp: new Date(),
      status: SmartbinStatus.ScheduledForDelivery,
      description:
        filters.comment || `Scheduled for delivery by ${teamMember.name}`,
      updatedBy: teamMember._id,
      updatedByName: teamMember.name,
    });

    await smartbin.save();

    // 1️⃣ email notification
    this.eventEmitter.emit(
      MailNotificationEvents.Application.SmartBinUpdate,
      new SendEmailEvent({
        to: teamMember.email,
        from: `"LAWMA REG" <accounts@lawma.co>`,
        subject: 'New SmartBin Delivery Assigned',
        context: {
          teamMember: teamMember.name,
          binId: smartbin.binId,
          address: smartbin.address,
          customer: smartbin.name || smartbin.businessName,
          comment: filters.comment,
        },
      }),
    );

    // 1️⃣ in-app notification
    this.eventEmitter.emit(
      events.notifications.created,
      new NotificationEvent({
        userId: String(teamMember.userId),
        title: 'SmartBin Delivery Scheduled',
        text: `You have been assigned to deliver SmartBin ${smartbin.binId}.`,
        type: NotificationType.SmartBinUpdate,
      }),
    );

    return {
      message: 'SmartBin delivery scheduled successfully',
      applicationId: filters.applicationId,
      status: smartbin.status,
      assignedTo: {
        id: teamMember._id,
        name: teamMember.name,
        email: teamMember.email,
        phoneNumber: teamMember.phoneNumber,
      },
      comment: filters.comment,
    };
  }

  // Get bin application by ID
  async getBinApplicationById(id: string) {
    const smartbin = await this.smartbinModel
      .findById(id)
      .populate('payment')
      .lean();
    if (!smartbin) {
      throw new NotFoundException('Bin application not found');
    }
    return smartbin;
  }

  async updateStatus(orderId: string, newStatus: SmartbinStatus) {
    const statusMessages = {
      [SmartbinStatus.Pending]:
        'Your application has been received and is awaiting approval',
      [SmartbinStatus.Inventory]:
        'Your smart bin has been allocated in inventory',
      [SmartbinStatus.ScheduledForDelivery]:
        'Your smart bin has been scheduled for delivery',
      [SmartbinStatus.Delivered]: 'Your smart bin was delivered successfully',
      [SmartbinStatus.Activated]: 'Smart bin has been successfully activated',
    };

    const order = await this.smartbinModel.findOneAndUpdate(
      { _id: orderId },
      {
        $set: { status: newStatus },
        $push: {
          applicationHistory: {
            status: newStatus,
            timestamp: new Date(),
            description: statusMessages[newStatus],
          },
        },
      },
      { new: true },
    );

    return order;
  }

  private async inferCustomerName(
    userId: Types.ObjectId,
    customerType: UserRole,
  ): Promise<string> {
    let customer: any;
    if (customerType === UserRole.Resident) {
      customer = await this.residentModel
        .findById(userId)
        .select('firstName lastName email')
        .lean();
    } else if (customerType === UserRole.Corporate) {
      customer = await this.corporateModel
        .findById(userId)
        .select('businessName email')
        .lean();
    } else if (customerType === UserRole.Agent) {
      customer = await this.agentModel
        .findById(userId)
        .select('firstName lastName email')
        .lean();
    } else if (customerType === UserRole.Facility) {
      customer = await this.facilityModel
        .findById(userId)
        .select('firstName lastName email')
        .lean();
    }

    if (!customer) {
      return 'N/A';
    }

    if (customerType === UserRole.Corporate) {
      return customer.businessName || 'N/A';
    } else {
      return `${customer.firstName || ''} ${customer.lastName || ''}  ${
        customer.email || ''
      }`.trim();
    }
  }

  async getOrderTimeline(id: string) {
    const order = await this.smartbinModel
      .findOne({ _id: id })
      .select(
        'id businessName name email address applicationHistory createdAt userId customerType',
      )
      .lean();

    if (!order) throw new NotFoundException('Order not found');
    const customerName = await this.inferCustomerName(
      order.userId as Types.ObjectId,
      order.customerType as UserRole,
    );

    return {
      orderId: order._id,
      dateProcessed: order.createdAt,
      customerName: customerName,
      customerType: order.customerType,
      destination: order.address,
      timeline: order.applicationHistory.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    };
  }

  async deliverBin(applicationId: string, deliveryData: DeliveryData) {
    if (!deliveryData.agreeToReceive) {
      throw new BadRequestException(
        'Receiver must agree to the delivery terms',
      );
    }

    const smartbin = await this.smartbinModel.findById(applicationId);
    if (!smartbin) {
      throw new NotFoundException('Bin application not found');
    }

    if (smartbin.status === SmartbinStatus.Delivered) {
      throw new BadRequestException('This SmartBin has already been delivered');
    }

    smartbin.status = SmartbinStatus.Delivered;
    smartbin.deliveredOn = new Date();
    smartbin.receiverName = deliveryData.receiverName;
    smartbin.receiverType = deliveryData.receiverType;
    smartbin.applicationHistory.push({
      timestamp: new Date(),
      status: SmartbinStatus.Delivered,
      description: `Delivered to ${deliveryData.receiverName} (${deliveryData.receiverType})`,
    });
    smartbin.applicationHistory.push({
      timestamp: new Date(),
      status: SmartbinStatus.Delivered,
      description: `Delivered to ${deliveryData.receiverName} (${deliveryData.receiverType})`,
      updatedBy: smartbin.assignedTo,
      updatedByName: deliveryData.deliveredBy,
    });

    await smartbin.save();

    return {
      message: 'SmartBin delivered successfully',
      applicationId: applicationId,
      status: smartbin.status,
      deliveredOn: smartbin.deliveredOn,
      deliveredBy: smartbin.deliveredBy,
      receiverName: deliveryData.receiverName,
      receiverType: deliveryData.receiverType,
    };
  }

  async getBinApplicationDetails(applicationId: string) {
    const smartBin = await this.smartbinModel
      .findById(applicationId)
      .populate('payment')
      .populate('lga_id', 'name')
      .lean();

    if (!smartBin) {
      throw new NotFoundException('Bin application not found');
    }

    const customerName = await this.inferCustomerName(
      smartBin.userId as Types.ObjectId,
      smartBin.customerType as UserRole,
    );

    const statusDates = this.extractStatusDates(smartBin.applicationHistory);
    const statusUpdaters = this.extractStatusUpdaters(
      smartBin.applicationHistory,
    );

    const data = {
      id: String(smartBin._id),
      binId: smartBin?.binId,
      status: smartBin?.status,
      createdAt: smartBin?.createdAt,

      customerName,
      email: smartBin?.email,
      customerType: smartBin?.customerType,
      phoneNumber: smartBin?.phoneNumber,

      address: smartBin?.address,
      lga: (smartBin?.lga_id as any)?.name || null,

      binType: smartBin?.binType,
      quantity: smartBin?.quantity || 1,

      deliveredBy: smartBin?.deliveredBy || null,
      assignedTo: smartBin?.assignedTo || null,
      receiverName: smartBin?.receiverName || null,
      receiverType: smartBin?.receiverType || null,

      datePending:
        statusDates[SmartbinStatus.Pending] || smartBin?.createdAt || null,
      dateAddedToInventory: statusDates[SmartbinStatus.Inventory] || null,
      dateAssigned: statusDates[SmartbinStatus.ScheduledForDelivery] || null,
      dateDelivered:
        statusDates[SmartbinStatus.Delivered] || smartBin?.deliveredOn || null,
      dateActivated: statusDates[SmartbinStatus.Activated] || null,

      updatedByInventory: statusUpdaters[SmartbinStatus.Inventory] || null,
      updatedByDelivery: statusUpdaters[SmartbinStatus.Delivered] || null,
      updatedByActivated: statusUpdaters[SmartbinStatus.Activated] || null,

      applicationHistory: smartBin?.applicationHistory || [],
    };

    return { data };
  }

  private extractStatusUpdaters(
    applicationHistory: Array<{
      timestamp: Date;
      status: string;
      description: string;
      updatedBy?: Types.ObjectId;
      updatedByName?: string;
    }>,
  ): Record<string, { name: string }> {
    const statusUpdaters: Record<string, { name: string }> = {};

    if (!Array.isArray(applicationHistory)) {
      return statusUpdaters;
    }

    for (const entry of applicationHistory) {
      if (!statusUpdaters[entry.status]) {
        statusUpdaters[entry.status] = {
          name: entry.updatedByName ?? null,
        };
      }
    }

    return statusUpdaters;
  }

  private extractStatusDates(
    applicationHistory: Array<{
      timestamp: Date;
      status: string;
      description: string;
    }>,
  ): Record<string, Date> {
    const statusDates: Record<string, Date> = {};

    if (!applicationHistory || !Array.isArray(applicationHistory)) {
      return statusDates;
    }

    for (const entry of applicationHistory) {
      if (!statusDates[entry.status]) {
        statusDates[entry.status] = entry.timestamp;
      }
    }

    return statusDates;
  }

  async deleteBinApplication(applicationId: string) {
    const smartBin:
      | (SmartbinDocument & { payment: TransactionAttributes })
      | any = await this.smartbinModel
      .findById(applicationId)
      .populate('payment');

    if (!smartBin) {
      throw new NotFoundException('Bin application not found');
    }

    if (
      smartBin.payment &&
      smartBin.payment.status === TransactionStatus.Successful
    ) {
      throw new BadRequestException('Application already paid!');
    }

    await smartBin.deleteOne();
    return { message: 'Bin application deleted successfully' };
  }

  /////////////////////////////////PARTNERS DASHBOARD///////////////////////////////////

  async getSmartBinPartnersDashboard() {
    const [
      totalSmartbinOrders,
      totalDeliveredSmartbins,
      totalRevenueAgg,
      ongoingDeliveries,
    ] = await Promise.all([
      this.smartbinModel.countDocuments(),
      this.smartbinModel.countDocuments({
        status: SmartbinStatus.Delivered,
      }),
      this.transactionModel.aggregate([
        {
          $match: {
            service: ServiceType.SmartBinPurchase,
            status: TransactionStatus.Successful,
          },
        },
        {
          $group: { _id: null, total: { $sum: '$amount' } },
        },
      ]),
      this.smartbinModel
        .find({
          status: { $in: [SmartbinStatus.Pending, SmartbinStatus.Approved] },
        })
        .populate('lga_id', 'name')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const totalRevenue =
      totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    const pendingList = await Promise.all(
      ongoingDeliveries.map(async (order) => {
        const customerName = await this.inferCustomerName(
          order.userId as Types.ObjectId,
          order.customerType as UserRole,
        );

        const statusDates = this.extractStatusDates(order.applicationHistory);

        return {
          id: String(order._id),
          orderId: order.binId,
          customerName: customerName || order.name || order.businessName,
          phoneNumber: order.phoneNumber,
          email: order.email,
          address: order.address,
          lga: (order?.lga_id as any)?.name || null,
          lga_id: order?.lga_id ? String((order.lga_id as any)._id) : null,
          binType: order.binType,
          quantity: order.quantity || 1,
          orderDate: order.createdAt,
          status: order.status,
          datePending:
            statusDates[SmartbinStatus.Pending] || order.createdAt || null,
          dateApproved: statusDates[SmartbinStatus.Approved] || null,
        };
      }),
    );

    return {
      totalSmartbinOrders,
      totalDeliveredSmartbins,
      totalRevenue,
      pendingList,
    };
  }
  /////////////////// TEAM MEMBER DASHBOARD ////////////////////////////
  // smartbin Team Member

  async getsmartBinTeamMemberDashboard(partnerId: string) {
    const assignedBins = await this.smartbinModel
      .find({ assignedTo: partnerId })
      .populate('lga_id', 'name')
      .lean();

    const totalOrders = assignedBins.length;
    const totalDelivered = assignedBins.filter(
      (b) => b.status === SmartbinStatus.Delivered,
    ).length;

    const pendingDeliveries = assignedBins.filter((b) =>
      [
        SmartbinStatus.Pending,
        SmartbinStatus.Approved,
        SmartbinStatus.ScheduledForDelivery,
      ].includes(b.status),
    );

    const transactionRefs = assignedBins
      .map((b) => b.transactionReference)
      .filter(Boolean);

    let totalAmountGenerated = 0;
    if (transactionRefs.length > 0) {
      const transactions = await this.transactionModel.find({
        transactionReference: { $in: transactionRefs },
        service: ServiceType.SmartBinPurchase,
        status: TransactionStatus.Successful,
      });

      totalAmountGenerated = transactions.reduce(
        (sum, tx) => sum + tx.amount,
        0,
      );
    }

    const pendingList = await Promise.all(
      pendingDeliveries.map(async (order) => {
        const customerName = await this.inferCustomerName(
          order.userId as Types.ObjectId,
          order.customerType as UserRole,
        );

        const statusDates = this.extractStatusDates(order.applicationHistory);
        const statusUpdaters = this.extractStatusUpdaters(
          order.applicationHistory,
        );

        return {
          id: String(order._id),
          orderId: order.binId,
          customerName: customerName || order.name || order.businessName,
          phoneNumber: order.phoneNumber,
          email: order.email,
          address: order.address,
          lga: (order?.lga_id as any)?.name || null,
          lga_id: order?.lga_id ? String((order.lga_id as any)._id) : null,
          binType: order.binType,
          quantity: order.quantity || 1,
          dateAssigned:
            statusDates[SmartbinStatus.ScheduledForDelivery] || null,
          assignedBy:
            statusUpdaters[SmartbinStatus.ScheduledForDelivery]?.name ||
            'Lawma Admin',
          status: order.status,
        };
      }),
    );

    return {
      totalOrders,
      totalDelivered,
      totalAmountGenerated,
      pendingDeliveries: pendingList,
    };
  }
  async getTeamMemberDeliveredBins(
    teamMemberId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { assignedTo: teamMemberId },
        { assignedTo: new Types.ObjectId(teamMemberId) },
      ],
      status: SmartbinStatus.Delivered,
    };

    if (filters?.startDate && filters?.endDate) {
      query.deliveredOn = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const [bins, total] = await Promise.all([
      this.smartbinModel
        .find(query)
        .populate('lga_id', 'name')
        .populate('payment')
        .sort({ deliveredOn: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(query),
    ]);

    const records = await Promise.all(
      bins.map(async (bin) => {
        const customerName = await this.inferCustomerName(
          bin.userId as Types.ObjectId,
          bin.customerType as UserRole,
        );

        const statusDates = this.extractStatusDates(bin.applicationHistory);
        const statusUpdaters = this.extractStatusUpdaters(
          bin.applicationHistory,
        );

        return {
          id: String(bin._id),
          binId: bin.binId,
          status: bin.status,

          // Customer info
          customerName: customerName || bin.name || bin.businessName,
          customerType: bin.customerType,
          email: bin.email,
          phoneNumber: bin.phoneNumber,

          // Location info
          address: bin.address,
          lga: (bin?.lga_id as any)?.name || null,
          lga_id: bin?.lga_id ? String((bin.lga_id as any)._id) : null,

          // Bin info
          binType: bin.binType,
          quantity: bin.quantity || 1,

          // Receiver info
          receiverName: bin.receiverName || null,
          receiverType: bin.receiverType || null,

          // Dates
          orderDate: bin.createdAt,
          dateAssigned:
            statusDates[SmartbinStatus.ScheduledForDelivery] || null,
          dateDelivered:
            statusDates[SmartbinStatus.Delivered] || bin.deliveredOn || null,

          // Updater
          deliveredBy: statusUpdaters[SmartbinStatus.Delivered]?.name || null,
        };
      }),
    );

    return {
      totalDelivered: total,
      records,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }

  async getTeamMemberActivatedBins(
    teamMemberId: string,
    filters?: GetTeamMemberBinsFilterDto,
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { assignedTo: teamMemberId },
        { assignedTo: new Types.ObjectId(teamMemberId) },
      ],
      status: SmartbinStatus.Activated,
    };

    if (filters?.startDate && filters?.endDate) {
      query.updatedAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const [bins, total] = await Promise.all([
      this.smartbinModel
        .find(query)
        .populate('lga_id', 'name')
        .populate('payment')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.smartbinModel.countDocuments(query),
    ]);

    const records = await Promise.all(
      bins.map(async (bin) => {
        const customerName = await this.inferCustomerName(
          bin.userId as Types.ObjectId,
          bin.customerType as UserRole,
        );

        const statusDates = this.extractStatusDates(bin.applicationHistory);
        const statusUpdaters = this.extractStatusUpdaters(
          bin.applicationHistory,
        );

        return {
          id: String(bin._id),
          binId: bin.binId,
          status: bin.status,

          customerName: customerName || bin.name || bin.businessName,
          customerType: bin.customerType,
          email: bin.email,
          phoneNumber: bin.phoneNumber,

          address: bin.address,
          lga: (bin?.lga_id as any)?.name || null,
          lga_id: bin?.lga_id ? String((bin.lga_id as any)._id) : null,

          binType: bin.binType,
          quantity: bin.quantity || 1,

          orderDate: bin.createdAt,
          dateDelivered:
            statusDates[SmartbinStatus.Delivered] || bin.deliveredOn || null,
          dateActivated: statusDates[SmartbinStatus.Activated] || null,

          activatedBy: statusUpdaters[SmartbinStatus.Activated]?.name || null,
        };
      }),
    );

    return {
      totalActivated: total,
      records,
      paging: {
        total,
        page,
        pages: Math.ceil(total / limit),
        size: limit,
      },
    };
  }
}
