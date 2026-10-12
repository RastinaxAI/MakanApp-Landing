#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 <<'SQL'
\getenv owner_password MIGRATION_DB_PASSWORD
\getenv api_password API_DB_PASSWORD
SELECT format('CREATE ROLE makan_migrator LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'owner_password') \gexec
SELECT format('CREATE ROLE makan_api LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'api_password') \gexec
SELECT format('ALTER DATABASE %I OWNER TO makan_migrator', current_database()) \gexec
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO makan_migrator;
GRANT USAGE ON SCHEMA public TO makan_api;
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO makan_api', current_database()) \gexec
SQL
