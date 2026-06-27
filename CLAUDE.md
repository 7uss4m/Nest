## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

---

## Project overview

Walli is a personal finance app — monorepo with three layers:

| Layer | Stack | Location |
|---|---|---|
| Backend API | .NET 10, EF Core 10, PostgreSQL | `backend/` |
| Web | Next.js 16, React 19, TypeScript | `web/` |
| Mobile | Flutter 3, Riverpod 3, Dio | `mobile/` |

Infrastructure (Postgres, MinIO) runs via `docker-compose.yml`.

---

## Running locally

```bash
# Infrastructure
docker compose up -d postgres minio minio-init

# Backend (port 5000)
cd backend
dotnet run --project Nest.Api

# Web (port 3000)
cd web
npm install && npm run dev

# Mobile (connect to http://10.0.2.2:5000 on Android emulator)
cd mobile
flutter run
```

To enable Swagger UI locally:
```bash
cd backend
Swagger__Enabled=true dotnet run --project Nest.Api
# then open http://localhost:5000
```

---

## Architecture

### Backend

Clean-ish layered architecture — not strict DDD, but domain-oriented:

- `Nest.Domain` — entities, value objects (`Money`), enums. No dependencies.
- `Nest.Application` — DTOs, interface `INestDbContext`. No EF Core dependency.
- `Nest.Infrastructure` — EF Core `NestDbContext`, migrations, configurations.
- `Nest.Api` — controllers, helpers, `Program.cs`. Thin; logic lives in controllers for now.

Controllers follow the pattern: authorize → query DB → map to DTO → return. `CurrencyHelper` in `Nest.Api/Helpers/` is the one shared utility for mapping `decimal + string → MoneyDto`.

### Web

Each feature is a single page component under `web/src/app/(dashboard)/`. No global state management — pages fetch their own data with `useEffect`. Shared API client is `web/src/lib/api.ts`. Shared types and formatters are `web/src/lib/utils.ts`.

### Mobile

Riverpod for state. All DTOs and the API client are in `mobile/lib/core/api/nest_api.dart` (one file — intentional for now). Each feature screen is `mobile/lib/features/<name>/<name>_screen.dart`.

---

## API contract

### MoneyDto

Money is serialized as `{ amount, currencyCode }`. The backend produces this via `CurrencyHelper.ToMoney()` in every controller that returns monetary values.

**Rule: never access `money.amount` or `money.currencyCode` directly in UI code.** Always format through the central helper:

- Web: `formatMoney(money)` from `web/src/lib/utils.ts`
- Mobile: `formatMoney(money)` from `mobile/lib/core/api/nest_api.dart`

Currency display precision (decimal places) comes from `WorkspaceCurrency.DecimalPlaces` in workspace settings. For display in lists, `Intl.NumberFormat` / `formatCurrency` defaults are used. Pages that need custom precision pass it explicitly to `formatCurrency(amount, code, decimals)`.

### CurrencyDto

`WorkspaceDto` always includes `currencies: CurrencyDto[]` (with `decimalPlaces`). Pages that need to format with workspace-configured precision look it up from there — not from `MoneyDto`.

---

## Code generation

The DTO types (`MoneyDto`, `CurrencyDto`, etc.) are defined once in C# and need to stay in sync with the TypeScript and Dart clients. We use OpenAPI generation to automate this.

### When to run

After any change to a backend DTO (adding/removing/renaming fields).

### How to run

```bash
# 1. Start backend with Swagger enabled
cd backend && Swagger__Enabled=true dotnet run --project Nest.Api

# 2. In another terminal, from repo root:
./scripts/generate-api-types.sh
```

This:
1. Fetches `/swagger/v1/swagger.json` from the running backend
2. Generates `web/src/lib/api-types.generated.ts` using `openapi-typescript`
3. Generates Dart model classes into `mobile/lib/core/api/generated/`

### After generation — web

`api-types.generated.ts` exports all schemas under `components["schemas"]`. In `utils.ts`, replace the manual interface definitions with:

```typescript
import type { components } from "./api-types.generated";
export type MoneyDto    = components["schemas"]["MoneyDto"];
export type CurrencyDto = components["schemas"]["CurrencyDto"];
// etc.
```

### After generation — mobile

Generated Dart classes land in `mobile/lib/core/api/generated/`. Import them into `nest_api.dart` or directly into screens, replacing the hand-written classes. If the generated code uses `json_serializable`, run:

```bash
cd mobile && dart run build_runner build --delete-conflicting-outputs
```

### What this prevents

Without generation, a single DTO change (add/remove a field) requires manually editing:
- The C# record
- The TypeScript interface in `utils.ts`
- The Dart class in `nest_api.dart`
- Every screen that directly accesses the removed field

With generation: change the C# record → run the script → fix compile errors only where the shape is consumed.

---

## Database

EF Core Code-First. Migration workflow:

```bash
cd backend
dotnet ef migrations add <Name> --project Nest.Infrastructure --startup-project Nest.Api
dotnet ef database update --project Nest.Infrastructure --startup-project Nest.Api
```

Migrations run automatically on startup (`db.Database.MigrateAsync()`).

Amount columns use `numeric(18,4)` precision. All entity IDs are `Guid`.

---

## Key conventions

- Controllers never return raw `decimal` for monetary values — always `MoneyDto` via `CurrencyHelper.ToMoney()`.
- `CurrencyHelper.LoadDefaultCodeAsync()` is the only DB call allowed for currency resolution in controllers.
- No business logic in controllers — query, map, return.
- Flutter screens use `formatMoney()` / `formatCurrency()` for all display; never call `.toString()` or string interpolation on money amounts.
- Authentication is JWT (access + refresh tokens). `localStorage` on web, `flutter_secure_storage` on mobile.
