# Menu API

> Status: Implemented

## Overview

The Menu module powers the public and internal catering menus. It manages menu categories, dish assignment, visual ordering within categories, secret categories (accessible solely via direct link), and company-level visibility restrictions (hiding specific categories or dishes from corporate clients).

It provides dual consumption models:
1. **Customer Employee Menu**: Unauthenticated endpoints tailored for ordering by employees (filtering out hidden items and secret categories).
2. **Staff Management & Preview**: Authenticated administrative endpoints for configuring categories and previewing the menu exactly as a target employee experiences it.

## Base Path

`/api/menu` (Direct route: `/menu`)

## Authentication

- **Employee Customer Endpoints**: Not required (Customer employees do not have login credentials).
- **Staff Management & Preview Endpoints**: Required (`JwtAuthGuard`).

## Permissions

- **Preview**: `Permission.MENU_PREVIEW` (`ADMIN`)
- **Read Categories**: `Permission.MENU_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Category & Dish Order Mutations**: `Permission.MENU_CREATE`, `Permission.MENU_UPDATE`, `Permission.MENU_DELETE` (`ADMIN` only)
- **Visibility Management**: `Permission.MENU_MANAGE_VISIBILITY` (`ADMIN` only)

---

## Endpoints

### Section A: Customer Employee Menu (Unauthenticated)

# Get Effective Employee Menu

### GET
`/api/menu/employees/:employeeId`

*(Alias route: `/api/menu/employee/:employeeId`)*

### Description
Returns the complete menu for a customer employee. Automatically resolves prices based on the employee's company price tier, filters out dishes hidden from the employee's company, excludes unpriced dishes, and hides secret categories.

### Authentication
Not required.

### Authorization
Public / Unauthenticated.

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `employeeId` | string | Yes | Customer Employee ID |

### Response
- **Status Code**: `200 OK`

```json
{
  "employee": {
    "id": "emp_001",
    "name": "Sarah Connor",
    "companyId": "cmp_123456789",
    "companyName": "Acme Corporation"
  },
  "categories": [
    {
      "id": "cat_lunch",
      "name": "Lunch Mains",
      "displayOrder": 1,
      "dishes": [
        {
          "id": "dish_111",
          "name": "Grilled Chicken Salad",
          "description": "Organic grilled chicken with greens",
          "imageUrl": "https://storage.fernleaf.internal/dishes/dish_111.jpg",
          "temperature": "COLD",
          "price": "6.00",
          "displayOrder": 1,
          "allergens": [],
          "dietaryTags": [{ "id": "tag_gluten_free", "name": "Gluten Free" }]
        }
      ]
    }
  ]
}
```

### Errors
| Status Code | Description |
|---|---|
| 403 | Employee or their company is inactive |
| 404 | Employee not found |

---

# Direct Access to Category for Employee

### GET
`/api/menu/employees/:employeeId/categories/:categoryId`

### Description
Directly retrieves a category for an employee. Used when an employee opens a direct link to a secret or special promotional category.

### Authentication
Not required.

### Authorization
Public / Unauthenticated.

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `employeeId` | string | Yes | Customer Employee ID |
| `categoryId` | string | Yes | Category ID |

### Response
- **Status Code**: `200 OK`
- Returns category with dishes priced for the employee.

### Errors
| Status Code | Description |
|---|---|
| 403 | Employee or company is inactive |
| 404 | Category not found or hidden from the employee's company |

---

### Section B: Staff Preview (Authenticated)

# Admin Preview Employee Menu

### GET
`/api/menu/preview/employees/:employeeId`

### Description
Allows staff administrators to view the menu exactly as a target employee experiences it.

### Authentication
Required.

### Authorization
`Permission.MENU_PREVIEW` (ADMIN only).

### Response
- **Status Code**: `200 OK`
- Same response format as `GET /api/menu/employees/:employeeId`.

---

# Admin Preview Direct Category

### GET
`/api/menu/preview/employees/:employeeId/categories/:categoryId`

### Description
Admin preview of a direct category for a target employee.

### Authentication
Required.

### Authorization
`Permission.MENU_PREVIEW` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

### Section C: Category Management (Authenticated)

# Create Menu Category

### POST
`/api/menu/categories`

### Description
Creates a new menu category. Can be designated as secret (`isSecret: true`), which hides it from standard menu listings while keeping it accessible via direct URL.

### Authentication
Required.

### Authorization
`Permission.MENU_CREATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique category name |
| `displayOrder` | number | Yes | Sort order integer |
| `isSecret` | boolean | No | Secret category flag (default: `false`) |
| `isActive` | boolean | No | Active state (default: `true`) |

