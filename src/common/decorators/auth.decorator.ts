import {
  ExecutionContext,
  UseGuards,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';

import { AgentAuthGuard } from '../guards/agent.guard';
import { ResidentAuthGuard } from '../guards/resident.guard';
import { FacilityManagerAuthGuard } from '../guards/facility-manager.guard';
import { CorporateAuthGuard } from '../guards/corporate.guard';
import { Request } from 'express';
import {
  AdminUser,
  AuthUser,
  PspUser,
  PspTeamMember,
  SmartbinPartnerUser,
} from '../types';
import { AuthGuard } from '@common/guards/actor.guard';
import { AdminAuthGuard } from '@common/guards/admin.guard';
import { PspUserAuthGuard } from '@common/guards/pspAdmin.guard';
import { SmartbinPartnerAuthGuard } from '@common/guards/smartbin-partner.guard';
import { PspTeamAuthGuard } from '@common/guards/pspTeamMember.guard';

export function AgentAuth() {
  return applyDecorators(UseGuards(AgentAuthGuard));
}

export function ResidentAuth() {
  return applyDecorators(UseGuards(ResidentAuthGuard));
}

export function FacilityManagerAuth() {
  return applyDecorators(UseGuards(FacilityManagerAuthGuard));
}

export function CorporateAuth() {
  return applyDecorators(UseGuards(CorporateAuthGuard));
}

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard));
}

export function AdminAuth() {
  return applyDecorators(UseGuards(AdminAuthGuard));
}

export function PspUserAuth() {
  return applyDecorators(UseGuards(PspUserAuthGuard));
}

export function PspTeamMemberAuth() {
  return applyDecorators(UseGuards(PspTeamAuthGuard));
}

export function SmartbinPartnerAuth() {
  return applyDecorators(UseGuards(SmartbinPartnerAuthGuard));
}

export const AuthenticatedAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { agent: AuthUser } = ctx.switchToHttp().getRequest();
    return req.agent;
  },
);

export const AuthenticatedCorporate = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { corporate: AuthUser } = ctx
      .switchToHttp()
      .getRequest();
    return req.corporate;
  },
);
export const AuthenticatedFacilityManager = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { facilityManager: AuthUser } = ctx
      .switchToHttp()
      .getRequest();
    return req.facilityManager;
  },
);
export const AuthenticatedResident = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { resident: AuthUser } = ctx
      .switchToHttp()
      .getRequest();
    return req.resident;
  },
);

export const AuthenticatedUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { user: AuthUser } = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

export const AuthenticatedAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { admin: AdminUser } = ctx.switchToHttp().getRequest();
    return {
      ...req.admin,
      ipAddress: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };
  },
);

export const AuthenticatedPspUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { pspUser: PspUser } = ctx
      .switchToHttp()
      .getRequest();
    return {
      ...req.pspUser,
      ipAddress: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };
  },
);

export const AuthenticatedPspTeamMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { pspTeamMember: PspTeamMember } = ctx
      .switchToHttp()
      .getRequest();
    return {
      ...req.pspTeamMember,
      ipAddress: req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    };
  },
);

export const AuthenticatedSmartbinPartner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req: Request & { smartbinPartner: SmartbinPartnerUser } = ctx
      .switchToHttp()
      .getRequest();
    return {
      ...req.smartbinPartner,
      ipAddress: req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    };
  },
);
