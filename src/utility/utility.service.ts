import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  BUSINESS_SECTORS,
  LAGOS_LGAS,
  NIGERIAN_STATES,
} from './utility.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Lga } from '@models/lgas.model';
import { Model } from 'mongoose';
import { response } from 'express';

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

  async getLgas(): Promise<Lga[]> {
    const lgas = await this.lgaModel.find().exec();
    console.log(lgas); 
    return lgas;
  }
  

  getBusinessSectors(): string[] {
    return BUSINESS_SECTORS;
  }
}
