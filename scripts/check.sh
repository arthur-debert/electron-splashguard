#!/usr/bin/env bash
set -euo pipefail

echo "==> Lint"
npx eslint src/ test/ e2e/splash-guard.e2e.ts

echo "==> Type-check"
npx tsc --noEmit

echo "==> Build"
npx tsc

echo "==> Unit tests"
npx vitest run

echo "==> E2E tests"
npx playwright test

echo "==> All checks passed"
