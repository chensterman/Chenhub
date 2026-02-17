-- Create a Postgres function to efficiently remove a tag from all scrapbook entries
-- This replaces the slow loop-based approach with a single SQL operation

CREATE OR REPLACE FUNCTION remove_tag_from_entries(tag_name_to_remove TEXT)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Update all entries that contain the tag
  -- array_remove() removes all occurrences of the tag from the tags array
  UPDATE scrapbook_entries
  SET tags = array_remove(tags, tag_name_to_remove)
  WHERE tags @> ARRAY[tag_name_to_remove]::TEXT[];
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT remove_tag_from_entries('TagName');
