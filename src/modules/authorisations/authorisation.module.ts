import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController, PortalAuthorisationController } from './authorisation.controller';
import { AuthorisationNotificationService } from './services/authorisation-notification.service';
import { AuthorisationQueryService } from './services/authorisation-query.service';
import { AuthorisationDecisionService } from './services/authorisation-decision.service';
import { MediaModule } from '../../media/media.module';
import { AdminModule } from '../admin/settings/admin.module';

@Module({
  imports: [MediaModule, AdminModule],
  controllers: [AuthorisationController, PortalAuthorisationController],
  providers: [AuthorisationService, AuthorisationNotificationService, AuthorisationQueryService, AuthorisationDecisionService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
