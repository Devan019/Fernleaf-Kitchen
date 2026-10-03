import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permission } from '../auth/types/permission.enum.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { BillingService } from './billing.service.js';
import { InvoiceService } from './invoice.service.js';
import { BillingAdjustmentService } from './billing-adjustment.service.js';
import {
  CompanyBillingQueryDto,
  CreateInvoiceDto,
  InvoiceAdjustmentDto,
  InvoiceListQueryDto,
  UninvoicedOrdersQueryDto,
} from './dto/index.js';
import type {
  BillingAdjustmentDetail,
  CompanyBillingSummaryResponse,
  InvoiceDetailResponse,
  PaginatedCompanyBillingSummariesResponse,
  PaginatedInvoicesResponse,
  PaginatedUninvoicedOrdersResponse,
} from './types/billing.types.js';

@ApiTags('billing')
@ApiBearerAuth()
@ApiCookieAuth('token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly invoiceService: InvoiceService,
    private readonly adjustmentService: BillingAdjustmentService,
  ) {}

  @Get('companies')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({
    summary: 'List billing summaries across companies',
    description:
      'Returns a paginated list of companies with metrics for uninvoiced confirmed orders, open invoices, and paid invoices.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of company billing summaries.',
  })
  listCompanies(
    @Query() query: CompanyBillingQueryDto,
  ): Promise<PaginatedCompanyBillingSummariesResponse> {
    return this.billingService.listCompanyBillingSummaries(query);
  }

  @Get('companies/:companyId')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({
    summary: 'Get billing summary for a specific company',
    description:
      'Returns counts and Decimal amounts for uninvoiced confirmed orders, open invoices, and paid invoices.',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Company billing summary metrics.',
  })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getCompanySummary(
    @Param('companyId') companyId: string,
  ): Promise<CompanyBillingSummaryResponse> {
    return this.billingService.getCompanyBillingSummary(companyId);
  }

  @Get('companies/:companyId/uninvoiced-orders')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({
    summary: 'List all confirmed uninvoiced orders for a company',
    description:
      'Only returns CONFIRMED orders not yet assigned to an invoice. Supports date filtering and search.',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of eligible uninvoiced confirmed orders.',
  })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getUninvoicedOrders(
    @Param('companyId') companyId: string,
    @Query() query: UninvoicedOrdersQueryDto,
  ): Promise<PaginatedUninvoicedOrdersResponse> {
    return this.billingService.getUninvoicedOrders(companyId, query);
  }

  @Post('companies/:companyId/invoices')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.BILLING_CREATE)
  @ApiOperation({
    summary: 'Group confirmed uninvoiced orders into an invoice',
    description:
      'Creates an internal invoice for selected order IDs. The server validates that all orders belong to the company, are CONFIRMED, and are uninvoiced.',
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully with snapshot lines and Decimal totals.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failure (orders unconfirmed or belong to another company).',
  })
  @ApiResponse({
    status: 404,
    description: 'Company or one or more orders not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: one or more orders are already invoiced.',
  })
  createInvoice(
    @Param('companyId') companyId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceDetailResponse> {
    return this.invoiceService.createInvoice(companyId, dto, user.id);
  }

  @Get('invoices')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({
    summary: 'List invoices with pagination and filters',
    description:
      'Supports filtering by company, invoice status (OPEN, PAID, VOID), date range, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of invoices.',
  })
  listInvoices(
    @Query() query: InvoiceListQueryDto,
  ): Promise<PaginatedInvoicesResponse> {
    return this.invoiceService.listInvoices(query);
  }

  @Get('invoices/:invoiceId')
  @RequirePermissions(Permission.BILLING_READ)
  @ApiOperation({
    summary: 'Get invoice details by ID',
    description:
      'Returns full invoice information including immutable snapshot lines, company contact info, and billing adjustments.',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Complete invoice details.',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  getInvoice(
    @Param('invoiceId') invoiceId: string,
  ): Promise<InvoiceDetailResponse> {
    return this.invoiceService.getInvoiceById(invoiceId);
  }

  @Post('invoices/:invoiceId/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.BILLING_PAY)
  @ApiOperation({
    summary: 'Mark an invoice as PAID',
    description:
      'Transitions an OPEN invoice to PAID status and records the paid timestamp.',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully marked as PAID.',
  })
  @ApiResponse({ status: 400, description: 'Invoice cannot be paid (e.g. VOID).' })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  @ApiResponse({ status: 409, description: 'Invoice is already paid.' })
  markInvoicePaid(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceDetailResponse> {
    return this.invoiceService.markInvoicePaid(invoiceId, user.id);
  }

  @Post('invoices/:invoiceId/adjustments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.BILLING_ADJUST)
  @ApiOperation({
    summary: 'Add a billing adjustment to an invoice',
    description:
      'Records a DEBIT or CREDIT adjustment against an invoiced order (e.g. for short delivery, cancellation, or administrative corrections). Updates invoice totals without modifying historical invoice lines.',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({
    status: 201,
    description: 'Billing adjustment created successfully and invoice totals updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid adjustment payload or order not on invoice.',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  createAdjustment(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: InvoiceAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BillingAdjustmentDetail> {
    return this.adjustmentService.createAdjustmentForInvoice(
      invoiceId,
      dto,
      user.id,
    );
  }
}
