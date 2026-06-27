# Nest — Web

The Next.js 16 / React 19 web client for [Nest](../README.md), styled with
Tailwind CSS v4.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app talks to the Nest API (default `http://localhost:5000` via Docker
Compose). The API client lives in [`src/lib/api.ts`](src/lib/api.ts) and handles
JWT access/refresh token rotation automatically.

## Build

```bash
npm run build   # produces a standalone output for the Docker image
npm start
```

See the [root README](../README.md) for the full stack and how to run everything
together with Docker Compose.
