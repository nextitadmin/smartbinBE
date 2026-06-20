import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsString,
	Min,
	MinLength,
  Max,
  MaxLength,
} from 'class-validator';

export class CreatePayerDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsDateString(
    {},
    {
      message: 'Date of birth must be a valid date: Year/Month/Day e.g 2000-01-01.',
    },
  )
  dateOfBirth: string;

  @ApiProperty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    minLength: 11,
    maxLength: 11,
  })
  @MinLength(11, {
    message: 'NIN cannot be less than 11 digits.',
  })
	@MaxLength(11, {
    message: 'NIN cannot be more than 11 digits.',
  })
  nin: string;
}
