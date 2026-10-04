# Fernleaf Kitchen API Documentation

Welcome to the central API reference for the **Fernleaf Kitchen Operations Admin Panel** backend. This documentation defines the exact HTTP contracts, authentication mechanisms, authorization rules, request/response formats, and error codes for all backend modules.

It serves as the definitive source of truth for frontend engineers building the Next.js client and backend engineers maintaining the NestJS service.

---

## Base URL & Environment

The backend server exposes RESTful endpoints.

- **Local Development Base URL**: `http://localhost:8000`
- **Frontend Client Origin**: `http://localhost:3000` (configured in CORS)
- **Interactive Swagger / OpenAPI UI**: `http://localhost:8000/api`
- **Global API Route Convention**: Endpoints are mounted directly at their respective module paths (e.g., `/auth`, `/users`, `/companies`, `/menu`, `/order`, etc.). When proxied or accessed via standard API gateways, routes are prefixed with `/api` (e.g. `/api/auth/login`).

> [!NOTE]
> In this documentation, endpoint routes are presented with their canonical `/api/...` prefix for gateway and frontend client standard routing, with direct route mapping indicated under each module's **Base Path**.

---

## Authentication & Session Management

The backend supports dual authentication mechanisms:

1. **HTTP-Only Cookies (`token`)**:
   - Sent automatically by browsers when `credentials: 'include'` is configured in `fetch` / Axios.
   - Configured with `httpOnly: true`, `sameSite: 'lax'` (or `'none'` in production HTTPS), and `path: '/'`.
   - Protects against Cross-Site Scripting (XSS) credential theft.

2. **Bearer Token Header (`Authorization: Bearer <token>`)**:
   - Used by native HTTP clients, automated scripts, and the Swagger UI.
   - Format: `Authorization: Bearer <jwt-token>`

### Minimal JWT Payload
The issued JWT payload contains strictly operational identity attributes:
```json
{
  "sub": "user_cuid_123456",
  "role": "ADMIN",
  "iat": 1728000000,
  "exp": 1728086400
}
```
Passwords and sensitive personal details are never stored inside tokens. On every authenticated request, `JwtStrategy` validates the token and queries the database to confirm that the staff user exists and `isActive === true`.

---

## Role-Based Access Control (RBAC) & Permissions

User accounts are assigned one of four strict operational roles:

| Role | Operational Scope | Catalogue | Orders | Kitchen | Dispatch | Driver | Billing | Settings |
|---|---|---|---|---|---|---|---|---|
| `ADMIN` | Full platform administration | Read / Write | Read / Write / Override | Read / Write / Force Complete | Read / Write | Read / Write | Read / Write | Read / Write |
| `KITCHEN` | Kitchen prep & station management | Read-only | Read-only | Read / Write | Read-only | No access | No access | Read-only |
| `DISPATCH` | Packaging & delivery coordination | Read-only | Read-only | Read-only | Read / Write / Assign | Track / Read | No access | Read-only |
| `DRIVER` | Delivery fulfillment | No access | No access | No access | No access | Own Drops Only | No access | No access |

### Centralized Permission Registry

Access is evaluated server-side via `@UseGuards(JwtAuthGuard, RolesGuard)` or `@UseGuards(JwtAuthGuard, PermissionsGuard)`. The platform defines granular operational permissions (`Permission` enum) mapped in `ROLE_PERMISSIONS`:

- **User**: `user:create`, `user:read`, `user:update`, `user:delete`
- **Kitchen**: `kitchen:read`, `kitchen:update`, `kitchen:force_complete`
- **Dispatch**: `dispatch:read`, `dispatch:update`, `dispatch:assign_driver`
- **Delivery**: `delivery:read_all`, `delivery:track`, `delivery:read_own`, `delivery:update_own`
- **Catalogue**: `catalogue:read`, `catalogue:create`, `catalogue:update`, `catalogue:delete`, `catalogue:manage_reference_data`, `catalogue:manage_options`, `catalogue:manage_groups`, `catalogue:manage_images`
- **Menu**: `menu:read`, `menu:create`, `menu:update`, `menu:delete`, `menu:manage_visibility`, `menu:preview`
- **Pricing**: `pricing:read`, `pricing:create`, `pricing:update`, `pricing:delete`
- **Company**: `company:read`, `company:create`, `company:update`, `company:delete`
- **Employee**: `employee:read`, `employee:create`, `employee:update`, `employee:delete`
- **Order**: `order:read`, `order:create`, `order:update`, `order:cancel`, `order:override`, `order:cutoff_process`
- **Billing**: `billing:read`, `billing:create`, `billing:update`, `billing:pay`, `billing:adjust`
- **Settings**: `settings:read`, `settings:update`

