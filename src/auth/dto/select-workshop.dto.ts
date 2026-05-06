import { IsString, IsNotEmpty } from 'class-validator';

export class SelectWorkshopDto {
  @IsString()
  @IsNotEmpty()
  workshopId: string;
}