import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicesPdfService } from './invoices-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { WorkshopGuard } from '../common/guards/workshop.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import {
  INVOICES_READ,
  INVOICES_CREATE,
  INVOICES_UPDATE,
  INVOICES_CANCEL,
  INVOICES_EXPORT,
} from '../common/permissions/permissions';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard, WorkshopGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private pdfService: InvoicesPdfService,
  ) {}

  @Post()
  @RequirePermission(INVOICES_CREATE)
  @ApiOperation({ summary: 'Create a new invoice' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser('workshopId') workshopId: string) {
    return this.invoicesService.create(dto, workshopId);
  }

  @Get()
  @RequirePermission(INVOICES_READ)
  @ApiOperation({ summary: 'List invoices' })
  findAll(@Query() dto: ListInvoicesDto) {
    return this.invoicesService.findAll(dto);
  }

  @Get(':id')
  @RequirePermission(INVOICES_READ)
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(INVOICES_UPDATE)
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Patch(':id/issue')
  @RequirePermission(INVOICES_UPDATE)
  @ApiOperation({ summary: 'Issue a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  issue(@Param('id') id: string, @Body() _dto: IssueInvoiceDto) {
    return this.invoicesService.issue(id);
  }

  @Patch(':id/cancel')
  @RequirePermission(INVOICES_CANCEL)
  @ApiOperation({ summary: 'Cancel an issued invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  cancel(@Param('id') id: string, @Body() _dto: CancelInvoiceDto) {
    return this.invoicesService.cancel(id);
  }

  @Get(':id/pdf')
  @RequirePermission(INVOICES_EXPORT)
  @ApiOperation({ summary: 'Export invoice as PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${id}.pdf"`);
    res.send(buffer);
  }
}
