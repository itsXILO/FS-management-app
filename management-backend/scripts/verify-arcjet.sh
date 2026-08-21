#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/tmp/arcjet-verify.log"

cd "$ROOT_DIR"
rm -f "$LOG_FILE"

ARCJET_LOG_LEVEL=debug npx tsx -e "import aj from './src/config/arcjet.ts'; import { slidingWindow } from '@arcjet/node'; const client = aj.withRule(slidingWindow({ mode: 'LIVE', interval: '1m', max: 2 })); const req = { headers: { host: 'localhost:4000', 'user-agent': 'curl/8.0' }, method: 'GET', url: '/api/subjects', socket: { remoteAddress: '127.0.0.1' } } as any; (async () => { for (let i = 1; i <= 3; i++) { const d = await client.protect(req); console.log(JSON.stringify({ i, conclusion: d.conclusion, denied: d.isDenied(), reasonType: d.reason?.type, ttl: d.ttl })); } })();" >"$LOG_FILE" 2>&1

HAS_DENY=0
if grep -q '"conclusion":"DENY"' "$LOG_FILE"; then
  HAS_DENY=1
fi

HAS_BOT_REASON=0
if grep -q '"reasonType":"BOT"' "$LOG_FILE"; then
  HAS_BOT_REASON=1
fi

HAS_REPORT=0
if grep -q 'Report request to https://decide.arcjet.com' "$LOG_FILE"; then
  HAS_REPORT=1
fi

echo "Arcjet verify checks: deny=$HAS_DENY bot_reason=$HAS_BOT_REASON report=$HAS_REPORT"

if [[ "$HAS_DENY" -eq 1 && "$HAS_BOT_REASON" -eq 1 && "$HAS_REPORT" -eq 1 ]]; then
  echo "PASS: Arcjet is active, denying bot traffic, and sending telemetry."
  exit 0
fi

echo "FAIL: Arcjet verification failed."
echo "--- last logs ---"
tail -n 160 "$LOG_FILE" || true
exit 1
