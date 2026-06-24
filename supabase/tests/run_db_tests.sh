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

# Stub pg_cron (a Supabase extension) so the group-rotation migration's
# cron.schedule calls are no-ops in this throwaway cluster.
"${PSQL[@]}" -q -d reconnect_test -c "
  create schema if not exists cron;
  create table if not exists cron.job (jobname text);
  create or replace function cron.schedule(text, text, text) returns bigint language sql as \$\$ select 1::bigint \$\$;
  create or replace function cron.unschedule(text) returns boolean language sql as \$\$ select true \$\$;
"

"${PSQL[@]}" -q -d reconnect_test \
  -f "$SCRIPT_DIR/schema_min.sql" \
  -f "$SCRIPT_DIR/group_schema_min.sql" \
  -f "$MIGRATIONS/20260615000000_phase2_personalization.sql" \
  -f "$SEEDS/questions.sql" \
  -f "$MIGRATIONS/20260615000001_phase2_rotate_personalized.sql" \
  -f "$MIGRATIONS/20260615000004_phase5_group_rotation.sql" \
  -f "$SCRIPT_DIR/rotate_personalization.test.sql" \
  -f "$SCRIPT_DIR/rotate_group.test.sql"

echo "rotate_daily_questions() + rotate_group_questions() DB tests: PASS"

# ── Group RLS test (separate DB: needs RLS enabled + a non-superuser role) ─────
"${PSQL[@]}" -d postgres -c "CREATE DATABASE rls_test;" >/dev/null
"${PSQL[@]}" -q -d rls_test \
  -f "$SCRIPT_DIR/rls_auth_stub.sql" \
  -f "$SCRIPT_DIR/schema_min.sql" \
  -f "$MIGRATIONS/20260615000003_phase5_groups.sql" \
  -f "$SCRIPT_DIR/group_rls.test.sql"

echo "group RLS DB test: PASS"

# ── Streak engine test (24h window) ──────────────────────────────────────────
"${PSQL[@]}" -d postgres -c "CREATE DATABASE streak_test;" >/dev/null
"${PSQL[@]}" -q -d streak_test -c "
  create schema if not exists cron;
  create table if not exists cron.job (jobname text);
  create or replace function cron.schedule(text, text, text) returns bigint language sql as \$\$ select 1::bigint \$\$;
  create or replace function cron.unschedule(text) returns boolean language sql as \$\$ select true \$\$;
"
"${PSQL[@]}" -q -d streak_test \
  -f "$SCRIPT_DIR/schema_min.sql" \
  -f "$MIGRATIONS/20260413000000_phase3_streaks.sql" \
  -f "$MIGRATIONS/20260624000001_streak_24h_window.sql" \
  -f "$SCRIPT_DIR/streak.test.sql"

echo "streak engine (24h) DB test: PASS"
