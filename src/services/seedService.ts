import { supabase } from '../lib/supabase';
import { mockProjects, mockPlans, mockTasks, mockOutcomes, mockRequirements } from '../mockData';

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        toSnakeCase(value),
      ])
    );
  }
  return obj;
}

export const seedSupabase = async () => {
  // Check if already seeded
  const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  if (count && count > 0) return false; // Already has data

  console.log('Seeding mock data into Supabase...');

  // Maps to link old mock IDs to new UUIDs
  const projectMap: Record<string, string> = {};
  const planMap: Record<string, string> = {};
  const reqMap: Record<string, string> = {};

  // 1. Projects
  const newProjects = mockProjects.map(p => {
    const newId = uuidv4();
    projectMap[p.id] = newId;
    return { ...p, id: newId };
  });

  if (newProjects.length > 0) {
    const { error } = await supabase.from('projects').insert(toSnakeCase(newProjects));
    if (error) throw new Error('Error seeding projects: ' + (error.message || JSON.stringify(error)));
  }

  // 2. Plans
  const newPlans = mockPlans.map(p => {
    const newId = uuidv4();
    planMap[p.id] = newId;
    return { 
      ...p, 
      id: newId, 
      projectId: projectMap[p.projectId] || p.projectId 
    };
  });
  
  // Need to update parentIds in plans for nested plans
  const updatedPlans = newPlans.map(p => ({
    ...p,
    parentId: p.parentId ? planMap[p.parentId] || p.parentId : undefined
  }));

  if (updatedPlans.length > 0) {
    const { error } = await supabase.from('plans').insert(toSnakeCase(updatedPlans));
    if (error) throw new Error('Error seeding plans: ' + (error.message || JSON.stringify(error)));
  }

  // 3. Tasks
  const newTasks = mockTasks.map(t => ({
    ...t,
    id: uuidv4(),
    projectId: projectMap[t.projectId] || t.projectId,
    planId: planMap[t.planId] || t.planId
  }));

  if (newTasks.length > 0) {
    const { error } = await supabase.from('tasks').insert(toSnakeCase(newTasks));
    if (error) throw new Error('Error seeding tasks: ' + (error.message || JSON.stringify(error)));
  }

  // 4. Outcomes
  const newOutcomes = mockOutcomes.map(o => ({
    ...o,
    id: uuidv4(),
    projectId: projectMap[o.projectId] || o.projectId
  }));

  if (newOutcomes.length > 0) {
    const { error } = await supabase.from('outcomes').insert(toSnakeCase(newOutcomes));
    if (error) throw new Error('Error seeding outcomes: ' + (error.message || JSON.stringify(error)));
  }

  // 5. Requirements
  const newReqs = mockRequirements.map(r => {
    const newId = uuidv4();
    reqMap[r.id] = newId;
    // Don't include history directly in the requirement insert 
    const { history, ...rest } = r;
    return {
      ...rest,
      id: newId,
      projectId: projectMap[r.projectId || ''] || r.projectId
    };
  });

  if (newReqs.length > 0) {
    const { error } = await supabase.from('requirements').insert(toSnakeCase(newReqs));
    if (error) throw new Error('Error seeding requirements: ' + (error.message || JSON.stringify(error)));
  }

  // 6. Requirement History
  const histories: any[] = [];
  mockRequirements.forEach(r => {
    if (r.history) {
      r.history.forEach(h => {
        histories.push({
          ...h,
          id: uuidv4(),
          requirementId: reqMap[h.requirementId] || h.requirementId
        });
      });
    }
  });

  if (histories.length > 0) {
    const { error } = await supabase.from('requirement_history').insert(toSnakeCase(histories));
    if (error) throw new Error('Error seeding requirement history: ' + (error.message || JSON.stringify(error)));
  }

  return true; // Seeded successfully
};
