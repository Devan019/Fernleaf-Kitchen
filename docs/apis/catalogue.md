# Catalogue API

> Status: Implemented

## Overview

The Catalogue module manages all food items, custom options, configuration option groups, portion sizes, and dietary reference metadata. It provides full control over dishes, SKU generation, cost prices, kitchen station assignments, temperature classifications (`HOT` / `COLD`), multi-part option groups, portion size surcharges, and Cloudflare R2 / S3 image asset storage.

## Base Path

`/api/catalogue` (Mounted across `/catalogue/dishes`, `/catalogue/options`, and `/catalogue`)

## Authentication

Required for all endpoints (`JwtAuthGuard`).

## Permissions

- **Read Operations**: `Permission.CATALOGUE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`)
- **Dish Mutations**: `Permission.CATALOGUE_CREATE`, `Permission.CATALOGUE_UPDATE`, `Permission.CATALOGUE_DELETE` (`ADMIN` only)
- **Option Mutations**: `Permission.CATALOGUE_MANAGE_OPTIONS` (`ADMIN` only)
- **Option Group Mutations**: `Permission.CATALOGUE_MANAGE_GROUPS` (`ADMIN` only)
- **Image Operations**: `Permission.CATALOGUE_MANAGE_IMAGES` (`ADMIN` only)
- **Reference Data Mutations**: `Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (`ADMIN` only)

---

## Endpoints

### Section A: Dishes (`/api/catalogue/dishes`)

# Create Dish

### POST
`/api/catalogue/dishes`

### Description
Creates a new dish in the catalogue. Cost price is recorded as high-precision Decimal. SKU must be unique across all dishes.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_CREATE` (ADMIN only).

### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Name of the dish |
| `description` | string | No | Detailed description |
| `sku` | string | Yes | Unique stock keeping unit code (uppercase recommended, e.g. `"DISH-CHICK-01"`) |
| `temperature` | `DishTemperature` | Yes | Temperature category (`HOT` or `COLD`) |
| `costPrice` | number / string | Yes | Internal preparation cost price |
| `minimumOrderQuantity` | number | No | Minimum portion requirement |
| `kitchenStationId` | string | No | Assigned preparation station ID |
| `allergenIds` | string[] | No | Associated Allergen IDs |
| `dietaryTagIds` | string[] | No | Associated DietaryTag IDs |
| `isActive` | boolean | No | Active status (default: `true`) |

```json
{
  "name": "Grilled Chicken Salad",
  "description": "Organic grilled chicken with seasonal greens and vinaigrette",
  "sku": "DISH-CHK-SLD",
  "temperature": "COLD",
  "costPrice": "4.50",
  "minimumOrderQuantity": 1,
  "kitchenStationId": "station_salad",
  "allergenIds": [],
  "dietaryTagIds": ["tag_gluten_free"],
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "dish_111",
  "name": "Grilled Chicken Salad",
  "description": "Organic grilled chicken with seasonal greens and vinaigrette",
  "sku": "DISH-CHK-SLD",
  "temperature": "COLD",
  "costPrice": "4.50",
  "minimumOrderQuantity": 1,
  "kitchenStationId": "station_salad",
  "kitchenStation": { "id": "station_salad", "name": "Salad Station" },
  "imageUrl": null,
  "isActive": true,
  "allergens": [],
  "dietaryTags": [{ "id": "tag_gluten_free", "name": "Gluten Free" }],
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
| 409 | Dish with SKU already exists |

---

# List Dishes

### GET
`/api/catalogue/dishes`

### Description
Retrieves a paginated list of dishes with search and filters.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Results per page (max 100) |
| `search` | string | No | - | Filter by name or SKU |
| `temperature` | `DishTemperature` | No | - | Filter by `HOT` or `COLD` |
| `kitchenStationId` | string | No | - | Filter by kitchen station |
| `isActive` | boolean | No | - | Filter by active state |

### Response
- **Status Code**: `200 OK`
- Returns paginated list of `DishListItemResponse`.

---

# Get Complete Dish Details

### GET
`/api/catalogue/dishes/:id`

### Description
Retrieves complete dish configuration including configured option groups, attached options, portion sizes, extra charges, allergens, and dietary tags.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Path Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Dish ID |

### Response
- **Status Code**: `200 OK`

```json
{
  "id": "dish_111",
  "name": "Grilled Chicken Salad",
  "sku": "DISH-CHK-SLD",
  "temperature": "COLD",
  "costPrice": "4.50",
  "imageUrl": "https://storage.fernleaf.internal/dishes/dish_111.jpg",
  "isActive": true,
  "optionGroups": [
    {
      "id": "grp_dressing",
      "name": "Dressing Options",
      "isRequired": true,
      "displayOrder": 1,
      "usesPortions": false,
      "options": [
        {
          "id": "opt_vinaigrette",
          "name": "Balsamic Vinaigrette",
          "displayOrder": 1,
          "costPrice": "0.20",
          "isActive": true
        }
      ],
      "portions": []
    }
  ],
  "allergens": [],
  "dietaryTags": [{ "id": "tag_gluten_free", "name": "Gluten Free" }]
}
```

---

# Update Dish

### PATCH
`/api/catalogue/dishes/:id`

### Description
Updates dish metadata, name, SKU, station, temperature, cost price, allergens, or dietary tags.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_UPDATE` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Update Dish Status

