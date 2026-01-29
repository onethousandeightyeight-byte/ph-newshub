-- Add embedding column to tags and create article_tags & ai_classifications tables
-- Assumes tags table exists; adjust table names if different.

-- Add embedding vector column to tags (384 dims for gte-small)
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);

-- Add ai_classifications table to store suggestions
-- Using TEXT for IDs to match the existing schema (gen_random_uuid()::text)
CREATE TABLE IF NOT EXISTS public.ai_classifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  article_id text NOT NULL,
  suggestions jsonb NOT NULL,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure article_tags exists (many-to-many between articles and tags)
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id text NOT NULL,
  tag_id text NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES public."Article"(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);
