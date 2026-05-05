import { ApiProperty } from '@nestjs/swagger';

export enum PriorityLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class PriorityFactorDto {
  @ApiProperty() key: string;
  @ApiProperty() weight: number;
  @ApiProperty() description: string;
  @ApiProperty() category: string;
}

export class NextBestActionDto {
  @ApiProperty() title: string;
  @ApiProperty() reason: string;
  @ApiProperty() urgency: PriorityLevel;
  @ApiProperty() owner: string;
  @ApiProperty() actionType: string;
  @ApiProperty() score: number;
  @ApiProperty({ type: [String] }) signals: string[];
}

export class PriorityResultDto {
  @ApiProperty({ description: 'Job ID' }) jobId: string;
  @ApiProperty({ description: 'Job number' }) jobNumber: string | null;

  /** Unified priority score 0–100 */
  @ApiProperty({ description: 'Unified priority score (0–100)' }) score: number;
  @ApiProperty({ enum: PriorityLevel, description: 'Risk level derived from score' }) level: PriorityLevel;

  /** Which factors contributed */
  @ApiProperty({ type: [PriorityFactorDto] }) factors: PriorityFactorDto[];

  /** Hours since last update */
  @ApiProperty() idleHours: number;
  /** Hours until promised delivery (null if not set) */
  @ApiProperty({ nullable: true }) hoursToPromise: number | null;

  /** Whether the promised date is overdue */
  @ApiProperty() isOverdue: boolean;

  /** Next best action recommendation */
  @ApiProperty() nextAction: NextBestActionDto;
}

export class BulkPriorityResultDto {
  @ApiProperty({ type: [PriorityResultDto] }) results: PriorityResultDto[];
  @ApiProperty() computedAt: Date;
}