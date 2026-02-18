CREATE TABLE bucket_list_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all items"
  ON bucket_list_items FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own items"
  ON bucket_list_items FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update any item"
  ON bucket_list_items FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own items"
  ON bucket_list_items FOR DELETE USING (auth.uid() = created_by);
