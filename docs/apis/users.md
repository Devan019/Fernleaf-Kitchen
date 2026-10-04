# Users API

> Status: Implemented

## Overview

The Users module manages internal staff user accounts. It provides full administrative capabilities for creating, listing with pagination, inspecting, updating, and soft-deactivating staff accounts. All operations are strictly restricted to users with the `ADMIN` role. Password hashes (`passwordHash`) are never exposed in any API response.

## Base Path

`/api/users` (Direct route: `/users`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

ADMIN only (`@Roles(UserRole.ADMIN)`).

---

## Endpoints

# Create Staff User

### POST
`/api/users`

### Description
Creates a new staff member account. Hashes the password securely with Argon2id before storing it. Validates that the email is unique across all users.

### Authentication
Required.

### Authorization
ADMIN only (`UserRole.ADMIN`).

### Path Parameters
None.

### Query Parameters
None.

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Full name of the staff member |
| `email` | string | Yes | Unique corporate email address (automatically normalized to lowercase) |
| `password` | string | Yes | Initial account password (minimum 8 characters) |
| `role` | `UserRole` | Yes | Staff operational role (`ADMIN`, `KITCHEN`, `DISPATCH`, `DRIVER`) |

```json
{
  "name": "Jane Cook",
  "email": "jane.cook@fernleaf.com",
  "password": "SecurePassword123!",
  "role": "KITCHEN"
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "cm1234567890abcdef",
  "name": "Jane Cook",
  "email": "jane.cook@fernleaf.com",
  "role": "KITCHEN",
  "isActive": true,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (missing required fields, password < 8 chars, invalid role) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (caller does not have ADMIN role) |
| 409 | Conflict (a staff user with this email address already exists) |

---

# List Staff Users

### GET
`/api/users`

### Description
Retrieves a paginated list of staff members, ordered by creation date descending. Sensitive fields such as password hashes are excluded.

### Authentication
Required.

### Authorization
ADMIN only (`UserRole.ADMIN`).

### Path Parameters
None.

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number (minimum 1) |
| `limit` | number | No | `20` | Results per page (minimum 1, maximum 100) |

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "data": [
    {
      "id": "cm1234567890abcdef",
      "name": "Jane Cook",
      "email": "jane.cook@fernleaf.com",
      "role": "KITCHEN",
      "isActive": true,
      "createdAt": "2026-10-04T08:00:00.000Z",
      "updatedAt": "2026-10-04T08:00:00.000Z"
    },
    {
      "id": "cmurx19sp0000gkfr3mfbzjr8",
      "name": "Admin User",
      "email": "admin@fernleaf.com",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2026-10-01T08:00:00.000Z",
      "updatedAt": "2026-10-01T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Invalid pagination parameters |
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN only) |

---

# Get Staff User by ID

### GET
`/api/users/:id`

### Description
Retrieves complete details for a specific staff user by unique identifier.

### Authentication
Required.

### Authorization
ADMIN only (`UserRole.ADMIN`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique ID of the staff user (CUID) |

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "cm1234567890abcdef",
  "name": "Jane Cook",
  "email": "jane.cook@fernleaf.com",
  "role": "KITCHEN",
  "isActive": true,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN only) |
| 404 | User not found |

---

# Update Staff User

### PATCH
`/api/users/:id`

### Description
Updates profile information, password, assigned role, or active status for a staff user. If a new password is provided, it is re-hashed using Argon2id.

### Authentication
Required.

### Authorization
ADMIN only (`UserRole.ADMIN`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique ID of the staff user |

### Query Parameters
None.

### Request Body
All fields are optional:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | No | Updated full name |
| `email` | string | No | Updated email address |
| `password` | string | No | New password (minimum 8 characters) |
| `role` | `UserRole` | No | New operational role |
| `isActive` | boolean | No | Active state flag |

```json
{
  "name": "Jane Senior Cook",
  "role": "KITCHEN",
  "isActive": true
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "cm1234567890abcdef",
  "name": "Jane Senior Cook",
  "email": "jane.cook@fernleaf.com",
  "role": "KITCHEN",
  "isActive": true,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T09:30:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (e.g., password < 8 chars, invalid role) |
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN only) |
| 404 | User not found |
| 409 | Conflict (updated email already in use by another user) |

---

# Deactivate Staff User

### DELETE
`/api/users/:id`

### Description
Soft-deactivates a staff member by setting `isActive: false`. Preserves user records to maintain historical auditability across orders, kitchen units, and delivery drops.

### Authentication
Required.

### Authorization
ADMIN only (`UserRole.ADMIN`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique ID of the staff user |

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "cm1234567890abcdef",
  "name": "Jane Senior Cook",
  "email": "jane.cook@fernleaf.com",
  "role": "KITCHEN",
  "isActive": false,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T10:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden (ADMIN only) |
| 404 | User not found |

---

## Planned Endpoints

None. All staff user management endpoints are fully implemented.

---

## Enums

### `UserRole`
| Value | Description |
|---|---|
| `ADMIN` | Full access to platform management and configuration |
| `KITCHEN` | Kitchen prep station operators |
| `DISPATCH` | Dispatch coordinators managing packaging and delivery drops |
| `DRIVER` | Delivery drivers |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `403 Forbidden: Access denied: Required role(s) [ADMIN]` | User has KITCHEN, DISPATCH, or DRIVER role | Access `/api/users` endpoints using an account with the ADMIN role. |
| `409 Conflict: User with this email already exists` | Attempting to create or update a user with an existing email | Use a unique email address. |
| `404 Not Found: User with ID {id} not found` | Targeted user ID does not exist | Verify the user ID CUID. |
