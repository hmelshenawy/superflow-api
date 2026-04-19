import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitInspectionDto {
  @ApiProperty() @IsString() status: string; // 'submitted' or 'reviewed' or 'approved'
}