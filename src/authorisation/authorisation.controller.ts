import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorisationService } from './authorisation.service';
import { DecideDto } from './dto/decide.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@ApiTags('Authorisation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class AuthorisationController {
  constructor(private service: AuthorisationService) {}

  @Post(':id/auth-request')
  @ApiOperation({ summary: 'Resend/create approval link for a job (staff)' })
  request(@Param('id') jobId: string, @Body() body: { channel?: string; sentTo?: string }) {
    return this.service.requestAuthorisation(jobId, body?.channel, body?.sentTo);
  }

  @Get(':id/auth-status')
  @ApiOperation({ summary: 'Check authorisation status for a job (staff)' })
  status(@Param('id') jobId: string) {
    return this.service.getAuthStatus(jobId);
  }
}

@ApiTags('Portal')
@Controller('portal')
export class PortalAuthorisationController {
  constructor(private service: AuthorisationService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Load approval report for customer (no JWT)' })
  load(@Param('token') token: string) {
    return this.service.loadPortal(token);
  }

  @Post(':token/decide')
  @ApiOperation({ summary: 'Submit customer decisions (no JWT)' })
  decide(@Param('token') token: string, @Body() dto: DecideDto, @Req() req: any) {
    return this.service.decideFromPortal(token, dto, req.ip, req.headers['user-agent']);
  }
}
