#!/bin/sh
# npm run db:sql — builds db/supabase.sql: schema + the demo data from a freshly seeded local DB,
# ready to paste into Supabase → SQL Editor. Run `npm run db:setup` first.
set -e
URL="${DATABASE_URL:-postgres://app:app@localhost:5432/adebietlab}"
{
  cat db/schema.sql
  echo
  echo "-- Демо деректер (npm run db:setup нәтижесі)"
  pg_dump "$URL" --data-only --schema=app --inserts --no-owner --no-privileges | grep -v '^--' | grep -v '^$' | grep -v '^\\' | grep -v '^SELECT pg_catalog.set_config'
  echo "set search_path = app, public;"
  echo "-- The app's tables live in schema app; the pooler may drop the client's search_path option."
  echo 'alter role current_user in database postgres set search_path = "$user", public, extensions, app;'
} > db/supabase.sql
echo "db/supabase.sql дайын."
