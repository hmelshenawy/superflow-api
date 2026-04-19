import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthorisationService } from './authorisation.service';
import { DecideDto } from './dto/decide.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@ApiTags('Authorisation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('authorisation')
export class AuthorisationController {
  constructor(private service: AuthorisationService) {}

  @Post('token')
  @ApiOperation({ summary: 'Create approval token for a job' })
  createToken(@Body() body: { jobId: string; channel?: string; sentTo?: string }) {
    return this.service.createToken(body.jobId, body.channel, body.sentTo);
  }

  @Post('decide')
  @ApiOperation({ summary: 'Record customer decision (approve/decline/defer)' })
  decide(@Body() dto: DecideDto, @Req() req: any) {
    return this.service.decide(dto, req.ip);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get all decisions for a job' })
  getDecisions(@Param('jobId') jobId: string) {
    return this.service.getDecisionsForJob(jobId);
  }
}