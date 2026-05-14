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

  saveRequirement: async (req: Requirement & { newHistoryEntry?: RequirementHistory }): Promise<void> => {
    const { newHistoryEntry, history, ...rest } = req;
    const { error } = await supabase.from('requirements').upsert(rest);
    if (error) {
      console.error('Failed to save requirement:', error);
      throw error;
    }
    
    if (newHistoryEntry) {
        const { error: histError } = await supabase.from('requirement_history').upsert(newHistoryEntry);
        if (histError) {
          console.error('Failed to save requirement history:', histError);
          throw histError;
        }
    } else if (history && history.length > 0) {
        // Optional: save history array if needed
        const { error: histError } = await supabase.from('requirement_history').upsert(history);
        if (histError) {
          console.error('Failed to save requirement history array:', histError);
          throw histError;
        }
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
    // If the table doesn't have a followupRecords json column, the upsert might fail.
    // Also remove empty string dates which cause Postgres timestamp errors
    const trackData: any = { ...track };
    if (trackData.signedDate === "") trackData.signedDate = null;
    if (trackData.followupDate === "") trackData.followupDate = null;
    if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;

    const { error } = await supabase.from('project_trackings').upsert(trackData);
    if (error) {
      console.error('Failed to save project tracking:', error);
      throw error;
    }
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    const { error } = await supabase.from('project_trackings').delete().eq('id', id);
    if (error) throw error;
  }
};
