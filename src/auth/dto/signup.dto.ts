import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'Premium Auto Workshop' })
  @IsString()
  workshopName: string;

  @ApiProperty({ example: 'Haitham Elshenawy' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'owner@premiumauto.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+971500000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'gcc', enum: ['us', 'gcc'] })
  @IsOptional()
  @IsString()
  region?: string;
}
