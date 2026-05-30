import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ACTIVITY_TYPES = ['call', 'visit', 'note', 'reminder', 'email', 'message'] as const;

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsString()
  @IsIn(ACTIVITY_TYPES)
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_at?: string;
}