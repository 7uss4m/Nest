#!/usr/bin/env bash
# Generates TypeScript types (web) and Dart models (mobile) from the backend OpenAPI spec.
#
# Prerequisites:
#   - Backend running locally with Swagger enabled (see below)
#   - Node.js + npx available
#
# Start the backend with Swagger on:
#   cd backend
#   Swagger__Enabled=true dotnet run --project Nest.Api
#
# Then run this script from the repo root:
#   ./scripts/generate-api-types.sh
#   API_URL=http://localhost:5000 ./scripts/generate-api-types.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-http://localhost:5000}"
SPEC_URL="$API_URL/swagger/v1/swagger.json"
SPEC_FILE="$REPO_ROOT/scripts/nest-api-spec.json"

# ── 1. Fetch spec ──────────────────────────────────────────────────────────────

echo "→ Fetching OpenAPI spec from $SPEC_URL ..."
if ! curl -sf "$SPEC_URL" -o "$SPEC_FILE"; then
  echo ""
  echo "ERROR: Could not reach $SPEC_URL"
  echo ""
  echo "Start the backend with Swagger enabled, then retry:"
  echo "  cd backend && Swagger__Enabled=true dotnet run --project Nest.Api"
  exit 1
fi
echo "  Saved to scripts/nest-api-spec.json"

# ── 2. Web — TypeScript types ──────────────────────────────────────────────────

echo ""
echo "→ Generating TypeScript types for web..."
cd "$REPO_ROOT/web"
npx --yes openapi-typescript "$SPEC_FILE" -o src/lib/api-types.generated.ts
echo "  Written to web/src/lib/api-types.generated.ts"
cd "$REPO_ROOT"

# ── 3. Mobile — Dart models ────────────────────────────────────────────────────

echo ""
echo "→ Generating Dart models for mobile..."
npx --yes @openapitools/openapi-generator-cli generate \
  -i "$SPEC_FILE" \
  -g dart \
  -o "$REPO_ROOT/mobile/lib/core/api/generated" \
  --additional-properties=pubName=nest,nullableFields=true,useEnumExtension=true \
  --global-property=models,modelTests=false,modelDocs=false \
  --skip-validate-spec
echo "  Written to mobile/lib/core/api/generated/"

# ── Done ───────────────────────────────────────────────────────────────────────

echo ""
echo "✓ Generation complete."
echo ""
echo "Next steps:"
echo "  web:    Import types from @/lib/api-types.generated — see web/src/lib/utils.ts"
echo "  mobile: Generated classes are in mobile/lib/core/api/generated/"
echo "          Run: cd mobile && dart run build_runner build --delete-conflicting-outputs"
