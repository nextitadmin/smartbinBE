import { SuccessResponse } from '@common/http';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller({
  path: '',
  version: '1',
})
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get('/track/bin-status/:reference')
  async trackBinStatus(@Param('reference') reference: string) {
    const response = await this.appService.trackBinStatus(reference);
    return new SuccessResponse('Smartbin status', response);
  }
}
