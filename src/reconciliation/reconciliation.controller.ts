import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '@common/decorators/auth.decorator';
import { PaginatedSuccessResponse, SuccessResponse } from '@common/http';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationFilterDto } from './dto/reconciliation.dto';

@ApiTags('Admin/Reconciliation')
@Controller({
  path: 'lawma/reconciliation',
  version: '1',
})
@AdminAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('summary')
  async getSummary(@Query() filters: ReconciliationFilterDto) {
    const summary = await this.reconciliationService.getSummary(filters);
    return new SuccessResponse('Reconciliation summary fetched successfully', summary);
  }

  @Get('pending-bills')
  async getPendingBills(@Query() filters: ReconciliationFilterDto) {
    const result = await this.reconciliationService.getPendingBills(filters);
    return new PaginatedSuccessResponse(
      'Pending bills fetched successfully',
      result.data,
      result.paging,
    );
  }

  @Get('pending-bills/:billId')
  async getPendingBill(@Param('billId') billId: string) {
    const bill = await this.reconciliationService.getPendingBill(billId);
    return new SuccessResponse('Pending bill fetched successfully', bill);
  }
}
