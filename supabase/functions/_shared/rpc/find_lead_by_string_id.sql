
CREATE OR REPLACE FUNCTION public.find_lead_by_string_id(lead_string_id text)
 RETURNS TABLE(id bigint, phone1 text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Try to directly match with the string representation
  -- This handles the case where the ID column is already a UUID type
  RETURN QUERY 
  SELECT l.id::bigint, l.phone1 
  FROM leads l 
  WHERE l.id::text = lead_string_id::text;
  
  -- If no rows returned, try to convert string to numeric if possible
  IF NOT FOUND AND lead_string_id ~ '^[0-9]+$' THEN
    RETURN QUERY 
    SELECT l.id, l.phone1 
    FROM leads l 
    WHERE l.id = lead_string_id::bigint;
  END IF;
END;
$function$;
