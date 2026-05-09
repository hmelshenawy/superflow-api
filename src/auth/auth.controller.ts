import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Req, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { SignupDto } from './dto/signup.dto';
import { SelectWorkshopDto } from './dto/select-workshop.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private readonly refreshCookieName = 'prioraflow_refresh';

  private refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }

  private readCookie(req: Request, name: string) {
    const header = req.headers.cookie;
    if (!header) return undefined;
    return header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(this.refreshCookieName, refreshToken, this.refreshCookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.refreshCookieName, {
      ...this.refreshCookieOptions(),
      maxAge: undefined,
    });
  }

  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 300_000 } })
  @ApiOperation({ summary: 'Create a trial workshop and owner account' })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.signup(dto);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...body } = result;
    return body;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 60_000 } })
  @ApiOperation({ summary: 'Login with email & password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...body } = result;
    return body;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 120_000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = dto.refreshToken || dto.refresh_token || this.readCookie(req, this.refreshCookieName) || '';
    const result = await this.auth.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }



  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 300_000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 300_000 } })
  @ApiOperation({ summary: 'Reset password using emailed token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  private assertBillingAccess(role: string) {
    if (!['workshop_admin', 'platform_admin'].includes(role)) {
      throw new ForbiddenException('Billing is only available to workshop admins and platform admins');
    }
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  getSubscription(@CurrentUser('workshopId') workshopId: string, @CurrentUser('role') role: string) {
    this.assertBillingAccess(role);
    if (!workshopId) return null;
    return this.auth.getSubscriptionStatus(workshopId);
  }

  @Get('billing')
  @UseGuards(JwtAuthGuard)
  getBilling(@CurrentUser('workshopId') workshopId: string, @CurrentUser('role') role: string) {
    this.assertBillingAccess(role);
    if (!workshopId) return null;
    return this.auth.getBillingOverview(workshopId);
  }

  @Post('select-workshop')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Select active workshop — returns new access token with workshopId' })
  selectWorkshop(@CurrentUser('sub') userId: string, @Body() dto: SelectWorkshopDto) {
    return this.auth.selectWorkshop(userId, dto.workshopId);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout — revoke all refresh tokens' })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.user.sub);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.auth.getProfile(userId);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List active sessions for current user' })
  listSessions(@CurrentUser('sub') userId: string) {
    return this.auth.listSessions(userId);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a specific session' })
  revokeSession(@Param('id') sessionId: string, @CurrentUser('sub') userId: string) {
    return this.auth.revokeSession(sessionId, userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update own profile (name, avatar)' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(userId, dto);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 300_000 } })
  @ApiOperation({ summary: 'Change own password' })
  changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}
