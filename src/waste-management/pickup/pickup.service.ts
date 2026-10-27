import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePickupDto } from './dto/createPickup.dto';
import { Pickup, PickupDocument, Status } from '@models/pickup';
import { Agent } from '@models/users/agent.model';
import { Corporate } from '@models/users/corporate.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { Resident } from '@models/users/resident.model';
import { Bill } from '@models/bill.model';
import { Wallet } from '@models/wallet.model';
import { SmartBin } from '@models/smart-bin.model';
import { UserRole } from '@models/types';
import { Payer } from '@models/users/payer.model';
import { Paging } from '@common/http';
import { generateRandomChars } from '@common/utils';

import {
  ServiceType,
  Transaction,
  TransactionStatus,
} from '@models/transaction.model';
import {
  AssignTeamMemberDto,
  GetPickupDto,
  GetPickupsForPspDto,
  UpdatePickupStatusDto,
  RequestPickupDto,
} from '@src/waste-management/pickup/dto/pickup.dto';
import { AdminUser, AuthUser, PspUser } from '@common/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PspUsersDocument, PSPUsers } from '@models/psp-users.model';
import { PspTeamMember } from '@common/types';

@Injectable()
export class PickupService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(Pickup.name)
    private readonly pickupModel: Model<PickupDocument>,
    @InjectModel(Resident.name)
    private readonly residentModel: Model<Resident>,
    @InjectModel(Agent.name)
    private readonly agentModel: Model<Agent>,
    @InjectModel(Corporate.name)
    private readonly corporateModel: Model<Corporate>,
    @InjectModel(FacilityManager.name)
    private readonly facilityManagerModel: Model<FacilityManager>,
    @InjectModel(PSPUsers.name)
    private readonly pspMembersModel: Model<PspUsersDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  //  findAll pickups
  async getAllPickups(accountId: Types.ObjectId) {
    return await this.pickupModel
      .find({ accountId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // resident pickups
  async getResidentPickups(residentId: string) {
    const [pickups] = await Promise.all([
      this.pickupModel
        .find({ userId: residentId, userType: UserRole.Resident })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    return {
      pickups,
    };
  }

  // For facility manager
  async getFacilityManagerPickups(facilityManagerId: string) {
    const query = {
      accountId: new Types.ObjectId(facilityManagerId),
      userType: UserRole.Facility,
    };
    const totalDocument = await this.pickupModel.countDocuments(query);
    const pickups = await this.pickupModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    const pagingMeta: Paging = {
      page: 1,
      pages: Math.ceil(totalDocument / 10), // Assuming 10 items per page
      size: totalDocument,
      total: totalDocument,
    };

    return {
      data: pickups,
      paging: pagingMeta,
    };
  }

  async getPickups(account: AuthUser) {
    const query = {
      accountId: new Types.ObjectId(account.id),
      accountType: account.role,
    };
    const totalDocument = await this.pickupModel.countDocuments(query);
    const pickups = await this.pickupModel
      .find(query)
      .populate('payment')
      .sort({ createdAt: -1 })
      .lean();

    const pagingMeta: Paging = {
      page: 1,
      pages: Math.ceil(totalDocument / 10), // Assuming 10 items per page
      size: totalDocument,
      total: totalDocument,
    };

    return {
      data: pickups,
      paging: pagingMeta,
    };
  }

  // For agent
  async getAgentPickups(agentId: string) {
    const [agent] = await Promise.all([
      this.pickupModel
        .find({ userId: agentId, userType: UserRole.Agent })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return {
      agent,
    };
  }

  //get all pickups by ID
  async getPickupById(id: string) {
    const pickup = await this.pickupModel.findById(id).lean();
    if (!pickup) {
      throw new NotFoundException(`Pickup with ID ${id} not found`);
    }
    return pickup;
  }

  //create pickup
  async createPickup({
    accountId,
    accountType,
    applicationData,
  }: {
    accountId: string;
    accountType: UserRole;
    applicationData: CreatePickupDto;
  }) {
    if (applicationData.transactionReference) {
      const successfulCharge = await this.transactionModel.exists({
        transactionReference: applicationData.transactionReference,
        userId: accountId,
        userType: accountType,
        status: TransactionStatus.Successful,
      });
      if (!successfulCharge) {
        throw new BadRequestException('Invalid transaction reference.');
      }
    }
    const generateTransactionRef = generateRandomChars(10, 'alphanum');
    const [wastePickupApplicaiton, transaction] = await Promise.all([
      this.pickupModel.create({
        ...applicationData,
        accountId: new Types.ObjectId(accountId),
        accountType: accountType,
        transactionReference:
          applicationData.transactionReference || generateTransactionRef,

        applicationHistory: [
          {
            timestamp: new Date(),
            status: Status.Pending,
            description: 'Application successful awaiting approval',
          },
        ],
      }),
      this.transactionModel.create({
        userId: String(accountId),
        transactionReference: generateTransactionRef,
        userType: accountType,
        amount: 100000,
        service: ServiceType.WasteDisposal,
        status: applicationData.transactionReference
          ? TransactionStatus.Successful
          : TransactionStatus.Pending,
        meta: {
          location: applicationData?.address,
          description: applicationData?.description,
          address: applicationData?.address,
        },
      }),
    ]);
    return {
      application: wastePickupApplicaiton,
      transactionReference: generateTransactionRef,
    };
  }

  // SuperAdmin pickups
  async getPickupsForAdmin(admin: AdminUser, filters?: GetPickupDto) {
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.search) {
      query.$or = [
        { address: { $regex: filters.search, $options: 'i' } },
        { representative: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [pickups, totalRequest] = await Promise.all([
      this.pickupModel
        .find(query)
        .select(
          'wasteId accountId accountType createdAt address representative status',
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.pickupModel.countDocuments(query),
    ]);

    const wastePickedUp = await this.pickupModel.countDocuments({
      status: Status.Completed,
    });
    const pendingPickups = await this.pickupModel.countDocuments({
      status: Status.Pending,
    });

    const result = await this.transactionModel.aggregate([
      {
        $match: {
          status: TransactionStatus.Successful,
          service: ServiceType.WasteDisposal,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const amountGenerated = result.length > 0 ? result[0].total : 0;

    return {
      adminInfo: {
        username: admin.name,
        adminId: admin.id,
        role: admin.role,
      },
      dashboard: {
        wastePickedUp,
        pendingPickups,
        amountGenerated,
      },
      pickups: pickups,
      paging: {
        totalRequest,
        page: page,
        pages: Math.ceil(totalRequest / limit),
        size: limit,
      },
    };
  }

  async getPendingPickups(psp: PspUser, filters?: GetPickupsForPspDto) {
    const { page = 1, limit = 10, search } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = {
      status: Status.Pending,
      pspId: null,
    };

    if (search) {
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { representative: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [pickups, totalCount] = await Promise.all([
      this.pickupModel
        .find(query)
        .select(
          'id address accountId customerName createdAt status accountType',
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.pickupModel.countDocuments(query),
    ]);

    const { users } = await this.inferUsers(pickups);

    const formattedPickups = pickups.map((pickup) => {
      const user = users[pickup.accountType].find(
        (user) => user._id.toString() === pickup.accountId.toString(),
      );
      return {
        wasteId: pickup._id,
        address: pickup.address,
        pspTeam: pickup.representative || 'N/A',
        customerName: user
          ? `${user.firstName} ${user.lastName}`
          : pickup.customerName,
        fillUpLevel: 'N/A',
        dateCreated: pickup.createdAt,
      };
    });

    const paging = {
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      pageSize: limit,
    };

    return {
      pspInfo: {
        username: psp.name,
        pspId: psp.id,
      },
      pickups: formattedPickups,
      paging,
    };
  }

  async inferUsers(pickups: any[]) {
    const residentIds = pickups
      .filter((pickup) => pickup.accountType === UserRole.Resident)
      .map((pickup) => pickup.accountId);
    const agentIds = pickups
      .filter((pickup) => pickup.accountType === UserRole.Agent)
      .map((pickup) => pickup.accountId);
    const corporateIds = pickups
      .filter((pickup) => pickup.accountType === UserRole.Corporate)
      .map((pickup) => pickup.accountId);
    const facilityManagerIds = pickups
      .filter((pickup) => pickup.accountType === UserRole.Facility)
      .map((pickup) => pickup.accountId);

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

  async getAssignedPickups(psp: PspUser, filters?: GetPickupsForPspDto) {
    const { page = 1, limit = 10, search } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = {
      pspId: new Types.ObjectId(psp.id),
      assignedTo: { $exists: true, $ne: null },
    };

    if (search) {
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { representative: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [pickups, totalCount] = await Promise.all([
      this.pickupModel
        .find(query)
        .select(
          'id address accountId customerName  updatedAt status accountType assignedTo',
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.pickupModel.countDocuments(query),
    ]);

    const { users } = await this.inferUsers(pickups);

    const formattedPickups = pickups.map((pickup) => {
      const user = users[pickup.accountType].find(
        (user) => user._id.toString() === pickup.accountId.toString(),
      );
      return {
        wasteId: pickup._id,
        address: pickup.address,
        accountId: pickup.accountId,
        accountType: pickup.accountType,
        customerName: user
          ? `${user.firstName} ${user.lastName}`
          : pickup.customerName,
        fillUpLevel: 'N/A',
        assignedTo: pickup.assignedTo || 'N/A',
        dateAssigned: pickup.updatedAt,
      };
    });

    const paging = {
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
    return {
      pspInfo: {
        username: psp.name,
        pspId: psp.id,
      },
      pickups: formattedPickups,
      paging,
    };
  }

  async getCompletedPickups(psp: PspUser, filters?: GetPickupsForPspDto) {
    const { page = 1, limit = 10, search } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = {
      status: Status.Completed,
      pspId: new Types.ObjectId(psp.id),
    };

    if (search) {
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { representative: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [pickups, totalCount] = await Promise.all([
      this.pickupModel
        .find(query)
        .select(
          'id address accountId customerName  updatedAt status accountType assignedTo',
        )
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean(),
      this.pickupModel.countDocuments(query),
    ]);

    const { users } = await this.inferUsers(pickups);

    const formattedPickups = pickups.map((pickup) => {
      const user = users[pickup.accountType].find(
        (user) => user._id.toString() === pickup.accountId.toString(),
      );
      return {
        wasteId: pickup._id,
        address: pickup.address,
        customerName: user
          ? `${user.firstName} ${user.lastName}`
          : pickup.customerName,
        assignedTo: pickup.assignedTo || 'N/A',
        dateCompleted: pickup.updatedAt,
      };
    });

    const paging = {
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      pageSize: limit,
    };

    return {
      pspInfo: {
        username: psp.name,
        pspId: psp.id,
      },
      pickups: formattedPickups,
      paging,
    };
  }

  async assignTeamMember(
    psp: PspUser,
    pickupId: string,
    dto: AssignTeamMemberDto,
  ) {
    const pickup = await this.pickupModel.findById(pickupId);
    const teamMember = await this.pspMembersModel.findOne({
      _id: dto.teamMemberId,
      psp_id: new Types.ObjectId(psp.id),
    });

    if (!teamMember) {
      throw new NotFoundException(
        `Team member with ID ${dto.teamMemberId} not found in your PSP`,
      );
    }

    if (!pickup) {
      throw new NotFoundException(`Pickup with ID ${pickupId} not found`);
    }

    // Update pickup status and assign team member
    pickup.status = Status.Assigned;
    pickup.assignedTo = teamMember.name;
    pickup.agentNote = dto.note;
    pickup.pspId = new Types.ObjectId(psp.id);

    await pickup.save();

    return pickup;
  }

  async getPickupAssignedToTeammember(
    pspTeamMember: PspTeamMember,
    filters?: GetPickupDto,
  ) {
    const { page = 1, limit = 10, search } = filters || {};
    const skip = (page - 1) * limit;
    const query: any = {
      assignedTo: pspTeamMember.name,
      status: Status.Assigned,
    };

    if (search) {
      query.$or = [
        { address: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { representative: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [pickups, totalCount] = await Promise.all([
      this.pickupModel
        .find(query)
        .select(
          'id address accountId customerName updatedAt status accountType assignedTo',
        )
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      this.pickupModel.countDocuments(query),
    ]);

    const { users } = await this.inferUsers(pickups);

    const formattedPickups = pickups.map((pickup) => {
      const user = users[pickup.accountType].find(
        (user) => user._id.toString() === pickup.accountId.toString(),
      );
      return {
        wasteId: pickup._id,
        address: pickup.address,
        accountId: pickup.accountId,
        accountType: pickup.accountType,
        customerName: user
          ? `${user.firstName} ${user.lastName}`
          : pickup.customerName,
        fillUpLevel: 'N/A',
        assignedTo: pickup.assignedTo || 'N/A',
        dateAssigned: pickup.updatedAt,
      };
    });

    const paging = {
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };

    return {
      teamMemberInfo: {
        username: pspTeamMember.name,
        memberId: pspTeamMember.id,
      },
      pickups: formattedPickups,
      paging,
    };
  }

  //update pickups status
  async updatePickupStatus(id: string, { status }: UpdatePickupStatusDto) {
    const pickup = await this.pickupModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean();
    if (!pickup) {
      throw new NotFoundException(`Pickup with ID ${id} not found`);
    }

    return pickup;
  }

  async getPickupByWasteId(id: string) {
    const pickup = await this.pickupModel.findById(id).lean();
    if (!pickup) {
      throw new NotFoundException(`Pickup with ID ${id} not found`);
    }

    let customerName: string | undefined;
    let email: string | undefined;
    let localGovernmentArea: string | undefined;

    if (pickup.accountId && pickup.accountType) {
      const { users } = await this.inferUsers([pickup]);
      const user = users[pickup.accountType].find(
        (user) => user._id.toString() === pickup.accountId.toString(),
      );
      if (user) {
        customerName = `${user.firstName} ${user.lastName}`;
        email = user.email;
        localGovernmentArea = 'N/A';
        // localGovernmentArea = user.localGovernmentArea;
      }
    }

    return {
      id: pickup._id,
      customerName,
      phoneNumber: pickup.phoneNumber,
      email,
      address: pickup.address,
      lga: localGovernmentArea || 'N/A',
      status: pickup.status,
      fillUpLevel: 'N/A',
    };
  }

  //delete pickup by ID
  async deletePickupById(id: string) {
    const pickup = await this.pickupModel.findByIdAndDelete(id).lean();
    if (!pickup) {
      throw new NotFoundException(`Pickup with ID ${id} not found`);
    }
    return { message: 'Pickup deleted successfully' };
  }

  // Add these methods to your PickupService

  // 1. Get revenue for ALL PSP companies (for Super Admin dashboard)
  async getPspRevenueForAdmin(filters?: GetPickupsForPspDto) {
    const { page = 1, limit = 10, search, lga } = filters || {};
    const skip = (page - 1) * limit;

    // Build date filter for completed pickups
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.updatedAt = {};
      if (filters.startDate)
        dateFilter.updatedAt.$gte = new Date(filters.startDate);
      if (filters.endDate)
        dateFilter.updatedAt.$lte = new Date(filters.endDate);
    }

    // Base match for pickups
    const pickupMatch: any = {
      status: Status.Completed,
      pspId: { $exists: true },
      ...dateFilter,
    };

    // Build the aggregation pipeline
    const pipeline: any[] = [
      { $match: pickupMatch },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionReference',
          foreignField: 'transactionReference',
          as: 'transaction',
        },
      },
      {
        $unwind: {
          path: '$transaction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'transaction.status': TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: '$pspId',
          totalRevenue: { $sum: '$transaction.amount' },
          completedPickups: { $sum: 1 },
          householdsCovered: { $addToSet: '$accountId' },
        },
      },
      {
        $lookup: {
          from: 'psps',
          localField: '_id',
          foreignField: '_id',
          as: 'psp',
        },
      },
      { $unwind: '$psp' },
      {
        $lookup: {
          from: 'lgas',
          localField: 'psp.lga_id',
          foreignField: '_id',
          as: 'lga',
        },
      },
      {
        $unwind: {
          path: '$lga',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add LGA filter after lookup (filter by LGA ID or name)
    if (lga) {
      pipeline.push({
        $match: {
          $or: [
            { 'lga._id': new Types.ObjectId(lga) },
            { 'lga.name': { $regex: lga, $options: 'i' } },
          ],
        },
      });
    }

    // Add search filter (search by PSP company name, administrator name, or LGA name)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'psp.company_name': { $regex: search, $options: 'i' } },
            { 'psp.administrator_name': { $regex: search, $options: 'i' } },
            { 'lga.name': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Project the final shape
    pipeline.push({
      $project: {
        pspId: '$_id',
        pspCompany: '$psp.company_name',
        administratorName: '$psp.administrator_name',
        administratorEmail: '$psp.administrator_email',
        lcda: '$lga.name',
        lgaId: '$lga._id',
        householdCovered: { $size: '$householdsCovered' },
        revenue: '$totalRevenue',
        completedPickups: 1,
      },
    });

    // Create a copy of the pipeline for counting (before skip/limit)
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Add sorting and pagination
    pipeline.push(
      { $sort: { revenue: -1 } },
      { $skip: skip },
      { $limit: limit },
    );

    // Execute both pipelines
    const [pspRevenue, totalCountResult, totalRevenueResult] =
      await Promise.all([
        this.pickupModel.aggregate(pipeline),
        this.pickupModel.aggregate(countPipeline),
        this.transactionModel.aggregate([
          {
            $match: {
              status: TransactionStatus.Successful,
              service: ServiceType.WasteDisposal,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    const totalCount = totalCountResult[0]?.total || 0;
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    return {
      totalRevenue,
      pspRevenue: pspRevenue.map((item) => ({
        pspId: item.pspId,
        pspCompany: item.pspCompany,
        administratorName: item.administratorName,
        lcda: item.lcda || 'N/A',
        lgaId: item.lgaId,
        householdCovered: item.householdCovered,
        revenue: item.revenue,
        completedPickups: item.completedPickups,
        outstandingBills: 0,
        company_name: item.pspCompany,
      })),
      paging: {
        totalRecords: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        pageSize: limit,
      },
    };
  }
  // async getPspRevenueForAdmin(filters?: GetPickupsForPspDto) {
  //   const { page = 1, limit = 10 } = filters || {};
  //   const skip = (page - 1) * limit;

  //   // Build date filter for completed pickups
  //   const dateFilter: any = {};
  //   if (filters?.startDate || filters?.endDate) {
  //     dateFilter.updatedAt = {};
  //     if (filters.startDate) dateFilter.updatedAt.$gte = filters.startDate;
  //     if (filters.endDate) dateFilter.updatedAt.$lte = filters.endDate;
  //   }

  //   // Aggregate completed pickups by PSP
  //   const pspRevenue = await this.pickupModel.aggregate([
  //     {
  //       $match: {
  //         status: Status.Completed,
  //         pspId: { $exists: true, $ne: null },
  //         ...dateFilter,
  //       },
  //     },
  //     {
  //       // Lookup the transaction to get the amount
  //       $lookup: {
  //         from: 'transactions',
  //         localField: 'transactionReference',
  //         foreignField: 'transactionReference',
  //         as: 'transaction',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$transaction',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       // Only count successful transactions
  //       $match: {
  //         'transaction.status': TransactionStatus.Successful,
  //       },
  //     },
  //     {
  //       // Group by PSP
  //       $group: {
  //         _id: '$pspId',
  //         totalRevenue: { $sum: '$transaction.amount' },
  //         completedPickups: { $sum: 1 },
  //         // Count unique households/accounts
  //         householdsCovered: { $addToSet: '$accountId' },
  //       },
  //     },
  //     {
  //       // Lookup PSP details
  //       $lookup: {
  //         from: 'psps',
  //         localField: '_id',
  //         foreignField: '_id',
  //         as: 'psp',
  //       },
  //     },
  //     {
  //       $unwind: '$psp',
  //     },
  //     {
  //       // Lookup LGA details
  //       $lookup: {
  //         from: 'lgas',
  //         localField: 'psp.lga_id',
  //         foreignField: '_id',
  //         as: 'lga',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$lga',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $project: {
  //         pspId: '$_id',
  //         pspCompany: '$psp.company_name',
  //         lcda: '$lga.name',
  //         householdCovered: { $size: '$householdsCovered' },
  //         revenue: '$totalRevenue',
  //         completedPickups: 1,
  //       },
  //     },
  //     { $sort: { revenue: -1 } },
  //     { $skip: skip },
  //     { $limit: limit },
  //   ]);

  //   // Get total count for pagination
  //   const totalCountResult = await this.pickupModel.aggregate([
  //     {
  //       $match: {
  //         status: Status.Completed,
  //         pspId: { $exists: true, $ne: null },
  //         ...dateFilter,
  //       },
  //     },
  //     {
  //       $group: { _id: '$pspId' },
  //     },
  //     {
  //       $count: 'total',
  //     },
  //   ]);

  //   const totalCount = totalCountResult[0]?.total || 0;

  //   // Get total revenue across all PSPs
  //   const totalRevenueResult = await this.transactionModel.aggregate([
  //     {
  //       $match: {
  //         status: TransactionStatus.Successful,
  //         service: ServiceType.WasteDisposal,
  //       },
  //     },
  //     {
  //       $group: { _id: null, total: { $sum: '$amount' } },
  //     },
  //   ]);

  //   const totalRevenue = totalRevenueResult[0]?.total || 0;

  //   return {
  //     totalRevenue,
  //     pspRevenue: pspRevenue.map((item) => ({

  //       pspId: item.pspId,
  //       pspCompany: item.pspCompany,
  //       lcda: item.lcda ,
  //       householdCovered: item.householdCovered,
  //       revenue: item.revenue,
  //       outstandingBills: 0,
  //     })),
  //     paging: {
  //       totalRecords: totalCount,
  //       currentPage: page,
  //       totalPages: Math.ceil(totalCount / limit),
  //       pageSize: limit,
  //     },
  //   };
  // }

  async getRevenueForPsp(
    pspId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'day' | 'month' | 'year';
    },
  ) {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      dateFilter.updatedAt = {};
      if (filters.startDate) dateFilter.updatedAt.$gte = filters.startDate;
      if (filters.endDate) dateFilter.updatedAt.$lte = filters.endDate;
    }

    // Get total revenue for this PSP
    const revenueResult = await this.pickupModel.aggregate([
      {
        $match: {
          status: Status.Completed,
          pspId: new Types.ObjectId(pspId),
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionReference',
          foreignField: 'transactionReference',
          as: 'transaction',
        },
      },
      {
        $unwind: {
          path: '$transaction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'transaction.status': TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$transaction.amount' },
          completedPickups: { $sum: 1 },
          householdsCovered: { $addToSet: '$accountId' },
        },
      },
    ]);

    // Get revenue over time (for chart)
    const groupBy = filters?.groupBy || 'month';
    const dateFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
      year: { $dateToString: { format: '%Y', date: '$updatedAt' } },
    };

    const revenueOverTime = await this.pickupModel.aggregate([
      {
        $match: {
          status: Status.Completed,
          pspId: new Types.ObjectId(pspId),
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionReference',
          foreignField: 'transactionReference',
          as: 'transaction',
        },
      },
      {
        $unwind: '$transaction',
      },
      {
        $match: {
          'transaction.status': TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: dateFormat[groupBy],
          revenue: { $sum: '$transaction.amount' },
          pickups: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const summary = revenueResult[0] || {
      totalRevenue: 0,
      completedPickups: 0,
      householdsCovered: [],
    };

    return {
      totalRevenue: summary.totalRevenue,
      completedPickups: summary.completedPickups,
      householdsCovered: Array.isArray(summary.householdsCovered)
        ? summary.householdsCovered.length
        : 0,
      revenueOverTime,
    };
  }

  // 3. Get monthly revenue breakdown for admin chart
  async getMonthlyRevenueForAdmin(year?: number) {
    const targetYear = year || new Date().getFullYear();

    const monthlyRevenue = await this.pickupModel.aggregate([
      {
        $match: {
          status: Status.Completed,
          pspId: { $exists: true, $ne: null },
          updatedAt: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`),
          },
        },
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionReference',
          foreignField: 'transactionReference',
          as: 'transaction',
        },
      },
      {
        $unwind: '$transaction',
      },
      {
        $match: {
          'transaction.status': TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: { $month: '$updatedAt' },
          revenue: { $sum: '$transaction.amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format for chart (fill in missing months with 0)
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const chartData = months.map((month, index) => {
      const found = monthlyRevenue.find((r) => r._id === index + 1);
      return {
        month,
        revenue: found?.revenue || 0,
      };
    });

    return {
      year: targetYear,
      data: chartData,
    };
  }
}
