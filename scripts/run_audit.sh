#!/usr/bin/env bash
set -euo pipefail

OUT="audit"
LOG="$OUT/logs"
mkdir -p "$LOG"

echo "== env ==" | tee "$LOG/env.txt"
echo "Node: $(node -v)" | tee -a "$LOG/env.txt"
echo "NPM:  $(npm -v)"  | tee -a "$LOG/env.txt"

echo "== install deps (read-only) =="
if [ -f package-lock.json ]; then
  npm ci || npm install
else
  npm install
fi

echo "== type-check =="
# capture output even if there are errors
( npm run check || true ) 2>&1 | tee "$LOG/tsc.txt"

echo "== build (frontend + bundle server) =="
( npm run build || true ) 2>&1 | tee "$LOG/build.txt"

echo "== scan for demo/mock/sample/etc =="
rg -n --hidden --glob '!node_modules' -i '(demo|sample|playground|dummy|mock|fixture|lorem|hello world)' \
  > "$LOG/mock_hits.txt" || true

echo "== coating system sanity =="
# duplicate definitions
rg -n "async getCoatingSystems|async createCoatingSystem" server/storage.ts \
  > "$LOG/coating_dupes.txt" || true
# routes present
rg -n "/api/coating-systems" server/routes.ts > "$LOG/coating_routes.txt" || true

echo "== routes health endpoint present? =="
rg -n "/api/health" server/routes.ts > "$LOG/health_route.txt" || true

echo "== commented test endpoints =="
rg -n --hidden --glob '!node_modules' -i 'templates/test-(pdf|system)' server/routes.ts \
  > "$LOG/commented_test_endpoints.txt" || true

echo "== npm audit (don’t auto-fix) =="
( npm audit --json || true ) > "$LOG/npm_audit.json"

echo "== quick summary =="
python3 - <<'PY' > "$OUT/SUMMARY.txt"
from pathlib import Path
p = Path("audit/logs")
def read(path): 
    fp = p/path
    return (fp.read_text() if fp.exists() else "").strip()

print("# Audit Summary\n")
# TypeScript errors count
ts = read("tsc.txt")
ts_errors = 0
if ts:
    import re
    m = re.search(r"Found (\d+) errors? in (\d+) files?", ts)
    if m: ts_errors = int(m.group(1))
print(f"- TypeScript errors: {ts_errors}")

# Build success?
build = read("build.txt")
built_ok = "built in" in build
print(f"- Build produced bundles: {'yes' if built_ok else 'no'}")

# Mock/demo hits
mock_hits = read("mock_hits.txt").splitlines()
print(f"- Files with demo/mock/sample/etc: {len(mock_hits)} lines matched")
if mock_hits:
    print("  (See audit/logs/mock_hits.txt)")

# Coating system dupes
dupes = read("coating_dupes.txt").splitlines()
print(f"- CoatingSystem duplicate method defs: {'found' if dupes else 'none'}")

# Health route presence
health = read("health_route.txt").strip()
print(f"- Health route declared: {'yes' if health else 'no (add /api/health)'}")

# Commented test endpoints
tests = read("commented_test_endpoints.txt").splitlines()
print(f"- Commented test endpoints in routes.ts: {len(tests)} matches")

# NPM audit quick glance
import json, os
audit_json = read("npm_audit.json")
sev_counts = {}
if audit_json:
    try:
        data = json.loads(audit_json)
        advisories = data.get("vulnerabilities") or {}
        # npm v7+ format has summary at "metadata" -> "vulnerabilities"
        meta = data.get("metadata", {}).get("vulnerabilities", {})
        if meta:
            sev_counts = meta
    except Exception:
        pass
if sev_counts:
    print("- npm audit severities:", sev_counts)
else:
    print("- npm audit: see audit/logs/npm_audit.json")

print("\nArtifacts written to ./audit/")
PY

echo "Done. See ./audit/ for results."
