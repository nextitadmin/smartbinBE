import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgentService } from './agent.service';

import {
  AgentAuth,
  AuthenticatedAgent,
} from '@common/decorators/auth.decorator';
import { AuthUser } from '@common/types';
import {
  CreateAgentAccountDto,
  EmailDTO,
  LoginAgentAccountDto,
  ProfileDto,
  ResetPasswordDto,
  UpdateAgencyProfileDto,
  VerifyAgentLogin,
} from './dto/agent.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { SuccessResponse } from '@common/http';
import { Public } from '@common/guards/public.guard';

@ApiTags('Agents')
@AgentAuth()
@Controller({
  path: 'agents',
  version: '1',
})
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Public()
  @Post('register')
  async register(@Body() body: CreateAgentAccountDto) {
    const agent = await this.agentService.registerAgent(body);
    return new SuccessResponse(agent.message, agent.data);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginAgentAccountDto) {
    await this.agentService.login(body);
    return new SuccessResponse('Verification code sent to your email', null);
  }

  @Public()
  @Post('verify-login')
  async verifyLogin(@Body() body: VerifyAgentLogin) {
    const agent = await this.agentService.verifyLoginCode(body.code);
    return new SuccessResponse(agent.message, {
      token: agent.token,
      attributes: agent.data,
    });
  }

  @Public()
  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: EmailDTO) {
    const response = await this.agentService.requestPasswordReset(body.email);
    return new SuccessResponse(response.message, null);
  }

  @Public()
  @Post('password-reset/verify')
  async verifyReset(@Body() body: VerifyAgentLogin) {
    const response = await this.agentService.verifyPasswordResetCode(body.code);
    return new SuccessResponse(
      'Code verified. You can now reset your password.',
      response,
    );
  }

  @Post('password-reset/complete')
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @AuthenticatedAgent() agent: AuthUser,
  ) {
    const response = await this.agentService.completePasswordReset({
      accountId: agent.id,
      newPassword: body.password,
      confirmPassword: body.confirmPassword,
    });
    return new SuccessResponse(
      'Password has been reset successfully',
      response,
    );
  }

  @Get('profile')
  @AgentAuth()
  async getProfile(
    @AuthenticatedAgent() agent: AuthUser,
  ): Promise<SuccessResponse> {
    const response = await this.agentService.getProfile(agent.id);
    return new SuccessResponse('agent details fetcted', response);
  }

  @Post('logout')
  @AgentAuth()
  async logout(@AuthenticatedAgent() agent: AuthUser) {
    const response = await this.agentService.logout(agent.token);
    return new SuccessResponse(response.message, null);
  }

  @Patch('profile-picture')
  @AgentAuth()
  async updateProfilePicture(
    @Body() body: ProfileDto,
    @AuthenticatedAgent() agent: AuthUser,
  ) {
    await this.agentService.updateProfilePicture(agent.id, body.imageUrl);
    return new SuccessResponse('profile picture updated', null);
  }

  @Put('profile')
  @AgentAuth()
  async updateProfile(
    @Body() body: UpdateAgencyProfileDto,
    @AuthenticatedAgent() agent: AuthUser,
  ) {
    const response = await this.agentService.updateProfile(agent.id, body);
    return new SuccessResponse('profile updated', response);
  }
}
