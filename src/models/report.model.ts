import { SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Lga } from './lgas.model';

export enum ReportType {
  Revenue = 'revenue',
  PaymentHistory = 'payment-history',
  WastePickup = 'waste-pickup',
  WasteDisposed = 'waste-disposed',
  SmartBinRequest = 'smartbin-request',
  SmartbinDelivered = 'smartbin-delivered',
  UserRegistration = 'user-registration',
  UnpaidBills = 'unpaid-bills',
}

export enum ReportMethod {
  Manual = 'manual',
  Scheduled = 'scheduled',
}
export enum Frequency {
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
}

export enum CustomerType {
  Corporate = 'Corporate',
  Resident = 'Resident',
}

export interface ReportAttributes {
  type: ReportType;
  reportName: string;
  filters: Record<string, any>;
  data: Record<string, any>;
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  lgaId?: Types.ObjectId;
  tenantName?: string;
  businessName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Report implements ReportAttributes {
  @Prop({ type: Types.ObjectId, required: false })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  adminId?: Types.ObjectId;

  @Prop({ required: true })
  reportName: string;

  @Prop()
  customerType?: CustomerType;

  @Prop()
  customerName?: string;

  @Prop({
    type: String,
    enum: Object.values(ReportType),
    required: true,
  })
  type: ReportType;

  @Prop({
    type: String,
    enum: Object.values(ReportMethod),
    default: ReportMethod.Manual,
  })
  reportMethod?: ReportMethod;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ type: Object })
  period: {
    from: string;
    to: string;
  };

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Lga.name,
    required: false,
  })
  lgaId?: Types.ObjectId;

  @Prop({ type: Object })
  filters: Record<string, any>;

  @Prop({ type: Object })
  data: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
  @Prop()
  tenantName?: string;
  @Prop()
  businessName?: string;

  @Prop({
    type: {
      isAuto: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: Object.values(Frequency),
        default: Frequency.Monthly,
      },
      day: { type: String },
      time: { type: String },
      nextRun: { type: Date },
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive',
      },
      primaryEmail: { type: String },
      secondaryEmails: [{ type: String }],
      createdBySuperAdmin: { type: Boolean, default: false },
    },
    required: false,
  })
  schedule?: {
    isAuto: boolean;
    frequency: Frequency;
    day: string;
    time: string;
    nextRun?: Date;
    status: 'active' | 'inactive';
    primaryEmail?: string;
    secondaryEmails?: string[];
    createdBySuperAdmin: boolean;
  };
}

export type ReportDocument = Report & Document;
export const ReportSchema = SchemaFactory.createForClass(Report);
