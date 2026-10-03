# Project Context

## Overview
Fernleaf Kitchen Server is a backend API service for managing kitchen operations, staff roles, and dispatch workflows. It provides RESTful endpoints documented via Swagger/OpenAPI with schema validation and role-based data models.

## Technology Stack
- **Runtime & Package Manager**: Bun with Node.js ECMAScript Modules (`"type": "module"`)
- **Framework**: NestJS 12 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser`)
- **Language**: TypeScript 6 targeting ES2023 with NodeNext module resolution
- **Database & ORM**: PostgreSQL, Prisma 7 using `@prisma/adapter-pg` driver adapter
- **Validation**: `class-validator`, `class-transformer`
- **Security & Cryptography**: Argon2 (`argon2`) for password hashing, JWT (`@nestjs/jwt`) for session tokens
- **Linting & Formatting**: Oxlint (`oxlint`), Prettier
- **Testing**: Vitest 4 with Supertest

## Project Structure
- `prisma/`: Prisma schema (`schema.prisma`), Prisma 7 configuration (`prisma7.config.ts`), migrations, and seed script (`seed.ts`).
- `src/generated/prisma/`: Generated Prisma client code (`prisma-client` generator target).
- `src/common/`: Cross-cutting modules and shared utilities:
  - `prisma/`: `PrismaModule` and `PrismaService` extending the generated PrismaClient.
  - `utils/`: Reusable cross-cutting helpers:
    - `password/`: Argon2id password hashing and verification (`hashPassword`, `verifyPassword`).
    - `pagination/`: Server-side pagination calculations and response wrappers (`calculatePagination`, `createPaginatedResponse`).
    - `prisma/`: Prisma error inspection type guards (`isPrismaError`).
- `src/modules/`: Domain feature modules:
  - `user/`: Staff user management (controller, service, DTOs, response types).
  - `auth/`: Complete authentication and server-side authorization:
    - `auth.controller.ts`: Endpoints for login (`POST /auth/login`), profile (`GET /auth/me`), and logout (`POST /auth/logout`).
    - `auth.service.ts`: Credential verification via `UserService`, Argon2 comparison, minimal JWT generation.
    - `constants/`: Centralized permission mappings (`permissions.constant.ts`) and role permission checks.
    - `decorators/`: Reusable route decorators (`@CurrentUser()`, `@Roles(...)`, `@RequirePermissions(...)`).
    - `dto/`: Input validation DTOs (`LoginDto`).
    - `guards/`: Route protection guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`).
    - `strategies/`: Passport JWT strategy (`JwtStrategy`) with dual HTTP-only cookie and Bearer token extraction (`cookieExtractor`).
    - `types/`: Type definitions (`AuthenticatedUser`, `JwtPayload`, `Permission`).
- `src/main.ts`: Local server bootstrap with Swagger UI, CORS, cookie parser, and validation pipes.
- `src/index.ts`: Serverless Express handler for Vercel deployment.
- `test/`: End-to-end (E2E) integration test suites (`app.e2e-spec.ts`, `user.e2e-spec.ts`, `auth.e2e-spec.ts`).

## Architecture
- **Modular Domain Architecture**: Built on standard NestJS module separation (`AppModule` importing domain modules from `src/modules/`).
- **Database Connection Layer**: `PrismaService` extends `PrismaClient` configured with `@prisma/adapter-pg` using the `DATABASE_URL` connection string.
- **Request Lifecycle**: Global `ValidationPipe` configured with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- **Error Mapping**: Service-level try/catch blocks inspect Prisma errors with `isPrismaError(error, code)` to throw HTTP exceptions (`ConflictException` on `P2002`, `NotFoundException` on `P2025`). Authentication errors throw generic 401 exceptions (`UnauthorizedException('Invalid email or password')`) to prevent user enumeration.
- **Dual Deployment Targets**: Standalone HTTP server (`main.ts`) for local development/containers and lazy-initialized serverless adapter (`index.ts`) for Vercel.

## Application Entry Points
- **Local Development / Container**: `src/main.ts` — bootstraps Nest application with `cookie-parser`, Swagger at `/api`, CORS, and listens on `process.env.PORT ?? 8000`.
- **Vercel Serverless Function**: `src/index.ts` — exports default `handler(req, res)` wrapping Express adapter.

## Backend & API
- **Framework**: NestJS 12 with Express adapter (`@nestjs/platform-express`).
- **API Documentation**: Swagger/OpenAPI setup at `/api` using CDN-hosted assets (`swagger-ui-dist@5`), supporting both cookie and Bearer auth.
- **CORS Configuration**: Enabled with `credentials: true` restricted to `process.env.CLIENT_URL`.
- **Response Safety**: Database queries explicitly project fields via `USER_SELECT` to omit sensitive fields (such as `passwordHash`).

## Database
- **Engine**: PostgreSQL.
- **ORM & Configuration**: Prisma 7 configured in `prisma7.config.ts` and `prisma/schema.prisma`.
- **Generated Client**: Emitted to `src/generated/prisma` rather than `node_modules/@prisma/client`.
- **Migrations**: Stored in `prisma/migrations/`.
- **Seed Script**: `prisma/seed.ts` upserts default staff accounts across roles using Argon2 password hashing.

