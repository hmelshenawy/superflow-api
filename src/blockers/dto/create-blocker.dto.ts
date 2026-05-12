import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BlockerType {
  PARTS = 'parts',
  CUSTOMER_APPROVAL = 'customer_approval',
  WORKSHOP_APPROVAL = 'workshop_approval',
  TECHNICIAN_UNAVAILABLE = 'technician_unavailable',
  CUSTOMER_DECISION = 'customer_decision',
  OTHER = 'other',
}

export enum BlockerSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateBlockerDto {
  @ApiProperty({ description: 'Job ID this blocker belongs to' })
  @IsString()
  @IsNotEmpty()
  job_id!: string;

  @ApiProperty({ enum: BlockerType })
  @IsEnum(BlockerType)
  type!: BlockerType;

  @ApiProperty({ description: 'Description of the blocker' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ enum: BlockerSeverity, default: BlockerSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(BlockerSeverity)
  severity?: BlockerSeverity;
}

export class ResolveBlockerDto {
  @ApiPropertyOptional({ description: 'Note about the resolution' })
  @IsOptional()
  @IsString()
  resolution_note?: string;
}