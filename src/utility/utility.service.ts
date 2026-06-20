import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  BUSINESS_SECTORS,
  LAGOS_LGAS,
  NIGERIAN_STATES,
} from './utility.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Lga } from '@models/lgas.model';
import { Model } from 'mongoose';

@Injectable()
export class UtilityService implements OnModuleInit {
  constructor(
    @InjectModel(Lga.name) private lgaModel: Model<Lga>
  ) {

  }
  async onModuleInit() {
    for (const name of LAGOS_LGAS) {
      const exists = await this.lgaModel.findOne({ name });
      if (!exists) {
        await this.lgaModel.create({ name });
      }
    }
  }
  getStates(): string[] {
    return NIGERIAN_STATES;
  }

  // getLgas(): string[] {
  //   return LAGOS_LGAS;
  // }

  getLgas(): Promise<Lga[]> {
    return this.lgaModel.find().exec();
  }

  getBusinessSectors(): string[] {
    return BUSINESS_SECTORS;
  }
}
