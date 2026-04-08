import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PspTeamMember} from '../types';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.guard';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PspAuthService } from '@src/lawma/psp/psp-users/auth/auth.service';
import { PspUserAuthGuard } from './pspAdmin.guard';

@Injectable()
export class PspTeamAuthGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly reflector: Reflector,
    private readonly pspAuthService: PspAuthService,
  ) {}

  private logger = new Logger(PspTeamAuthGuard.name);

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request & {
      user: Record<string, any>;
      pspTeamMember?: PspTeamMember;
    } = ctx.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const [, token] = request.headers?.authorization?.split(' ') ?? [];

    const isBlacklisted = await this.cacheService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Not Authorized');
    }

    const pspTeamMember = await this.pspAuthService.getAdminDetailsByToken(token);
    if (!pspTeamMember) {
      this.logger.warn('failed to auth: no team member object in request');
      throw new UnauthorizedException('not authenticated!');
    }

    const { _id,psp_id, email, name } = pspTeamMember;

    req.pspTeamMember = {
      id: String(_id),
      pspId: String(psp_id),
      email: email,
      name: name,
      token: token,
    };

    return true;
  }
}
