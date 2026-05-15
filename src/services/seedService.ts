import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockProjects, mockPlans, mockTasks, mockOutcomes, mockRequirements } from '../mockData';

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 未配置，无法写入初始数据。');
  }
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
  try {
    ensureConfigured();
    // Check if already seeded
    const { count, error: countError } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    if (countError) {
      throw new Error('Error checking project count: ' + (countError.message || JSON.stringify(countError)));
    }
    if (count && count > 0) return false; // Already has data

    console.log('Seeding mock data into Supabase...');

  // 1. Projects
  if (mockProjects.length > 0) {
    const { error } = await supabase.from('projects').insert(toSnakeCase(mockProjects));
    if (error) throw new Error('Error seeding projects: ' + (error.message || JSON.stringify(error)));
  }

  // 2. Plans
  if (mockPlans.length > 0) {
    const { error } = await supabase.from('plans').insert(toSnakeCase(mockPlans));
    if (error) throw new Error('Error seeding plans: ' + (error.message || JSON.stringify(error)));
  }

  // 3. Tasks
  if (mockTasks.length > 0) {
    const { error } = await supabase.from('tasks').insert(toSnakeCase(mockTasks));
    if (error) throw new Error('Error seeding tasks: ' + (error.message || JSON.stringify(error)));
  }

  // 4. Outcomes
  if (mockOutcomes.length > 0) {
    const { error } = await supabase.from('outcomes').insert(toSnakeCase(mockOutcomes));
    if (error) throw new Error('Error seeding outcomes: ' + (error.message || JSON.stringify(error)));
  }

  // 5. Requirements
  const newReqs = mockRequirements.map(r => {
    // Don't include history directly in the requirement insert 
    const { history, ...rest } = r;
    return rest;
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
        histories.push(h);
      });
    }
  });

  if (histories.length > 0) {
    const { error } = await supabase.from('requirement_history').insert(toSnakeCase(histories));
    if (error) throw new Error('Error seeding requirement history: ' + (error.message || JSON.stringify(error)));
  }

  return true; // Seeded successfully
  } catch (error: any) {
    console.warn('Seed service failed or blocked by RLS:', error);
    // Do not throw, so the app can still launch with empty data if RLS blocks inserting
    return false;
  }
};
