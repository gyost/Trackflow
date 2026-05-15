import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let isValidUrl = false;
let parsedUrl = '';
try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      // Supabase JS appends /rest/v1 automatically, so we just want the origin.
      // If the user appended /rest/v1, this will fix it.
      parsedUrl = u.origin;
      isValidUrl = true;
    }
  }
} catch (e) {
  isValidUrl = false;
}

export const isSupabaseConfigured = Boolean(
  isValidUrl && 
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl !== 'your-project-url'
);

// Provide dummy values to prevent createClient from throwing immediately if missing,
// but our apiService will check isSupabaseConfigured before querying.
export const supabase = createClient(
  isSupabaseConfigured ? parsedUrl : 'http://localhost:3000', 
  isSupabaseConfigured ? supabaseAnonKey : 'dummy-key'
);
