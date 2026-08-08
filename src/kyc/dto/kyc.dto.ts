import { Gender } from '@models/types';
import { LawmaCustomerType } from '@models/users/resident.model';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  IsArray,
  ArrayNotEmpty,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CompanyInformationDto {
  @ApiProperty()
  @IsString({ message: 'Business name must be a string' })
  businessName: string;

  @ApiProperty()
  @IsString({ message: 'Business registration number must be a string' })
  businessRegistrationNumber: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Email must be a string' })
  email?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber?: string;

  @ApiProperty()
  @IsString({ message: 'Business sector must be a string' })
  businessSector: string;

  @ApiProperty()
  @IsString({ message: 'Address must be a string' })
  address: string;
}

class BusinessRegistrationCertificateDto {
  @ApiProperty()
  @IsString({ message: 'ID document number must be a string' })
  NinNo: string;

  @ApiProperty()
  @IsString({ message: 'ID document must be a string' })
  idDocument: string;
}

class AuthorizedSignatoryDto {
  @ApiProperty()
  @IsString({ message: 'Last name must be a string' })
  lastName: string;

  @ApiProperty()
  @IsString({ message: 'First name must be a string' })
  firstName: string;

  @ApiProperty()
  @IsString({ message: 'Email must be a string' })
  email: string;

  @ApiProperty()
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber: string;

  @ApiProperty()
  @IsString({ message: 'Nationality must be a string' })
  nationality: string;

  @ApiProperty()
  @IsEnum(Gender, { message: 'Gender must be Male or Female' })
  gender: Gender;

  @ApiProperty()
  @IsString({ message: 'Job title must be a string' })
  jobTitle: string;

  @ApiProperty()
  @IsString({ message: 'Address must be a string' })
  address: string;

  @ApiProperty()
  @IsString({ message: 'ID document number must be a string' })
  NinNo: string;

  @ApiProperty()
  @IsString({ message: 'ID document must be a string' })
  idDocument: string;
}

export class CreateCorporateKycDto {
  @ApiProperty({ type: CompanyInformationDto })
  @ValidateNested()
  @Type(() => CompanyInformationDto)
  companyInformation: CompanyInformationDto;

  @ApiProperty({ type: BusinessRegistrationCertificateDto })
  @ValidateNested()
  @Type(() => BusinessRegistrationCertificateDto)
  businessRegistrationCertificate: BusinessRegistrationCertificateDto;

  @ApiProperty({ type: [AuthorizedSignatoryDto] })
  @IsArray({ message: 'Authorized signatories must be an array' })
  @ValidateNested({ each: true })
  @Type(() => AuthorizedSignatoryDto)
  authorizedSignatories: AuthorizedSignatoryDto[];
}

export class PersonalInfoDto {
  @ApiProperty()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiProperty()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiProperty()
  @IsString({ message: 'Nationality must be a string' })
  nationality?: string;

  @ApiProperty()
  @IsEnum(Gender, { message: 'Gender must be Male or Female' })
  gender: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Lawma customer type must be a string' })
  lawmaCustomerType?: LawmaCustomerType;
}

export class AgentInfoDto {
  @ApiProperty()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiProperty()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiProperty()
  @IsString({ message: 'Nationality must be a string' })
  nationality?: string;

  @ApiProperty()
  @IsEnum(Gender, { message: 'Gender must be Male or Female' })
  gender: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'Lawma customer type must be a string' })
  lawmaCustomerType?: LawmaCustomerType;

  @ApiProperty({ description: '11-digit National Identification Number (NIN)' })
  @IsString({ message: 'NIN number must be a string' })
  @IsNotEmpty({ message: 'NIN number is required' })
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must contain only digits' })
  NinNo: string;

  @ApiProperty()
  @IsString({ message: 'ID document must be a string' })
  @IsNotEmpty({ message: 'ID document is required' })
  idDocument: string;
}

export class Branches {
  @ApiProperty()
  @IsString({ message: 'Branch name must be a string' })
  @IsNotEmpty({ message: 'Branch name is required' })
  branchName: string;

  @ApiProperty()
  @IsString({ message: 'Branch Address must be a string' })
  @IsNotEmpty({ message: 'Branch Address is required' })
  branchAddress: string;
}

export class AgencyInformationDto {
  @ApiProperty()
  @IsString({ message: 'Agency name must be a string' })
  @IsNotEmpty({ message: 'Agency name is required' })
  agencyName: string;

  @ApiProperty()
  @IsString({ message: 'Business registration number must be a string' })
  businessRegistrationNumber: string;

  @ApiProperty()
  @IsString()
  @IsEmail()
  businessEmailAddress: string;

  @ApiProperty()
  @IsString({ message: 'Business phone number must be a string' })
  businessPhoneNumber: string;

  @ApiProperty({ type: [Branches], description: 'Array of Branches' })
  @IsArray({ message: 'Branches must be an array' })
  @ValidateNested({ each: true })
  @Type(() => Branches)
  branches: Branches[];
}

