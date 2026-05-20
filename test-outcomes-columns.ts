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
  const payload: any = {
    id: '99999999-9999-9999-9999-999999999999',
    title: 'Test',
  };
  
  const testCols = ['status', 'submitter_id', 'project_id', 'description', 'date', 'created_at', 'file_url', 'organization_id'];
  for (const c of testCols) {
    const p = { ...payload, [c]: 'test' };
    const { error } = await supabase.from('outcomes').insert(p);
    console.log(`Column '${c}': error=`, error?.message || 'SUCCESS');
  }
}

check();
