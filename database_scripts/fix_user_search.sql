-- Create an RPC to search users by the first few characters of their UUID (ID)
CREATE OR REPLACE FUNCTION search_profiles_by_id_prefix(prefix text)
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Cast ID to text and perform a case-insensitive prefix match
  SELECT * FROM profiles 
  WHERE id::text ILIKE prefix || '%'
  OR username ILIKE prefix || '%'
  LIMIT 5;
$$;
