import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 6 }) @MinLength(6) password: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() role_id?: string;
}