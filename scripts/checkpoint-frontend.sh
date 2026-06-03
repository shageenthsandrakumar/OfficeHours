#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
echo "== npm install =="
npm install
echo "== npm run build =="
npm run build
cd "$ROOT"
echo "== git status =="
git status
BRANCH=$(git branch --show-current)
echo "== branch: $BRANCH =="
git add frontend/ docs/FRONTEND_IMPLEMENTATION.md docs/SUGGESTED_NEXT_STEP.md
git status
if git diff --cached --quiet; then
  echo "Nothing staged to commit."
  exit 0
fi
git commit -m "$(cat <<'EOF'
feat(frontend): signal discovery UI, dual-lens modes, and onboarding flow

Add Next.js frontend with mentor/reviewer product modes, investigation
experience, surface-vs-hidden signals, reasoning timeline, and demo
onboarding (intake → analysis → mock investigation). No backend wiring yet.
EOF
)"
git push origin HEAD
echo "== post-push =="
git status
git log -1 --format="commit: %H%n%s"
