-- Seed initial tags from the previously hardcoded list
-- Run this after creating the tags table

INSERT INTO tags (name) VALUES
  ('Highlights'),
  ('Date Night'),
  ('Travel'),
  ('Home'),
  ('Celebration'),
  ('Food'),
  ('Adventure'),
  ('Family')
ON CONFLICT (name) DO NOTHING;
