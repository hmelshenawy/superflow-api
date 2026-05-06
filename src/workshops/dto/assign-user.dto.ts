import { IsString, IsNotEmpty } from 'class-validator';

export class AssignUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}