---

## Architectural Principles

### 1. Financial Precision (Mandatory Decimal Arithmetic)
- Monetary amounts (prices, subtotals, line totals, adjustments) are stored as PostgreSQL `@db.Decimal(10, 2)` or `@db.Decimal(12, 2)`.
- Floating-point arithmetic is strictly forbidden. In API responses, monetary amounts are serialized as precise decimal strings (e.g. `"12.50"` or `"0.00"`).

### 2. Historical Immutability
- Orders record complete price, dish name, and option snapshots at order time (`dishNameSnapshot`, `unitPrice`, `portionExtraCharge`).
- Invoiced orders snapshot the unit price and line amount into immutable `InvoiceLine` records. Subsequent order modifications or delivery adjustments generate explicit `BillingAdjustment` debit/credit records rather than mutating historical financial lines.

### 3. Strict Calendar Segregation
- **Company Calendar**: Governs customer company working days and holidays. Determines whether a company can receive food deliveries on a specific date.
- **Kitchen Calendar**: Platform-wide singleton settings (working days, cut-off time, cut-off working-day count, kitchen holidays). Strictly governs production schedules and backwards order cut-off calculations.

### 4. Server-Side Input Validation
- Global NestJS `ValidationPipe` is configured with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. Unknown fields in request bodies cause HTTP `400 Bad Request` errors.

---

## Standard Pagination Envelope

All paginated endpoints return items within a standardized response structure:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Standard Query Parameters for paginated routes:
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number (minimum 1) |
| `limit` | number | No | `20` | Items per page (minimum 1, maximum 100) |

---

## Standard HTTP Error Codes

| Status Code | Description | Meaning |
|---|---|---|
| `400 Bad Request` | Validation Failure | Payload failed DTO validation rules or broke business constraints. |
| `401 Unauthorized` | Missing / Invalid Token | Authentication cookie or Bearer token is missing, expired, or invalid. |
| `403 Forbidden` | Access Denied | Authenticated user lacks the required role or permission. |
| `404 Not Found` | Entity Missing | The requested resource (ID, company, order, etc.) does not exist. |
| `409 Conflict` | Unique Collision | Unique constraint violation (e.g., duplicate email, SKU, holiday date, display order). |
| `500 Internal Error`| Server Exception | Unhandled internal exception. |

---

## Modules Directory

| Module | Documentation | Status | Primary Responsibilities |
|---|---|---|---|
| **Auth** | [auth.md](./auth.md) | **Implemented** | Staff login, session cookies, current user profile, logout |
| **Users** | [users.md](./users.md) | **Implemented** | Staff accounts, user roles, pagination, soft deactivation |
| **Companies** | [companies.md](./companies.md) | **Implemented** | Company profiles, email domains, delivery addresses, holidays, calendar, price tiers, visibility, bulk employee CSV import |
| **Employees** | [employees.md](./employees.md) | **Implemented** | Company employees, delivery permission flags, allergen & dietary tag preferences |
| **Catalogue** | [catalogue.md](./catalogue.md) | **Implemented** | Dishes, options, option groups, portion sizes, allergens, dietary tags, kitchen stations, image storage |
| **Pricing** | [pricing.md](./pricing.md) | **Implemented** | Price tiers (manual, multiplier, percentage), tier dish/option overrides, unpriced audit, runtime price resolution |
| **Menu** | [menu.md](./menu.md) | **Implemented** | Menu categories, dish ordering, company category/dish hiding, secret categories, unauthenticated employee menu, admin preview |
| **Order** | [order.md](./order.md) | **Implemented** | Order lifecycle, option combinations, cut-off calculations, manual/automated cut-off processing, price snapshots, admin delivery overrides |
| **Settings** | [settings.md](./settings.md) | **Implemented** | Platform-wide kitchen working days, cut-off times, cut-off working days, platform timezone, kitchen holidays |
| **Kitchen** | [kitchen.md](./kitchen.md) | **Implemented** | Kitchen preparation board by station, unit start/complete transitions, SLA late/at-risk indicators, admin force-complete |
| **Dispatch** | [dispatch.md](./dispatch.md) | **Implemented** | Delivery drops, driver assignment, dispatch readiness, out-for-delivery, driver today's drops, POD photo upload, delivery completion |
| **Billing** | [billing.md](./billing.md) | **Implemented** | Company billing summaries, confirmed uninvoiced orders, invoice creation, immutable snapshots, payments, debit/credit adjustments |
