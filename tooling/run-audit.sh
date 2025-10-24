#!/usr/bin/env bash
set -euo pipefail
npm ci
npm run check || true
npm run build || true
npx semgrep scan --config p/owasp-top-ten --config p/nodejs --json > audits/semgrep.json || true
npm audit --omit=dev --json > audits/npm-audit.json || true
npx @cyclonedx/cyclonedx-npm --output audits/sbom.json --spec-version 1.5 || true
test -f audits/k6-script.js && (command -v k6 >/dev/null && k6 run audits/k6-script.js || node audits/k6-script.js || true)
