import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let parsedUrl = rawUrl;
try {
  const u = new URL(rawUrl);
  parsedUrl = u.origin;
} catch (e) {}

const supabase = createClient(parsedUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('--- Querying column catalogs ---');
  try {
    // We can query the column catalog in postgres if allowed
    const { data: cols, error } = await supabase
      .from('pg_catalog.pg_stats') // this might be blocked, but let's see
      .select('*')
      .limit(1);
    console.log('pg_stats query error:', error);
  } catch (err) {
    console.warn(err);
  }
}

checkColumns();
