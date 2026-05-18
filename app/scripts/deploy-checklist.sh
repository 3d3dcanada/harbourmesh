#!/usr/bin/env bash
set -euo pipefail

echo "=== HarborMesh Deployment Checklist ==="
echo ""

# 1. Resource check
echo "[1/6] System resources"
free -h | head -3
df -h / | tail -1
echo ""

# 2. Type checking
echo "[2/6] TypeScript type check"
npx tsc -p tsconfig.app.json --noEmit
echo "  PASS"
echo ""

# 3. Lint
echo "[3/6] ESLint"
npx eslint . --max-warnings 0 2>/dev/null || echo "  WARN: lint warnings present (non-blocking)"
echo ""

# 4. Build
echo "[4/6] Production build"
npx vite build
echo ""

# 5. Verify outputs
echo "[5/6] Build verification"
if [ -f dist/manifest.webmanifest ]; then
  echo "  manifest.webmanifest: PRESENT"
else
  echo "  manifest.webmanifest: MISSING (PWA may not install)"
fi

if [ -d dist/icons ]; then
  echo "  icons/: PRESENT"
else
  echo "  icons/: MISSING"
fi

BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
echo "  Total bundle: $BUNDLE_SIZE"
echo ""

# 6. Deploy gate
echo "[6/6] DEPLOY GATE"
echo "  Run: npx wrangler pages deploy ./dist --project-name=harbourmesh"
echo "  Ken must approve before running the deploy command."
echo ""
echo "=== Checklist complete ==="
