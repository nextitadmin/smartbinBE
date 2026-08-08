import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationEnvironment } from '@common/constants';
import { ConfigAttributes } from '@src/config';
import { AxiosError, AxiosInstance } from 'axios';

/**
 * Normalized verdict for an identity check. `verified`/`rejected` are final;
 * `pending` means TrustPointly accepted the request but the verdict is not yet
 * settled (resolve later by polling in LIVE mode); `error` means the call could
 * not be completed (network / 5xx / unexpected shape).
 */
export type NinVerificationStatus =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'error';

/**
 * Curated, non-sensitive identity subset returned to callers for display /
 * name-matching. Deliberately excludes photo, signature, NIN/vNIN, next-of-kin
 * and address data. Never persisted.
 */
export interface NinIdentity {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface NinVerificationResult {
  status: NinVerificationStatus;
  /** TrustPointly transaction reference, when returned. Safe to persist. */
  reference?: string;
  /** Non-sensitive status/message text from the provider, safe to persist. */
  providerStatus?: string;
  /**
   * Curated non-sensitive identity subset from the provider's `data` object.
   * Surfaced to callers but NEVER persisted; sensitive fields are dropped.
   */
  identity?: NinIdentity;
}

/**
 * Thin client over the TrustPointly Client API (identity verification).
 *
 * Security constraints enforced here:
 * - The submitted NIN and the full verification response are never logged.
 * - The TEST vs LIVE key is chosen by application environment, never by
 *   inspecting the key text.
 * - Verification POSTs are never auto-retried (no idempotency support upstream).
 */
@Injectable()
export class TrustpointlyService {
  private readonly logger = new Logger(TrustpointlyService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<ConfigAttributes>,
  ) {
    const { baseUrl, testApiKey, liveApiKey } = this.configService.get('kyc', {
      infer: true,
    });

    const environment = this.configService.get('applicationEnvironment', {
      infer: true,
    });

    const apiKey =
      environment === ApplicationEnvironment.Production
        ? liveApiKey
        : testApiKey;

    // TEMP DIAGNOSTIC — remove after debugging NIN verification config
    this.logger.log(
      `TrustPointly config: env=${environment}, baseUrl=${baseUrl}, apiKeyLen=${
        apiKey?.length ?? 0
      }, createFn=${typeof this.httpService.axiosRef.create}`,
    );

    this.httpClient = this.httpService.axiosRef.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Verify a National Identification Number.
   *
   * @param nin an 11-character NIN string
   * Does not throw for provider-level rejections (400) or outages (5xx/network);
   * those are mapped to a normalized {@link NinVerificationResult}. Never retries.
   */
  async verifyNin(nin: string): Promise<NinVerificationResult> {
    try {
      const { data } = await this.httpClient.post('/api/verification/nin', {
        number_nin: nin,
      });

      return this.normalize(data);
    } catch (err) {
      const axiosErr = err as AxiosError;
      const httpStatus = axiosErr.response?.status;

      // 400 = validation error / rejected identity per TrustPointly semantics.
      if (httpStatus === 400) {
        this.logger.warn('NIN verification rejected by provider (400)');
        return { status: 'rejected', providerStatus: 'rejected' };
      }

      // 401 (key/allowlist), 5xx, or network failure: could not complete.
      this.logger.error(
        `NIN verification could not be completed (status: ${
          httpStatus ?? 'network'
        }). TEMP-DIAG code=${axiosErr.code}, message=${axiosErr.message}, url=${
          axiosErr.config?.baseURL ?? ''
        }${axiosErr.config?.url ?? ''}`,
      );
      return { status: 'error' };
    }
  }

  /**
   * Map the synchronous NIN response onto a normalized verdict. Reads only
   * non-sensitive status/reference/identity fields — sensitive identity data
   * (photo, signature, NIN/vNIN, NOK, addresses) is intentionally ignored so
   * it is never returned to callers or persisted.
   */
  private normalize(data: Record<string, any>): NinVerificationResult {
    const verification = data?.verification ?? {};
    const rawStatus = String(
      verification.status ?? data?.status ?? '',
    ).toLowerCase();
    const reference: string | undefined =
      verification.reference ?? data?.reference;

    const identity = this.safeIdentity(data?.data);

    if (rawStatus === 'pending') {
      return { status: 'pending', reference, providerStatus: rawStatus, identity };
    }

    if (['rejected', 'failed', 'declined'].includes(rawStatus)) {
      return { status: 'rejected', reference, providerStatus: rawStatus, identity };
    }

    // Treat an explicit success verdict, or a 200 with identity data, as verified.
    if (
      ['verified', 'success', 'successful', 'completed', 'approved'].includes(
        rawStatus,
      ) ||
      data?.data
    ) {
      return { status: 'verified', reference, providerStatus: rawStatus, identity };
    }

    // Unknown shape: don't guess a pass — leave for manual review.
    return { status: 'pending', reference, providerStatus: rawStatus, identity };
  }

  /**
   * Extract only the curated, non-sensitive identity fields from the
   * provider's `data` block. Every other key (photo, signature, nin, vnin,
   * nok_*, addresses, …) is dropped here and never leaves this service.
   */
  private safeIdentity(dataBlock: Record<string, any> | undefined): NinIdentity | undefined {
    if (!dataBlock || typeof dataBlock !== 'object') return undefined;

    const identity: NinIdentity = {
      firstName: dataBlock.firstname,
      lastName: dataBlock.surname,
      dateOfBirth: dataBlock.birthdate,
      gender: dataBlock.gender,
    };

    return Object.values(identity).some((v) => v !== undefined && v !== null)
      ? identity
      : undefined;
  }
}
