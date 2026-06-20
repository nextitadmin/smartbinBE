import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SuccessResponse } from '@common/http';
import { UtilityService } from './utility.service';

@ApiTags('Utilities')
@Controller({
  path: 'utility',
  version: '1',
})
export class UtilityController {
  constructor(private readonly utilityService: UtilityService) {}

  @Get('get-states')
  async getStates() {
    const data = this.utilityService.getStates();
    return new SuccessResponse('list of states fetched successfully', data);
  }

  @Get('get-lgas')
  async getLgas() {
    const data = await this.utilityService.getLgas();
    return new SuccessResponse(
      'list of local government fetched successfully',
      data,
    );
  }

  @Get('get-business-sectors')
  async getBusinessSectors() {
    const data = this.utilityService.getBusinessSectors();
    return new SuccessResponse(
      'list of business sectors fetched successfully',
      data,
    );
  }
}
