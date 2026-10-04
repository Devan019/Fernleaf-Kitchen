# Fernleaf Kitchen

Internal catering operations software for managing companies, employees, menus, pricing, orders, kitchen production, dispatch, deliveries, and billing.

Fernleaf Kitchen is a staff-facing operations platform. It is not a customer checkout or public food-ordering application. The frontend provides role-specific workspaces, while the backend owns business rules, workflow transitions, validation, authorization, and financial history.

## README Index

- [Test Accounts](#test-accounts)
- [1. Executive Summary](#1-executive-summary)
- [2. Business Problem](#2-business-problem)
- [3. Scope and Non-Goals](#3-scope-and-non-goals)
- [4. System Architecture](#4-system-architecture)
- [5. Technology Stack](#5-technology-stack)
- [6. Core Business Flows](#6-core-business-flows)
  - [Main Order Flow](#61-main-order-flow)
  - [Company and Employee Flow](#62-company-and-employee-flow)
  - [Catalogue, Menu, and Pricing Flow](#63-catalogue-menu-and-pricing-flow)
  - [Kitchen Flow](#64-kitchen-flow)
  - [Dispatch and Driver Flow](#65-dispatch-and-driver-flow)
  - [Billing Flow](#66-billing-flow)
  - [Authentication Flow](#67-authentication-flow)
- [7. Data Model](#7-data-model)
- [8. Role-Based Authentication and Authorization](#8-role-based-authentication-and-authorization)
- [9. Frontend Navigation](#9-frontend-navigation)
- [10. Validation, Money, and Historical Integrity](#10-validation-money-and-historical-integrity)
- [11. API Documentation](#11-api-documentation)
- [12. Local Development Setup](#12-local-development-setup)
- [13. Testing and Quality Checks](#13-testing-and-quality-checks)
- [14. Suggested Demo Flow](#14-suggested-demo-flow)
- [15. Project Structure](#15-project-structure)
- [16. Engineering Principles](#16-engineering-principles)
- [17. Submission Notes](#17-submission-notes)
  - [What I built](#what-i-built)
  - [What I skipped and why](#what-i-skipped-and-why)
  - [What I would do next with more time](#what-i-would-do-next-with-more-time)
  - [Ambiguous requirements and how I interpreted them](#ambiguous-requirements-and-how-i-interpreted-them)
- [18. Source-of-Truth References](#18-source-of-truth-references)
- [19. Final Notes](#19-final-notes)

### Documentation Shortcuts

- [Documentation Index](docs/README.md)
- [API Documentation](docs/apis/README.md)
- [Unit Test Report](docs/tests/unit_test.md)
- [End-to-End Test Report](docs/tests/e2e.md)

## Test Accounts

The seed data includes local/demo accounts for each operational role:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@test.com` | `Test@1234` |
| Kitchen | `kitchen@test.com` | `Test@1234` |
| Dispatch | `dispatch@test.com` | `Test@1234` |
| Driver | `driver@test.com` | `Test@1234` |

These credentials are for local and demonstration environments only. Do not use them in production.

## 1. Executive Summary

Fernleaf Kitchen manages the complete internal catering workflow:

```text
Company → Employee → Menu/Pricing → Order
        → Kitchen → Dispatch → Driver
        → Delivered → Invoice → Paid
```

The system supports:

- Company and employee administration.
- Catalogue, dish, option, allergen, dietary, and kitchen-station management.
- Menu categories, secret categories, and company-specific visibility.
- Price tiers, derived pricing, overrides, and historical price snapshots.
- Staff-created catering orders.
- Kitchen preparation boards and production timing.
- Delivery-drop grouping, dispatch readiness, driver assignment, and delivery confirmation.
- Company billing, invoices, payments, and explicit post-invoice adjustments.

## 2. Business Problem

Catering operations require more than recording an order. Staff must coordinate customer-company rules, delivery calendars, menu visibility, price tiers, kitchen preparation, dispatch timing, drivers, and billing without losing historical accuracy.

Fernleaf Kitchen addresses that operational problem by separating responsibilities into focused workspaces:

- **Admin** manages configuration, companies, staff, pricing, orders, and billing.
- **Kitchen staff** manage production units and station workloads.
- **Dispatch staff** prepare delivery drops, assign drivers, and release routes.
- **Drivers** see their own delivery work and confirm completed drops.

The application is intentionally process-oriented. It prioritizes reliable workflow state and server-side business rules over a generic analytics dashboard or public ordering experience.

## 3. Scope and Non-Goals

### Included

- Internal staff authentication and role-based authorization.
- Company, employee, delivery address, holiday, and billing-contact management.
- Catalogue and menu configuration.
- Company-specific menu visibility.
- Price-tier assignment and price resolution.
- Order creation, status transitions, kitchen processing, dispatch, and delivery.
- Invoice creation, payment status, and billing adjustments.
- Dish-image upload support through S3/R2-compatible object storage.
- Swagger/OpenAPI API documentation.

### Not included

- Public customer checkout.
- Customer self-service accounts.
- Employee payment processing.
- External SSO or identity-provider integration.
- Automated route optimization.
- Predictive demand planning.
- A separate native mobile application.

## 4. System Architecture

```mermaid
flowchart LR
    User[Staff User]
    FE[Next.js Frontend]
    API[NestJS REST API]
    AUTH[Authentication and RBAC]
    DOMAIN[Domain Services]
    PRISMA[Prisma ORM]
    DB[(PostgreSQL)]
    STORAGE[(S3 / R2 Object Storage)]

    User --> FE
    FE -->|HTTP / JSON| API
    API --> AUTH
    API --> DOMAIN
    DOMAIN --> PRISMA
    PRISMA --> DB
    DOMAIN --> STORAGE
```

### Frontend

The Next.js frontend is located in [client/](client/). It provides:

- Login and session-aware routing.
- Role-specific navigation.
- Dashboard, order, kitchen, dispatch, delivery, catalogue, menu, pricing, company, billing, user, and settings screens.
- React Query-based API data fetching.
- Forms and client-side validation for operational workflows.

The navigation definition is in [client/src/lib/navigation.ts](client/src/lib/navigation.ts). Frontend restrictions improve the user experience, but they are not the security boundary.

### Backend

The NestJS backend is located in [server/](server/). It provides:

- REST controllers and DTO validation.
- Authentication and JWT verification.
- Centralized permission guards.
- Domain services for each operational module.
- Prisma database access.
- Swagger/OpenAPI documentation.
- Image storage integration.

The frontend never connects directly to Prisma or PostgreSQL.

### Data and storage

- PostgreSQL stores operational and financial data.
- Prisma maps the database schema and generates the database client.
- S3-compatible storage stores uploaded dish images.
- Monetary values use explicit decimal types rather than JavaScript floating-point arithmetic.

## 5. Technology Stack

### Client

- Next.js 16
- React 19
- TypeScript
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- Biome

### Server

- NestJS 12
- TypeScript
- Prisma 7
- PostgreSQL
- Passport and JWT
- Argon2 password hashing
- Swagger/OpenAPI
- Class Validator and Class Transformer
- Vitest
- Oxlint

### External integration

- AWS SDK S3 client for S3/R2-compatible object storage.

## 6. Core Business Flows

### 6.1 Main Order Flow

```text
Admin creates order
      ↓
Employee → Company → Menu + Price Tier
      ↓
Order placed
      ↓
Kitchen cut-off validation
      ↓
Order confirmed
      ↓
Kitchen prepares production units
      ↓
Kitchen ready
      ↓
Dispatcher prepares delivery drop
      ↓
Driver assigned
      ↓
Drop out for delivery
      ↓
Driver delivers
      ↓
Driver confirms with note and/or photo
      ↓
Drop delivered
      ↓
Company invoice
      ↓
Invoice paid
```

The order status values are `DRAFT`, `PLACED`, `CONFIRMED`, `DELIVERED`, `CANCELLED`, and `REJECTED`. Delivery execution is additionally tracked through fulfillment and delivery-drop states.

### 6.2 Company and Employee Flow

```text
Create Company
  ↓
Domains + Addresses + Billing Contact
  ↓
Working Days + Company Holidays
  ↓
Price Tier + Menu Visibility
  ↓
Company Ready
```

```text
Create Employee
  ↓
Assign Company
  ↓
Delivery Permissions
  ↓
Allergen and Dietary Preferences
  ↓
Employee uses Company rules
```

Each employee belongs to one company. Employee settings include whether the employee can change delivery time, packaging, or delivery address.

### 6.3 Catalogue, Menu, and Pricing Flow

```text
Catalogue
  ↓
Categories → Dishes → Options and Option Groups
  ↓
Allergens + Dietary Tags + Portion Sizes
  ↓
Kitchen Station Assignment
  ↓
Menu Configuration
  ↓
Active / Hidden / Secret Items
  ↓
Company Visibility
  ↓
Company Price Tier
  ↓
Employee Order Menu
```

```text
Price Tier
  ↓
Dish and Option Prices
  ↓
Manual Overrides or Derived Prices
  ↓
Round derived prices up to the next $0.05
  ↓
Assign Tier to Company
```

Price derivation supports manual prices, cost multipliers, and tier percentages. Order lines retain snapshots so later menu or pricing changes do not rewrite historical orders.

### 6.4 Kitchen Flow

```text
Confirmed Order
  ↓
Preparation Units
  ↓
Kitchen Station
  ↓
PENDING
  ↓
STARTED
  ↓
DONE
  ↓
All Units Done
  ↓
Kitchen Ready
```

The kitchen board calculates operational indicators including `ON_TRACK`, `AT_RISK`, `LATE`, and `COMPLETED`. The default at-risk threshold is 30 minutes unless configured otherwise.

### 6.5 Dispatch and Driver Flow

```text
Kitchen Ready
  ↓
Group orders into Delivery Drop
(company + address + delivery date + exact time)
  ↓
DISPATCH_READY
  ↓
Assign Driver
  ↓
OUT_FOR_DELIVERY
  ↓
Driver picks up and delivers
  ↓
Confirm delivery with optional note/photo
  ↓
DELIVERED
```

Delivery drops use the states `KITCHEN_READY`, `DISPATCH_READY`, `OUT_FOR_DELIVERY`, and `DELIVERED`. Drivers are restricted to their assigned drops.

### 6.6 Billing Flow

```text
Confirmed + uninvoiced orders
  ↓
Group by company
  ↓
Create invoice
  ↓
Invoice OPEN
  ↓
Mark invoice PAID
```

Invoices use the states `OPEN`, `PAID`, and `VOID`. Invoice lines are historical financial snapshots. Post-invoice differences are recorded as `DEBIT` or `CREDIT` billing adjustments rather than silently changing old invoice lines.

### 6.7 Authentication Flow

```text
Login with email and password
      ↓
Backend verifies Argon2 password hash
      ↓
JWT issued in HTTP-only token cookie
      ↓
JWT strategy validates each protected request
      ↓
Role and permission checks
      ↓
Role-based UI and API access
```

## 7. Data Model

The exact field-level source of truth is [server/prisma/schema.prisma](server/prisma/schema.prisma).

The major relationships are:

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        enum role
        boolean isActive
    }

    COMPANY {
        string id PK
        string name UK
        string priceTierId FK
    }

    EMPLOYEE {
        string id PK
        string companyId FK
        string email UK
        boolean isActive
    }

    PRICE_TIER {
        string id PK
        string name UK
        enum derivationType
        boolean isDefault
    }

    MENU_CATEGORY {
        string id PK
        string name UK
        boolean isSecret
        int displayOrder
    }

    DISH {
        string id PK
        string sku UK
        string name
        string kitchenStationId FK
        decimal costPrice
    }

    CATEGORY_DISH {
        string categoryId FK
        string dishId FK
        int displayOrder
    }

    ORDER {
        string id PK
        string employeeId FK
        string companyId FK
        date deliveryDate
        enum status
        decimal total
    }

    ORDER_LINE {
        string id PK
        string orderId FK
        string dishId FK
        int quantity
        decimal unitPrice
    }

    KITCHEN_UNIT {
        string id PK
        string orderId FK
        string orderLineId FK
        string kitchenStationId FK
        enum status
    }

    DELIVERY_DROP {
        string id PK
        string companyId FK
        string driverId FK
        date deliveryDate
        enum status
        boolean isOnTime
    }

    INVOICE {
        string id PK
        string companyId FK
        enum status
        decimal total
    }

    INVOICE_LINE {
        string id PK
        string invoiceId FK
        string orderId FK
        decimal amount
    }

    BILLING_ADJUSTMENT {
        string id PK
        string invoiceId FK
        string orderId FK
        enum type
        decimal amount
    }

    COMPANY ||--o{ EMPLOYEE : has
    COMPANY }o--o| PRICE_TIER : uses
    MENU_CATEGORY ||--o{ CATEGORY_DISH : contains
    DISH ||--o{ CATEGORY_DISH : assigned
    DISH ||--o{ ORDER_LINE : ordered
    EMPLOYEE ||--o{ ORDER : places
    COMPANY ||--o{ ORDER : receives
    ORDER ||--o{ ORDER_LINE : contains
    ORDER ||--o{ KITCHEN_UNIT : produces
    ORDER ||--o| DELIVERY_DROP : assigned_to
    COMPANY ||--o{ DELIVERY_DROP : receives
    USER ||--o{ DELIVERY_DROP : drives
    COMPANY ||--o{ INVOICE : billed
    INVOICE ||--o{ INVOICE_LINE : contains
    ORDER ||--o| INVOICE_LINE : billed_once
    INVOICE ||--o{ BILLING_ADJUSTMENT : has
```

Important modeling decisions:

- `CategoryDish` is a join model; dishes are not directly owned by one category.
- `OrderLine` stores order-specific quantities and prices.
- `KitchenUnit` connects an order-line combination to production work.
- `DeliveryDrop` groups operational delivery work separately from the order itself.
- `InvoiceLine.orderId` is unique, preventing one order from being invoiced twice.
- Invoice lines and billing adjustments preserve financial history.

## 8. Role-Based Authentication and Authorization

The platform has four operational roles:

| Role | Primary Responsibility |
|---|---|
| `ADMIN` | Full platform administration, configuration, orders, and billing |
| `KITCHEN` | Catalogue/menu access and kitchen production |
| `DISPATCH` | Delivery drops, packaging readiness, and driver assignment |
| `DRIVER` | Assigned delivery drops for the driver |

Authorization is enforced server-side through JWT authentication and permission guards. The permission guard rejects unauthorized requests with `403 Forbidden`. The frontend navigation only hides irrelevant pages; it must not be treated as the security boundary.

## 9. Frontend Navigation

| Area | Roles |
|---|---|
| Dashboard | Admin, Kitchen, Dispatch, Driver |
| Orders | Admin, Kitchen |
| Kitchen Board | Admin, Kitchen |
| Dispatch Board | Admin, Dispatch |
| My Deliveries | Driver |
| Catalogue | Admin, Kitchen |
| Menu | Admin, Kitchen |
| Pricing | Admin |
| Companies | Admin |
| Company Billing | Admin |
| Users | Admin |
| Settings | Admin |

## 10. Validation, Money, and Historical Integrity

- NestJS uses strict global request validation with whitelisting and rejection of unknown fields.
- Passwords are hashed with Argon2.
- JWT payloads carry operational identity data rather than passwords or sensitive profile data.
- Monetary columns use PostgreSQL decimal types.
- Derived prices round upward to the nearest $0.05.
- Orders snapshot dish, option, portion, and pricing information.
- Invoice lines are immutable financial snapshots.
- Post-invoice changes use explicit debit/credit adjustments.
- Order and delivery status transitions are validated by backend services.

## 11. API Documentation

The backend exposes REST endpoints for:

- Auth
- Users
- Companies
- Employees
- Catalogue
- Pricing
- Menu
- Orders
- Settings
- Kitchen
- Dispatch
- Billing

The central API reference is [docs/apis/README.md](docs/apis/README.md). Swagger/OpenAPI is available from the backend's configured `/api` route when the server is running.

Additional documentation:

- [Complete documentation index](docs/README.md)
- [API documentation index](docs/apis/README.md)
- [Authentication API](docs/apis/auth.md)
- [Users API](docs/apis/users.md)
- [Companies API](docs/apis/companies.md)
- [Employees API](docs/apis/employees.md)
- [Catalogue API](docs/apis/catalogue.md)
- [Pricing API](docs/apis/pricing.md)
- [Menu API](docs/apis/menu.md)
- [Order API](docs/apis/order.md)
- [Settings API](docs/apis/settings.md)
- [Kitchen API](docs/apis/kitchen.md)
- [Dispatch API](docs/apis/dispatch.md)
- [Billing API](docs/apis/billing.md)

## 12. Local Development Setup

### Prerequisites

Install:

- Node.js
- Bun
- PostgreSQL
- Git

### Clone the repository

```bash
git clone <repository-url>
cd fernleaf-kitchen
```

### Backend

```bash
cd server
bun install
```

Create `server/.env` from [server/.env.example](server/.env.example):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/fernleaf_kitchen"
JWT_SECRET="your-secret-with-at-least-32-characters"
PORT=8000
```

Generate Prisma Client and apply migrations:

```bash
bunx prisma generate
bunx prisma migrate dev
```

Seed local/demo data:

```bash
bun run seed
```

Start the API:

```bash
bun run dev
```

The backend listens on `http://localhost:8000` by default.

### Frontend

```bash
cd client
bun install
```

Create `client/.env.local` from [client/.env.example](client/.env.example):

```env
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

Start the frontend:

```bash
bun run dev
```

Open `http://localhost:3000`.

## 13. Testing and Quality Checks

### Backend

```bash
cd server
bun run test
bun run test:e2e
bun run lint
bun run build
```

Test documentation and captured test output:

- [Unit test report and output](docs/tests/unit_test.md)
- [End-to-end test report and output](docs/tests/e2e.md)

### Frontend

```bash
cd client
bun run lint
bun run build
```

## 14. Suggested Demo Flow

### 1. Login as Admin

Show the dashboard, users, companies, catalogue, menu, pricing, orders, billing, and settings areas.

### 2. Configure a company and employee

```text
Company
  ↓
Price Tier
  ↓
Employee
  ↓
Menu Visibility + Employee Permissions
```

### 3. Create or review an order

Show:

- Employee and company.
- Delivery date and delivery address.
- Packaging and delivery options.
- Dishes, options, and quantities.
- Price breakdown.
- Order timeline and status.

### 4. Run the kitchen workflow

Open Kitchen Board:

```text
Confirmed
 → Start preparation
 → Complete production units
 → Kitchen Ready
```

### 5. Run the dispatch workflow

Open Dispatch Board:

```text
Kitchen Ready
 → Create or group delivery drop
 → Mark dispatch ready
 → Assign driver
 → Send out for delivery
```

### 6. Run the driver workflow

Log in as the Driver and show:

- Today's assigned drops.
- Delivery sequence and destination.
- Marking a drop delivered.
- Optional delivery note and photo/POD evidence.

### 7. Complete billing

Return to Admin:

```text
Confirmed
 → Uninvoiced
 → Create Invoice
 → Mark Paid
```

### 8. Show settings

Show kitchen working days, holidays, cut-off configuration, timezone, and operational thresholds.

## 15. Project Structure

The repository is organized as a frontend, backend, documentation, and database schema:

```text
fernleaf-kitchen/
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── billing/
│   │   │   │   ├── catalogue/
│   │   │   │   ├── companies/
│   │   │   │   ├── dispatch/
│   │   │   │   ├── kitchen/
│   │   │   │   ├── menu/
│   │   │   │   ├── my-deliveries/
│   │   │   │   ├── orders/
│   │   │   │   ├── pricing/
│   │   │   │   ├── settings/
│   │   │   │   └── users/
│   │   │   └── login/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── billing/
│   │   │   ├── catalogue/
│   │   │   ├── companies/
│   │   │   ├── dispatch/
│   │   │   ├── employees/
│   │   │   ├── kitchen/
│   │   │   ├── menu/
│   │   │   ├── orders/
│   │   │   ├── pricing/
│   │   │   ├── settings/
│   │   │   └── users/
│   │   ├── lib/
│   │   │   └── api/
│   │   └── types/
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── common/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── billing/
│   │       ├── catalogue/
│   │       ├── company/
│   │       ├── dispatch/
│   │       ├── employee/
│   │       ├── kitchen/
│   │       ├── menu/
│   │       ├── order/
│   │       ├── pricing/
│   │       ├── settings/
│   │       └── user/
│   ├── test/
│   └── package.json
│
├── docs/
│   ├── README.md
│   ├── apis/
│   │   ├── README.md
│   │   ├── auth.md
│   │   ├── billing.md
│   │   ├── catalogue.md
│   │   ├── companies.md
│   │   ├── dispatch.md
│   │   ├── employees.md
│   │   ├── kitchen.md
│   │   ├── menu.md
│   │   ├── order.md
│   │   ├── pricing.md
│   │   ├── settings.md
│   │   └── users.md
│   └── tests/
│       ├── e2e.md
│       └── unit_test.md
│
└── readme.md
```

## 16. Engineering Principles

- Business rules and permissions are enforced server-side.
- The backend is the source of truth for workflow transitions.
- Money calculations use explicit decimal logic.
- Historical order and invoice values are preserved.
- Large collections use server-side pagination.
- Kitchen and dispatch boards are designed for operational workloads.
- Driver access is limited to the driver's assigned work.
- The frontend should remain a consumer of the API rather than a second business-rule engine.

## 17. Submission Notes

### What I built

I built a staff-facing catering operations platform covering the workflow from company and employee setup through menu and pricing configuration, order management, kitchen production, dispatch, driver delivery, invoicing, and payment tracking. The implementation includes:

- A Next.js frontend with login, role-specific navigation, dashboards, forms, operational boards, and detail pages.
- A NestJS REST API with DTO validation, JWT authentication, server-side permission guards, and domain services.
- Prisma/PostgreSQL models and migrations for the operational and financial data.
- Catalogue, menu, pricing, company, employee, order, kitchen, dispatch, billing, settings, and user modules.
- Historical price and order snapshots, invoice lines, and post-invoice adjustments so financial history is not silently overwritten.
- S3/R2-compatible dish-image storage integration.
- Swagger/OpenAPI documentation and backend end-to-end test coverage for the main modules.

### What I skipped and why

- No major functionality has been skipped or left unimplemented.

### What I would do next with more time

- Employee and company side UI/UX
- Add email and push notifications for operational events and emergencies alerts
- Add Redis caching for stable, read-heavy data
- Add rate limiting and throttling for API endpoints
- Optimized api queries for large datasets
- Add advanced operational analytics and reporting
- Add more end-to-end, integration, and load testing

### Ambiguous requirements and how I interpreted them

- I interpreted “kitchen management” as production-unit tracking and station workload management, rather than a full inventory or recipe-costing system.
- I interpreted “delivery” as dispatch-drop preparation, driver assignment, and delivery confirmation; route optimization is therefore a future capability.
- I interpreted role-based access as both role-specific frontend navigation and server-side authorization. The backend remains the security boundary.
- I interpreted invoice history as immutable once created. Corrections are represented as explicit debit/credit adjustments instead of rewriting invoice lines.
- I interpreted operational dates and cut-offs using the kitchen's configured working days, holidays, timezone, and production thresholds rather than the browser's local calendar.

### Assumptions and deferred work

The implementation makes explicit interpretations for areas where operational requirements can vary:

- `AT_RISK` is based on configured production timing thresholds.
- Cut-off and delivery dates use backend calendar logic rather than browser-local assumptions.
- Confirmed orders may be invoiced before delivery.
- Post-invoice changes use adjustments instead of mutating invoice history.


## 18. Source-of-Truth References

When documentation and implementation need to be compared, use these files first:

- [server/prisma/schema.prisma](server/prisma/schema.prisma) — database entities, relationships, and lifecycle enums.
- [docs/apis/README.md](docs/apis/README.md) — API contracts and module behavior.
- [client/src/lib/navigation.ts](client/src/lib/navigation.ts) — role-specific frontend navigation.
- [server/src/modules/auth/auth.controller.ts](server/src/modules/auth/auth.controller.ts) — login, session cookie, and logout behavior.
- [server/src/modules/auth/guards/permissions.guard.ts](server/src/modules/auth/guards/permissions.guard.ts) — server-side permission enforcement.
- [server/src/common/storage/storage.service.ts](server/src/common/storage/storage.service.ts) — image storage integration.
- [docs/README.md](docs/README.md) — documentation index.
- [docs/apis/README.md](docs/apis/README.md) — API documentation index.
- [docs/tests/e2e.md](docs/tests/e2e.md) — end-to-end test report and output.
- [docs/tests/unit_test.md](docs/tests/unit_test.md) — unit test report and output.

## 19. Final Notes

Fernleaf Kitchen is a kitchen- and dispatch-driven internal operations platform:

```text
Company
  ↓
Employee
  ↓
Menu and Price Tier
  ↓
Order
  ↓
Kitchen Production
  ↓
Dispatch Drop
  ↓
Driver Delivery
  ↓
Delivery Confirmation
  ↓
Company Invoice
  ↓
Payment
```

The architecture keeps business-critical rules in the NestJS backend while the Next.js frontend provides focused interfaces for each operational role.
