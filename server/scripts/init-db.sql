-- Run from the root `server` directory:
-- psql -d <database> -f scripts/init-db.sql

\echo 'Creating schema and seeding initial data...'

\i iem_lms.sql

\echo 'Database initialization complete.'
