-- Create an index for fast ANN search. Using ivfflat requires specifying lists; adjust as needed.
-- If your dataset is small, a simple ivfflat will still work; replace with hnsw if you enable it in pgvector.
CREATE INDEX IF NOT EXISTS idx_tags_embedding ON public.tags USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
