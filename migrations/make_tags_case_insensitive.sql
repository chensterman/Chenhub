-- Make tag names case-insensitive by adding a unique constraint on lowercase name
-- This prevents duplicates like "Work" and "work"

-- Drop the old unique constraint on name
ALTER TABLE tags
DROP CONSTRAINT IF EXISTS tags_name_key;

-- Create a case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS tags_name_lower_unique 
ON tags (LOWER(name));
