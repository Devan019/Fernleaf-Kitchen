# Project Context

## Overview
Fernleaf Kitchen Server is a backend API service for managing kitchen operations, staff roles, and dispatch workflows. It provides RESTful endpoints documented via Swagger/OpenAPI with schema validation and role-based data models.

## Technology Stack
- **Runtime & Package Manager**: Bun with Node.js ECMAScript Modules (`"type": "module"`)
- **Framework**: NestJS 12 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/swagger`)
- **Language**: TypeScript 6 targeting ES2023 with NodeNext module resolution
- **Database & ORM**: PostgreSQL, Prisma 7 using `@prisma/adapter-pg` driver adapter
- **Validation**: `class-validator`, `class-transformer`
- **Security & Cryptography**: Argon2 (`argon2`) for password hashing
- **Linting & Formatting**: Oxlint (`oxlint`), Prettier
- **Testing**: Vitest 4 with Supertest

## Project Structure
- `prisma/`: Prisma schema (`schema.prisma`), Prisma 7 configuration (`prisma7.config.ts`), migrations, and seed script (`seed.ts`).
- `src/generated/prisma/`: Generated Prisma client code (`prisma-client` generator target).
- `src/common/`: Cross-cutting modules and utilities:
  - `prisma/`: `PrismaModule` and `PrismaService` extending the generated PrismaClient.
  - `utils/`: Password hashing (`argon2`), pagination calculations, and Prisma error helpers.
- `src/module/`: Domain feature modules (e.g., `user/` containing controller, service, DTOs, and response types).
- `src/main.ts`: Local server bootstrap with Swagger UI and CORS.
- `src/index.ts`: Serverless Express handler for Vercel deployment.
- `test/`: End-to-end (E2E) integration test suites.

## Architecture
- **Modular Domain Architecture**: Built on standard NestJS module separation (`AppModule` importing feature modules under `src/module/`).
- **Database Connection Layer**: `PrismaService` extends `PrismaClient` configured with `@prisma/adapter-pg` using the `DATABASE_URL` connection string.
- **Request Lifecycle**: Global `ValidationPipe` configured with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- **Error Mapping**: Service-level try/catch blocks inspect Prisma errors with `isPrismaError(error, code)` to throw HTTP exceptions (`ConflictException` on `P2002`, `NotFoundException` on `P2025`).
- **Dual Deployment Targets**: Standalone HTTP server (`main.ts`) for local development/containers and lazy-initialized serverless adapter (`index.ts`) for Vercel.

## Application Entry Points
- **Local Development / Container**: `src/main.ts` — bootstraps Nest application and listens on `process.env.PORT ?? 8000`.
- **Vercel Serverless Function**: `src/index.ts` — exports default `handler(req, res)` wrapping Express adapter.

## Backend
- **Framework**: NestJS 12 with Express adapter (`@nestjs/platform-express`).
- **API Documentation**: Swagger/OpenAPI setup at `/api` using CDN-hosted assets (`swagger-ui-dist@5`).
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
- **Password Security**: Passwords hashed with Argon2id (`argon2.hash`) before database persistence.
- **Projection Guard**: Sensitive fields are stripped at query time using typed select objects.

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

## Testing
- **Framework**: Vitest 4 with `vite-tsconfig-paths`.
- **Unit Tests**: Files matching `src/**/*.spec.ts` testing individual controllers, services, and utilities with mock providers.
- **E2E Tests**: Files matching `test/**/*.e2e-spec.ts` using `@nestjs/testing` and `supertest`.

## Important Files
- `prisma/schema.prisma`: Data models (`User`), enums (`UserRole`), and client generation configuration.
- `prisma7.config.ts`: Prisma 7 configuration file for migrations, schema path, and datasource URL.
- `src/main.ts`: Main local application bootstrap with CORS and Swagger configuration.
- `src/index.ts`: Vercel serverless entry point with Express adapter.
- `src/app.module.ts`: Root application module aggregating configuration, Prisma, and domain modules.
- `src/common/prisma/prisma.service.ts`: Prisma client lifecycle service connecting via `@prisma/adapter-pg`.
- `src/common/utils/prisma/prisma-error.ts`: Type guard utility for Prisma error codes.
- `src/module/user/user.service.ts`: User service managing CRUD, Argon2 password hashing, and pagination.

## Conventions
- **Explicit ESM Extensions**: The project uses TypeScript `nodenext` module resolution. All relative imports must include the `.js` extension (e.g. `import { AppModule } from './app.module.js'`).
- **Prisma Client Imports**: Import Prisma types and client from `../../generated/prisma/client.js` or `../../generated/prisma/enums.js` rather than `@prisma/client`.
- **Input Validation**: All incoming payloads must use DTO classes decorated with `class-validator` rules.
- **Prisma Error Handling**: Guard database exceptions with `isPrismaError(error, 'P2002')` (unique constraint) or `isPrismaError(error, 'P2025')` (record not found) and rethrow appropriate NestJS HTTP exceptions.
