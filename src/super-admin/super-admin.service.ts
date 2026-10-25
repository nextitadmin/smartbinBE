import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { Resident } from '@models/users/resident.model';
import { Agent } from '@models/users/agent.model';
import { Corporate } from '@models/users/corporate.model';
import { FacilityManager } from '@models/users/facility-manager.model';
import { Bill, BillStatus } from '@models/bill.model';
import { Wallet } from '@models/wallet.model';
import { BinType, SmartBin, SmartbinStatus } from '@models/smart-bin.model';
import {
  ServiceType,
  Transaction,
  TransactionStatus,
} from '@models/transaction.model';
import { Pickup, Status } from '@models/pickup';
import { TeamMember } from '@models/team.model';
import { UserRole } from '@models/types';
import { Paging, SuccessResponse } from '@common/http';
import { PSP } from '@models/psp.model';
import { Lga } from '@models/lgas.model';
import { PspService } from '../lawma/psp/psp.service';
import { CreatePspDTO, ChangeStatusPspDto } from '../lawma/psp/dto/psp.dto';
import { PickupService } from '@src/waste-management/pickup/pickup.service';
import { AdminUser, PspUser } from '@common/types';
import { GetPickupsForPspDto } from '@src/waste-management/pickup/dto/pickup.dto';
import {
  RevenueOverviewDto,
  DashboardFiltersDto,
  DashboardFilterType,
  LawmaAdminDashboardFiltersDto,
} from './dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Resident.name) private readonly residentModel: Model<Resident>,
    @InjectModel(Agent.name) private readonly agentModel: Model<Agent>,
    @InjectModel(Corporate.name)
    private readonly corporateModel: Model<Corporate>,
    @InjectModel(FacilityManager.name)
    private readonly facilityModel: Model<FacilityManager>,
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(SmartBin.name) private readonly smartbinModel: Model<SmartBin>,
    @InjectModel(Pickup.name) private readonly pickupModel: Model<Pickup>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(TeamMember.name)
    private readonly teamMemberModel: Model<TeamMember>,
    @InjectModel(PSP.name) private readonly pspModel: Model<PSP>,
    @InjectModel(Lga.name) private readonly lgaModel: Model<Lga>,
    private readonly pspService: PspService,
    private readonly pickupService: PickupService,
  ) { }

  async getSuperAdminDashboard(filters?: DashboardFiltersDto) {
    // derive date range from filters
    const { filter, year, pspId, lgaId } = filters || {};
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (filter) {
      case DashboardFilterType.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case DashboardFilterType.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case DashboardFilterType.MTD:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case DashboardFilterType.THIS_YEAR:
        startDate = new Date(year || now.getFullYear(), 0, 1);
        endDate = new Date((year || now.getFullYear()) + 1, 0, 1);
        break;
      case DashboardFilterType.YTD:
        startDate = new Date(year || now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        // no date filtering
        break;
    }

    const [
      residentCount,
      agentCount,
      corporateCount,
      facilityManagerCount,
      totalTeamMembers,
    ] = await Promise.all([
      this.residentModel.countDocuments().exec(),
      this.agentModel.countDocuments().exec(),
      this.corporateModel.countDocuments().exec(),
      this.facilityModel.countDocuments().exec(),
      this.teamMemberModel.countDocuments().exec(),
    ]);

    const totalRegisteredUsers =
      residentCount + agentCount + corporateCount + facilityManagerCount;

    const percentageByUserType = {
      resident: Math.floor((residentCount / totalRegisteredUsers) * 100) || 0,
      agent: Math.floor((agentCount / totalRegisteredUsers) * 100) || 0,
      corporate: Math.floor((corporateCount / totalRegisteredUsers) * 100) || 0,
      facilityManager:
        Math.floor((facilityManagerCount / totalRegisteredUsers) * 100) || 0,
      teamMember:
        Math.floor((totalTeamMembers / totalRegisteredUsers) * 100) || 0,
    };

    // date match for queries
    const dateMatch: any = {};
    if (startDate && endDate)
      dateMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate) dateMatch.createdAt = { $gte: startDate };

    // Bin requests with breakdown by type and status
    const binRequestsPipeline: PipelineStage[] = [
      {
        $match: {
          ...dateMatch,
        },
      },
      {
        $facet: {
          pendingBinRequests: [
            {
              $match: {
                status: SmartbinStatus.Pending,
              },
            },
            {
              $count: 'count',
            },
          ],
          deliveredBinRequests: [
            {
              $match: {
                status: SmartbinStatus.Delivered,
              },
            },
            {
              $count: 'count',
            },
          ],
          totalBinRequests: [
            {
              $count: 'count',
            },
          ],
          smartBinCount: [
            {
              $match: {
                binType: BinType.Smart,
              },
            },
            {
              $count: 'count',
            },
          ],
          nonSmartBinCount: [
            {
              $match: {
                binType: BinType.Non_Smart,
              },
            },
            {
              $count: 'count',
            },
          ],
          binStatusBreakdown: [
            { $match: dateMatch },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];
    const [binRequests] =
      await this.smartbinModel.aggregate(binRequestsPipeline);
    const totalBinRequests = binRequests?.totalBinRequests?.[0]?.count || 0;
    const pendingBinRequests = binRequests?.pendingBinRequests?.[0]?.count || 0;
    const deliveredBinRequests =
      binRequests?.deliveredBinRequests?.[0]?.count || 0;
    const smartBinCount = binRequests?.smartBinCount?.[0]?.count || 0;
    const nonSmartBinCount = binRequests?.nonSmartBinCount?.[0]?.count || 0;
    // Bin request status breakdown
    const binStatusBreakdown = binRequests?.binStatusBreakdown || [];

    // Revenue data - total, bin purchase, waste disposal
    const transactionDateMatch: any = { status: TransactionStatus.Successful };
    if (startDate && endDate)
      transactionDateMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate)
      transactionDateMatch.createdAt = { $gte: startDate };

    const [totalRevenue, binPurchaseRevenue, wasteDisposalRevenue] =
      await Promise.all([
        // total revenue in range or full year
        (async () => {
          if (startDate) {
            const res = await this.transactionModel.aggregate([
              { $match: transactionDateMatch },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);
            return res?.[0]?.total || 0;
          }
          return this.getYearlyRevenue(new Date().getFullYear());
        })(),
        this.transactionModel.aggregate([
          {
            $match: {
              ...transactionDateMatch,
              service: ServiceType.SmartBinPurchase,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        this.transactionModel.aggregate([
          {
            $match: {
              ...transactionDateMatch,
              service: ServiceType.WasteDisposal,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    const totalPSPCompanies = await this.pspModel.countDocuments().exec();

    // Number of waste pickups (completed) in range
    const pickupMatch: any = { status: Status.Completed };
    if (startDate && endDate)
      pickupMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate) pickupMatch.createdAt = { $gte: startDate };
    if (pspId) pickupMatch.pspId = new Types.ObjectId(pspId);

    const numberOfWastePickups = await this.pickupModel
      .countDocuments(pickupMatch)
      .exec();

    // Households enumerated and number of LGAs covered
    const residentMatch: any = { deleted_at: null };
    if (lgaId) residentMatch.lga_id = new Types.ObjectId(lgaId);
    if (startDate && endDate)
      residentMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate)
      residentMatch.createdAt = { $gte: startDate };

    // Households enumerated: object with total and byLga breakdown (including 0 counts)
    const [totalHouseholdsEnumerated, allLgas, householdsByLgaAggregation] =
      await Promise.all([
        this.residentModel.countDocuments(residentMatch).exec(),
        this.lgaModel.find().lean(),
        this.residentModel.aggregate([
          { $match: residentMatch },
          { $group: { _id: '$lga_id', count: { $sum: 1 } } },
        ]),
      ]);

    const householdsMap = new Map(
      householdsByLgaAggregation.map((item) => [String(item._id), item.count]),
    );

    const householdsByLga = allLgas
      .map((lga) => ({
        lgaId: lga._id,
        lgaName: lga.name,
        householdsEnumerated: householdsMap.get(String(lga._id)) || 0,
      }))
      .sort((a, b) => b.householdsEnumerated - a.householdsEnumerated);

    const householdsEnumerated = {
      total: totalHouseholdsEnumerated,
      byLga: householdsByLga,
    };

    const lgaIds = await this.residentModel.distinct('lga_id', residentMatch);
    const numberOfLgasCovered = Array.isArray(lgaIds) ? lgaIds.length : 0;

    // Unpaid bills
    const unpaidBillMatch: any = { status: BillStatus.Pending };
    if (startDate && endDate)
      unpaidBillMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate)
      unpaidBillMatch.createdAt = { $gte: startDate };

    const [unpaidBillsSummary] = await this.billModel
      .aggregate([
        { $match: unpaidBillMatch },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    // PSP revenue breakdown for dashboard
    const pspTransactionMatch: any = { status: TransactionStatus.Successful };
    if (startDate && endDate)
      pspTransactionMatch.createdAt = { $gte: startDate, $lt: endDate };
    else if (startDate && !endDate)
      pspTransactionMatch.createdAt = { $gte: startDate };

    const { pspRevenue, totalRevenue: totalPspRevenue } =
      await this.pickupService.getPspRevenueForAdmin({
        startDate,
        endDate,
        limit: 5,
      });

    const statusDefaults: Record<string, number> = Object.values(
      SmartbinStatus,
    ).reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const binStatusObj = binStatusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, statusDefaults);

    // Bin delivered: object with smart/non-smart splitting and delivery status
    const binDelivered = {
      total: deliveredBinRequests,
      smart: binRequests?.smartBinCount?.[0]?.count || 0,
      nonSmart: binRequests?.nonSmartBinCount?.[0]?.count || 0,
      byStatus: binStatusObj,
    };

    return {
      registeredUsers: {
        residentUsers: residentCount,
        agentsUsers: agentCount,
        corporatesUsers: corporateCount,
        facilityManagers: facilityManagerCount,
        totalRegisteredUsers: totalRegisteredUsers,
        percentageByUserType: percentageByUserType,
      },
      binRequests: {
        byType: {
          smart: smartBinCount,
          nonSmart: nonSmartBinCount,
          total: totalBinRequests,
        },
        byStatus: binStatusObj,
        summary: {
          pending: pendingBinRequests,
          delivered: deliveredBinRequests,
          total: totalBinRequests,
        },
      },
      binDelivered,
      revenue: {
        total: totalRevenue,
        binPurchase: binPurchaseRevenue[0]?.total || 0,
        wasteDisposal: wasteDisposalRevenue[0]?.total || 0,
      },
      numberOfWastePickups,
      householdsEnumerated,
      numberOfLgasCovered,
      unpaidBills: {
        count: unpaidBillsSummary?.count ?? 0,
        totalAmount: unpaidBillsSummary?.totalAmount ?? 0,
      },
      totalTeamMembers: totalTeamMembers,
      pspCompanies: {
        registeredPSPs: totalPSPCompanies,
        topPSPcompanies: pspRevenue.map((revenue) => ({
          _id: revenue.pspId,
          company_name: revenue.company_name,
          revenue: revenue.revenue,
        })),
        revenueSummary: totalPspRevenue,
      },
    };
  }

  async getYearlyRevenue(year: number) {
    const result = await this.transactionModel
      .aggregate([
        {
          $match: {
            status: TransactionStatus.Successful,
            service: {
              $in: [ServiceType.WasteDisposal, ServiceType.SmartBinPurchase],
            },
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    return result?.[0]?.total ?? 0;
  }

  // Lawma Admin
  async getLawmaAdminDashboard(filters?: LawmaAdminDashboardFiltersDto) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const selectedYear = filters?.year ? Number(filters.year) : currentYear;
    const lastYear = selectedYear - 1;

    const [residentCount, agentCount, corporateCount, facilityManagerCount] =
      await Promise.all([
        this.residentModel.countDocuments().exec(),
        this.agentModel.countDocuments().exec(),
        this.corporateModel.countDocuments().exec(),
        this.facilityModel.countDocuments().exec(),
      ]);

    const totalRegisteredUsers =
      residentCount + agentCount + corporateCount + facilityManagerCount;

    const percentageByUserType = {
      resident: Math.floor((residentCount / totalRegisteredUsers) * 100) || 0,
      agent: Math.floor((agentCount / totalRegisteredUsers) * 100) || 0,
      corporate: Math.floor((corporateCount / totalRegisteredUsers) * 100) || 0,
      facilityManager:
        Math.floor((facilityManagerCount / totalRegisteredUsers) * 100) || 0,
    };

    const totalPSPCompanies = await this.pspModel.countDocuments().exec();



    // Helper function for yearly aggregation

    const [currentYearRevenue, lastYearRevenue] = await Promise.all([
      this.getYearlyRevenue(selectedYear),
      this.getYearlyRevenue(lastYear),
    ]);

    const annualRevenueGrowth =
      lastYearRevenue > 0
        ? (
          ((currentYearRevenue - lastYearRevenue) / lastYearRevenue) *
          100
        ).toFixed(2) + '%'
        : '100%';

    const monthlyRevenueData = await this.transactionModel
      .aggregate([
        {
          $match: {
            status: TransactionStatus.Successful,
            service: {
              $in: [ServiceType.WasteDisposal, ServiceType.SmartBinPurchase],
            },
            createdAt: {
              $gte: new Date(`${selectedYear}-01-01`),
              $lt: new Date(`${selectedYear + 1}-01-01`),
            },
          },
        },
        {
          $group: {
            _id: { month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.month': 1 } },
      ])
      .exec();

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const month = monthlyRevenueData.find((m) => m._id.month === i + 1);
      return month ? month.revenue : 0;
    });

    // Calculate total revenue from monthly breakdown to ensure consistency
    const totalRevenueForSelectedYear = monthlyRevenue.reduce(
      (sum, val) => sum + val,
      0,
    );

    // Yearly revenue data for the chart (last 5 years)
    const yearlyRevenueData = await Promise.all(
      Array.from({ length: 5 }, (_, i) => {
        const year = currentYear - i;
        return this.getYearlyRevenue(year);
      }),
    );

    const yearlyRevenue = Array.from({ length: 5 }, (_, i) => {
      const year = currentYear - i;
      return {
        year,
        revenue: yearlyRevenueData[i],
      };
    }).reverse(); // Show oldest to newest

    const topPSPcompanies = await this.pspModel
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'psp-users',
            localField: '_id',
            foreignField: 'psp_id',
            as: 'team_members',
          },
        },
        {
          $addFields: {
            teamMembersCount: { $size: '$team_members' },
          },
        },
        {
          $project: {
            _id: 1,
            company_name: 1,
            teamMembersCount: 1,
          },
        },
      ])
      .exec();

    const [pendingBinrequests, completedBinrequests, totalBinRequests] =
      await Promise.all([
        this.smartbinModel
          .countDocuments({ status: SmartbinStatus.Pending })
          .exec(),
        this.smartbinModel
          .countDocuments({ status: SmartbinStatus.Delivered })
          .exec(),
        this.smartbinModel.countDocuments().exec(),
      ]);
    return {
      registeredUsers: {
        resident: residentCount,
        agent: agentCount,
        corporate: corporateCount,
        facilityManager: facilityManagerCount,
        total: totalRegisteredUsers,
        percentageByUserType,
      },
      binRequests: {
        pending: pendingBinrequests,
        completed: completedBinrequests,
        total: totalBinRequests,
      },
      psp: {
        total: totalPSPCompanies,
        topCompanies: topPSPcompanies,
      },
      revenue: {
        year: selectedYear,
        total: totalRevenueForSelectedYear,
        monthlyRevenue,
        // yearlyRevenue,
        annualGrowth: annualRevenueGrowth,
      },
    };
  }

  // get Revenue Overview
  async getRevenueOverview(currentYear: number = new Date().getFullYear()) {
    const totalAmount = await this.transactionModel.find().lean();
    const totalAmountGeneratedOvertime = totalAmount.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    const totalRevenuePerYear = await this.transactionModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);
    const [smartbinStats] = await this.transactionModel.aggregate([
      { $match: { service: ServiceType.SmartBinPurchase } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const [pickupStats] = await this.transactionModel.aggregate([
      { $match: { service: ServiceType.WasteDisposal } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const paymentDetails = await this.transactionModel
      .find(
        {},
        {
          transactionReference: 1,
          service: 1,
          amount: 1,
          createdAt: 1,
          paymentMethod: 1,
          status: 1,
        },
      )
      .sort({ createdAt: -1 })
      .lean();
    return {
      totalAmountGeneratedOvertime,
      totalRevenuePerYear,
      smartbinApp: {
        revenue: smartbinStats?.revenue,
        totalTransactions: smartbinStats?.totalTransactions,
      },
      pickupApp: {
        revenue: pickupStats?.revenue,
        totalTransactions: pickupStats?.totalTransactions,
      },
      paymentDetails,
    };
  }

  async getRevenue(filters?: RevenueOverviewDto) {
    const currentYear = filters?.year || new Date().getFullYear();
    const previousYear = currentYear - 1;
    const { page = 1, limit = 10 } = filters || {};
    const skip = (page - 1) * limit;

    // 1. Total amount generated overtime (all successful transactions)
    const [totalAmountResult] = await this.transactionModel.aggregate([
      { $match: { status: TransactionStatus.Successful } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalAmountGeneratedOvertime = totalAmountResult?.total || 0;

    // 2. Smart Bin revenue (total)
    const [smartBinStats] = await this.transactionModel.aggregate([
      {
        $match: {
          service: ServiceType.SmartBinPurchase,
          status: TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // 3. PSP/Waste Disposal revenue (total)
    const [pspStats] = await this.transactionModel.aggregate([
      {
        $match: {
          service: ServiceType.WasteDisposal,
          status: TransactionStatus.Successful,
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // 4. Current year total revenue
    const [currentYearTotal] = await this.transactionModel.aggregate([
      {
        $match: {
          status: TransactionStatus.Successful,
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // 5. Previous year total revenue (for comparison percentage)
    const [previousYearTotal] = await this.transactionModel.aggregate([
      {
        $match: {
          status: TransactionStatus.Successful,
          createdAt: {
            $gte: new Date(`${previousYear}-01-01`),
            $lt: new Date(`${currentYear}-01-01`),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const currentYearRevenue = currentYearTotal?.total || 0;
    const previousYearRevenue = previousYearTotal?.total || 0;

    // Calculate year-over-year percentage change
    const percentageChange =
      previousYearRevenue > 0
        ? (
          ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) *
          100
        ).toFixed(1)
        : 0;

    // 6. Monthly revenue breakdown for the selected year (combined SmartBin + WasteDisposal)
    const monthlyRevenue = await this.transactionModel.aggregate([
      {
        $match: {
          status: TransactionStatus.Successful,
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$amount' },
          smartBinRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$service', ServiceType.SmartBinPurchase] },
                '$amount',
                0,
              ],
            },
          },
          wasteDisposalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$service', ServiceType.WasteDisposal] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

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
      const found = monthlyRevenue.find((r) => r._id.month === index + 1);
      return {
        month,
        total: found?.total || 0,
        smartBinRevenue: found?.smartBinRevenue || 0,
        wasteDisposalRevenue: found?.wasteDisposalRevenue || 0,
      };
    });

    const pspRevenue = await this.pickupService.getPspRevenueForAdmin();
    const [pspCountResult] = await this.pickupModel.aggregate([
      {
        $match: {
          status: Status.Completed,
          pspId: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: '$pspId' } },
      { $count: 'total' },
    ]);
    const totalPspCount = pspCountResult?.total || 0;

    return {
      totalAmountGeneratedOvertime,
      smartBinSuppliers: {
        revenue: smartBinStats?.revenue || 0,
        totalTransactions: smartBinStats?.totalTransactions || 0,
      },
      pspCompanies: {
        revenue: pspStats?.revenue || 0,
        totalTransactions: pspStats?.totalTransactions || 0,
      },

      totalRevenue: {
        year: currentYear,
        amount: currentYearRevenue,
        percentageChange: Number(percentageChange),
        comparisonText: `vs Last Year`,
        monthlyBreakdown: chartData,
      },
      pspRevenue: pspRevenue,
    };
  }

  // PSP Revenue Management
  async getPspRevenueAnalysis(
    page: number = 1,
    limit: number = 10,
    lgaFilter?: string,
    search?: string,
  ) {
    // This returns all PSPs
    const psps = await this.pspService.getPsps();
    const total = psps.length;

    //  manually filter
    const filteredPsps = psps.filter((psp) => {
      if (lgaFilter && psp.lga_id.toString() !== lgaFilter) return false;
      if (
        search &&
        !psp.company_name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedPsps = filteredPsps.slice(startIndex, endIndex);

    // Get revenue data for each PSP
    const revenueData = await Promise.all(
      paginatedPsps.map(async (psp, index) => {
        // Get household coverage
        const householdCovered = await this.residentModel.countDocuments({
          lga_id: psp.lga_id,
          deleted_at: null,
        });

        // successful transactions
        const transactions = await this.transactionModel.aggregate([
          {
            $match: {
              psp_id: psp._id,
              status: TransactionStatus.Successful,
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$amount' },
              totalBills: { $sum: 1 },
            },
          },
        ]);

        const revenueInfo = transactions[0] || {
          totalRevenue: 0,
          totalBills: 0,
        };

        // Get LGA name
        const lga = await this.lgaModel.findById(psp.lga_id).lean();

        return {
          pspCompany: psp.company_name,
          lga: lga?.name || 'N/A',
          householdCovered,
          revenue: revenueInfo.totalRevenue,
          bills: revenueInfo.totalBills.countDocuments(),
        };
      }),
    );

    return {
      data: revenueData,
      total: filteredPsps.length,
      page,
      limit,
      totalPages: Math.ceil(filteredPsps.length / limit),
    };
  }

  async getPspRevenueForAdmin(admin: AdminUser, filters?: GetPickupsForPspDto) {
    const data = await this.pickupService.getPspRevenueForAdmin(filters);
    return new SuccessResponse('PSP revenue retrieved successfully', data);
  }

  async getRevenueForPsp(psp: PspUser, filters?: any) {
    const data = await this.pickupService.getRevenueForPsp(psp.id, filters);
    return new SuccessResponse('Revenue retrieved successfully', data);
  }

  async getMonthlyRevenueForAdmin(admin: AdminUser, year?: number) {
    const data = await this.pickupService.getMonthlyRevenueForAdmin(year);
    return new SuccessResponse('Monthly revenue retrieved successfully', data);
  }
}
