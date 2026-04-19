import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController } from './authorisation.controller';

@Module({
  controllers: [AuthorisationController],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}