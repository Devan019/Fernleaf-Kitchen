# Billing API

> Status: Implemented

## Overview

The Billing module provides financial accounting, invoicing, payment tracking, and debit/credit adjustments for corporate catering orders.

### Architectural Rules
1. **Who Pays?**: The corporate client (`Company`) pays for catering orders. Invoicing is bound to `order.companyId`. Employee payment is not supported.
2. **When is an Order Billable?**: An order becomes billable as soon as it enters `CONFIRMED` status (e.g. after order cut-off processing). Physical delivery is not required prior to invoicing.
3. **Order Uniqueness Constraint**: An order can belong to at most one invoice. Enforced via a database unique constraint on `InvoiceLine.orderId` (`@unique`).
4. **Immutable Financial Snapshots**: Invoicing takes an immutable snapshot of the order's financial amount (`InvoiceLine.unitAmount`, `InvoiceLine.amount`).
5. **No Historical Rewriting**: If an order changes post-invoicing (e.g. cancellation, admin correction, or short delivery), the original invoice line is never modified. Instead, explicit `BillingAdjustment` records (`DEBIT` or `CREDIT`) are recorded to modify the net invoice balance while preserving full audit traceability.
6. **Paid Invoice Immutability**: Paid invoices remain in `PAID` status. Post-payment adjustments update net totals without altering the `PAID` state.
7. **Monetary Precision**: All financial fields, subtotals, adjustment totals, and final totals are represented as PostgreSQL `@db.Decimal(12, 2)` strings. Floating-point arithmetic is strictly forbidden.
8. **Sequential Invoice Numbers**: Invoices receive human-readable identifiers formatted as `INV-YYYY-XXXXXX`.

## Base Path

