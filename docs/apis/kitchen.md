# Kitchen API

> Status: Implemented

## Overview

The Kitchen module powers kitchen preparation operations. Upon cut-off processing of confirmed orders, the system generates atomic `KitchenUnit` records for each unique dish option combination.

### Key Operational Concepts
1. **Station Grouping**: The preparation board groups units by assigned kitchen station (e.g., Grill, Cold Prep, Bakery) for parallel execution.
2. **SLA Time Calculations**: The engine calculates:
   - `plannedDispatchReadyAt = deliveryDateTime - company.leaveKitchenMinutes`
   - `plannedKitchenReadyAt = plannedDispatchReadyAt - DEFAULT_KITCHEN_BUFFER_MINUTES (30 mins)`
3. **Operational Statuses**:
   - `ON_TRACK`: Remaining preparation time is safe.
   - `AT_RISK`: Approaching `plannedKitchenReadyAt` within threshold (15 minutes).
   - `LATE`: Current time exceeds `plannedKitchenReadyAt` while unit remains incomplete.
   - `COMPLETED`: Unit is marked `DONE`.
4. **Order Milestone Sync**:
   - Starting the first unit for an order sets `order.kitchenStartedAt`.
   - Completing the final unit for an order sets `order.kitchenReadyAt` and alerts dispatch.

## Base Path

`/api/kitchen` (Direct route: `/kitchen`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Board Viewing**: `Permission.KITCHEN_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Unit Preparation**: `Permission.KITCHEN_UPDATE` (`ADMIN`, `KITCHEN`)
- **Admin Force Complete**: `Permission.KITCHEN_FORCE_COMPLETE` (`ADMIN` only)

---

## Endpoints

# Get Kitchen Preparation Board

### GET
`/api/kitchen/board`

### Description
Returns all kitchen preparation units for confirmed orders on a specified delivery date, grouped by preparation station. Units carry real-time SLA metrics (`isLate`, `isAtRisk`, `operationalStatus`).

### Authentication
Required.

### Authorization
`Permission.KITCHEN_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
None.

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `deliveryDate` | string | Yes | Target delivery date (`YYYY-MM-DD`, e.g. `"2026-10-14"`) |
| `stationId` | string | No | Filter by specific kitchen station ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "deliveryDate": "2026-10-14",
  "totalUnits": 3,
  "stations": [
    {
      "id": "station_salad",
      "name": "Salad & Cold Station",
      "unitsCount": 2,
      "units": [
        {
          "unitId": "k_unit_01",
          "orderId": "ord_1001",
          "orderNumber": "ORD-20261014-0001",
          "company": {
            "id": "cmp_123456789",
            "name": "Acme Corporation"
          },
          "employee": {
            "id": "emp_001",
            "name": "Sarah Connor"
          },
          "dish": {
            "id": "dish_111",
            "name": "Grilled Chicken Salad",
            "sku": "DISH-CHK-SLD"
          },
          "quantity": 2,
          "selectedOptions": [
            {
              "optionId": "opt_chicken",
              "optionName": "Grilled Chicken",
              "optionGroupName": "Choice of Protein",
              "portionSizeName": "Large"
            }
          ],
          "station": {
            "id": "station_salad",
            "name": "Salad & Cold Station"
          },
          "status": "PENDING",
          "startedAt": null,
          "completedAt": null,
          "startedByUser": null,
          "completedByUser": null,
          "plannedKitchenReadyAt": "2026-10-14T11:15:00.000Z",
          "plannedDispatchReadyAt": "2026-10-14T11:45:00.000Z",
          "deliveryDate": "2026-10-14",
          "deliveryTime": "12:30",
          "isLate": false,
          "isAtRisk": false,
          "operationalStatus": "ON_TRACK",
          "createdAt": "2026-10-12T16:00:05.000Z",
          "updatedAt": "2026-10-12T16:00:05.000Z"
        }
      ]
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid `deliveryDate` format |
| 401 | Unauthorized |
| 403 | Forbidden |

---

# Start Unit Preparation

### POST
`/api/kitchen/units/:unitId/start`

### Description
Transitions a `PENDING` kitchen unit to `STARTED`. Records the starting timestamp and user. If this is the first unit started for the order, sets `order.kitchenStartedAt`.

### Authentication
Required.

### Authorization
`Permission.KITCHEN_UPDATE` (`ADMIN`, `KITCHEN`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `unitId` | string | Yes | Kitchen Unit ID |

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- Returns updated `KitchenUnitResponse` with `status: "STARTED"` and populated `startedAt`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Order is not in CONFIRMED status |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Kitchen unit not found |
| 409 | Kitchen unit is already started or completed |

---

# Complete Unit Preparation

### POST
`/api/kitchen/units/:unitId/complete`

### Description
Transitions a unit to `DONE`. Records completion timestamp and user. If all units for the order are `DONE`, automatically sets `order.kitchenReadyAt` and flags the associated delivery drop as ready for packaging.

### Authentication
Required.

### Authorization
`Permission.KITCHEN_UPDATE` (`ADMIN`, `KITCHEN`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `unitId` | string | Yes | Kitchen Unit ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- Returns updated `KitchenUnitResponse` with `status: "DONE"` and populated `completedAt`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Order is not in CONFIRMED status |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Kitchen unit not found |
| 409 | Kitchen unit is already completed |

---

# Force-Complete Order Kitchen Work (Admin Only)

### POST
`/api/kitchen/orders/:orderId/force-complete`

### Description
Administrative override that marks all kitchen units for an order as `DONE` and sets `order.kitchenReadyAt`. Preserves existing start timestamps. Fully idempotent.

### Authentication
Required.

### Authorization
`Permission.KITCHEN_FORCE_COMPLETE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | string | Yes | Order ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "orderId": "ord_1001",
  "orderNumber": "ORD-20261014-0001",
  "status": "CONFIRMED",
  "kitchenStartedAt": "2026-10-14T10:00:00.000Z",
  "kitchenReadyAt": "2026-10-14T11:00:00.000Z",
  "units": [ ... ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Order is not in CONFIRMED status |
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN role required) |
| 404 | Order not found |

---

## Planned Endpoints

None. All kitchen operations and force-complete endpoints are implemented.

---

## Enums

### `KitchenUnitStatus`
| Value | Description |
|---|---|
| `PENDING` | Unit queued for preparation |
| `STARTED` | Unit currently being prepped at station |
| `DONE` | Unit finished and plated/boxed |

### `KitchenUnitOperationalStatus`
| Value | Description |
|---|---|
| `ON_TRACK` | Time remaining before planned ready threshold |
| `AT_RISK` | Within 15 minutes of `plannedKitchenReadyAt` and incomplete |
| `LATE` | Past `plannedKitchenReadyAt` and incomplete |
| `COMPLETED` | Finished prep |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `409 Conflict: Kitchen unit is already started or completed` | Attempting to start an already active or completed unit | Verify unit state on the kitchen board. |
| `400 Bad Request: Order is not in CONFIRMED status` | Attempting to operate on draft or cancelled order units | Only confirmed orders generate active prep units. |
| `404 Not Found: Kitchen unit not found` | Invalid unit ID | Refresh board and verify unit ID. |
