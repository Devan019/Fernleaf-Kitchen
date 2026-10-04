# Companies API

> Status: Implemented

## Overview

The Companies module provides complete management of customer companies. Companies represent the billing entities and delivery targets for catering orders. This module manages company configuration, corporate email domains, delivery addresses, company delivery calendars (working days and holidays), delivery defaults, price tier bindings, category/dish visibility rules, delivery availability validation, and bulk CSV employee imports.

## Base Path

`/api/companies` (Direct route: `/companies`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Read Operations**: `Permission.COMPANY_READ` (Roles: `ADMIN`, `KITCHEN`, `DISPATCH`)
- **Write / Management Operations**: `Permission.COMPANY_CREATE`, `Permission.COMPANY_UPDATE`, `Permission.COMPANY_DELETE` (Role: `ADMIN`)
- **Bulk Employee Import**: `Permission.EMPLOYEE_CREATE` (Role: `ADMIN`)

---

## Endpoints

# Create Company

### POST
`/api/companies`

### Description
Creates a new customer company with optional initial domains, working days, delivery defaults, and price tier assignment.

### Authentication
Required.

### Authorization
`Permission.COMPANY_CREATE` (ADMIN only).

### Path Parameters
None.

### Query Parameters
None.

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique corporate name (max 150 chars) |
| `domains` | string[] | No | Initial corporate email domains (e.g. `["acme.com"]`) |
| `billingContactName` | string | No | Name of billing contact |
| `billingContactEmail` | string | No | Email address for invoices |
| `billingContactPhone` | string | No | Phone number of billing contact |
| `workingDays` | `DayOfWeek[]` | No | Operational delivery days (defaults to Mon-Fri) |
| `defaultDeliveryTime` | string | No | Default delivery time in `HH:mm` format (e.g. `"12:30"`) |
| `leaveKitchenMinutes` | number | No | Minutes prior to delivery food must leave kitchen (default: `60`) |
| `defaultPackagingType` | string | No | Preferred packaging type (e.g. `"ECO_BOX"`) |
| `standingDriverInstructions`| string | No | Permanent delivery instructions for drivers |
| `defaultDriverId` | string | No | User ID of preferred driver (must have `DRIVER` role) |
| `priceTierId` | string | No | Initial price tier ID |
| `isActive` | boolean | No | Active status (default: `true`) |

```json
{
  "name": "Acme Corporation",
  "domains": ["acme.com"],
  "billingContactName": "Alice Smith",
  "billingContactEmail": "billing@acme.com",
  "billingContactPhone": "+44 20 7946 0958",
  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  "defaultDeliveryTime": "12:00",
  "leaveKitchenMinutes": 45,
  "defaultPackagingType": "ECO_BOX",
  "standingDriverInstructions": "Buzz unit 4B at reception.",
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "cmp_123456789",
  "name": "Acme Corporation",
  "isActive": true,
  "billingContact": {
    "name": "Alice Smith",
    "email": "billing@acme.com",
    "phone": "+44 20 7946 0958"
  },
  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  "deliveryDefaults": {
    "defaultDeliveryTime": "12:00",
    "leaveKitchenMinutes": 45,
    "defaultPackagingType": "ECO_BOX",
    "standingDriverInstructions": "Buzz unit 4B at reception.",
    "defaultDriverId": null,
    "defaultDriver": null
  },
  "priceTierId": null,
  "priceTier": null,
  "ownerId": null,
  "owner": null,
  "employeeCount": 0,
  "emailDomains": [
    {
      "id": "dom_111",
      "domain": "acme.com",
      "companyId": "cmp_123456789",
      "createdAt": "2026-10-04T08:00:00.000Z"
    }
  ],
  "deliveryAddresses": [],
  "holidays": [],
  "hiddenCategoryIds": [],
  "hiddenDishIds": [],
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
| 409 | Company name or domain already claimed by another company |

---

# List Companies

### GET
`/api/companies`

### Description
Lists customer companies with pagination, search, price tier filter, and active status filters.

### Authentication
Required.

### Authorization
`Permission.COMPANY_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
None.

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page (max 100) |
| `search` | string | No | - | Filter by company name or domain |
| `isActive` | boolean | No | - | Filter by active state |
| `priceTierId` | string | No | - | Filter by assigned price tier ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "data": [
    {
      "id": "cmp_123456789",
      "name": "Acme Corporation",
      "isActive": true,
      "priceTierId": null,
      "priceTier": null,
      "ownerId": null,
      "owner": null,
      "employeeCount": 14,
      "emailDomains": ["acme.com"],
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

# Get Company Details by ID

### GET
`/api/companies/:id`

### Description
Retrieves full configuration details for a company, including delivery addresses, verified email domains, calendar holidays, delivery defaults, and hidden menu items.

### Authentication
Required.

### Authorization
`Permission.COMPANY_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Company ID |

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- Returns full `CompanyDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Company not found |

---

# Update Company

### PATCH
`/api/companies/:id`

### Description
Updates company name, active state, delivery defaults, or notes.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Company ID |

### Request Body
Optional fields matching `UpdateCompanyDto`:
```json
{
  "name": "Acme Global Corp",
  "defaultDeliveryTime": "12:15"
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Company not found |
| 409 | Company name collision |

---

# Deactivate Company

### DELETE
`/api/companies/:id`

### Description
Soft-deactivates a company by setting `isActive: false`.

### Authentication
Required.

### Authorization
`Permission.COMPANY_DELETE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Company ID |

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- Returns deactivated `CompanyDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Company not found |

---

# Add Email Domain

### POST
`/api/companies/:companyId/domains`

### Description
Registers an email domain for the company. Employees registering or checking out with this domain are automatically associated with this company. Reject public webmail domains (e.g. `gmail.com`, `yahoo.com`).

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `companyId` | string | Yes | Company ID |

### Request Body
```json
{
  "domain": "acme-corp.com"
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "dom_222",
  "domain": "acme-corp.com",
  "companyId": "cmp_123456789",
  "createdAt": "2026-10-04T09:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid domain or public email provider |
| 404 | Company not found |
| 409 | Domain already claimed by another company |

---

# Remove Email Domain

### DELETE
`/api/companies/:companyId/domains/:domainId`

### Description
Removes an email domain from the company. Active companies must maintain at least one verified email domain.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `companyId` | string | Yes | Company ID |
| `domainId` | string | Yes | Domain ID |

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Domain removed successfully"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Cannot delete the last remaining domain of an active company |
| 404 | Domain or company not found |

---

# List Delivery Addresses

### GET
`/api/companies/:companyId/addresses`

### Description
Lists all delivery addresses associated with a company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Response
- **Status Code**: `200 OK`

```json
[
  {
    "id": "addr_123",
    "companyId": "cmp_123456789",
    "label": "HQ Floor 4",
    "street": "100 Innovation Way",
    "unit": "Floor 4",
    "city": "London",
    "postcode": "EC1A 1BB",
    "deliveryInstructions": "Enter via side service elevator",
    "isDefault": true,
    "createdAt": "2026-10-04T08:00:00.000Z",
    "updatedAt": "2026-10-04T08:00:00.000Z"
  }
]
```

---

# Add Delivery Address

### POST
`/api/companies/:companyId/addresses`

### Description
Adds a new delivery address to a company. If marked `isDefault: true`, existing default addresses are automatically demoted.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "label": "Engineering Annex",
  "street": "102 Innovation Way",
  "unit": "Suite 200",
  "city": "London",
  "postcode": "EC1A 1BC",
  "deliveryInstructions": "Ring bell 2",
  "isDefault": false
}
```

### Response
- **Status Code**: `201 Created`
- Returns created `DeliveryAddressResponse`.

---

# Update Delivery Address

### PATCH
`/api/companies/:companyId/addresses/:addressId`

### Description
Updates an existing delivery address.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
Optional fields from `UpdateDeliveryAddressDto`.

### Response
- **Status Code**: `200 OK`

---

# Delete Delivery Address

### DELETE
`/api/companies/:companyId/addresses/:addressId`

### Description
Deletes a delivery address. Active companies must maintain at least one delivery address.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

---

# Update Billing Contact

### PATCH
`/api/companies/:companyId/billing-contact`

### Description
Updates the billing contact details (name, email, phone) for the company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "billingContactName": "Finance Department",
  "billingContactEmail": "accounts@acme.com",
  "billingContactPhone": "+44 20 7000 0000"
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

---

# Set Company Owner

### PATCH
`/api/companies/:companyId/owner`

### Description
Sets or replaces the company owner. The owner must be an active employee of the targeted company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "ownerId": "emp_999999"
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Owner must be an employee of the same company |
| 404 | Employee or Company not found |

---

# Update Company Calendar

### PATCH
`/api/companies/:companyId/calendar`

### Description
Configures the company's delivery working days. At least one day must be active.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "workingDays": ["MONDAY", "WEDNESDAY", "FRIDAY"]
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

---

# List Company Holidays

### GET
`/api/companies/:companyId/holidays`

### Description
Lists registered delivery holidays for the company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Response
- **Status Code**: `200 OK`

```json
[
  {
    "id": "hol_111",
    "companyId": "cmp_123456789",
    "date": "2026-12-25",
    "name": "Christmas Day Closure",
    "description": "Office closed for Christmas",
    "createdAt": "2026-10-04T08:00:00.000Z",
    "updatedAt": "2026-10-04T08:00:00.000Z"
  }
]
```

---

# Add Company Holiday

### POST
`/api/companies/:companyId/holidays`

### Description
Adds a holiday date on which the company does not accept food deliveries.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "date": "2026-12-25",
  "name": "Christmas Day Closure",
  "description": "Office closed"
}
```

### Response
- **Status Code**: `201 Created`

### Errors
| Status Code | Description |
|---|---|
| 409 | Holiday on this date already exists for this company |

---

# Update Company Holiday

### PATCH
`/api/companies/:companyId/holidays/:holidayId`

### Description
Updates the date, name, or description of an existing company holiday.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "name": "Christmas Day Public Holiday"
}
```

### Response
- **Status Code**: `200 OK`

---

# Delete Company Holiday

### DELETE
`/api/companies/:companyId/holidays/:holidayId`

### Description
Deletes a company holiday.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Holiday deleted successfully"
}
```

---

# Update Delivery Defaults

### PATCH
`/api/companies/:companyId/delivery-defaults`

### Description
Updates company delivery time, leave kitchen lead time, packaging type, default driver, or driver instructions.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "defaultDeliveryTime": "12:45",
  "leaveKitchenMinutes": 50,
  "defaultPackagingType": "PREMIUM_TRAY",
  "standingDriverInstructions": "Call front desk upon arrival."
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

---

# Assign Price Tier

### PATCH
`/api/companies/:companyId/price-tier`

### Description
Assigns or clears the custom price tier for the company. Pass `null` or omit `priceTierId` to revert to the platform default price tier.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Request Body
```json
{
  "priceTierId": "tier_corporate_gold"
}
```

### Response
- **Status Code**: `200 OK`
- Returns updated `CompanyDetailResponse`.

### Errors
| Status Code | Description |
|---|---|
| 400 | Inactive price tier cannot be assigned |
| 404 | Price tier not found |

---

# Hide Menu Category for Company

### POST
`/api/companies/:companyId/hidden-categories/:categoryId`

### Description
Hides a specific menu category from all employees belonging to this company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Category hidden successfully"
}
```

---

# Unhide Menu Category for Company

### DELETE
`/api/companies/:companyId/hidden-categories/:categoryId`

### Description
Restores visibility of a menu category for this company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Category unhidden successfully"
}
```

---

# Hide Dish for Company

### POST
`/api/companies/:companyId/hidden-dishes/:dishId`

### Description
Hides a specific dish from all employees belonging to this company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Dish hidden successfully"
}
```

---

# Unhide Dish for Company

### DELETE
`/api/companies/:companyId/hidden-dishes/:dishId`

### Description
Restores visibility of a dish for this company.

### Authentication
Required.

### Authorization
`Permission.COMPANY_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Dish unhidden successfully"
}
```

---

# Check Delivery Availability

### GET
`/api/companies/:companyId/delivery-availability`

### Description
Evaluates whether delivery is available for this company on a specific date based on company working days and registered company holidays.

### Authentication
Required.

### Authorization
`Permission.COMPANY_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | Target date in `YYYY-MM-DD` format (e.g. `"2026-10-05"`) |

### Response
- **Status Code**: `200 OK`

```json
{
  "allowed": false,
  "reason": "Target date 2026-10-05 is not an active delivery working day for Acme Corporation"
}
```

---

# Bulk CSV Employee Import

### POST
`/api/companies/:companyId/employees/import`

### Description
Bulk imports employee profiles from CSV text content. Each row is validated independently; bad rows are isolated and returned with line-specific errors while valid rows are imported.

### Authentication
Required.

### Authorization
`Permission.EMPLOYEE_CREATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `csvContent` | string | Yes | Raw CSV text content with headers `name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging` |

```json
{
  "csvContent": "name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging\nJohn Doe,john@acme.com,true,false,true\nJane Smith,jane@acme.com,false,false,false"
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "totalRows": 2,
  "imported": 2,
  "failed": 0,
  "errors": []
}
```

---

## Planned Endpoints

None. All company management endpoints are implemented.

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
| `400 Bad Request: Cannot delete the last domain of active company` | Attempting to delete the only domain on an active company | Register a new domain first or deactivate the company. |
| `409 Conflict: Domain is already claimed by another company` | Email domain collision across companies | Check company domain ownership. |
| `404 Not Found: Company with ID {id} not found` | Invalid company ID | Verify the company ID. |
