import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty() @IsString() job_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
}

export class RenameGroupDto {
  @ApiProperty() @IsString() title: string;
}