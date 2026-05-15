import { supabase } from '../lib/supabase';
import { Plan, Task, Outcome, Project, Requirement, RequirementHistory, ReleaseGoal, ProjectTracking, FollowupRecord } from '../types';

// Utility functions for converting between camelCase and snake_case
const toSnakeCaseStr = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCaseStr = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toSnakeCaseStr(key),
        toSnakeCase(value),
      ])
    );
  }
  return obj;
}

export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCaseStr(key),
        toCamelCase(value),
      ])
    );
  }
  return obj;
}

export const apiService = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    return toCamelCase(data || []);
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    const plans = toCamelCase(data || []);
    return plans.map((p: any) => ({
      ...p,
      metric: typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric
    }));
  },

  savePlan: async (plan: Plan): Promise<void> => {
    const dataToSave = toSnakeCase(plan);
    const { error } = await supabase.from('plans').upsert(dataToSave);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    return toCamelCase(data || []);
  },

  saveTask: async (task: Task): Promise<void> => {
    const { error } = await supabase.from('tasks').upsert(toSnakeCase(task));
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  deleteTask: async (taskId: string): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Outcomes
  getOutcomes: async (): Promise<Outcome[]> => {
    const { data, error } = await supabase.from('outcomes').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    return toCamelCase(data || []);
  },

  saveOutcome: async (outcome: Outcome): Promise<void> => {
    const { error } = await supabase.from('outcomes').upsert(toSnakeCase(outcome));
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Requirements
  getRequirements: async (): Promise<Requirement[]> => {
    // Note: If you have a foreign key set up to `requirement_history`, supabase can auto-join
    const { data, error } = await supabase.from('requirements').select(`*, requirement_history(*)`);
    if (error) throw new Error(error.message || JSON.stringify(error));
    const parsedData = toCamelCase(data || []);
    // Map relation if its named requirementHistory
    return parsedData.map((d: any) => {
        d.history = d.requirementHistory || d.history;
        delete d.requirementHistory;
        return d;
    });
  },

  saveRequirement: async (req: Requirement & { newHistoryEntry?: RequirementHistory }): Promise<void> => {
    const { newHistoryEntry, history, ...rest } = req;
    
    // Convert requirement to snake case
    const reqData = toSnakeCase(rest);
    
    const { error } = await supabase.from('requirements').upsert(reqData);
    if (error) {
      console.error('Failed to save requirement:', error);
      throw new Error(error.message || JSON.stringify(error));
    }
    
    if (newHistoryEntry) {
        const histData = toSnakeCase(newHistoryEntry);
        // ensure relation
        histData.requirement_id = req.id;
        const { error: histError } = await supabase.from('requirement_history').upsert(histData);
        if (histError) throw new Error(histError.message || JSON.stringify(histError));
    } 
  },

  deleteRequirement: async (id: string): Promise<void> => {
    const { error } = await supabase.from('requirements').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Release Goals
  getReleaseGoals: async (): Promise<ReleaseGoal[]> => {
    const { data, error } = await supabase.from('release_goals').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    return toCamelCase(data || []);
  },

  saveReleaseGoal: async (goal: ReleaseGoal): Promise<void> => {
    const { error } = await supabase.from('release_goals').upsert(toSnakeCase(goal));
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  deleteReleaseGoal: async (id: string): Promise<void> => {
    const { error } = await supabase.from('release_goals').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Project Trackings
  getProjectTrackings: async (): Promise<ProjectTracking[]> => {
    const { data, error } = await supabase.from('project_trackings').select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    return toCamelCase(data || []);
  },

  saveProjectTracking: async (track: ProjectTracking): Promise<void> => {
    const trackData: any = { ...track };
    if (trackData.signedDate === "") trackData.signedDate = null;
    if (trackData.followupDate === "") trackData.followupDate = null;
    if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;

    const { error } = await supabase.from('project_trackings').upsert(toSnakeCase(trackData));
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    const { error } = await supabase.from('project_trackings').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  }
};
