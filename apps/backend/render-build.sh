#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Render.com build script for AM Mart backend
# Runs with CWD = apps/backend (Render Root Directory setting)
# Uses pnpm to avoid npm's invalid-version error on the monorepo root
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "==> Installing pnpm..."
npm install -g pnpm@9 --quiet

echo "==> Moving to monorepo root..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing backend dependencies..."
pnpm install --filter backend...

echo "==> Generating Prisma client..."
cd "$SCRIPT_DIR"
npx prisma generate

echo "==> Pushing database schema..."
npx prisma db push --accept-data-loss

echo "==> Building NestJS app..."
pnpm run build

echo "==> Build complete ✅"
