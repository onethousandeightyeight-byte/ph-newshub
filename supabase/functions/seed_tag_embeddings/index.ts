
// seed_tag_embeddings Edge Function
// Iterates through all tags, generates embeddings using 'gte-small' via Supabase.ai, and updates the DB.

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // @ts-ignore
        const session = new Supabase.ai.Session('gte-small');

        const { data: tags, error } = await supabase.from('tags').select('id, name').is('embedding', null);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

        if (!tags || tags.length === 0) return new Response(JSON.stringify({ message: 'No tags to seed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

        let updated = 0;
        for (const tag of tags) {
            // Generate embedding for tag name
            const output = await session.run(tag.name, { mean_pool: true, normalize: true });
            const embedding = (output?.[0]?.embedding ?? output?.embedding) || output;

            if (embedding) {
                const { error: updateErr } = await supabase
                    .from('tags')
                    .update({ embedding: JSON.stringify(embedding) }) // Storing as JSON or vector cast
                    .eq('id', tag.id);

                if (!updateErr) updated++;
            }
        }

        return new Response(JSON.stringify({ message: `Seeded ${updated} tags` }), { headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
