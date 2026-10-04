# Settings API

> Status: Implemented

## Overview

The Settings module manages platform-wide operational configurations for kitchen operations and order cut-off calculations.

### Separation of Calendars
- **Kitchen Calendar (Platform-Wide)**: Governs which days the kitchen produces food and which calendar dates are closed holidays. This directly controls backwards cut-off calculations for all incoming orders.
- **Company Calendar**: Governs customer delivery eligibility. It never affects cut-off calculation deadlines.

Settings are stored in the database (`KitchenSetting` and `KitchenHoliday`) and can be modified at runtime without server restarts or code changes.

## Base Path

`/api/settings` (Direct route: `/settings`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Read Operations**: `Permission.SETTINGS_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Settings & Holiday Mutations**: `Permission.SETTINGS_UPDATE` (`ADMIN` only)

---

## Endpoints

### Section A: Kitchen Settings (`/api/settings/kitchen`)

# Get Kitchen Configuration

### GET
`/api/settings/kitchen`

### Description
Retrieves current platform-wide kitchen operational parameters, including working days, cut-off time, cut-off working days, platform timezone, and registered kitchen holidays.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
None.

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "workingDays": [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY"
  ],
  "cutOffTime": "16:00",
  "cutOffWorkingDays": 2,
  "timezone": "Europe/London",
  "holidays": [
    {
      "id": "k_hol_01",
      "date": "2026-12-25",
      "name": "Christmas Day Closure",
      "description": "Kitchen closed for public holiday",
      "createdAt": "2026-10-04T08:00:00.000Z",
      "updatedAt": "2026-10-04T08:00:00.000Z"
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |

---

# Update Kitchen Configuration

### PATCH
`/api/settings/kitchen`

### Description
Updates kitchen operational parameters in a single atomic transaction. Changes take effect immediately for all subsequent cut-off and production planning calculations.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_UPDATE` (ADMIN only).

### Request Body
All fields are optional:

| Field | Type | Required | Description |
|---|---|---|---|
| `workingDays` | `DayOfWeek[]` | No | Operational weekdays for the kitchen (minimum 1 day) |
| `cutOffTime` | string | No | Cut-off time in `HH:mm` 24-hour format (e.g. `"16:00"`) |
| `cutOffWorkingDays` | number | No | Number of working days prior to delivery (integer >= 0) |
| `timezone` | string | No | Valid IANA timezone string (e.g. `"Europe/London"`) |

```json
{
  "workingDays": [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY"
  ],
  "cutOffTime": "17:00",
  "cutOffWorkingDays": 2,
  "timezone": "Europe/London"
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `KitchenSettingsResponseDto`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (invalid time format, invalid timezone, or empty working days) |
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN only) |

---

### Section B: Kitchen Holidays (`/api/settings/kitchen/holidays`)

# List Kitchen Holidays

### GET
`/api/settings/kitchen/holidays`

### Description
Retrieves all registered platform-wide kitchen closure dates, ordered chronologically.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Response
- **Status Code**: `200 OK`

```json
[
  {
    "id": "k_hol_01",
    "date": "2026-12-25",
    "name": "Christmas Day Closure",
    "description": "Kitchen closed for public holiday",
    "createdAt": "2026-10-04T08:00:00.000Z",
    "updatedAt": "2026-10-04T08:00:00.000Z"
  }
]
```

---

# Get Kitchen Holiday by ID

### GET
`/api/settings/kitchen/holidays/:id`

### Description
Retrieves details of a specific kitchen holiday.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_READ`.

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Kitchen holiday ID |

### Response
- **Status Code**: `200 OK`

---

# Create Kitchen Holiday

### POST
`/api/settings/kitchen/holidays`

### Description
Registers a new date on which the kitchen is closed. Dates must be unique across the platform. Cut-off backwards calculations skip this date.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_UPDATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | Closure date in `YYYY-MM-DD` format |
| `name` | string | Yes | Descriptive title (e.g. `"New Year's Day"`) |
| `description` | string | No | Optional notes |

```json
{
  "date": "2027-01-01",
  "name": "New Year's Day",
  "description": "Annual kitchen closure"
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "k_hol_02",
  "date": "2027-01-01",
  "name": "New Year's Day",
  "description": "Annual kitchen closure",
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid date format |
| 401 | Unauthorized |
| 403 | Forbidden |
| 409 | Conflict: A kitchen holiday already exists for this date |

---

# Update Kitchen Holiday

### PATCH
`/api/settings/kitchen/holidays/:id`

### Description
Updates the date, name, or description of an existing kitchen holiday.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_UPDATE` (ADMIN only).

### Request Body
Optional fields from `UpdateKitchenHolidayDto`:
```json
{
  "name": "New Year's Day (Observed)"
}
```

### Response
- **Status Code**: `200 OK`

### Errors
| Status Code | Description |
|---|---|
| 404 | Kitchen holiday not found |
| 409 | Conflict: Updated date collides with an existing holiday |

---

# Delete Kitchen Holiday

### DELETE
`/api/settings/kitchen/holidays/:id`

### Description
Deletes a kitchen holiday. Future cut-off calculations will consider this date a valid working day if it falls on a configured working weekday.

### Authentication
Required.

### Authorization
`Permission.SETTINGS_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Kitchen holiday deleted successfully"
}
```

---

## Planned Endpoints

None. All operational settings endpoints are implemented.

---

## Enums

### `DayOfWeek`
| Value | Description |
|---|---|
| `MONDAY` | Monday |
| `TUESDAY` | Tuesday |
| `WEDNESDAY` | Wednesday |
| `THURSDAY` | Thursday |
| `FRIDAY` | Friday |
| `SATURDAY` | Saturday |
| `SUNDAY` | Sunday |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `400 Bad Request: workingDays must contain at least 1 day` | Passing an empty array for kitchen working days | Specify at least one weekday. |
| `409 Conflict: Kitchen holiday for date already exists` | Attempting to register two holidays on the same calendar date | Dates must be unique across the platform. |
| `400 Bad Request: cutOffTime must be in HH:mm 24-hour format` | Malformed time string | Pass time formatted as `HH:mm` (e.g. `16:00`). |
