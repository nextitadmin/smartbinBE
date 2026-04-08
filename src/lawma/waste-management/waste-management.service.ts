import { SuccessResponse } from '@common/http';
import { Status } from '@models/pickup';
import { Injectable } from '@nestjs/common';
import { PickupService } from '@src/waste-management/pickup/pickup.service';
import { AdminUser,PspUser, PspTeamMember } from '@common/types';
import { GetPickupDto ,AssignTeamMemberDto, UpdatePickupStatusDto, GetPickupsForPspDto} from '@src/waste-management/pickup/dto/pickup.dto';

@Injectable()
export class LawmaWasteManagementService {
  constructor(private readonly pickupService: PickupService) {}
  async getPickupsForAdmin(
    admin: AdminUser,
    filters?: GetPickupDto,
    
  ) {
    const data = await this.pickupService.getPickupsForAdmin(
      admin,
      filters,
    );
    return new SuccessResponse('Pickups retrieved successfully', data);
  }



  async getPickupRequest(psp:PspUser, filters?: GetPickupDto) {
    const pendingPickups = await this.pickupService.getPendingPickups(psp,filters);
    return new SuccessResponse('Pickup requests retrieved successfully', pendingPickups);
  }

  async getPickupById(id: string) {
    const pickup = await this.pickupService.getPickupByWasteId(id);
    return new SuccessResponse('Pickup retrieved successfully', pickup);
  }
  async getCompletedPickups (psp:PspUser, filters?:GetPickupDto){
    const completedPickups = await this.pickupService.getCompletedPickups(psp,filters)
    return new SuccessResponse ('Completed Pickups retrieved successfully', completedPickups)
  }
  
  async updatePickupStatus(
    id: string,
    dto: UpdatePickupStatusDto,
  ) {
    const updatedPickup = await this.pickupService.updatePickupStatus(  id,dto);
    return new SuccessResponse('Pickup status updated successfully', updatedPickup);
  }

//  async  getPspRevenueForAdmin() {

//   }


  // In LawmaWasteManagementService
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

  async assignTeamMember(
    psp:PspUser,
    id: string,
    dto:AssignTeamMemberDto,
  ) {
    const updatedPickup = await this.pickupService.assignTeamMember(
      psp,
      id,
    dto
    );
    return new SuccessResponse('Team member assigned successfully', updatedPickup);
  }

  async getAssignedPickups(psp:PspUser, filters?: GetPickupDto) {
    const assignedPickups = await this.pickupService.getAssignedPickups(psp,filters);
    return new SuccessResponse('Assigned pickups retrieved successfully', assignedPickups);
  }

  async getTeammemberAssignedPickup(pspTeamMember:PspTeamMember, filters?: GetPickupDto) {
    const assignedPickups = await this.pickupService.getPickupAssignedToTeammember(pspTeamMember,filters);
    return new SuccessResponse('Assigned pickups retrieved successfully', assignedPickups);
  }

}
