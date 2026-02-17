-- Create shared tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tags
CREATE POLICY "Anyone can view tags"
  ON tags
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create tags
CREATE POLICY "Authenticated users can create tags"
  ON tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can delete tags they created
CREATE POLICY "Users can delete their own tags"
  ON tags
  FOR DELETE
  USING (auth.uid() = created_by);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
