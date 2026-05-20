import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let parsedUrl = rawUrl;
try {
  const u = new URL(rawUrl);
  parsedUrl = u.origin;
} catch (e) {}

const supabase = createClient(parsedUrl, supabaseAnonKey);

async function check() {
  // Insert a dummy plan to see what columns it has by checking error messages.
  // We can try inserting a column that doesn't exist and see what other columns are mentioned, 
  // or we can test common column names like description, notes, target, status, parent_id.
  const payload: any = {
    id: '99999999-9999-9999-9999-999999999999',
    title: 'Test',
  };
  
  const testCols = ['status', 'progress', 'start_date', 'end_date', 'parent_id', 'description', 'notes', 'target', 'level', 'project_id'];
  for (const c of testCols) {
    const p = { ...payload, [c]: 'test' };
    if (c === 'progress') p[c] = 50;
    const { error } = await supabase.from('plans').insert(p);
    console.log(`Column '${c}': error=`, error?.message || 'SUCCESS');
  }
}

check();
