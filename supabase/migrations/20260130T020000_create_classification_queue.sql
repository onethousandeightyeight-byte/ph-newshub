
-- Migration: classification queue, helper RPC, trigger to enqueue articles

-- 1) Create classification_queue
CREATE TABLE IF NOT EXISTS public.classification_queue (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  article_id text NOT NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_classification_queue_processed_enqueued_at ON public.classification_queue(processed, enqueued_at);

-- 2) Helper upsert RPC for article_tags (to avoid race conditions)
-- Creates or ignores duplicate (article_id, tag_id)
-- Adjusted to use text for p_tag_id to match our schema where IDs are text
CREATE OR REPLACE FUNCTION public.upsert_article_tag(p_article_id text, p_tag_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.article_tags (article_id, tag_id)
  VALUES (p_article_id, p_tag_id)
  ON CONFLICT (article_id, tag_id) DO NOTHING;
END;
$$;

-- 3) Enqueue trigger function
CREATE OR REPLACE FUNCTION public.enqueue_article_for_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.classification_queue (article_id) VALUES (NEW.id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if relevant fields changed 
    -- Note: 'content' column might be 'contentBody' in our schema. 
    -- Adjusting to match our schema: 'contentBody' and 'title'.
    IF (NEW.title IS DISTINCT FROM OLD.title) OR (NEW."contentBody" IS DISTINCT FROM OLD."contentBody") THEN
      INSERT INTO public.classification_queue (article_id) VALUES (NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- 4) Attach trigger to Article table (adjust schema/table name if needed)
-- 5) RPC to fetch and mark queue items (for batch processing)
CREATE OR REPLACE FUNCTION public.fetch_and_mark_queue(p_limit int)
RETURNS TABLE(id text, article_id text)
LANGUAGE sql
AS $$
  WITH cte AS (
    SELECT id, article_id
    FROM public.classification_queue
    WHERE processed = false
    ORDER BY enqueued_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.classification_queue q
  SET processed = true, processed_at = now()
  FROM cte
  WHERE q.id = cte.id
  RETURNING q.id, q.article_id;
$$;
