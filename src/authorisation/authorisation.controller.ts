import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthorisationService } from './authorisation.service';
import { DecideDto } from './dto/decide.dto';
import { RequestAuthorisationDto } from './dto/request-authorisation.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaService } from '../media/media.service';
import { Request, Response } from 'express';

@ApiTags('Authorisation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class AuthorisationController {
  constructor(private service: AuthorisationService) {}

  @Post(':id/auth-request')
  @Roles('admin', 'manager', 'service_advisor')
  @ApiOperation({ summary: 'Resend/create approval link for a job (staff)' })
  request(@Param('id') jobId: string, @Body() body: RequestAuthorisationDto) {
    return this.service.requestAuthorisation(jobId, body?.channel, body?.sentTo);
  }

  @Get(':id/auth-status')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Check authorisation status for a job (staff)' })
  status(@Param('id') jobId: string) {
    return this.service.getAuthStatus(jobId);
  }
}

@ApiTags('Portal')
@Controller('portal')
export class PortalAuthorisationController {
  constructor(
    private service: AuthorisationService,
    private mediaService: MediaService,
  ) {}

  @Get(':token')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Load approval report for customer (no JWT)' })
  load(@Param('token') token: string) {
    return this.service.loadPortal(token);
  }

  @Post(':token/decide')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit customer decisions (no JWT)' })
  decide(@Param('token') token: string, @Body() dto: DecideDto, @Req() req: any) {
    return this.service.decideFromPortal(token, dto, req.ip, req.headers['user-agent']);
  }

  @Get(':token/media/:mediaId')
  @ApiOperation({ summary: 'Proxy media file for customer portal (no JWT)' })
  async proxyMedia(@Param('token') token: string, @Param('mediaId') mediaId: string, @Res() res: Response) {
    // Validate the portal token first
    await this.service.validatePortalToken(token);
    const file = await this.mediaService.getDownloadStream(mediaId);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${(file.filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}"`);
    const { Readable } = await import('stream');
    const nodeStream = file.stream instanceof Readable ? file.stream : Readable.fromWeb(file.stream as any);
    nodeStream.pipe(res);
  }
}
