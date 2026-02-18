-- Allow any authenticated user to update any bucket list item
-- (both users collaborate on the shared list)
CREATE POLICY "Authenticated users can update any item"
  ON bucket_list_items FOR UPDATE USING (auth.role() = 'authenticated');
