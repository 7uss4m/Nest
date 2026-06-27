# Nest

A self-hostable personal finance tracker: accounts, transactions, budgets, planned
payments, assets, liabilities, and a net-worth dashboard — with multi-currency
support, receipt storage, and push notifications.

Nest is built as a clean, three-surface application:

- **Backend** — ASP.NET Core (.NET 10) REST API in a Clean Architecture layout
- **Web** — Next.js 16 / React 19 dashboard styled with Tailwind CSS v4
- **Mobile** — Flutter app (Riverpod + Dio) sharing the same API

> **Status:** Active development. The backend API and the web/mobile UI layers are in
> place; some modules are still being wired end-to-end.

## Architecture

```
Nest/
├── backend/            ASP.NET Core 10 API (Clean Architecture)
│   ├── Nest.Domain/         entities, enums, domain logic
│   ├── Nest.Application/     use cases, DTOs, interfaces
│   ├── Nest.Infrastructure/ EF Core 10 + PostgreSQL, migrations, services
│   └── Nest.Api/            controllers, auth, composition root
├── web/                Next.js 16 + React 19 + Tailwind v4
├── mobile/             Flutter app (Riverpod, Dio)
├── infra/              nginx / MinIO config
└── docker-compose.yml  Postgres, MinIO, API, web
```

### Tech stack

| Layer    | Technology                                              |
|----------|--------------------------------------------------------|
| Backend  | ASP.NET Core 10, EF Core 10, Npgsql                    |
| Database | PostgreSQL 17                                          |
| Auth     | JWT (15-min access + 30-day refresh token rotation)    |
| Storage  | MinIO (S3-compatible) for receipts & attachments       |
| Notify   | [ntfy](https://ntfy.sh) push notifications             |
| Web      | Next.js 16, React 19, Tailwind CSS v4                  |
| Mobile   | Flutter, Riverpod, Dio                                 |

### API surface

Auth · Workspaces · Accounts · Transactions · Transaction Templates · Categories ·
Budgets · Planned Payments · Assets · Liabilities · Exchange Rates · Attachments ·
Dashboard.

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- For local (non-Docker) development: [.NET 10 SDK](https://dotnet.microsoft.com/),
  [Node.js 22+](https://nodejs.org/), and the [Flutter SDK](https://docs.flutter.dev/)

### Run with Docker Compose

```bash
# 1. Copy the env template and fill in your secrets
cp .env.example .env
#    → set JWT_KEY to a random string of at least 32 characters
#    → set POSTGRES_PASSWORD / MINIO_ROOT_PASSWORD for anything non-local
#    → optionally set NTFY_URL / NTFY_TOKEN

# 2. Start the stack
docker compose up --build
```

This brings up:

| Service  | URL                     |
|----------|-------------------------|
| Web      | http://localhost:3000   |
| API      | http://localhost:5000   |
| Postgres | localhost:25432         |
| MinIO    | http://localhost:9001 (console) |

Database migrations run automatically on API startup.

> **Tip:** when building the images, pass `--provenance=false` if the BuildKit
> provenance step hangs on Docker Desktop.

### Local development

**Backend**

```bash
cd backend
dotnet run --project Nest.Api
```

**Web**

```bash
cd web
npm install
npm run dev
```

**Mobile**

```bash
cd mobile
flutter pub get
flutter run
```

The mobile app's API base URL is set in
[`mobile/lib/core/api/nest_api.dart`](mobile/lib/core/api/nest_api.dart)
(`10.0.2.2` targets the host machine from the Android emulator; use your host's
LAN IP for a physical device).

## Configuration

All secrets and environment-specific settings are supplied via environment
variables (see [`.env.example`](.env.example)). No real credentials are committed
to this repository — the values in `appsettings.json` and `docker-compose.yml` are
local development defaults and **must** be changed for any deployment.

## License

Licensed under the **GNU Affero General Public License v3.0**. See [LICENSE](LICENSE).
