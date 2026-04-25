import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransitionStatusDto {
  @ApiProperty() @IsString() to_status!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}