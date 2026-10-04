# Auth API

> Status: Implemented

## Overview

The Auth module handles staff authentication, active session verification, and logout. Passwords are encrypted with Argon2id. Successful logins issue JSON Web Tokens (JWT) stored in HTTP-only cookies (`token`) and also supported via `Authorization: Bearer <token>` headers. The minimal token payload contains only `sub` (User ID) and `role` (Staff role), preventing credential leakage.

## Base Path

`/api/auth` (Direct route: `/auth`)

## Authentication

- `POST /api/auth/login`: Not required
- `GET /api/auth/me`: Required (`JwtAuthGuard`)
- `POST /api/auth/logout`: Not required (Idempotent cookie clearance)

## Permissions

No operational permissions required. Any authenticated staff member with a valid role (`ADMIN`, `KITCHEN`, `DISPATCH`, `DRIVER`) whose account has `isActive: true` can access profile details.

---

## Endpoints

# Staff Login

### POST
`/api/auth/login`

### Description
Authenticates an active staff member using email and password. Upon successful validation, issues a signed JWT, sets an HTTP-only session cookie named `token`, and returns the authenticated user object.

### Authentication
Not required.

### Authorization
Public / Unauthenticated.

### Path Parameters
None.

### Query Parameters
None.

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Valid email address of the staff member |
| `password` | string | Yes | Account password |

```json
{
  "email": "admin@test.com",
  "password": "Password123!"
}
```

### Response
- **Status Code**: `200 OK`
- **Headers**: `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax`

```json
{
  "user": {
    "id": "cmurx19sp0000gkfr3mfbzjr8",
    "email": "admin@test.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed (invalid email format or empty fields) |
| 401 | Invalid email or password (or staff account inactive) |

---

# Get Current User Profile

### GET
`/api/auth/me`

### Description
Retrieves the profile of the currently authenticated staff member extracted from the HTTP-only cookie or Bearer token.

### Authentication
Required (`JwtAuthGuard`).

### Authorization
Any authenticated staff role:
- `ADMIN`
- `KITCHEN`
- `DISPATCH`
- `DRIVER`

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
  "id": "cmurx19sp0000gkfr3mfbzjr8",
  "email": "admin@test.com",
  "name": "Admin User",
  "role": "ADMIN"
}
```

### Errors
| Status Code | Description |
|---|---|
| 401 | Unauthorized (missing, expired, or invalid JWT token, or account deactivated) |

---

# Staff Logout

### POST
`/api/auth/logout`

### Description
Logs out the current staff member by clearing the HTTP-only `token` cookie. This operation is idempotent and succeeds even if no session was previously active.

### Authentication
Not required.

### Authorization
Public / Any user.

### Path Parameters
None.

### Query Parameters
None.

### Request Body
None.

### Response
- **Status Code**: `200 OK`
- **Headers**: `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

```json
{
  "message": "Logged out successfully"
}
```

### Errors
None.

---

## Planned Endpoints

None. All core authentication endpoints are implemented.

---

## Enums

### `UserRole`
Staff authorization roles defined in the system:

| Value | Description |
|---|---|
| `ADMIN` | Platform administrator with complete system access |
| `KITCHEN` | Kitchen operations staff managing prep boards and stations |
| `DISPATCH` | Dispatch operations staff managing drops, packing, and driver assignment |
| `DRIVER` | Delivery driver fulfilling assigned delivery drops |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `401 Unauthorized: Invalid email or password` | Incorrect credentials or inactive user | Verify login email and password. Ensure the user's account has not been deactivated. |
| `401 Unauthorized: Unauthorized` | Missing or expired token on protected route | Send the request with the `token` cookie or `Authorization: Bearer <token>` header. Refresh login if expired. |
| `400 Bad Request: Must be a valid email address` | Email failed class-validator validation | Pass a well-formed email string. |
