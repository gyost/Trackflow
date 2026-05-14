import { supabase } from '../lib/supabase';
import { Plan, Task, Outcome, Project, Requirement, RequirementHistory, ReleaseGoal, ProjectTracking, FollowupRecord } from '../types';

export const apiService = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return data || [];
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    const { data, error } = await supabase.from('plans').select('*');
    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      metric: typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric
    }));
  },

  savePlan: async (plan: Plan): Promise<void> => {
    const { error } = await supabase.from('plans').upsert(plan);
    if (error) throw error;
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data || [];
  },

  saveTask: async (task: Task): Promise<void> => {
    const { error } = await supabase.from('tasks').upsert(task);
    if (error) throw error;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  },

  // Outcomes
  getOutcomes: async (): Promise<Outcome[]> => {
    const { data, error } = await supabase.from('outcomes').select('*');
    if (error) throw error;
    return data || [];
  },

  saveOutcome: async (outcome: Outcome): Promise<void> => {
    const { error } = await supabase.from('outcomes').upsert(outcome);
    if (error) throw error;
  },

  // Requirements
  getRequirements: async (): Promise<Requirement[]> => {
    const { data, error } = await supabase.from('requirements').select(`*, history:requirement_history(*)`);
    if (error) throw error;
    // Supabase returns related data in nested objects if configured correctly,
    // assuming 'requirement_history' table linked by 'requirementId'
    return data || [];
  },

  saveRequirement: async (req: Requirement): Promise<void> => {
    const { error } = await supabase.from('requirements').upsert(req);
    if (error) throw error;
    
    if (req.history && req.history.length > 0) {
        const { error: histError } = await supabase.from('requirement_history').upsert(req.history);
        if (histError) throw histError;
    }
  },

  deleteRequirement: async (id: string): Promise<void> => {
    const { error } = await supabase.from('requirements').delete().eq('id', id);
    if (error) throw error;
  },

  // Release Goals
  getReleaseGoals: async (): Promise<ReleaseGoal[]> => {
    const { data, error } = await supabase.from('release_goals').select('*');
    if (error) throw error;
    return data || [];
  },

  saveReleaseGoal: async (goal: ReleaseGoal): Promise<void> => {
    const { error } = await supabase.from('release_goals').upsert(goal);
    if (error) throw error;
  },

  deleteReleaseGoal: async (id: string): Promise<void> => {
    const { error } = await supabase.from('release_goals').delete().eq('id', id);
    if (error) throw error;
  },

  // Project Trackings
  getProjectTrackings: async (): Promise<ProjectTracking[]> => {
    const { data, error } = await supabase.from('project_trackings').select('*');
    if (error) throw error;
    return data || [];
  },

  saveProjectTracking: async (track: ProjectTracking): Promise<void> => {
    const { error } = await supabase.from('project_trackings').upsert(track);
    if (error) throw error;
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    const { error } = await supabase.from('project_trackings').delete().eq('id', id);
    if (error) throw error;
  }
};
