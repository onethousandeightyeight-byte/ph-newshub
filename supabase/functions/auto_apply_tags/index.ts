
// auto_apply_tags Edge Function
// Entry: POST { article_id: "<uuid>", apply: true|false }
// Uses Supabase.ai.Session('gte-small') to create an embedding, queries tags via pgvector,
// writes article_tags if apply=true, and records suggestions in ai_classifications.

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
        }

        const startUrl = new URL(req.url);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // @ts-ignore
        const session = new Supabase.ai.Session('gte-small');

        // Handle /process-queue endpoint
        if (startUrl.pathname.endsWith('/process-queue')) {
            // Fetch pending items from queue
            // We assume 'fetch_and_mark_queue' RPC exists from migration 20260130T020000_create_classification_queue.sql
            // Or we just select from queue where status='pending' and LIMIT

            let batchSize = 5;
            try { const b = await req.json(); if (b.batch_size) batchSize = b.batch_size; } catch (e) { }

            // Try RPC first for safety/concurrency
            let items: any[] = [];
            const { data: qData, error: qErr } = await supabase.rpc('fetch_and_mark_queue', { batch_size: batchSize });

            if (qErr) {
                // Fallback: manual select (less safe for concurrency but works for single cron)
                const { data: manualData } = await supabase
                    .from('classification_queue')
                    .select('id, article_id')
                    .eq('status', 'pending')
                    .limit(batchSize);

                if (manualData && manualData.length > 0) {
                    items = manualData;
                    // Mark processing
                    const ids = items.map(i => i.id);
                    await supabase.from('classification_queue').update({ status: 'processing', updated_at: new Date() }).in('id', ids);
                }
            } else {
                items = qData;
            }

            if (!items || items.length === 0) {
                return new Response(JSON.stringify({ message: 'No items to process' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            const results = [];

            // Loop and process each (calling logic equivalent to single classification)
            // Note: For efficiency in Edge Function, we might reuse connection/session.

            // Pre-fetch all tags ONCE for efficiency
            const { data: allTags } = await supabase.from('tags').select('id, name, embedding');

            // Helper to compute dist
            const computeDist = (a: number[], b: number[]) => {
                if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
                let s = 0;
                for (let i = 0; i < a.length; i++) { s += (a[i] - b[i]) ** 2; }
                return Math.sqrt(s);
            };

            for (const item of items) {
                try {
                    // Fetch Article
                    const { data: article } = await supabase
                        .from('Article')
                        .select('id, title, snippet, contentBody')
                        .eq('id', item.article_id)
                        .single();

                    if (!article) {
                        // Mark failed
                        await supabase.from('classification_queue').update({ status: 'failed', error_message: 'Article not found' }).eq('id', item.id);
                        continue;
                    }

                    // Embed
                    const textToEmbed = `${article.title ?? ''}\n${article.snippet ?? ''}\n\n${article.contentBody ?? ''}`.slice(0, 4000);
                    const embResp = await session.run(textToEmbed, { mean_pool: true, normalize: true });
                    const embedding = (embResp?.[0]?.embedding ?? embResp?.embedding) || embResp;

                    if (!embedding) {
                        await supabase.from('classification_queue').update({ status: 'failed', error_message: 'Embedding failed' }).eq('id', item.id);
                        continue;
                    }

                    // Calc distance
                    const scored = (allTags ?? [])
                        .filter((t: any) => t.embedding)
                        .map((t: any) => {
                            let vec = [];
                            try { vec = typeof t.embedding === 'string' ? JSON.parse(t.embedding) : t.embedding; } catch (e) { vec = []; }
                            return { ...t, distance: computeDist(embedding, vec) }
                        })
                        .filter((t: any) => t.distance !== Number.POSITIVE_INFINITY);

                    scored.sort((x: any, y: any) => x.distance - y.distance);
                    const nearestTags = scored.slice(0, 5);

                    const suggestions = nearestTags.map((t: any) => ({ tag_id: t.id, name: t.name, distance: t.distance }));

                    // Save Result
                    await supabase.from('ai_classifications').insert([{ article_id: article.id, suggestions: suggestions, applied: true }]);

                    // Apply Tags
                    if (suggestions.length > 0) {
                        const toInsert = suggestions.map((s: any) => ({ article_id: article.id, tag_id: s.tag_id }));
                        await supabase.from('article_tags').upsert(toInsert, { onConflict: 'article_id,tag_id', ignoreDuplicates: true });
                    }

                    // Mark Completed
                    await supabase.from('classification_queue').update({ status: 'completed', updated_at: new Date() }).eq('id', item.id);
                    results.push({ article_id: article.id, status: 'success' });
                } catch (err: any) {
                    console.error(`Error processing item ${item.id}:`, err);
                    await supabase.from('classification_queue').update({ status: 'failed', error_message: String(err) }).eq('id', item.id);
                    results.push({ article_id: item.article_id, status: 'failed', error: String(err) });
                }
            }

            return new Response(JSON.stringify({ processed: results.length, details: results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }


        const body = await req.json();
        const article_id = body?.article_id;
        const apply = body?.apply === true;

        if (!article_id) {
            return new Response(JSON.stringify({ error: 'article_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Fetch the article text
        const { data: article, error: articleErr } = await supabase
            .from('Article')
            .select('id, title, snippet, contentBody')
            .eq('id', article_id)
            .limit(1)
            .maybeSingle();

        if (articleErr) {
            console.error('fetch article error', articleErr);
            return new Response(JSON.stringify({ error: 'failed fetching article' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        if (!article) {
            return new Response(JSON.stringify({ error: 'article not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Prepare text (title + snippet + contentBody)
        const textToEmbed = `${article.title ?? ''}\n${article.snippet ?? ''}\n\n${article.contentBody ?? ''}`.slice(0, 4000);

        // Get embedding from Supabase AI
        const embResp = await session.run(textToEmbed, { mean_pool: true, normalize: true });
        const embedding = (embResp?.[0]?.embedding ?? embResp?.embedding) || embResp;

        if (!embedding || !Array.isArray(embedding)) {
            console.error('invalid embedding response', embResp);
            return new Response(JSON.stringify({ error: 'failed to get embedding' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Query nearest tag vectors
        // Using simple client-side distance for fallback safety inside this simplified script

        const { data: allTags, error: allErr } = await supabase.from('tags').select('id, name, embedding');
        if (allErr) {
            console.error('tags fetch error', allErr);
            return new Response(JSON.stringify({ error: 'failed to query tags' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        // Simple dot product / distance (assuming normalized vectors)
        const computeDist = (a: number[], b: number[]) => {
            if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
            let s = 0;
            for (let i = 0; i < a.length; i++) {
                s += (a[i] - b[i]) ** 2;
            }
            return Math.sqrt(s);
        };

        // Filter tags with embeddings and compute score
        const scored = (allTags ?? [])
            .filter((t: any) => t.embedding)
            .map((t: any) => {
                let vec = [];
                try {
                    vec = typeof t.embedding === 'string' ? JSON.parse(t.embedding) : t.embedding;
                } catch (e) { vec = []; }
                return { ...t, distance: computeDist(embedding, vec) }
            })
            .filter((t: any) => t.distance !== Number.POSITIVE_INFINITY); // Remove invalid

        scored.sort((x: any, y: any) => x.distance - y.distance);
        const nearestTags = scored.slice(0, 5);

        // Build suggestions payload
        const suggestions = nearestTags.map((t: any) => ({
            tag_id: t.id,
            name: t.name,
            distance: t.distance
        }));

        // Insert ai_classifications record
        const { error: insertErr } = await supabase
            .from('ai_classifications')
            .insert([{ article_id, suggestions: suggestions, applied: apply }]);

        if (insertErr) {
            console.error('failed create ai_classifications', insertErr);
        }

        // If apply=true, upsert into article_tags
        if (apply && suggestions.length > 0) {
            const toInsert = suggestions.map((s: any) => ({ article_id, tag_id: s.tag_id }));

            // Upsert: ignore duplicates by using onConflict mechanism if possible, or just insert and ignore error
            // Since insert().select() might fail if duplicates exist and we don't handle it
            // We will loop and try insert one by one for safety or use upsert if constraint exists

            const { error: atErr } = await supabase.from('article_tags').upsert(toInsert, { onConflict: 'article_id,tag_id', ignoreDuplicates: true }).select();

            if (atErr) {
                console.warn('article_tags insert warning', atErr);
            }
        }

        return new Response(JSON.stringify({ suggestions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error('function error', err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
