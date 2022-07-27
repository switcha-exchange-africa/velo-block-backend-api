import { IsString, IsNotEmpty, IsBoolean, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { SwitchaDeviceType, USER_LOCK, USER_SIGNUP_STATUS_TYPE, USER_TYPE } from 'src/lib/constants';
import { Types } from 'mongoose';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsEnum(SwitchaDeviceType)
  device: SwitchaDeviceType

  @IsString()
  password: string

  @IsBoolean()
  agreedToTerms: boolean

  @IsOptional()
  country: string

  @IsOptional()
  isAdmin: boolean

  @IsOptional()
  isActive: boolean

  @IsOptional()
  emailVerified: boolean

  @IsOptional()
  phoneVerified: boolean

  @IsOptional()
  lastLoginDate: Date

  @IsOptional()
  createdAt: Date

  @IsOptional()
  dob: Date

  @IsOptional()
  phone: string

  @IsOptional()
  updatedAt: Date

  @IsOptional()
  lock: USER_LOCK;

  @IsOptional()
  authStatus: USER_SIGNUP_STATUS_TYPE

  @IsOptional()
  userType: USER_TYPE
}

export class UpdateUserDto extends PartialType(SignupDto) { }



export class FindByIdDto {
  @IsNotEmpty()
  @IsString()
  public id: Types.ObjectId;

}