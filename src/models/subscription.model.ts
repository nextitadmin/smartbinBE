import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface SubscriptionAttributes {
  userId: Types.ObjectId;
  plan: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
}

@Schema({
  timestamps: true,
  collection: 'subscriptions',
  versionKey: false,
})
export class Subscription implements SubscriptionAttributes {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  plan: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ status: 1, endDate: 1 });
SubscriptionSchema.index({ userId: 1, startDate: -1 });

SubscriptionSchema.pre('find', function (next) {
  const obj = this as any;
  obj.userId = new Types.ObjectId(obj.userId);
  next();
});

SubscriptionSchema.pre('findOne', function (next) {
  const obj = this as any;
  obj.userId = new Types.ObjectId(obj.userId);
  next();
});
