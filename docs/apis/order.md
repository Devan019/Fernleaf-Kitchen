# Order API

> Status: Implemented

## Overview

The Order module manages customer catering orders through their lifecycle. Orders can contain multiple dishes, each with multi-option preparation combinations and portion size charges.

### Key Architectural Concepts
1. **Lifecycle States**: `DRAFT` -> `PLACED` -> `CONFIRMED` -> `DELIVERED` (or `CANCELLED` / `REJECTED`).
2. **Immutable Price Snapshots**: Every line item and option combination captures the item name, SKU, unit price, portion charge, and combination total at order creation time. Subsequent menu or tier price updates never alter past orders.
3. **Cut-off Enforcement**: Orders for a future delivery date can be modified by clients while in `DRAFT` or `PLACED` status until the kitchen cut-off deadline passes. Once cut-off is processed, `PLACED` orders transition to `CONFIRMED` (and become billable), while unplaced `DRAFT` orders are cancelled.
4. **Admin Overrides**: Administrators can update delivery details or cancel orders even after cut-off.

## Base Path

`/api/order` (Direct route: `/order`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Create Order**: `Permission.ORDER_CREATE` (`ADMIN`)
- **Read Orders / Cut-off Check**: `Permission.ORDER_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Modify / Place Orders**: `Permission.ORDER_UPDATE` (`ADMIN`)
- **Cancel Orders**: `Permission.ORDER_CANCEL` (`ADMIN`)
- **Delivery Overrides**: `Permission.ORDER_OVERRIDE` (`ADMIN`)
- **Process Cut-off**: `Permission.ORDER_CUTOFF_PROCESS` (`ADMIN` only)

---

## Endpoints

# Create Order

### POST
`/api/order`

### Description
Creates a new order on behalf of an employee. Validates company working day availability, resolves current server prices into immutable snapshots, verifies option combinations and minimum order quantities, and calculates line totals with Decimal precision.

### Authentication
Required.

### Authorization
`Permission.ORDER_CREATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `employeeId` | string | Yes | Customer Employee ID |
| `deliveryDate` | string | Yes | Delivery date in `YYYY-MM-DD` format |
| `deliveryTime` | string | No | Requested delivery time in `HH:mm` format |
| `deliveryAddressId` | string | No | Company delivery address ID (uses default if omitted) |
| `packagingType` | string | No | Packaging preference (e.g. `"STANDARD"`, `"ECO_BOX"`) |
| `deliveryInstructions` | string | No | Custom instructions for this delivery |
| `status` | `OrderStatus` | No | Initial status: `DRAFT` (default) or `PLACED` |
| `lines` | array | Yes | Array of ordered dishes and combinations |

```json
{
  "employeeId": "emp_001",
  "deliveryDate": "2026-10-14",
  "deliveryTime": "12:30",
  "status": "PLACED",
  "packagingType": "ECO_BOX",
  "deliveryInstructions": "Leave with reception",
  "lines": [
    {
      "dishId": "dish_111",
      "quantity": 2,
      "combinations": [
        {
          "quantity": 2,
          "options": [
            {
              "optionGroupId": "grp_protein",
              "optionId": "opt_chicken",
              "portionSizeId": "portion_large"
            }
          ]
        }
      ]
    }
  ]
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "ord_1001",
  "orderNumber": "ORD-20261014-0001",
  "employeeId": "emp_001",
  "employeeName": "Sarah Connor",
  "companyId": "cmp_123456789",
  "companyName": "Acme Corporation",
  "deliveryDate": "2026-10-14",
  "deliveryTime": "12:30",
  "status": "PLACED",
  "packagingType": "ECO_BOX",
  "deliveryAddress": {
    "deliveryAddressId": "addr_123",
    "deliveryAddressLabel": "HQ Main",
    "deliveryStreet": "100 Innovation Way",
    "deliveryUnit": "Floor 4",
    "deliveryCity": "London",
    "deliveryPostcode": "EC1A 1BB",
    "deliveryInstructions": "Leave with reception"
  },
  "subtotal": "14.50",
  "total": "14.50",
  "isInvoiced": false,
  "placedAt": "2026-10-04T08:00:00.000Z",
  "confirmedAt": null,
  "deliveredAt": null,
  "linesCount": 1,
  "lines": [
    {
      "id": "line_01",
      "dishId": "dish_111",
      "dishName": "Grilled Chicken Salad",
      "dishSku": "DISH-CHK-SLD",
      "unitPrice": "6.00",
      "quantity": 2,
      "lineTotal": "14.50",
      "combinations": [
        {
          "id": "comb_01",
          "quantity": 2,
          "unitPrice": "7.25",
          "combinationTotal": "14.50",
          "options": [
            {
              "id": "opt_snap_01",
              "optionGroupId": "grp_protein",
              "optionGroupName": "Choice of Protein",
              "optionId": "opt_chicken",
              "optionName": "Grilled Chicken",
              "unitPrice": "1.00",
              "portionSizeId": "portion_large",
              "portionSizeName": "Large",
              "portionExtraCharge": "0.25",
              "finalPrice": "1.25"
            }
          ]
        }
      ]
    }
  ],
  "statusHistory": [
    {
      "id": "hist_01",
      "fromStatus": null,
      "toStatus": "PLACED",
      "changedByUserId": "cmurx19sp0000gkfr3mfbzjr8",
      "note": "Initial order creation",
      "createdAt": "2026-10-04T08:00:00.000Z"
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (e.g. invalid combinations, company closed on delivery date, cut-off passed) |
| 401 | Unauthorized |
| 403 | Forbidden |

---

# Check Cut-off Status for Delivery Date

### GET
`/api/order/cutoff/check`

### Description
Calculates the exact cut-off deadline for a given delivery date using platform kitchen working days, cut-off time, and kitchen holidays.

### Authentication
Required.

### Authorization
`Permission.ORDER_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `deliveryDate` | string | Yes | Target delivery date (`YYYY-MM-DD`) |

### Response
- **Status Code**: `200 OK`

```json
{
  "deliveryDate": "2026-10-14",
  "cutoffDateTime": "2026-10-12T16:00:00.000Z",
  "isPastCutoff": false,
  "kitchenWorkingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  "workingDaysBeforeDelivery": 2,
  "cutoffTime": "16:00",
  "timezone": "Europe/London"
}
```

---

# Process Cut-off for Delivery Date

### POST
`/api/order/cutoff/process`

### Description
Manually triggers cut-off execution for a delivery date. Idempotently transitions all `PLACED` orders for that date to `CONFIRMED` and all `DRAFT` orders to `CANCELLED`. Generates kitchen preparation units and delivery drops.

### Authentication
Required.

### Authorization
`Permission.ORDER_CUTOFF_PROCESS` (ADMIN only).

### Request Body
```json
{
  "deliveryDate": "2026-10-14"
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "deliveryDate": "2026-10-14",
  "cancelledDrafts": 1,
  "confirmedPlaced": 15,
  "processedAt": "2026-10-12T16:00:05.000Z"
}
```

---

# List Orders

### GET
`/api/order`

### Description
Retrieves a paginated list of orders with filters for date range, status, company, employee, and invoiced status.

### Authentication
Required.

### Authorization
`Permission.ORDER_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number |
| `limit` | number | No | Results per page (max 100) |
| `status` | `OrderStatus` | No | Filter by order status |
| `companyId` | string | No | Filter by company ID |
| `employeeId` | string | No | Filter by employee ID |
| `startDate` | string | No | Start delivery date (`YYYY-MM-DD`) |
| `endDate` | string | No | End delivery date (`YYYY-MM-DD`) |
| `isInvoiced` | boolean | No | Filter by invoiced flag |
| `search` | string | No | Search by order number |

### Response
- **Status Code**: `200 OK`
- Returns paginated list of `OrderSummaryResponse`.

---

# Get Order Details by ID

### GET
`/api/order/:id`

### Description
Retrieves complete order information with historical price snapshots, option combinations, and status history timeline.

### Authentication
Required.

### Authorization
`Permission.ORDER_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Response
- **Status Code**: `200 OK`
- Returns `OrderDetailResponse`.

---

# Place Draft Order

### POST
`/api/order/:id/place`

### Description
Transitions a `DRAFT` order to `PLACED`. Re-verifies that cut-off has not passed and confirms items remain available.

### Authentication
Required.

### Authorization
`Permission.ORDER_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Update Order Before Cut-off

### PATCH
`/api/order/:id`

### Description
Modifies order items, quantities, combinations, or delivery details before the cut-off deadline. Recalculates totals.

### Authentication
Required.

### Authorization
`Permission.ORDER_UPDATE` (ADMIN only).

### Request Body
Supports updating items, delivery time, address, and packaging.

### Response
- **Status Code**: `200 OK`

---

# Update Delivery Details (Admin Override)

### PATCH
`/api/order/:id/delivery`

### Description
Allows administrators to update delivery address, instructions, packaging, or requested time after cut-off without recalculating historical dish prices.

### Authentication
Required.

### Authorization
`Permission.ORDER_OVERRIDE` (ADMIN only).

### Request Body
```json
{
  "deliveryTime": "13:00",
  "deliveryInstructions": "Security requires guest badge"
}
```

### Response
- **Status Code**: `200 OK`

---

# Cancel Order

### POST
`/api/order/:id/cancel`

### Description
Cancels an order. Can be performed before cut-off, or by admin override after cut-off. If the order was already invoiced, cancels and records cancellation history.

### Authentication
Required.

### Authorization
`Permission.ORDER_CANCEL` (ADMIN only).

### Request Body
```json
{
  "reason": "Client event rescheduled"
}
```

### Response
- **Status Code**: `200 OK`

---

# Add Line Item to Order

### POST
`/api/order/:id/lines`

### Description
Adds a new dish and combination to an order before cut-off.

### Authentication
Required.

### Authorization
`Permission.ORDER_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Update Order Line Item

### PATCH
`/api/order/:id/lines/:lineId`

### Description
Updates dish quantity or option combinations on an order line before cut-off.

### Authentication
Required.

### Authorization
`Permission.ORDER_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Remove Order Line Item

### DELETE
`/api/order/:id/lines/:lineId`

### Description
Removes a line item from an order before cut-off.

### Authentication
Required.

### Authorization
`Permission.ORDER_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

## Planned Endpoints

None. All core order lifecycle and cut-off processing endpoints are implemented. Automated recurring cut-off cron triggers consume `POST /api/order/cutoff/process`.

---

## Enums

### `OrderStatus`
| Value | Description |
|---|---|
| `DRAFT` | Initial unplaced cart / order |
| `PLACED` | Placed order awaiting cut-off confirmation |
| `CONFIRMED` | Confirmed order post cut-off (billable & sent to kitchen) |
| `DELIVERED` | Order delivered to customer |
| `CANCELLED` | Order cancelled prior to delivery |
| `REJECTED` | Order rejected by kitchen or administration |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `400 Bad Request: Cut-off passed for delivery date` | Attempting to edit or place order past the calculated cut-off deadline | Use admin override endpoints if authorized. |
| `400 Bad Request: Company does not accept delivery on date` | Delivery date falls on a company weekend or company holiday | Choose an active working day for the company. |
| `404 Not Found: Order not found` | Invalid order ID | Verify order ID. |