```json
{
  "name": "Executive Platters",
  "displayOrder": 2,
  "isSecret": false,
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "cat_exec",
  "name": "Executive Platters",
  "displayOrder": 2,
  "isSecret": false,
  "isActive": true,
  "dishesCount": 0,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

---

# List Categories for Management

### GET
`/api/menu/categories`

### Description
Retrieves a paginated list of categories for administration.

### Authentication
Required.

### Authorization
`Permission.MENU_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number |
| `limit` | number | No | Page limit |
| `search` | string | No | Search by category name |
| `isSecret` | boolean | No | Filter secret status |
| `isActive` | boolean | No | Filter active status |

### Response
- **Status Code**: `200 OK`

---

# Reorder Categories in Bulk

### PATCH
`/api/menu/categories/reorder`

### Description
Updates the visual display order of all categories in a single atomic transaction.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Request Body
```json
{
  "categories": [
    { "categoryId": "cat_lunch", "displayOrder": 1 },
    { "categoryId": "cat_exec", "displayOrder": 2 },
    { "categoryId": "cat_dessert", "displayOrder": 3 }
  ]
}
```

### Response
- **Status Code**: `200 OK`
- Array of updated category items with sequential display orders.

---

# Get Category Details by ID

### GET
`/api/menu/categories/:id`

### Description
Retrieves full configuration details of a category, including all assigned dishes.

### Authentication
Required.

### Authorization
`Permission.MENU_READ`.

### Response
- **Status Code**: `200 OK`

---

# Update Category

### PATCH
`/api/menu/categories/:id`

### Description
Updates category name, display order, or secret status.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Update Category Status

### PATCH
`/api/menu/categories/:id/status`

### Description
Soft-activates or deactivates a category.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Request Body
```json
{
  "isActive": false
}
```

---

### Section D: Category Dish Assignments

# Add Dish to Category

### POST
`/api/menu/categories/:categoryId/dishes`

### Description
Assigns an active dish to a menu category with a specific display order.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Request Body
```json
{
  "dishId": "dish_111",
  "displayOrder": 1
}
```

### Response
- **Status Code**: `201 Created`
- Returns updated category detail with dishes.

---

# Remove Dish from Category

### DELETE
`/api/menu/categories/:categoryId/dishes/:dishId`

### Description
Unassigns a dish from a menu category.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true
}
```

---

# Reorder Category Dishes

### PATCH
`/api/menu/categories/:categoryId/dishes/reorder`

### Description
Reorders dishes within a specific category transactionally.

### Authentication
Required.

### Authorization
`Permission.MENU_UPDATE` (ADMIN only).

### Request Body
```json
{
  "items": [
    { "dishId": "dish_111", "displayOrder": 1 },
    { "dishId": "dish_222", "displayOrder": 2 },
    { "dishId": "dish_333", "displayOrder": 3 }
  ]
}
```

### Response
- **Status Code**: `200 OK`

---

### Section E: Company Menu Visibility (Hide / Unhide)

# Hide Category for Company

### POST
`/api/menu/categories/:categoryId/hidden-companies/:companyId`

### Description
Hides a category from a specific company's employees.

### Authentication
Required.

### Authorization
`Permission.MENU_MANAGE_VISIBILITY` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Unhide Category for Company

### DELETE
`/api/menu/categories/:categoryId/hidden-companies/:companyId`

### Description
Restores category visibility for a company.

### Authentication
Required.

### Authorization
`Permission.MENU_MANAGE_VISIBILITY` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Hide Dish for Company

### POST
`/api/menu/dishes/:dishId/hidden-companies/:companyId`

### Description
Hides a specific dish from a company's employees.

### Authentication
Required.

### Authorization
`Permission.MENU_MANAGE_VISIBILITY` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Unhide Dish for Company

### DELETE
`/api/menu/dishes/:dishId/hidden-companies/:companyId`

### Description
Restores dish visibility for a company.

### Authentication
Required.

### Authorization
`Permission.MENU_MANAGE_VISIBILITY` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

## Planned Endpoints

None. All menu management and visibility endpoints are implemented.

---

## Enums

None defined directly in Menu module; uses catalogue `DishTemperature` on dishes.

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `403 Forbidden: Inactive employee or company` | Calling employee menu for an inactive account | Reactivate the company or employee. |
| `404 Not Found: Category hidden from company` | Attempting to access a category that is explicitly hidden | Unhide the category or verify the link. |
| `409 Conflict: Category with this name already exists` | Category name collision | Choose a distinct category name. |
