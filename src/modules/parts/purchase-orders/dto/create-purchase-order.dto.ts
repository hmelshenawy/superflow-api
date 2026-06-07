import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePoItemDto } from './create-po-item.dto';

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() supplier_id?: string;
  @ApiProperty({ type: [CreatePoItemDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePoItemDto) items: CreatePoItemDto[];
}