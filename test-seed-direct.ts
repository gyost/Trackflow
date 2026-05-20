import { createClient } from '@supabase/supabase-js';
import { mockProjects, mockPlans, mockTasks } from './src/mockData';

const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let parsedUrl = rawUrl;
try {
  const u = new URL(rawUrl);
  parsedUrl = u.origin;
} catch (e) {}

const supabase = createClient(parsedUrl, supabaseAnonKey);

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        (key.endsWith('Id') && value === '') ? null : toSnakeCase(value),
      ])
    );
  }
  return obj;
}

async function injectOrgId(data: any): Promise<any> {
  let orgId = '';
  const { data: orgData } = await supabase.from('organizations').select('id').limit(1);
  if (orgData && orgData.length > 0) {
    orgId = orgData[0].id;
  } else {
    orgId = '44b92b1f-b190-440d-a92a-58281c905f84';
  }
  if (Array.isArray(data)) {
    data.forEach(item => { item.organization_id = orgId; });
  } else {
    data.organization_id = orgId;
  }
  return data;
}

async function testSeed() {
  console.log('--- Testing table inserts with resilient mapping ---');
  
  // 1. Projects (set managerId to '' so toSnakeCase maps it to null to bypass foreign key constraint)
  console.log('Seeding projects...');
  const projectsToSeed = mockProjects.map(p => ({
    ...p,
    managerId: '' // map as null
  }));
  const snakeProjects = toSnakeCase(projectsToSeed);
  const dataPrj = await injectOrgId(snakeProjects);
  const { error: prjErr } = await supabase.from('projects').insert(dataPrj);
  if (prjErr) {
    console.log('Projects seed err:', prjErr.code, prjErr.message);
  } else {
    console.log('Projects seed success!');
  }

  // 2. Plans (serialize metric into title to bypass missing metric column)
  console.log('Seeding plans...');
  const plansToSeed = mockPlans.map(p => {
    const serialized = { ...p };
    if (p.metric) {
      serialized.title = `${p.title} [metric:${JSON.stringify(p.metric)}]`;
    }
    // Delete metric property so it's not converted and inserted as a column
    delete (serialized as any).metric;
    return serialized;
  });
  const snakePlans = toSnakeCase(plansToSeed);
  const dataPlans = await injectOrgId(snakePlans);
  const { error: plnErr } = await supabase.from('plans').insert(dataPlans);
  if (plnErr) {
    console.log('Plans seed err:', plnErr.code, plnErr.message);
  } else {
    console.log('Plans seed success!');
  }

  // 3. Tasks
  console.log('Seeding tasks...');
  const tasksToSeed = mockTasks.map(t => {
    const serialized = { ...t };
    if (t.assigneeId) {
      serialized.title = `${t.title} [assignee_id:${t.assigneeId}]`;
    }
    serialized.assigneeId = ''; // map as NULL in supabase
    return serialized;
  });
  const snakeTasks = toSnakeCase(tasksToSeed);
  const dataTasks = await injectOrgId(snakeTasks);
  const { error: tskErr } = await supabase.from('tasks').insert(dataTasks);
  if (tskErr) {
    console.log('Tasks seed err:', tskErr.code, tskErr.message);
  } else {
    console.log('Tasks seed success!');
  }
}

testSeed();
