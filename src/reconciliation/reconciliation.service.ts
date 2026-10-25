import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bill, BillStatus } from '@models/bill.model';
import { Transaction, TransactionStatus } from '@models/transaction.model';
import { Paging } from '@common/http';
import { DashboardFilterType } from '@src/super-admin/dto';
import { ReconciliationFilterDto } from './dto/reconciliation.dto';

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Same date logic as the superadmin dashboard, so both views agree.
 * Dates are matched against createdAt.
 */
export function resolveDateRange(
  filter?: DashboardFilterType,
  year?: number,
  now: Date = new Date(),
): DateRange {
  const selectedYear = year || now.getFullYear();

  switch (filter) {
    case DashboardFilterType.TODAY: {
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      return { startDate, endDate };
    }
    case DashboardFilterType.THIS_MONTH: {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      return { startDate, endDate };
    }
    case DashboardFilterType.MTD:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };
    case DashboardFilterType.THIS_YEAR:
      return {
        startDate: new Date(selectedYear, 0, 1),
        endDate: new Date(selectedYear + 1, 0, 1),
      };
    case DashboardFilterType.YTD:
      return { startDate: new Date(selectedYear, 0, 1), endDate: now };
    default:
      return {};
  }
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  /** Summary cards shared by both tabs. Date range only, no search. */
  async getSummary(filters: ReconciliationFilterDto) {
    const dateMatch = this.buildDateMatch(filters);

    const [unpaid] = await this.billModel.aggregate([
      { $match: { status: BillStatus.Pending, ...dateMatch } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const [paid] = await this.transactionModel.aggregate([
      { $match: { status: TransactionStatus.Successful, ...dateMatch } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return {
      unpaidBills: {
        count: unpaid?.count ?? 0,
        totalAmount: unpaid?.totalAmount ?? 0,
      },
      paymentsMade: {
        count: paid?.count ?? 0,
        totalAmount: paid?.totalAmount ?? 0,
      },
    };
  }

  /** All pending bills, not only overdue ones. */
  async getPendingBills(filters: ReconciliationFilterDto) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const match = this.buildBillMatch(filters);

    const [total, bills] = await Promise.all([
      this.billModel.countDocuments(match).exec(),
      this.billModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const paging: Paging = {
      page,
      size: limit,
      total,
      pages: Math.ceil(total / limit),
    };

    const data = bills.map((bill, index) => ({
      serialNumber: (page - 1) * limit + index + 1,
      ...this.toBillRow(bill),
    }));

    return { data, paging };
  }

  async getPendingBill(billId: string) {
    const bill = await this.billModel
      .findOne({ billId, status: BillStatus.Pending })
      .lean()
      .exec();
    if (!bill) {
      throw new NotFoundException('Pending bill not found');
    }

    return {
      ...this.toBillRow(bill),
      branch: bill.branch ?? null,
      createdAt: bill.createdAt,
    };
  }

  private buildDateMatch(filters: ReconciliationFilterDto) {
    const { startDate, endDate } = resolveDateRange(
      filters.filter,
      filters.year,
    );
    if (!startDate && !endDate) return {};

    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.$gte = startDate;
    if (endDate) createdAt.$lt = endDate;
    return { createdAt };
  }

  private buildBillMatch(filters: ReconciliationFilterDto) {
    const match: Record<string, any> = {
      status: BillStatus.Pending,
      ...this.buildDateMatch(filters),
    };

    const search = filters.search?.trim();
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      match.$or = [
        { billId: pattern },
        { customerName: pattern },
        { service: pattern },
      ];
    }

    return match;
  }

  private toBillRow(bill: any) {
    return {
      billId: bill.billId,
      name: bill.customerName ?? null,
      payerId: String(bill.userId),
      service: bill.service,
      amount: bill.amount,
      status: bill.status,
      dueDate: bill.dueDate,
    };
  }
}
