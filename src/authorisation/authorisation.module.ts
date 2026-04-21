import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController, PortalAuthorisationController } from './authorisation.controller';

@Module({
  controllers: [AuthorisationController, PortalAuthorisationController],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
