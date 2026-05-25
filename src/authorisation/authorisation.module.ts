import { Module } from '@nestjs/common';
import { AuthorisationService } from './authorisation.service';
import { AuthorisationController, PortalAuthorisationController } from './authorisation.controller';
import { MediaModule } from '../media/media.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [MediaModule, AdminModule],
  controllers: [AuthorisationController, PortalAuthorisationController],
  providers: [AuthorisationService],
  exports: [AuthorisationService],
})
export class AuthorisationModule {}
