export const CacheKeys = {
  AgentLoginCode: (code: string) => `SMTBIN_AG_${code}`,
  ResidentLoginCode: (code: string) => `SMTBIN_RS_${code}`,
  FacilityManagerLoginCode: (code: string) => `SMTBIN_FM_${code}`,
  CorporateLoginCode: (code: string) => `SMTBIN_CM_${code}`,

  // Administrator
  AdministratorLoginCode: (code: string) => `SMTBIN_AD_${code}`,
  AdministratorResetPasswordCode: (code: string) => `SMTBIN_AD_RESET_${code}`,

  //PSP
  PspLoginCode: (code: string) => `SMTBIN:PSP:${code}`,
  PspResetPasswordCode: (code: string) => `SMTBIN:PSP:RESET:${code}`,
};

export const AdminMessagePatternCommands = Object.freeze({
  Smartbin: {
    GetOverview: 'GET_OVERVIEW',
    GetDelivered: 'GET_DELIVERED_BINS',
    GetApplications: 'GET_ALL_APPLICATIONS',
    GetApplicationDetails: 'APPLICATION_DETAILS',
  },
  KycFlow: {
    GetApplications: 'GET_ALL_KYC_APPLICATIONS',
    GetApplicationDetails: 'KYC_APPLICATION_DETAILS',
    ApproveApplication: 'APPROVE_KYC_APPLICATION',
    RejectApplication: 'REJECT_KYC_APPLICATION',
  },

  Users: {
    GetUsers: 'GET_USERS',
    GetUser: 'GET_USER',
    GetFacilityUsers: 'GET_FACILITY_USERS',
    GetAgentRegisteredUsers: 'GET_AGENT_REGISTERED_USERS',
  },
  SuperAdmin: {
    GetDashboard: 'GET_DASHBOARD',
    GetRevenueOverview: 'GET_REVENUE_OVERVIEW',
  },

  Report: {
    CreateReport: 'CREATE_REPORT',
    GetReports: 'GET_REPORTS',
    GetReport: 'GET_REPORT',
  },
});

export enum IdVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AddressVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AgencyInformationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SignatoryVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
