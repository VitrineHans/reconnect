#!/usr/bin/env bash
# Run the rotate_daily_questions() DB test against a throwaway Postgres.
#
# Spins up a temporary, isolated Postgres cluster (its own data dir + unix
# socket, no TCP, nothing touching system services), loads the minimal schema +
# the REAL Phase 2 migration + REAL seed + REAL rotate function, runs the
# scenario assertions, then tears everything down. Exit code is non-zero if any
# assertion fails (psql runs with ON_ERROR_STOP=1).
#
# Requires `psql`/`initdb`/`pg_ctl` on PATH. With Homebrew:
#   brew install postgresql@17
#   export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$SCRIPT_DIR/../migrations"
SEEDS="$SCRIPT_DIR/../seeds"

for bin in initdb pg_ctl createdb psql; do
  command -v "$bin" >/dev/null 2>&1 || {
    echo "error: '$bin' not found on PATH. Install Postgres, e.g.:" >&2
    echo "  brew install postgresql@17 && export PATH=\"/opt/homebrew/opt/postgresql@17/bin:\$PATH\"" >&2
    exit 1
  }
done

PORT=5433
PGDATA="$(mktemp -d)"
SOCK="/tmp/rcn_pgtest_$$"
mkdir -p "$SOCK"

cleanup() {
  pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$PGDATA" "$SOCK"
}
trap cleanup EXIT

initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$PGDATA/server.log" -w start >/dev/null

PSQL=(psql -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -U postgres)
"${PSQL[@]}" -d postgres -c "CREATE DATABASE reconnect_test;" >/dev/null

"${PSQL[@]}" -q -d reconnect_test \
  -f "$SCRIPT_DIR/schema_min.sql" \
  -f "$MIGRATIONS/20260615000000_phase2_personalization.sql" \
  -f "$SEEDS/questions.sql" \
  -f "$MIGRATIONS/20260615000001_phase2_rotate_personalized.sql" \
  -f "$SCRIPT_DIR/rotate_personalization.test.sql"

echo "rotate_daily_questions() DB test: PASS"
