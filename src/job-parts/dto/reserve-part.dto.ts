import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'JobPartCatalogOrAdhoc', async: false })
class JobPartCatalogOrAdhocConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const dto = args.object as ReservePartDto;
    const hasPartId = Boolean(dto.partId);
    const hasPartName = Boolean(dto.partName?.trim());
    const hasConcernId = Boolean(dto.concernId);

    if (hasPartId) {
      return hasConcernId;
    }

    return hasPartName && hasConcernId;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as ReservePartDto;

    if (dto.partId) {
      return 'concernId is required when adding a catalog part';
    }

    return 'partName and concernId are required when adding an ad-hoc part';
  }
}

export class ReservePartDto {
  @ApiProperty()
  @IsString()
  job_id: string;

  @ApiProperty()
  @IsUUID()
  concernId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  estimateLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  partName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  partNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  @IsString()
  warehouse_id?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unit_cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;

  @Validate(JobPartCatalogOrAdhocConstraint)
  private readonly jobPartCatalogOrAdhoc?: unknown;
}
