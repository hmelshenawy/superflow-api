import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PriorityWeightsOverrideDto {
  @ApiPropertyOptional() @IsOptional() @IsString() promiseOverdue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promiseDue2h?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() promiseDue6h?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() noPromiseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerWaiting?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerAngry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerVip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerComeback?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() waitingCustomerDecision?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partsBackorder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partsWaitingWarehouse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partsNeedOrder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idle24h?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idle12h?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idle6h?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stageCheckingDiagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stageQcNearDelivery?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() readyToInform?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() highEstimateValue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mediumEstimateValue?: string;
}