export class AgencyDocumentDto {
  @ApiProperty()
  @IsString({ message: 'Agency Certificate document must be a string' })
  @IsNotEmpty({ message: 'Agency Certificate is required' })
  agencyCertificateDocument: string;
}

export class IdVerificationDto {
  @ApiProperty({ description: '11-digit National Identification Number (NIN)' })
  @IsString({ message: 'NIN number must be a string' })
  @IsNotEmpty({ message: 'NIN number is required' })
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must contain only digits' })
  NinNo: string;

  @ApiProperty()
  @IsString({ message: 'ID document must be a string' })
  @IsNotEmpty({ message: 'ID document is required' })
  idDocument: string;
}

export class AddressVerificationDto {
  @ApiProperty()
  @IsString({ message: 'Building type must be a string' })
  @IsNotEmpty({ message: 'Building type is required' })
  buildingType: string;

  @ApiProperty()
  @IsString({ message: 'House number must be a string' })
  @IsNotEmpty({ message: 'House number is required' })
  houseNumber: string;

  @ApiProperty()
  @IsString({ message: 'Flat number must be a string' })
  flatNumber?: string;

  @ApiProperty()
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @ApiProperty()
  @IsString({ message: 'Local government must be a string' })
  @IsNotEmpty({ message: 'Local government is required' })
  localGovernment: string;

  @ApiProperty()
  @IsString({ message: 'Closest landmark must be a string' })
  closestLandmark?: string;
}

export class CreateResidentKycDto {
  @ApiProperty({ type: PersonalInfoDto })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInformation: PersonalInfoDto;

  @ApiProperty({ type: IdVerificationDto })
  @ValidateNested()
  @Type(() => IdVerificationDto)
  identityInformation: IdVerificationDto;

  @ApiProperty({ type: AddressVerificationDto })
  @ValidateNested()
  @Type(() => AddressVerificationDto)
  addressInformation: AddressVerificationDto;
}

export class CreateFacilityManagerKycDto {
  @ApiProperty({ type: PersonalInfoDto })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInformation: PersonalInfoDto;

  @ApiProperty({ type: IdVerificationDto })
  @ValidateNested()
  @Type(() => IdVerificationDto)
  identityInformation: IdVerificationDto;

  @ApiProperty({ type: AddressVerificationDto })
  @ValidateNested()
  @Type(() => AddressVerificationDto)
  addressInformation: AddressVerificationDto;
}

export class CreateAgentKycDto {
  @ApiProperty({ type: AgentInfoDto })
  @ValidateNested()
  @Type(() => AgentInfoDto)
  personalInformation: AgentInfoDto;

  @ApiProperty({ type: AgencyInformationDto })
  @ValidateNested()
  @Type(() => AgencyInformationDto)
  agencyInformation: AgencyInformationDto;

  @ApiProperty({ type: AgencyDocumentDto })
  @ValidateNested()
  @Type(() => AgencyDocumentDto)
  addressDocument: AgencyDocumentDto;
}

export class CompanyInfoDto {
  @ApiProperty()
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @ApiProperty()
  @IsString({ message: 'Business registration number must be a string' })
  businessRegistrationNumber?: string;

  @ApiProperty()
  @IsString({ message: 'Business sector must be a string' })
  businessSector?: string;
}

export class SignatoriesDto {
  @ApiProperty({
    type: [String],
    description: 'Array of valid MongoDB ObjectIds',
  })
  @IsArray({ message: 'Signatories must be an array' })
  @ArrayNotEmpty({ message: 'Signatories array cannot be empty' })
  @IsMongoId({ each: true, message: "Signatory is not valid or doesn't exist" })
  signatories: string[];
}

export class TeamMemberDto {
  @ApiProperty()
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty()
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty()
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @ApiProperty()
  @IsString({ message: 'Nationality must be a string' })
  @IsNotEmpty({ message: 'Nationality is required' })
  nationality: string;

  @ApiProperty()
  @IsString({ message: 'Gender must be a string' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender: Gender;

  @ApiProperty()
  @IsString({ message: 'Job title must be a string' })
  @IsNotEmpty({ message: 'Job title is required' })
  jobTitle: string;

  @ApiProperty()
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @ApiProperty()
  @IsString({ message: 'ID document number must be a string' })
  @IsNotEmpty({ message: 'ID document number is required' })
  NinNo: string;

  @ApiProperty()
  @IsString({ message: 'ID document must be a string' })
  @IsNotEmpty({ message: 'ID document is required' })
  idDocument: string;
}

export class UpdateTeamMemberDto {
  @ApiProperty({ required: false })
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @ApiProperty({ required: false })
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Nationality must be a string' })
  nationality?: string;

  @ApiProperty({ required: false })
  @IsEnum(Gender, { message: 'Gender must be Male or Female' })
  gender?: Gender;

  @ApiProperty({ required: false })
  @IsString({ message: 'Job title must be a string' })
  jobTitle?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'ID document number must be a string' })
  NinNo?: string;

  @ApiProperty({ required: false })
  @IsString({ message: 'ID document must be a string' })
  idDocument?: string;
}