## Authentication & Authorization
- **Staff Roles**: Enumerated in schema as `ADMIN`, `KITCHEN`, `DISPATCH`, `DRIVER`.
- **Password Security**: Passwords hashed with Argon2id (`hashPassword`) and verified via `verifyPassword`.
- **JWT Storage**: Stored in HTTP-only cookies (`token`) for browser security; also supports `Authorization: Bearer <token>` for API clients and Swagger.
- **Minimal JWT Payload**: `{ sub: user.id, role: user.role }` — strictly minimal, never contains password hashes or personal sensitive data.
- **Active State Verification**: `JwtStrategy` loads the user fresh from the database on each authenticated request to ensure `isActive === true`.
- **Centralized Permission Registry**: Operational permissions (`Permission` enum) mapped to roles in `ROLE_PERMISSIONS`. Adding future roles requires updating this single dictionary without modifying controllers.
- **Server-Side Enforcement**: Enforced via `@UseGuards(JwtAuthGuard, RolesGuard)` or `@UseGuards(JwtAuthGuard, PermissionsGuard)`.

## Development Commands
- `bun run dev`: Start local development server with file watch mode (`nest start --watch`).
- `bun run build`: Generate Prisma client and compile NestJS to `dist/` (`prisma generate && nest build`).
- `bun run start:prod`: Launch production build (`node dist/main`).
- `bun run lint`: Run high-performance type-aware linting with Oxlint (`oxlint --type-aware src/ test/`).
- `bun run format`: Format code with Prettier (`prettier --write`).
- `bun run test`: Run unit tests with Vitest (`vitest run`).
- `bun run test:watch`: Run unit tests in interactive watch mode (`vitest`).
- `bun run test:cov`: Run unit tests with v8 code coverage reporting.
- `bun run test:e2e`: Run end-to-end tests against Nest testing application (`vitest run --config ./vitest.config.e2e.ts`).
- `bun run pri:gen`: Re-generate Prisma client to `src/generated/prisma`.
- `bun run pri:migrate`: Run Prisma migrations for development (`prisma migrate dev --preview-feature`).
- `bun run seed`: Run database seeder (`bun run prisma/seed.ts`).

## Environment Configuration
Required variables (see `.env.example`):
- `PORT`: HTTP server listen port (defaults to `8000`).
- `CLIENT_URL`: Allowed frontend client origin for CORS.
- `DATABASE_URL`: PostgreSQL connection string for Prisma driver adapter.
- `JWT_SECRET`: Secret key for signing JSON Web Tokens.
- `JWT_EXPIRES_IN`: JWT expiration lifespan (e.g. `1d`).
- `COOKIE_SECURE`: Optional boolean override for cookie `secure` flag.
- `COOKIE_SAME_SITE`: Optional SameSite cookie policy (`lax`, `strict`, `none`).

## Testing
- **Framework**: Vitest 4 with `vite-tsconfig-paths`.
- **Unit Tests**: Files matching `src/**/*.spec.ts` testing individual controllers, services, strategies, and guards with mock providers.
- **E2E Tests**: Files matching `test/**/*.e2e-spec.ts` testing full HTTP lifecycles, validation, database persistence, authentication, and RBAC authorization.

## Important Files
- `prisma/schema.prisma`: Data models (`User`), enums (`UserRole`), and client generation configuration.
- `prisma7.config.ts`: Prisma 7 configuration file for migrations, schema path, and datasource URL.
- `src/main.ts`: Main local application bootstrap with CORS, cookie parser, and Swagger configuration.
- `src/index.ts`: Vercel serverless entry point with Express adapter.
- `src/app.module.ts`: Root application module aggregating configuration, Prisma, and feature modules (`UserModule`, `AuthModule`).
- `src/common/prisma/prisma.service.ts`: Prisma client lifecycle service connecting via `@prisma/adapter-pg`.
- `src/common/utils/password/password.ts`: Shared Argon2id password hashing and verification utility.
- `src/common/utils/prisma/prisma-error.ts`: Type guard utility for Prisma error codes.
- `src/modules/user/user.service.ts`: User service managing CRUD, Argon2 password hashing, and pagination.
- `src/modules/auth/auth.service.ts`: Auth service managing credentials verification, Argon2 validation, and JWT issuing.
- `src/modules/auth/auth.controller.ts`: Auth controller exposing `/auth/login`, `/auth/me`, and `/auth/logout`.
- `src/modules/auth/guards/`: Reusable access guards (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`).
- `src/modules/auth/decorators/`: Route decorators (`@CurrentUser()`, `@Roles(...)`, `@RequirePermissions(...)`).
- `src/modules/auth/constants/permissions.constant.ts`: Centralized role-to-permission mapping dictionary.

## Conventions
- **Explicit ESM Extensions**: The project uses TypeScript `nodenext` module resolution. All relative imports must include the `.js` extension (e.g. `import { AppModule } from './app.module.js'`).
- **Prisma Client Imports**: Import Prisma types and client from `../../generated/prisma/client.js` or `../../generated/prisma/enums.js` rather than `@prisma/client`.
- **Input Validation**: All incoming payloads must use DTO classes decorated with `class-validator` rules.
- **Prisma Error Handling**: Guard database exceptions with `isPrismaError(error, 'P2002')` (unique constraint) or `isPrismaError(error, 'P2025')` (record not found) and rethrow appropriate NestJS HTTP exceptions.
- **Authentication Safety**: Generic error responses for login failures (`Invalid email or password`), never return password hashes, use HTTP-only cookies, and enforce authorization server-side.
