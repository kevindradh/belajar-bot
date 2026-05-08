import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data', 'challenges');

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function seed() {
  const difficulties = ['easy', 'medium', 'hard'];
  let total = 0;

  for (const diff of difficulties) {
    const dir = join(dataDir, diff);
    let files: string[];
    try {
      files = readdirSync(dir).filter(f => f.endsWith('.json'));
    } catch { continue; }

    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf-8');
      const challenge = JSON.parse(raw);

      const { data: existing } = await supabase
        .from('challenges').select('id').eq('slug', challenge.slug).single();

      if (existing) {
        console.log(`⏭️  Skip (exists): ${challenge.slug}`);
        continue;
      }

      const { error } = await supabase.from('challenges').insert({
        slug: challenge.slug,
        title: challenge.title,
        difficulty: diff,
        xp_reward: challenge.xp_reward,
        description: challenge.description,
        constraints: challenge.constraints || null,
        examples: challenge.examples || [],
        function_signatures: challenge.function_signatures || {},
        test_cases_public: challenge.test_cases_public || [],
        test_cases_hidden: challenge.test_cases_hidden || [],
        hints: challenge.hints || [],
        tags: challenge.tags || [],
        supported_languages: challenge.supported_languages || ['python', 'javascript'],
        time_limit_ms: challenge.time_limit_ms || 5000,
        memory_limit_mb: challenge.memory_limit_mb || 256,
      });

      if (error) {
        console.error(`❌ Error: ${challenge.slug}:`, error.message);
      } else {
        console.log(`✅ Seeded: ${challenge.slug} (${diff})`);
        total++;

        // Link categories
        if (challenge.categories) {
          for (const catSlug of challenge.categories) {
            const { data: cat } = await supabase.from('categories').select('id').eq('slug', catSlug).single();
            if (cat) {
              const { data: ch } = await supabase.from('challenges').select('id').eq('slug', challenge.slug).single();
              if (ch) {
                await supabase.from('challenge_categories').upsert(
                  { challenge_id: ch.id, category_id: cat.id },
                  { onConflict: 'challenge_id,category_id' }
                );
              }
            }
          }
        }
      }
    }
  }

  console.log(`\n🎉 Seeded ${total} new challenges!`);
}

seed().catch(console.error);
