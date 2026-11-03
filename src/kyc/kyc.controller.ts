// import { PaginatedSuccessResponse, SuccessResponse } from '@common/http';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { KycService } from './kyc.service';
import { ApiTags } from '@nestjs/swagger';
import { VerifyNinDto } from './dto/kyc.dto';
import { Auth, AuthenticatedUser } from '@common/decorators/auth.decorator';
import { type AuthUser } from '@common/types';
import { namesMatch } from './name-match.util';

const NIN_CACHE_TTL_MS = 30 * 60 * 1000;

// Only terminal verdicts are cached, and only the name subset of the identity.
type NinVerdictCacheEntry = {
  status: 'verified' | 'rejected';
  reference?: string;
  providerStatus?: string;
  name?: { firstName?: string; lastName?: string };
};

@ApiTags('Identities')
@Controller({
  path: 'identities',
  version: '1',
})
export class KycController {
  constructor(
    private readonly kycService: KycService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post('/verify-nin')
  @Auth()
  async verifyNin(
    @Body() body: VerifyNinDto,
    @AuthenticatedUser() user: AuthUser,
  ) {
    const firstName = user.firstName;
    const lastName = user.lastName;

    // Key on a hash so the raw NIN is never stored
    const cacheKey = `nin:${createHash('sha256').update(body.nin).digest('hex')}`;

    const cached = await this.cacheManager.get<NinVerdictCacheEntry>(cacheKey);
    if (cached) {
      return {
        cached: true,
        status: cached.status,
        reference: cached.reference,
        providerStatus: cached.providerStatus,
        matchesPersonalInfo: this.matchesName(cached.name, firstName, lastName),
      };
    }

    const result = await this.kycService.verifyNinField(body.nin);

    if (result.status === 'verified' || result.status === 'rejected') {
      await this.cacheManager.set(
        cacheKey,
        {
          status: result.status,
          reference: result.reference,
          providerStatus: result.providerStatus,
          name: {
            firstName: result.identity?.firstName,
            lastName: result.identity?.lastName,
          },
        } satisfies NinVerdictCacheEntry,
        NIN_CACHE_TTL_MS,
      );
    }

    return {
      cached: false,
      status: result.status,
      reference: result.reference,
      providerStatus: result.providerStatus,
      matchesPersonalInfo: this.matchesName(
        result.identity
          ? {
              firstName: result.identity.firstName,
              lastName: result.identity.lastName,
            }
          : undefined,
        firstName,
        lastName,
      ),
    };
  }

  private matchesName(
    name: { firstName?: string; lastName?: string } | undefined,
    firstName: string,
    lastName: string,
  ): boolean {
    if (!name?.firstName && !name?.lastName) return false;
    return namesMatch(
      `${firstName} ${lastName}`,
      `${name.firstName ?? ''} ${name.lastName ?? ''}`,
    );
  }
}
