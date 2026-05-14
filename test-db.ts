import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.example' }); // We appended variables there

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
     const { data, error } = await supabase.from('requirements').select('*').limit(1);
     console.log('Requirements error:', error);
     console.log('Requirements columns:', data && data.length > 0 ? Object.keys(data[0]) : 'no data');

     const { data: q2, error: e2 } = await supabase.from('project_trackings').select('*').limit(1);
     console.log('Project Trackings error:', e2);
     console.log('Project Trackings columns:', q2 && q2.length > 0 ? Object.keys(q2[0]) : 'no data');
  } catch (err) {
     console.error(err);
  }
}
check();
