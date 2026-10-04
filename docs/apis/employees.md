# Employees API

> Status: Implemented

## Overview

The Employees module manages customer employees who place catering orders. Note that customer employees do not possess backend login credentials; their identities are resolved via email and corporate domain. This module allows administrative staff to manage employee records, configure order permission flags (e.g. custom delivery address selection, delivery time overrides, custom packaging), record allergen warnings, and manage dietary tag preferences.

## Base Path

`/api/employees` (Direct route: `/employees`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Read Operations**: `Permission.EMPLOYEE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Management Operations**: `Permission.EMPLOYEE_CREATE`, `Permission.EMPLOYEE_UPDATE`, `Permission.EMPLOYEE_DELETE` (`ADMIN` only)

---

## Endpoints

# Create Customer Employee

### POST
`/api/employees`

### Description
Creates a new customer employee profile linked to an existing company. Validates that the email address is unique across employees and that referenced allergens/tags exist.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_CREATE` (ADMIN only).

### Path Parameters
None.

### Query Parameters
None.

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Full name of the employee |
| `email` | string | No | Corporate email address |
| `companyId` | string | Yes | ID of the company this employee belongs to |
| `canChooseDeliveryAddress` | boolean | No | Flag allowing employee to override delivery address (default: `false`) |
| `canChangeDeliveryTime` | boolean | No | Flag allowing employee to customize delivery time (default: `false`) |
| `canChangePackaging` | boolean | No | Flag allowing employee to select packaging type (default: `false`) |
| `allergenIds` | string[] | No | Array of Allergen IDs to attach to the employee |
| `dietaryTagIds` | string[] | No | Array of DietaryTag IDs to attach to the employee |
| `isActive` | boolean | No | Active status (default: `true`) |

```json
{
  "name": "Sarah Connor",
  "email": "sarah.connor@acme.com",
  "companyId": "cmp_123456789",
  "canChooseDeliveryAddress": true,
  "canChangeDeliveryTime": false,
  "canChangePackaging": true,
  "allergenIds": ["all_gluten", "all_peanuts"],
  "dietaryTagIds": ["tag_vegetarian"],
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "emp_001",
  "name": "Sarah Connor",
  "email": "sarah.connor@acme.com",
  "companyId": "cmp_123456789",
  "company": {
    "id": "cmp_123456789",
    "name": "Acme Corporation",
    "isActive": true
  },
  "canChooseDeliveryAddress": true,
  "canChangeDeliveryTime": false,
  "canChangePackaging": true,
  "allergens": [
    { "id": "all_gluten", "name": "Gluten" },
    { "id": "all_peanuts", "name": "Peanuts" }
  ],
  "dietaryTags": [
    { "id": "tag_vegetarian", "name": "Vegetarian" }
  ],
  "isOwnerOfCompany": false,
  "isActive": true,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Referenced Company, Allergen, or DietaryTag not found |
| 409 | Employee email already exists |

---

# List Customer Employees

### GET
`/api/employees`

### Description
Lists customer employees with pagination, search, company filtering, and active status filters.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
None.

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page (max 100) |
| `search` | string | No | - | Filter by employee name or email |
| `companyId` | string | No | - | Filter by company ID |
| `isActive` | boolean | No | - | Filter by active state |

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "data": [
    {
      "id": "emp_001",
      "name": "Sarah Connor",
      "email": "sarah.connor@acme.com",
      "companyId": "cmp_123456789",
      "company": {
        "id": "cmp_123456789",
        "name": "Acme Corporation",
        "isActive": true
      },
      "canChooseDeliveryAddress": true,
      "canChangeDeliveryTime": false,
      "canChangePackaging": true,
      "allergens": [
        { "id": "all_gluten", "name": "Gluten" }
      ],
      "dietaryTags": [
        { "id": "tag_vegetarian", "name": "Vegetarian" }
      ],
      "isOwnerOfCompany": false,
      "isActive": true,
      "createdAt": "2026-10-04T08:00:00.000Z",
      "updatedAt": "2026-10-04T08:00:00.000Z"
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
| 403 | Forbidden |

---

# Get Employee Details by ID

### GET
`/api/employees/:id`

### Description
Retrieves full details of a specific employee, including company association, allergen warnings, dietary tags, and business flags.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Employee ID |

### Response
- **Status Code**: `200 OK`
- Returns `EmployeeSummaryResponse`.

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Employee not found |

---

# Update Employee

### PATCH
`/api/employees/:id`

### Description
Updates employee name, email, company association (relocating employee), or active status.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_UPDATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Employee ID |

### Request Body
```json
{
  "name": "Sarah Connor-Reese",
  "canChangeDeliveryTime": true
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `EmployeeSummaryResponse`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Employee or destination Company not found |
| 409 | Email already exists |

---

# Deactivate Employee

### DELETE
`/api/employees/:id`

### Description
Soft-deactivates an employee account (`isActive: false`).

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_DELETE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Employee ID |

### Response
- **Status Code**: `200 OK`
- Returns deactivated `EmployeeSummaryResponse`.

---

# Update Business Permission Flags

### PATCH
`/api/employees/:id/permissions`

### Description
Configures business permission flags granting the employee self-service ordering flexibility.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_UPDATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Employee ID |

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `canChooseDeliveryAddress` | boolean | No | Ability to choose delivery address for order |
| `canChangeDeliveryTime` | boolean | No | Ability to adjust order delivery time |
| `canChangePackaging` | boolean | No | Ability to customize meal packaging |

```json
{
  "canChooseDeliveryAddress": true,
  "canChangeDeliveryTime": true,
  "canChangePackaging": false
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `EmployeeSummaryResponse`.

---

# Update Preferences (Allergens & Dietary Tags)

### PATCH
`/api/employees/:id/preferences`

### Description
Updates an employee's allergen warnings and dietary tag preferences simultaneously.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_UPDATE` (ADMIN only).

### Request Body
```json
{
  "allergenIds": ["all_gluten"],
  "dietaryTagIds": ["tag_vegan", "tag_halal"]
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `EmployeeSummaryResponse`.

---

# Replace Employee Allergens

### PUT
`/api/employees/:id/allergies`

### Description
Replaces all allergen warnings linked to the employee with the provided set.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_UPDATE` (ADMIN only).

### Request Body
```json
{
  "allergenIds": ["all_dairy", "all_nuts"]
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `EmployeeSummaryResponse`.

---

# Replace Employee Dietary Preferences

### PUT
`/api/employees/:id/dietary-preferences`

### Description
Replaces all dietary tag preferences linked to the employee with the provided set.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_UPDATE` (ADMIN only).

### Request Body
```json
{
  "dietaryTagIds": ["tag_gluten_free"]
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `EmployeeSummaryResponse`.

---

## Planned Endpoints

None. All employee endpoints are implemented.

---

## Enums

None defined directly in Employee module; references catalogue `Allergen` and `DietaryTag` entities.

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `404 Not Found: Employee with ID {id} not found` | Targeted employee does not exist | Verify the employee ID. |
| `404 Not Found: Company with ID {id} not found` | Moving employee to a nonexistent company | Ensure destination company ID exists. |
| `409 Conflict: Employee with this email already exists` | Email address collision | Use a unique corporate email. |
