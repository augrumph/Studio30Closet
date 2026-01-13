-- Create execute_sql function for AI queries
-- This function allows the edge function to execute dynamic SELECT queries

CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  clean_query text;
BEGIN
  -- Remove trailing semicolons and whitespace
  clean_query := TRIM(TRAILING ';' FROM TRIM(query));

  -- Security: Only allow SELECT statements
  IF clean_query !~* '^\s*SELECT' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Security: Block dangerous operations (using word boundaries to avoid false positives)
  IF clean_query ~* '\m(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\M' THEN
    RAISE EXCEPTION 'Dangerous operations are not allowed';
  END IF;

  -- Execute the query and return result as JSON
  EXECUTE format('SELECT jsonb_agg(row_to_json(t.*)) FROM (%s) t', clean_query) INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
