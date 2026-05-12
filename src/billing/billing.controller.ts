import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ADMIN_USERS } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get all plans with regional pricing and features' })
  getPricing(@Query('region') region: string = 'gcc') {
    return this.billingService.getPricing(region);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription, plan features, and usage' })
  async getSubscription(@CurrentUser() user: any) {
    const workshopId = await this.resolveWorkshopId(user);
    if (!workshopId) return { subscription: null, plan: null, features: [], usage: {} };
    return this.billingService.getSubscription(workshopId);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current month usage vs ceilings for all features' })
  async getUsage(@CurrentUser() user: any) {
    const workshopId = await this.resolveWorkshopId(user);
    if (!workshopId) return {};
    return this.billingService.getUsage(workshopId);
  }

  /** Resolve workshop context: JWT claim → user's first assigned workshop */
  private async resolveWorkshopId(user: any): Promise<string | null> {
    if (user.workshopId) return user.workshopId;
    if (user.role === 'platform_admin') {
      // Admins: use whichever workshop the frontend has selected (via query) or the first active one
      const first = await this.prisma.workshops.findFirst({ where: { is_active: true }, select: { id: true } });
      return first?.id ?? null;
    }
    const access = await this.prisma.user_workshop_access.findFirst({ where: { user_id: user.sub } });
    return access?.workshop_id ?? null;
  }

  // ── Admin endpoints ────────────────────────────────────

  @Post('admin/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ADMIN_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually activate a subscription (mark as paid/active)' })
  activateSubscription(
    @Body() body: { workshopId: string; planId: string; region?: string; priceOverrideCents?: number; discountPct?: number; internalNotes?: string; status?: string },
    @CurrentUser() user: any,
  ) {
    return this.billingService.activateSubscription(body.workshopId, body.planId, body.region || 'gcc', user.id, {
      priceOverrideCents: body.priceOverrideCents,
      discountPct: body.discountPct,
      internalNotes: body.internalNotes,
      status: body.status,
    });
  }

  @Post('admin/invoices')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ADMIN_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a manual invoice for a workshop' })
  createInvoice(
    @Body() body: { workshopId: string; planId: string; region?: string; periodStart?: string; periodEnd?: string },
  ) {
    return this.billingService.createInvoice(body.workshopId, body.planId, body.region || 'gcc', body.periodStart, body.periodEnd);
  }

  @Post('admin/invoices/:id/mark-paid')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ADMIN_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark an invoice as paid (manual payment reconciliation)' })
  markInvoicePaid(
    @Param('id') invoiceId: string,
    @Body() body: { method?: string; reference?: string },
  ) {
    return this.billingService.markInvoicePaid(invoiceId, body.method || 'manual', body.reference);
  }

  @Get('admin/workshops/:workshopId/billing')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(ADMIN_USERS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing overview for a specific workshop (admin)' })
  getWorkshopBilling(@Param('workshopId') workshopId: string) {
    return this.billingService.getWorkshopBillingOverview(workshopId);
  }
}