# Dispatch & Driver API

> Status: Implemented

## Overview

The Dispatch module manages order packaging, driver assignment, delivery dispatching, and driver fulfillment. The primary operational unit is the **Delivery Drop** (`DeliveryDrop`), which aggregates orders sharing the same:
- Company ID
- Delivery Date
- Delivery Time
- Delivery Address

### Lifecycle Transitions
1. `KITCHEN_READY`: Kitchen prep is complete for all attached orders.
2. `DISPATCH_READY`: Orders are packed and checked in dispatch.
3. `OUT_FOR_DELIVERY`: Drop is loaded onto the assigned driver's vehicle and in transit.
4. `DELIVERED`: Driver completes delivery, records proof notes, and uploads proof-of-delivery (POD) photo.

The module contains two dedicated sub-domains:
- **Dispatch Coordination (`/api/dispatch`)**: For dispatch staff managing the board, packaging checks, and driver assignments.
- **Driver Mobile Portal (`/api/driver`)**: Tailored strictly for the authenticated delivery driver to inspect assigned routes, view customer access instructions, upload delivery photos, and mark drops delivered.

## Base Paths

- Dispatch Management: `/api/dispatch` (Direct route: `/dispatch`)
- Driver Mobile Portal: `/api/driver` (Direct route: `/driver`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Dispatch Operations**: `Permission.DISPATCH_READ`, `Permission.DISPATCH_ASSIGN_DRIVER`, `Permission.DISPATCH_UPDATE` (`ADMIN`, `DISPATCH`)
- **Driver Portal**: `UserRole.DRIVER` only (`@Roles(UserRole.DRIVER)`)

---

## Endpoints

### Section A: Dispatch Management (`/api/dispatch`)

# View Dispatch Board

### GET
`/api/dispatch/board`

### Description
Retrieves all delivery drops for a specific delivery date, ordered by delivery time ascending. Shows attached order counts, assigned driver, operational status, and action availability flags (`canMarkReady`, `canMarkOutForDelivery`, `canDeliver`).

### Authentication
Required.

### Authorization
`Permission.DISPATCH_READ` (`ADMIN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `deliveryDate` | string | Yes | Delivery date in `YYYY-MM-DD` format (e.g. `"2026-10-14"`) |
| `status` | `DeliveryDropStatus` | No | Filter by drop status |
| `driverId` | string | No | Filter by assigned driver user ID |

### Response
- **Status Code**: `200 OK`

```json
{
  "deliveryDate": "2026-10-14",
  "drops": [
    {
      "id": "drop_101",
      "deliveryDate": "2026-10-14",
      "deliveryTime": "12:30",
      "company": {
        "id": "cmp_123456789",
        "name": "Acme Corporation"
      },
      "address": {
        "street": "100 Innovation Way",
        "unit": "Floor 4",
        "city": "London",
        "postcode": "EC1A 1BB",
        "deliveryInstructions": "Leave with reception"
      },
      "driver": {
        "id": "usr_driver_01",
        "name": "Dave Driver"
      },
      "status": "DISPATCH_READY",
      "ordersCount": 3,
      "dispatchReadyAt": "2026-10-14T11:40:00.000Z",
      "outForDeliveryAt": null,
      "deliveredAt": null,
      "deliveredNote": null,
      "deliveredPhotoUrl": null,
      "isOnTime": null,
      "canMarkReady": false,
      "canMarkOutForDelivery": true,
      "canDeliver": false
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid query parameters |
| 401 | Unauthorized |
| 403 | Forbidden |

---

# View Delivery Drop Details

### GET
`/api/dispatch/drops/:dropId`

### Description
Retrieves detailed operational information for a delivery drop, including full attached orders, employee recipients, packaging types, and status audit history.

### Authentication
Required.

### Authorization
`Permission.DISPATCH_READ` (`ADMIN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Response
- **Status Code**: `200 OK`
- Returns `DispatchDropDetailResponse`.

---

# Assign Driver to Delivery Drop

### POST
`/api/dispatch/drops/:dropId/driver`

### Description
Assigns or reassigns a driver staff member to a delivery drop. Validates that the assigned user exists, is active, and possesses the `DRIVER` role.

### Authentication
Required.

### Authorization
`Permission.DISPATCH_ASSIGN_DRIVER` (`ADMIN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `driverId` | string | Yes | Staff User ID of the driver |

```json
{
  "driverId": "usr_driver_01"
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "drop_101",
  "driverId": "usr_driver_01",
  "status": "DISPATCH_READY"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Assigned user does not have DRIVER role or drop is already delivered |
| 404 | Drop or driver user not found |

---

# Mark Delivery Drop as Dispatch Ready

### POST
`/api/dispatch/drops/:dropId/ready`

### Description
Transitions an eligible drop from `KITCHEN_READY` to `DISPATCH_READY`. Verifies that all attached orders have completed kitchen prep.

### Authentication
Required.

### Authorization
`Permission.DISPATCH_UPDATE` (`ADMIN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Response
- **Status Code**: `200 OK`

---

# Mark Order Dispatch Ready by Order ID

### POST
`/api/dispatch/orders/:orderId/ready`

### Description
Convenience route to mark the delivery drop containing a specific order as `DISPATCH_READY`.

### Authentication
Required.

### Authorization
`Permission.DISPATCH_UPDATE` (`ADMIN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | string | Yes | Order ID |

### Response
- **Status Code**: `200 OK`

---

# Mark Drop as Out for Delivery

### POST
`/api/dispatch/drops/:dropId/out-for-delivery`

### Description
Transitions a `DISPATCH_READY` drop to `OUT_FOR_DELIVERY`. Requires an assigned driver. Simultaneously advances the fulfillment status of all attached orders to `OUT_FOR_DELIVERY`.

### Authentication
Required.

### Authorization
`Permission.DISPATCH_UPDATE` (`ADMIN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Response
- **Status Code**: `200 OK`

### Errors
| Status Code | Description |
|---|---|
| 400 | Drop is not in DISPATCH_READY status, has no driver assigned, or orders cancelled |
| 404 | Drop not found |
| 409 | Drop already out for delivery or modified concurrently |

---

### Section B: Driver Mobile Portal (`/api/driver`)

# View Assigned Drops for Today

### GET
`/api/driver/drops/today`

### Description
Retrieves delivery drops assigned to the calling driver for today in the business timezone, sorted chronologically by delivery time.

### Authentication
Required.

### Authorization
`UserRole.DRIVER` only.

### Path Parameters
None.

### Query Parameters
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "date": "2026-10-14",
  "drops": [
    {
      "id": "drop_101",
      "deliveryTime": "12:30",
      "company": {
        "id": "cmp_123456789",
        "name": "Acme Corporation"
      },
      "address": {
        "street": "100 Innovation Way",
        "unit": "Floor 4",
        "city": "London",
        "postcode": "EC1A 1BB",
        "deliveryInstructions": "Leave with reception"
      },
      "ordersCount": 3,
      "status": "OUT_FOR_DELIVERY",
      "isOnTime": null,
      "canDeliver": true
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden: Caller is not a driver |

---

# View Driver Drop Details

### GET
`/api/driver/drops/:dropId`

### Description
Returns operational drop details including standing driver instructions and recipient meal packages. Access is strictly isolated to the driver assigned to the drop.

### Authentication
Required.

### Authorization
`UserRole.DRIVER` (Assigned driver only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "drop_101",
  "deliveryDate": "2026-10-14",
  "deliveryTime": "12:30",
  "status": "OUT_FOR_DELIVERY",
  "company": {
    "id": "cmp_123456789",
    "name": "Acme Corporation",
    "standingDriverInstructions": "Buzz unit 4B at reception."
  },
  "address": {
    "street": "100 Innovation Way",
    "unit": "Floor 4",
    "city": "London",
    "postcode": "EC1A 1BB",
    "deliveryInstructions": "Leave with reception"
  },
  "ordersCount": 1,
  "orders": [
    {
      "id": "ord_1001",
      "orderNumber": "ORD-20261014-0001",
      "employeeName": "Sarah Connor",
      "packagingType": "ECO_BOX",
      "deliveryInstructions": "Leave with reception",
      "itemsCount": 2
    }
  ],
  "isOnTime": null,
  "dispatchReadyAt": "2026-10-14T11:40:00.000Z",
  "outForDeliveryAt": "2026-10-14T11:55:00.000Z",
  "deliveredAt": null,
  "deliveredNote": null,
  "deliveredPhotoUrl": null,
  "canDeliver": true
}
```

### Errors
| Status Code | Description |
|---|---|
| 403 | Forbidden: Caller is not the driver assigned to this drop |
| 404 | Drop not found |

---

# Mark Delivery Drop as Delivered

### POST
`/api/driver/drops/:dropId/deliver`

### Description
Transitions the drop and all attached orders to `DELIVERED`. Automatically computes `isOnTime` by comparing the completion time against the promised delivery time. Records completion notes.

### Authentication
Required.

### Authorization
`UserRole.DRIVER` (Assigned driver only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `dropId` | string | Yes | Delivery drop ID |

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `note` | string | No | Delivery confirmation note |
| `photoUrl` | string | No | Optional URL of uploaded proof-of-delivery photo |

```json
{
  "note": "Delivered to reception desk, signed by John at 12:22",
  "photoUrl": "https://storage.fernleaf.internal/deliveries/drop_101.jpg"
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "drop_101",
  "status": "DELIVERED",
  "deliveredAt": "2026-10-14T12:22:15.000Z",
  "isOnTime": true,
  "deliveredNote": "Delivered to reception desk, signed by John at 12:22"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Drop is not in OUT_FOR_DELIVERY status |
| 403 | Forbidden: Caller is not the assigned driver |
| 409 | Drop already marked delivered |

---

# Upload Delivery Proof Photo

### POST
`/api/driver/drops/:dropId/delivery-photo`

### Description
Uploads a delivery proof image from the driver's device (JPEG, PNG, WebP - max 5MB). The image is stored in object storage and returns the public asset URL to be passed into `/deliver`.

### Authentication
Required.

### Authorization
`UserRole.DRIVER` (Assigned driver only).

### Request Body (Multipart / Form-Data)
| Field | Type | Description |
|---|---|---|
| `file` | binary | Proof of delivery image |

### Response
- **Status Code**: `200 OK`

```json
{
  "photoUrl": "https://storage.fernleaf.internal/deliveries/pod_drop_101_1728000.jpg"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid image file or type |
| 403 | Forbidden: Caller is not the assigned driver |
| 404 | Drop not found |

---

## Planned Endpoints

None. All dispatch operations, drop grouping, and driver delivery confirmation workflows are implemented.

---

## Enums

### `DeliveryDropStatus`
| Value | Description |
|---|---|
| `KITCHEN_READY` | Food preparation finished, drop queued for packaging |
| `DISPATCH_READY` | Packed, labeled, and staged for loading |
| `OUT_FOR_DELIVERY` | In transit with assigned driver |
| `DELIVERED` | Delivery completed at destination |

### `FulfillmentStatus`
Order-level fulfillment milestone:
| Value | Description |
|---|---|
| `KITCHEN_PENDING` | Waiting for kitchen production |
| `KITCHEN_READY` | Kitchen prep completed |
| `DISPATCH_READY` | Packed by dispatch |
| `OUT_FOR_DELIVERY` | In transit |
| `DELIVERED` | Delivered to recipient |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `400 Bad Request: Drop is not OUT_FOR_DELIVERY` | Driver attempting to complete a drop that hasn't left dispatch | Ensure dispatch marks the drop out for delivery first. |
| `403 Forbidden: Caller is not the assigned driver` | Driver attempting to view or deliver another driver's drop | Verify assigned driver ID. |
| `400 Bad Request: Unfinished kitchen units` | Attempting to mark drop ready while kitchen units are pending | Complete all kitchen units for attached orders first. |
