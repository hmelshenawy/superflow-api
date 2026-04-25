import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController, PortalAuthorisationController } from './authorisation.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [AuthorisationController, PortalAuthorisationController],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}