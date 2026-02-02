-- 🚨 NUCLEAR OPTION: DISABLE RLS 🚨
-- This removes ALL permission checks from the table.
-- Anyone with the API URL and Key (anon or authenticated) can Read, Create, Update, and Delete.

-- 1. Disable Row Level Security
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;

-- 2. Grant FULL permissions to EVERYONE (Anon and Authenticated)
GRANT ALL ON collections TO anon;
GRANT ALL ON collections TO authenticated;
GRANT ALL ON collections TO service_role;

-- 3. Grant Sequence permissions (for ID generation)
GRANT USAGE, SELECT ON SEQUENCE collections_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE collections_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE collections_id_seq TO service_role;

-- 4. Just in case RLS re-enables, remove all restricting policies
DROP POLICY IF EXISTS "Enable read access for all users" ON collections;
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON collections;
DROP POLICY IF EXISTS "Authenticated Admin Access" ON collections;
DROP POLICY IF EXISTS "Public Read Access" ON collections;

-- Confirmation
SELECT 'RLS Disabled and Full Access Granted' as result;
