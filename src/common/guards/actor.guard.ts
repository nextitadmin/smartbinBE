import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { IS_PUBLIC_KEY } from './public.guard';
import {
  AgentUser,
  AuthUser,
  CorporateUser,
  FacilityManagerUser,
  ResidentUser,
} from '@common/types';
import { UserRole } from '@models/types';

// import your 4 services
import { ResidentService } from '@src/resident/resident.service';
import { AgentService } from '@src/agent/agent.service';
import { CorporateService } from '@src/corporate/corporate.service';
import { FacilityManagerService } from '@src/facility-manager/facility-manager.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  private logger = new Logger(AuthGuard.name);
  private AUTHENTICATION_ERROR_MESSAGE = 'Invalid authentication token';

  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly reflector: Reflector,
    private readonly residentService: ResidentService,
    private readonly agentService: AgentService,
    private readonly corporateService: CorporateService,
    private readonly facilityManagerService: FacilityManagerService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: Request & { user?: AuthUser } = ctx.switchToHttp().getRequest();

    // Skip if endpoint is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const [_, token] = request.headers?.authorization?.split(' ') ?? [];

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException(this.AUTHENTICATION_ERROR_MESSAGE);
    }

    const isValidToken = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    if (!isValidToken) {
      this.logger.warn('Invalid token provided');
      throw new UnauthorizedException(this.AUTHENTICATION_ERROR_MESSAGE);
    }

    const isBlacklisted = await this.cacheService.get(`blacklist:${token}`);
    if (isBlacklisted)
      throw new UnauthorizedException(this.AUTHENTICATION_ERROR_MESSAGE);

    const strategies = [
      {
        role: UserRole.Corporate,
        service: this.corporateService,
        method: this.corporateService.getCorporateDetailsByToken.name,
      },
      {
        role: UserRole.Resident,
        service: this.residentService,
        method: this.residentService.getResidentDetailsByToken.name,
      },
      {
        role: UserRole.Agent,
        service: this.agentService,
        method: this.agentService.getAgentDetailsByToken.name,
      },
      {
        role: UserRole.Facility,
        service: this.facilityManagerService,
        method:
          this.facilityManagerService.getFacilityManagerDetailsByToken.name,
      },
    ];

    const strategy = strategies.find(
      (strat) => strat.role === isValidToken.role,
    );
    if (!strategy) {
      this.logger.warn(
        `No strategy found for role ${isValidToken.role} in request`,
      );
      throw new UnauthorizedException(this.AUTHENTICATION_ERROR_MESSAGE);
    }

    const user = await strategy.service[strategy.method](token).catch(
      () => null,
    );
    if (!user) {
      this.logger.warn(
        `failed to auth: no user found for role ${isValidToken.role}`,
      );
      throw new UnauthorizedException(this.AUTHENTICATION_ERROR_MESSAGE);
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: strategy.role,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      token,
    } satisfies
      AuthUser | CorporateUser | AgentUser | FacilityManagerUser | ResidentUser;
    return true;
  }
}
