-- Migration: create tags, article_tags, ai_classifications and seed from existing Category / Article slugs
-- Run as a single migration file. This includes DDL, useful indexes, and a safe seed block.
-- NOTE: This migration intentionally DOES NOT create any RLS policies.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- article_tags linking table
CREATE TABLE IF NOT EXISTS public.article_tags (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    article_id text NOT NULL,
    tag_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(article_id, tag_id),
    CONSTRAINT fk_article FOREIGN KEY (article_id) REFERENCES public."Article"(id) ON DELETE CASCADE,
    CONSTRAINT fk_tag FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);

-- ai_classifications table
CREATE TABLE IF NOT EXISTS public.ai_classifications (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    article_id text NOT NULL,
    suggestions jsonb NOT NULL,
    raw_response jsonb,
    applied boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes to support lookups and RLS later
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON public.article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON public.article_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_ai_classifications_article_id ON public.ai_classifications(article_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags( lower(name) );

-- Safe seed: import existing Category.slug and Article.slug values into tags and article_tags
-- This block only runs if the referenced tables/columns exist. It uses lower(trim(...)) for normalization
DO $$
BEGIN
    -- Seed tags from Category.slug if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Category' AND column_name = 'slug'
    ) THEN
        INSERT INTO public.tags (id, name)
        SELECT gen_random_uuid()::text, lower(trim(slug))
        FROM public."Category"
        WHERE slug IS NOT NULL
        ON CONFLICT (name) DO NOTHING;
    END IF;

    -- Seed tags from Article.slug and link articles to tags if Article.slug exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Article' AND column_name = 'slug'
    ) THEN
        -- Insert tag rows for article slugs
        INSERT INTO public.tags (id, name)
        SELECT gen_random_uuid()::text, lower(trim(slug))
        FROM public."Article"
        WHERE slug IS NOT NULL
        ON CONFLICT (name) DO NOTHING;

        -- Link articles to tags when slug matches tag name
        INSERT INTO public.article_tags (id, article_id, tag_id)
        SELECT gen_random_uuid()::text, a.id, t.id
        FROM public."Article" a
        JOIN public.tags t ON lower(trim(a.slug)) = t.name
        WHERE a.slug IS NOT NULL
        ON CONFLICT (article_id, tag_id) DO NOTHING;

    END IF;
END $$;

-- End of migration