`/api/billing` (Direct route: `/billing`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

All billing operations require administrative privileges:
- `Permission.BILLING_READ` (ADMIN only)
- `Permission.BILLING_CREATE` (ADMIN only)
- `Permission.BILLING_UPDATE` (ADMIN only)
- `Permission.BILLING_PAY` (ADMIN only)
- `Permission.BILLING_ADJUST` (ADMIN only)

---

## Endpoints

# List Company Billing Summaries

### GET
`/api/billing/companies`

### Description
Returns a paginated list of companies with metrics for uninvoiced confirmed orders, open invoices, and paid invoices.

### Authentication
Required.

### Authorization
`Permission.BILLING_READ` (ADMIN only).

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page (max 100) |
| `search` | string | No | - | Filter by company name |
| `hasUninvoicedOrders` | boolean | No | - | Filter companies with uninvoiced confirmed orders |
| `hasOpenInvoices` | boolean | No | - | Filter companies with open invoices |

### Response
- **Status Code**: `200 OK`

```json
{
  "data": [
    {
      "company": {
        "id": "cmp_123456789",
        "name": "Acme Corporation"
      },
      "uninvoicedOrderCount": 5,
      "uninvoicedAmount": "142.50",
      "openInvoiceCount": 1,
      "openInvoiceAmount": "350.00",
      "paidInvoiceCount": 12,
      "paidAmount": "4200.00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden: Admin privileges required |

---

# Get Company Billing Summary

### GET
`/api/billing/companies/:companyId`

### Description
Retrieves financial summary metrics for a specific company.

### Authentication
Required.

### Authorization
`Permission.BILLING_READ` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `companyId` | string | Yes | Company ID |

### Response
- **Status Code**: `200 OK`
- Returns `CompanyBillingSummaryResponse`.

### Errors
| Status Code | Description |
|---|---|
| 404 | Company not found |

---

# List Uninvoiced Confirmed Orders

### GET
`/api/billing/companies/:companyId/uninvoiced-orders`

### Description
Lists all eligible confirmed orders for a company that have not yet been assigned to an invoice (`Order.isInvoiced: false` and `Order.status: CONFIRMED`).

### Authentication
Required.

### Authorization
`Permission.BILLING_READ` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `companyId` | string | Yes | Company ID |

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number |
| `limit` | number | No | Results per page |
| `startDate` | string | No | Filter delivery start date (`YYYY-MM-DD`) |
| `endDate` | string | No | Filter delivery end date (`YYYY-MM-DD`) |
| `search` | string | No | Search by order number |

### Response
- **Status Code**: `200 OK`

```json
{
  "company": {
    "id": "cmp_123456789",
    "name": "Acme Corporation"
  },
  "orders": [
    {
      "id": "ord_1001",
      "orderNumber": "ORD-20261014-0001",
      "employeeId": "emp_001",
      "employeeName": "Sarah Connor",
      "deliveryDate": "2026-10-14",
      "deliveryTime": "12:30",
      "status": "CONFIRMED",
      "total": "14.50",
      "createdAt": "2026-10-04T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

# Create Invoice for Company

### POST
`/api/billing/companies/:companyId/invoices`

### Description
Groups selected confirmed, uninvoiced orders into a single invoice. The server verifies that all orders belong to the target company, are `CONFIRMED`, and are uninvoiced. Snapshots the lines into immutable `InvoiceLine` records, sets `Order.isInvoiced = true`, and generates a sequential invoice number.

### Authentication
Required.

### Authorization
`Permission.BILLING_CREATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `companyId` | string | Yes | Company ID |

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `orderIds` | string[] | Yes | Array of unique confirmed order IDs (minimum 1) |

```json
{
  "orderIds": ["ord_1001", "ord_1002"]
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "inv_9001",
  "invoiceNumber": "INV-2026-000042",
  "companyId": "cmp_123456789",
  "company": {
    "id": "cmp_123456789",
    "name": "Acme Corporation",
    "billingContactName": "Alice Smith",
    "billingContactEmail": "billing@acme.com",
    "billingContactPhone": "+44 20 7946 0958"
  },
  "status": "OPEN",
  "issuedAt": "2026-10-14T10:00:00.000Z",
  "paidAt": null,
  "subtotal": "34.50",
  "adjustmentTotal": "0.00",
  "total": "34.50",
  "createdAt": "2026-10-14T10:00:00.000Z",
  "updatedAt": "2026-10-14T10:00:00.000Z",
  "lines": [
    {
      "id": "inv_line_01",
      "invoiceId": "inv_9001",
      "orderId": "ord_1001",
      "orderNumber": "ORD-20261014-0001",
      "employeeName": "Sarah Connor",
      "deliveryDate": "2026-10-14",
      "description": "Order ORD-20261014-0001 (Sarah Connor)",
      "quantity": 1,
      "unitAmount": "14.50",
      "amount": "14.50",
      "createdAt": "2026-10-14T10:00:00.000Z"
    }
  ],
  "adjustments": []
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (empty orderIds, unconfirmed order, or orders belong to another company) |
| 404 | Company or one or more orders not found |
| 409 | Conflict: One or more orders are already invoiced |

---

# List Invoices

### GET
`/api/billing/invoices`

### Description
Lists invoices with pagination and filters (company, status, date range, search).

### Authentication
Required.

### Authorization
`Permission.BILLING_READ` (ADMIN only).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number |
| `limit` | number | No | Page size |
| `companyId` | string | No | Filter by company ID |
| `status` | `InvoiceStatus` | No | Filter by status (`OPEN`, `PAID`, `VOID`) |
| `startDate` | string | No | Start issue date (`YYYY-MM-DD`) |
| `endDate` | string | No | End issue date (`YYYY-MM-DD`) |
| `search` | string | No | Search invoice number |

### Response
- **Status Code**: `200 OK`
- Returns paginated list of `InvoiceSummaryResponse`.

---

# Get Invoice Details by ID

### GET
`/api/billing/invoices/:invoiceId`

### Description
Retrieves complete invoice details including company billing contact details, snapshot line items, and audit adjustment records.

### Authentication
Required.

### Authorization
`Permission.BILLING_READ` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | string | Yes | Invoice ID |

### Response
- **Status Code**: `200 OK`
- Returns `InvoiceDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 404 | Invoice not found |

---

# Mark Invoice as Paid

### POST
`/api/billing/invoices/:invoiceId/pay`

### Description
Transitions an `OPEN` invoice to `PAID` status and records the payment timestamp.

### Authentication
Required.

### Authorization
`Permission.BILLING_PAY` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | string | Yes | Invoice ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- Returns updated `InvoiceDetailResponse` with `status: "PAID"` and populated `paidAt`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Invoice cannot be paid (e.g. VOID status) |
| 404 | Invoice not found |
| 409 | Invoice is already paid |

---

# Add Billing Adjustment to Invoice

### POST
`/api/billing/invoices/:invoiceId/adjustments`

### Description
Records an explicit post-invoicing `DEBIT` or `CREDIT` adjustment against an invoiced order (e.g., cancellation credit, short delivery credit, or administrative correction). Recomputes net invoice totals inside an atomic transaction without mutating historical line items.

### Authentication
Required.

### Authorization
`Permission.BILLING_ADJUST` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | string | Yes | Invoice ID |

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `orderId` | string | Yes | ID of the invoiced order being adjusted |
| `reason` | string | Yes | Detailed reason (e.g. `"Short delivery of 2 meals"`, `"Order cancelled"`) |
| `type` | `BillingAdjustmentType` | No | `DEBIT` or `CREDIT` (required if specifying explicit `amount`) |
| `amount` | string | No | Explicit positive decimal string (e.g. `"20.00"`) |
| `newBillableAmount` | string | No | Alternative: provide new total billable amount; system automatically determines difference |

```json
{
  "orderId": "ord_1001",
  "type": "CREDIT",
  "amount": "14.50",
  "reason": "Order cancelled post-invoicing"
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "adj_555",
  "invoiceId": "inv_9001",
  "orderId": "ord_1001",
  "orderNumber": "ORD-20261014-0001",
  "type": "CREDIT",
  "amount": "14.50",
  "reason": "Order cancelled post-invoicing",
  "createdAt": "2026-10-14T11:00:00.000Z",
  "createdByUserId": "cmurx19sp0000gkfr3mfbzjr8",
  "createdByUser": {
    "id": "cmurx19sp0000gkfr3mfbzjr8",
    "name": "Admin User"
  }
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid adjustment payload or targeted order does not belong to this invoice |
| 404 | Invoice not found |

---

## Planned Endpoints

The following features represent architectural boundaries and future extensions. They are intentionally **not implemented** in the current release:

- `POST /api/billing/invoices/:invoiceId/send-email`: Automated email delivery of invoice PDF to billing contacts (Currently, invoice data is consumed directly via the Admin Panel and REST API).
- `POST /api/billing/payment-gateway/webhook`: External payment gateway integration (Stripe, Adyen, Banking APIs). The platform maintains internal accounting records and does not connect to external merchant accounts.

---

## Enums

### `InvoiceStatus`
| Value | Description |
|---|---|
| `OPEN` | Invoice issued and awaiting settlement |
| `PAID` | Invoice marked as settled |
| `VOID` | Invoice cancelled or voided |

### `BillingAdjustmentType`
| Value | Description | Impact on Net Balance |
|---|---|---|
| `DEBIT` | Additional charge | Increases invoice balance |
| `CREDIT` | Deduction or refund credit | Decreases invoice balance |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `409 Conflict: One or more orders are already invoiced` | Attempting to add an already-invoiced order to a second invoice | An order can only belong to one invoice. Verify order status. |
| `400 Bad Request: Order is not in CONFIRMED status` | Attempting to invoice a DRAFT or CANCELLED order | Only CONFIRMED orders are eligible for invoicing. |
| `400 Bad Request: Order does not belong to target company` | Cross-company order grouping attempted | Ensure all order IDs belong to `companyId`. |
