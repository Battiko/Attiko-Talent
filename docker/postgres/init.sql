-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;  -- Metaphone/Soundex for identity resolution

-- Create spatial index on artists.geo_point (run after Drizzle migration)
-- This is idempotent; the migration creates the table first.
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'artists') THEN
    CREATE INDEX IF NOT EXISTS artists_geo_point_gist
      ON artists USING GIST (geo_point);
  END IF;
END $$;
