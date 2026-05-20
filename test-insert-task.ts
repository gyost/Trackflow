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
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('Organizations:', orgs);

  const { data: projs } = await supabase.from('projects').select('*');
  console.log('Projects count:', projs?.length);

  const { data: plans } = await supabase.from('plans').select('*');
  console.log('Plans count:', plans?.length);

  const { data: tasks } = await supabase.from('tasks').select('*');
  console.log('Tasks count:', tasks?.length);

  // Let's try inserting a task
  const testTaskId = '88888888-8888-8888-8888-888888888888';
  const sampleTask = {
    id: testTaskId,
    title: 'Test New Task [assignee_id:d994f820-3db6-4ae8-9587-33b0b6ee3024]',
    organization_id: orgs?.[0]?.id || null,
    project_id: projs?.[0]?.id || null,
    plan_id: plans?.[0]?.id || null,
    assignee_id: null,
    status: 'not_started',
    priority: 'medium',
    progress: 0,
    planned_progress: 10,
    start_date: '2026-05-20',
    end_date: '2026-05-27'
  };

  console.log('Inserting sample task...');
  const { data, error } = await supabase.from('tasks').insert(sampleTask).select();
  if (error) {
    console.log('Insert error code:', error.code);
    console.log('Insert error msg:', error.message);
  } else {
    console.log('Insert success! Task row:', data);
    // Cleanup
    await supabase.from('tasks').delete().eq('id', testTaskId);
  }
}

check();
