import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Param,
  UsePipes,
  ValidationPipe,
  Delete,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResidentService } from './resident.service';

import { diskStorage } from 'multer';
import { application, Request, Response } from 'express';
import {
  ResidentAuth,
  AuthenticatedResident,
} from '@common/decorators/auth.decorator';
import { AuthUser } from '@common/types';
import {
  CreateResidentAccountDto,
  ResidentLoginDto,
  VerifyResidentLogin,
  ResidentForgotPasswordDto,
  ResidentVerifyResetCodeDto,
  UpdateProfileDto,
  ResetPasswordDto,
  ProfileDto,
  CreateApplicationDto,
  GetApplicationParamDto,
} from './dto/resident.dto';

import { ApiTags } from '@nestjs/swagger';
import { SuccessResponse, PaginatedSuccessResponse } from '@common/http';
import { Public } from '@common/guards/public.guard';
import { UpdateSmartBinStatusDto } from '@src/smart-bin/dto/binAppDto';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBinApplicationStatus } from '@models/types';
// import { MessagePattern } from '@nestjs/microservices';

@ApiTags('Residents')
@Controller({
  path: 'residents',
  version: '1',
})
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Public()
  @Post('register')
  async register(@Body() body: CreateResidentAccountDto) {
    const agent = await this.residentService.registerResident(body);
    return new SuccessResponse(agent.message, agent.data);
  }

  @Public()
  @Post('login')
  async login(@Body() body: ResidentLoginDto) {
    await this.residentService.login(body);
    return new SuccessResponse('Verification code sent to your email', null);
  }
  ewmjnwewewewwew;

  @Public()
  @Post('verify-login')
  async verifyLogin(@Body() body: VerifyResidentLogin) {
    const agent = await this.residentService.verifyLoginCode(body.code);
    return new SuccessResponse(agent.message, {
      token: agent.token,
      attributes: agent.data,
    });
  }

  @Public()
  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: ResidentForgotPasswordDto) {
    const response = await this.residentService.requestPasswordReset(body);
    return new SuccessResponse(response.message, null);
  }

  @Public()
  @Post('verify-password-reset')
  async verifyReset(
    @Body() body: ResidentVerifyResetCodeDto,
    @Req() req: Request | any,
  ) {
    const response = await this.residentService.verifyPasswordResetCode(body);
    return new SuccessResponse('success', response);
  }

  @Post('reset-password')
  async resetPassword(
    @AuthenticatedResident() resident: AuthUser,
    @Body() body: ResetPasswordDto,
  ) {
    const response = await this.residentService.resetPassword(
      resident.id,
      body,
    );

    return new SuccessResponse('reset password successful', response);
  }

  @Get('profile')
  @ResidentAuth()
  async getProfile(
    @AuthenticatedResident() resident: AuthUser,
  ): Promise<SuccessResponse> {
    const response = await this.residentService.getProfile(resident.id);
    return new SuccessResponse('Resident details fetcted', response);
  }

  @Post('logout')
  @ResidentAuth()
  async logout(@AuthenticatedResident() resident: AuthUser) {
    const response = await this.residentService.logout(resident.token);
    return new SuccessResponse(response.message, null);
  }

  @Patch('profile-picture')
  @ResidentAuth()
  async updateProfilePicture(
    @Body() body: ProfileDto,
    @AuthenticatedResident() resident: AuthUser,
  ) {
    const response = await this.residentService.updateProfilePicture(
      resident.id,
      body.imageUrl,
    );
    return new SuccessResponse('profile picture updated', null);
  }

  @Put('profile')
  @ResidentAuth()
  async updateProfile(
    @Body() body: UpdateProfileDto,
    @AuthenticatedResident() resident: AuthUser,
  ) {
    const response = await this.residentService.updateProfile(
      resident.id,
      body,
    );
    return new SuccessResponse('profile updated', response);
  }

  // @Get('dashboard')
  // @ResidentAuth()
  // async getResidentDashboard(@AuthenticatedResident() resident: AuthUser) {
  //   const response = await this.residentService.getDashboardDetails(
  //     resident.id,
  //   );
  //   return new SuccessResponse(response.message, response.data);
  // }

  @Post('apply-smart-bin')
  @ResidentAuth()
  async createSmartBinApplication(
    @Body() body: CreateApplicationDto,
    @AuthenticatedResident() resident: AuthUser,
  ) {
    const response = await this.residentService.createBinApplication({
      ...body,
      residentId: resident.id,
    });
    return new SuccessResponse(
      'Application for smart bin submitted successfully',
      response,
    );
  }

  // @Get('smart-bin-applications')
  // @ResidentAuth()
  // async getAllResidentBinApplications(
  //   @AuthenticatedResident() resident: AuthUser,
  // ) {
  //   const response = await this.residentService.getAllResidentApplications(
  //     resident.id,
  //     resident.role,
  //   );
  //   return new SuccessResponse(
  //     'Application for smart bin submitted successfully',
  //     response,
  //   );
  // }

  @Get('smart-bin-applications')
  @ResidentAuth()
  async getAllResidentBinApplications(
    @AuthenticatedResident() resident: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const { data, paging } =
      await this.residentService.getAllResidentApplications(
        resident.id,
        pageNumber,
        limitNumber,
      );

    return new PaginatedSuccessResponse(
      'Smart bin applications retrieved successfully',
      data,
      paging,
    );
  }

  @Get('smart-bin-applications/:applicationId')
  @ResidentAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getApplicationDetails(
    @AuthenticatedResident() resident: AuthUser,
    @Param() params: GetApplicationParamDto,
  ) {
    console.log('params', params);
    const { applicationId } = params;
    const response =
      await this.residentService.getApplicationDetails(applicationId);
    return new SuccessResponse(
      'Smart Bin application retrieved successfully',
      response,
    );
  }

  @Get('smart-bin-applications/:orderId/tracker')
  @ResidentAuth()
  async trackApplication(@Param('orderId') orderId: string) {
    return this.residentService.trackApplication(orderId);
  }

  @Delete('smartbin/:applicationId')
  @ResidentAuth()
  async deleteApplication(@Param('applicationId') applicationId: string) {
    await this.residentService.deleteBinApplication(applicationId);
    return new SuccessResponse('application deleted', null);
  }
}
