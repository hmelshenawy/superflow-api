import { IsNotEmpty, IsString } from 'class-validator';

export class ResetApprovalDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}