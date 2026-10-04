# Pricing API

> Status: Implemented

## Overview

The Pricing module governs customer price tiers, pricing derivations, item-level overrides, and dynamic price resolution for ordering. The engine supports three derivation methods:
1. `MANUAL`: Explicit prices entered per dish/option.
2. `COST_MULTIPLIER`: Computed as `costPrice * multiplier` (e.g. `1.30` for a 30% markup).
3. `TIER_PERCENTAGE`: Computed from an ancestor base tier with a percentage markup or discount (e.g. `10.00` for +10%, or `-5.00` for 5% discount).

Explicit overrides on a tier take precedence over derived calculations. Missing price audits allow administrators to detect any dishes or options lacking valid prices prior to order placement.

## Base Path

`/api/pricing` (Direct route: `/pricing`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Read / Resolution Operations**: `Permission.PRICING_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Tier Configuration & Price Overrides**: `Permission.PRICING_CREATE`, `Permission.PRICING_UPDATE`, `Permission.PRICING_DELETE` (`ADMIN` only)

---

## Endpoints

### Section A: Price Tiers (`/api/pricing/tiers`)

# Create Price Tier

### POST
`/api/pricing/tiers`

### Description
Creates a new pricing tier. Validates derivation rules (multiplier required for `COST_MULTIPLIER`; `baseTierId` and `percentage` required for `TIER_PERCENTAGE`).

### Authentication
Required.

### Authorization
`Permission.PRICING_CREATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique name for the tier (e.g. `"Corporate Gold"`) |
| `description` | string | No | Descriptive notes |
| `derivationType` | `PriceDerivationType` | Yes | `MANUAL`, `COST_MULTIPLIER`, or `TIER_PERCENTAGE` |
| `baseTierId` | string | No | Base tier ID (required if `TIER_PERCENTAGE`) |
| `multiplier` | number / string | No | Markup multiplier (e.g. `1.30`, required if `COST_MULTIPLIER`) |
| `percentage` | number / string | No | Markup/discount percentage (e.g. `15.00` or `-5.00`, required if `TIER_PERCENTAGE`) |
| `isDefault` | boolean | No | Set as default tier for unassigned companies |
| `isActive` | boolean | No | Active state (default: `true`) |

```json
{
  "name": "Standard Corporate",
  "description": "Base pricing for corporate clients using 30% markup",
  "derivationType": "COST_MULTIPLIER",
  "multiplier": "1.3000",
  "isDefault": true,
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "tier_std_corp",
  "name": "Standard Corporate",
  "description": "Base pricing for corporate clients using 30% markup",
  "derivationType": "COST_MULTIPLIER",
  "baseTierId": null,
  "baseTierName": null,
  "multiplier": "1.3000",
  "percentage": null,
  "isDefault": true,
  "isActive": true,
  "companiesCount": 0,
  "dishOverridesCount": 0,
  "optionOverridesCount": 0,
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

### Errors
| Status Code | Description |
|---|---|
| 400 | Validation failed or invalid derivation configuration |
| 401 | Unauthorized |
| 403 | Forbidden |
| 409 | Price tier with name already exists |

---

# List Price Tiers

### GET
`/api/pricing/tiers`

### Description
Lists all price tiers with pagination and search.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page (max 100) |
| `search` | string | No | - | Filter by tier name |
| `isActive` | boolean | No | - | Filter by active state |

### Response
- **Status Code**: `200 OK`
- Returns paginated list of `PriceTierResponse`.

---

# Get Price Tier by ID

### GET
`/api/pricing/tiers/:id`

### Description
Retrieves details of a specific price tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

---

# Update Price Tier

### PATCH
`/api/pricing/tiers/:id`

### Description
Updates tier settings. Circular tier derivations (e.g. Tier A -> Tier B -> Tier A) are rejected.

### Authentication
Required.

### Authorization
`Permission.PRICING_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Delete Price Tier

### DELETE
`/api/pricing/tiers/:id`

### Description
Deletes a price tier. System default tiers or tiers currently assigned to companies or child tiers cannot be deleted.

### Authentication
Required.

### Authorization
`Permission.PRICING_DELETE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true,
  "message": "Price tier deleted successfully"
}
```

---

# Set Tier as Default

### PATCH
`/api/pricing/tiers/:id/default`

### Description
Designates this tier as the system default. The previous default tier is automatically unset. Inactive tiers cannot be made default.

### Authentication
Required.

### Authorization
`Permission.PRICING_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

### Section B: Tier Dishes & Overrides

# View Tier Dishes Pricing

### GET
`/api/pricing/tiers/:id/dishes`

### Description
Inspects all catalogue dishes in the context of this tier, returning the resolved price, whether an explicit override exists, and whether the dish is missing a price.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | No | Page number |
| `limit` | number | No | Page limit |
| `search` | string | No | Search dish name or SKU |
| `missingOnly` | boolean | No | Show only unpriced dishes |

### Response
- **Status Code**: `200 OK`

```json
{
  "data": [
    {
      "dishId": "dish_111",
      "dishName": "Grilled Chicken Salad",
      "sku": "DISH-CHK-SLD",
      "costPrice": "4.50",
      "tierId": "tier_std_corp",
      "overridePrice": "6.00",
      "derivedPrice": "5.85",
      "effectivePrice": "6.00",
      "hasOverride": true,
      "isMissingPrice": false
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

# Audit Missing Dishes on Tier

### GET
`/api/pricing/tiers/:tierId/missing-dishes`

### Description
Filters for catalogue dishes that have no valid price resolvable on this tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

---

# Bulk Update Dish Prices on Tier

### PUT
`/api/pricing/tiers/:tierId/dishes/bulk`

### Description
Applies multiple explicit dish price overrides in a single atomic transaction.

### Authentication
Required.

### Authorization
`Permission.PRICING_UPDATE` (ADMIN only).

### Request Body
```json
{
  "prices": [
    { "dishId": "dish_111", "price": "6.00" },
    { "dishId": "dish_222", "price": "8.50" }
  ]
}
```

### Response
- **Status Code**: `200 OK`

```json
{
  "tierId": "tier_std_corp",
  "updatedCount": 2,
  "failedCount": 0,
  "errors": []
}
```

---

# Set Explicit Dish Price Override

### PUT
`/api/pricing/tiers/:tierId/dishes/:dishId`

### Description
Sets or updates an explicit price override for a specific dish on this tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_UPDATE` (ADMIN only).

### Request Body
```json
{
  "price": "6.25"
}
```

### Response
- **Status Code**: `200 OK`

---

# Remove Dish Price Override

### DELETE
`/api/pricing/tiers/:tierId/dishes/:dishId`

### Description
Removes the explicit override, allowing the dish to fall back to the tier's derivation formula.

### Authentication
Required.

### Authorization
`Permission.PRICING_DELETE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

### Section C: Tier Options & Overrides

# View Tier Options Pricing

### GET
`/api/pricing/tiers/:id/options`

### Description
Inspects all catalogue options under this tier, displaying effective prices, overrides, and missing status.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

---

# Audit Missing Options on Tier

### GET
`/api/pricing/tiers/:tierId/missing-options`

### Description
Identifies options that do not have a valid price on this tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

---

# Set Explicit Option Price Override

### PUT
`/api/pricing/tiers/:tierId/options/:optionId`

### Description
Sets or overrides the price of an option on this tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_UPDATE` (ADMIN only).

### Request Body
```json
{
  "price": "1.00"
}
```

### Response
- **Status Code**: `200 OK`

---

# Remove Option Price Override

### DELETE
`/api/pricing/tiers/:tierId/options/:optionId`

### Description
Removes the explicit option override from the tier.

### Authentication
Required.

### Authorization
`Permission.PRICING_DELETE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

### Section D: Runtime Price Resolution

# Resolve Company Dish Price

### GET
`/api/pricing/resolve/company/:companyId/dish/:dishId`

### Description
Authoritatively resolves the exact unit price a company pays for a dish, walking up the company price tier hierarchy with overrides and derivations.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

```json
{
  "status": "RESOLVED",
  "price": "6.00",
  "source": "OVERRIDE",
  "isOverridden": true,
  "isDerived": false,
  "missing": false,
  "tierId": "tier_std_corp",
  "tierName": "Standard Corporate"
}
```

---

# Resolve Company Option Price

### GET
`/api/pricing/resolve/company/:companyId/option/:optionId`

### Description
Authoritatively resolves the exact price a company pays for an option based on their assigned tier and derivations.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

---

# Get Company Pricing Context

### GET
`/api/pricing/resolve/company/:companyId/context`

### Description
Returns the effective pricing metadata for a company, including company ID, company name, resolved price tier, and derivation rules.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

```json
{
  "companyId": "cmp_123456789",
  "companyName": "Acme Corporation",
  "priceTierId": "tier_std_corp",
  "priceTierName": "Standard Corporate",
  "isDefaultTier": true
}
```

---

# Resolve Employee Dish Price

### GET
`/api/pricing/resolve/employee/:employeeId/dish/:dishId`

### Description
Authoritatively resolves the exact unit price an employee pays for a dish, walking up the employee's company price tier hierarchy with overrides and derivations.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

```json
{
  "itemId": "dish_111",
  "itemType": "DISH",
  "itemName": "Grilled Chicken Salad",
  "effectivePrice": "6.00",
  "tierId": "tier_std_corp",
  "tierName": "Standard Corporate",
  "derivationSource": "OVERRIDE"
}
```

---

# Resolve Employee Option Price

### GET
`/api/pricing/resolve/employee/:employeeId/option/:optionId`

### Description
Authoritatively resolves the exact price an employee pays for an option.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

```json
{
  "itemId": "opt_avocado",
  "itemType": "OPTION",
  "itemName": "Avocado Slices",
  "effectivePrice": "1.00",
  "tierId": "tier_std_corp",
  "tierName": "Standard Corporate",
  "derivationSource": "OVERRIDE"
}
```

---

# Get Employee Pricing Context

### GET
`/api/pricing/resolve/employee/:employeeId/context`

### Description
Returns the effective pricing metadata for an employee, including company ID, company name, resolved price tier, and derivation rules.

### Authentication
Required.

### Authorization
`Permission.PRICING_READ`.

### Response
- **Status Code**: `200 OK`

```json
{
  "employeeId": "emp_001",
  "companyId": "cmp_123456789",
  "companyName": "Acme Corporation",
  "priceTierId": "tier_std_corp",
  "priceTierName": "Standard Corporate",
  "isDefaultTier": true
}
```

---

## Planned Endpoints

None. All pricing endpoints are implemented.

---

## Enums

### `PriceDerivationType`
| Value | Description | Required Parameters |
|---|---|---|
| `MANUAL` | Prices are explicitly set per item | None |
| `COST_MULTIPLIER` | Price = `dish.costPrice * multiplier` | `multiplier` |
| `TIER_PERCENTAGE` | Price = `baseTierPrice * (1 + percentage / 100)` | `baseTierId`, `percentage` |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `400 Bad Request: Circular dependency detected in price tiers` | Tier A derives from Tier B which derives from Tier A | Select an ancestor tier that does not create a cycle. |
| `400 Bad Request: Cannot delete default price tier` | Attempting to delete the tier marked `isDefault: true` | Assign a new default tier first. |
| `404 Not Found: Price tier not found` | Invalid price tier ID | Verify tier ID. |
