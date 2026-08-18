import { Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { SmartBin } from '@src/models/smart-bin.model';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(SmartBin.name)
    private readonly smartbinModel: Model<SmartBin>,
  ) {}
  async trackBinStatus(reference: string) {
    const smartbin = await this.smartbinModel
      .findOne({ transactionReference: reference })
      .select('status -_id');

    if (!smartbin) {
      throw new NotFoundException('Smartbin not found');
    }
    return smartbin;
  }
}
