import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController, PortalAuthorisationController } from './authorisation.controller';
import { AuthorisationNotificationService } from './services/authorisation-notification.service';
import { MediaModule } from '../media/media.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [MediaModule, AdminModule],
  controllers: [AuthorisationController, PortalAuthorisationController],
  providers: [AuthorisationService, AuthorisationNotificationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
