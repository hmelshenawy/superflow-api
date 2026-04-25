import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DecisionItemDto {
  @ApiProperty() @IsString() estimate_line_id!: string;
  @ApiProperty() @IsEnum(['approved', 'declined', 'deferred']) decision!: 'approved' | 'declined' | 'deferred';
  @ApiPropertyOptional() @IsOptional() @IsString() customer_comment?: string;
}

export class DecideDto {
  @ApiProperty({ type: [DecisionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecisionItemDto)
  decisions!: DecisionItemDto[];
}
