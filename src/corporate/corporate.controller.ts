import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/guards/public.guard';
import { SuccessResponse } from '@common/http';
import {
  AuthenticatedCorporate,
  CorporateAuth,
} from '@common/decorators/auth.decorator';
import { AuthUser } from '@common/types';
import {
  AddCorporateBranchDto,
  CorporateForgotPasswordDto,
  CorporateLoginDto,
  CorporateVerifyResetCodeDto,
  UpdateProfileDto,
  CreateApplicationDto,
  CreateCorporateAccountDto,
  GetApplicationParamDto,
  ProfileDto,
  ResetPasswordDto,
  VerifyCorporateLogin,
} from './dto/corporate.dto';

@ApiTags('Corporates')
@Controller({
  path: 'corporate',
  version: '1',
})
export class CorporateController {
  constructor(private readonly corporateService: CorporateService) {}

  @Public()
  @Post('register')
  async register(@Body() body: CreateCorporateAccountDto) {
    const corporate = await this.corporateService.registerCorporate(body);
    return new SuccessResponse(corporate.message, corporate.data);
  }

  @Public()
  @Post('login')
  async login(@Body() body: CorporateLoginDto) {
    await this.corporateService.loginCorporate(body);
    return new SuccessResponse('Verification code sent to your email', null);
  }

  @Public()
  @Post('verify-login')
  async verifyLogin(@Body() body: VerifyCorporateLogin) {
    const corporate = await this.corporateService.verifyLoginCode(body.code);
    return new SuccessResponse(corporate.message, {
      token: corporate.token,
      attributes: corporate.data,
    });
  }

  @Public()
  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: CorporateForgotPasswordDto) {
    const corporate = await this.corporateService.requestPasswordReset(body);
    return new SuccessResponse(corporate.message, null);
  }

  @Public()
  @Post('verify-password-reset')
  async verifyReset(@Body() body: CorporateVerifyResetCodeDto) {
    const response = await this.corporateService.verifyPasswordResetCode(body);
    return new SuccessResponse('success', response);
  }

  @Post('reset-password')
  async resetPassword(
    @AuthenticatedCorporate() corporate: AuthUser,
    @Body() body: ResetPasswordDto,
  ) {
    const response = await this.corporateService.resetPassword(
      corporate.id,
      body,
    );

    return new SuccessResponse('reset password successful', response);
  }

  @Put('profile')
  @CorporateAuth()
  async updateProfile(
    @Body() body: UpdateProfileDto,
    @AuthenticatedCorporate() corporate: AuthUser,
  ) {
    const response = await this.corporateService.updateProfile(
      corporate.id,
      body,
    );
    return new SuccessResponse('profile updated', response);
  }

  @Get('profile')
  @CorporateAuth()
  async getProfile(
    @AuthenticatedCorporate() corporate: AuthUser,
  ): Promise<SuccessResponse> {
    const response = await this.corporateService.getProfile(corporate.id);
    return new SuccessResponse('Corporate details fetcted', response);
  }

  @Post('logout')
  @CorporateAuth()
  async logout(@AuthenticatedCorporate() corporate: AuthUser) {
    const response = await this.corporateService.logout(corporate.token);
    return new SuccessResponse(response.message, null);
  }

  @Patch('profile-picture')
  @CorporateAuth()
  async updateProfilePicture(
    @Body() body: ProfileDto,
    @AuthenticatedCorporate() corporate: AuthUser,
  ) {
    await this.corporateService.updateProfilePicture(
      corporate.id,
      body.imageUrl,
    );
    return new SuccessResponse('profile picture updated', null);
  }

  @Post('add-branch')
  @CorporateAuth()
  async addBranch(
    @Body() body: AddCorporateBranchDto,
    @AuthenticatedCorporate() corporate: AuthUser,
  ) {
    const response = await this.corporateService.addBranch(corporate.id, body);
    return new SuccessResponse(
      'Branch added to corporation successfully',
      response,
    );
  }

  @Get('fetch-branches')
  @CorporateAuth()
  async fetchBranches(@AuthenticatedCorporate() corporate: AuthUser) {
    const response = await this.corporateService.fetchBranches(corporate.id);
    return new SuccessResponse(response.message, response);
  }
}
