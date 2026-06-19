-- ===========================================
-- Iron Loot - Database Initialization Script
-- ===========================================
-- This script runs on first container startup
-- Creates extensions and initial schema setup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON DATABASE ironloot_db TO ironloot;

-- Create schemas for organization (optional, can use public)
-- CREATE SCHEMA IF NOT EXISTS audit;
-- GRANT ALL ON SCHEMA audit TO ironloot;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Iron Loot database initialized at %', NOW();
END $$;