### PATCH
`/api/catalogue/dishes/:id/status`

### Description
Soft activates or deactivates a dish.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_UPDATE` (ADMIN only).

### Request Body
```json
{
  "isActive": false
}
```

### Response
- **Status Code**: `200 OK`

---

# Upload Dish Image

### POST
`/api/catalogue/dishes/:id/image`

### Description
Uploads or replaces the dish photo. Accepted formats: JPEG, PNG, WebP, GIF (max 5MB). The asset is stored securely in S3/Cloudflare R2 and updates `dish.imageUrl`.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_IMAGES` (ADMIN only).

### Request Body (Multipart / Form-Data)
| Field | Type | Description |
|---|---|---|
| `file` | binary | Image file |

### Response
- **Status Code**: `200 OK`

```json
{
  "imageUrl": "https://storage.fernleaf.internal/dishes/dish_111_1728000.jpg"
}
```

---

# Remove Dish Image

### DELETE
`/api/catalogue/dishes/:id/image`

### Description
Deletes the dish image from storage and resets `dish.imageUrl` to `null`.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_IMAGES` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true
}
```

---

### Section B: Options (`/api/catalogue/options`)

# Create Option

### POST
`/api/catalogue/options`

### Description
Creates a reusable catalogue option (e.g. "Extra Cheese", "Gluten-Free Bun") with cost price and allergen tags.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_OPTIONS` (ADMIN only).

### Request Body
```json
{
  "name": "Avocado Slices",
  "costPrice": "0.75",
  "allergenIds": [],
  "dietaryTagIds": ["tag_vegan"],
  "isActive": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "opt_avocado",
  "name": "Avocado Slices",
  "costPrice": "0.75",
  "isActive": true,
  "allergens": [],
  "dietaryTags": [{ "id": "tag_vegan", "name": "Vegan" }],
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

---

# List Options

### GET
`/api/catalogue/options`

### Description
Lists options with pagination and search.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ` (`ADMIN`, `KITCHEN`, `DISPATCH`).

### Response
- **Status Code**: `200 OK`
- Paginated list of options.

---

# Get Option by ID

### GET
`/api/catalogue/options/:id`

### Description
Retrieves details for a specific option.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

### Response
- **Status Code**: `200 OK`

---

# Update Option

### PATCH
`/api/catalogue/options/:id`

### Description
Updates option details.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_OPTIONS` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Update Option Status

### PATCH
`/api/catalogue/options/:id/status`

### Description
Soft activates or deactivates an option.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_OPTIONS` (ADMIN only).

### Request Body
```json
{
  "isActive": false
}
```

---

### Section C: Option Groups & Portions (`/api/catalogue`)

# Create Option Group for Dish

### POST
`/api/catalogue/dishes/:dishId/option-groups`

### Description
Creates an option group attached to a specific dish. Can be configured as required and with portion size enforcement (`usesPortions: true`).

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Request Body
```json
{
  "name": "Choice of Protein",
  "isRequired": true,
  "displayOrder": 1,
  "usesPortions": true
}
```

### Response
- **Status Code**: `201 Created`

```json
{
  "id": "grp_protein",
  "dishId": "dish_111",
  "name": "Choice of Protein",
  "isRequired": true,
  "displayOrder": 1,
  "usesPortions": true,
  "options": [],
  "portions": [],
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

---

# List Option Groups for Dish

### GET
`/api/catalogue/dishes/:dishId/option-groups`

### Description
Lists all option groups configured for a dish, ordered by `displayOrder` ascending.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

### Response
- **Status Code**: `200 OK`

---

# Get Option Group by ID

### GET
`/api/catalogue/option-groups/:id`

### Description
Retrieves details of an option group.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

### Response
- **Status Code**: `200 OK`

---

# Update Option Group

### PATCH
`/api/catalogue/option-groups/:id`

### Description
Updates option group name, requirement status, or display order.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Delete Option Group

### DELETE
`/api/catalogue/option-groups/:id`

### Description
Deletes an option group and cascades removal of group option associations.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Response
- **Status Code**: `200 OK`

```json
{
  "success": true
}
```

---

# Add Option to Group

### POST
`/api/catalogue/option-groups/:id/options`

### Description
Attaches a catalogue option to this group with a specific display order.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Request Body
```json
{
  "optionId": "opt_chicken",
  "displayOrder": 1
}
```

### Response
- **Status Code**: `201 Created`
- Returns updated `OptionGroupResponse`.

---

# Remove Option from Group

### DELETE
`/api/catalogue/option-groups/:id/options/:optionId`

### Description
Detaches an option from the option group.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Reorder Group Options

### PATCH
`/api/catalogue/option-groups/:id/options/reorder`

### Description
Reorders options within the group in a single transaction.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Request Body
```json
{
  "optionIds": ["opt_chicken", "opt_tofu", "opt_beef"]
}
```

### Response
- **Status Code**: `200 OK`

---

# Add Portion Size to Group

### POST
`/api/catalogue/option-groups/:id/portions`

### Description
Enables a portion size on a group that has `usesPortions: true`.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Request Body
```json
{
  "portionSizeId": "portion_large",
  "displayOrder": 1
}
```

### Response
- **Status Code**: `201 Created`

---

# Remove Portion Size from Group

### DELETE
`/api/catalogue/option-groups/:id/portions/:portionId`

### Description
Removes a portion size from the option group.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Response
- **Status Code**: `200 OK`

---

# Reorder Group Portions

### PATCH
`/api/catalogue/option-groups/:id/portions/reorder`

### Description
Reorders portion sizes within the option group.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_GROUPS` (ADMIN only).

### Request Body
```json
{
  "portionSizeIds": ["portion_regular", "portion_large"]
}
```

### Response
- **Status Code**: `200 OK`

---

### Section D: Reference Data (`/api/catalogue`)

# List Allergens

### GET
`/api/catalogue/allergens`

### Description
Lists all registered food allergens.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

### Response
- **Status Code**: `200 OK`

---

# Create Allergen

### POST
`/api/catalogue/allergens`

### Description
Creates a new allergen. Name must be unique.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

### Request Body
```json
{
  "name": "Mustard"
}
```

### Response
- **Status Code**: `201 Created`

---

# Update Allergen

### PATCH
`/api/catalogue/allergens/:id`

### Description
Updates allergen name or active status.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# List Dietary Tags

### GET
`/api/catalogue/dietary-tags`

### Description
Lists all registered dietary tags.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

---

# Create Dietary Tag

### POST
`/api/catalogue/dietary-tags`

### Description
Creates a new dietary tag (e.g. "Halal", "Kosher", "Vegan"). Name must be unique.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# Update Dietary Tag

### PATCH
`/api/catalogue/dietary-tags/:id`

### Description
Updates dietary tag name or active status.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# List Kitchen Stations

### GET
`/api/catalogue/kitchen-stations`

### Description
Lists all kitchen preparation stations (e.g. "Grill", "Salad & Cold Prep", "Bakery").

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

---

# Create Kitchen Station

### POST
`/api/catalogue/kitchen-stations`

### Description
Creates a kitchen preparation station.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# Update Kitchen Station

### PATCH
`/api/catalogue/kitchen-stations/:id`

### Description
Updates kitchen station name or active status.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# List Portion Sizes

### GET
`/api/catalogue/portion-sizes`

### Description
Lists all portion sizes (e.g. "Regular", "Large").

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_READ`.

---

# Create Portion Size

### POST
`/api/catalogue/portion-sizes`

### Description
Creates a new portion size.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

# Update Portion Size

### PATCH
`/api/catalogue/portion-sizes/:id`

### Description
Updates portion size name or active status.

### Authentication
Required.

### Authorization
`Permission.CATALOGUE_MANAGE_REFERENCE_DATA` (ADMIN only).

---

## Planned Endpoints

None. All catalogue endpoints are implemented.

---

## Enums

### `DishTemperature`
| Value | Description |
|---|---|
| `HOT` | Hot food requiring heated transport and hot-holding |
| `COLD` | Cold food requiring chilled transport |

---

## Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `409 Conflict: Dish with SKU already exists` | Duplicate SKU | SKUs must be unique across the platform. |
| `400 Bad Request: Invalid image file or type` | Non-image upload or file > 5MB | Upload a valid JPEG, PNG, or WebP under 5MB. |
| `400 Bad Request: Option group usesPortions rule violated` | Adding portions to a group where `usesPortions: false` | Set `usesPortions: true` on the option group first. |
