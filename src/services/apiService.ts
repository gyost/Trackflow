import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Plan, Task, Outcome, Project, Requirement, RequirementHistory, ReleaseGoal, ProjectTracking, FollowupRecord } from '../types';

// Utility functions for converting between camelCase and snake_case
const toSnakeCaseStr = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCaseStr = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    const u = import.meta.env.VITE_SUPABASE_URL;
    throw new Error(`Supabase 未配置或 URL 格式无效（当前为: ${u}）。请在环境变量中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。如果您在预览环境中，请在设置中配置密钥。`);
  }
}

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
    try { ensureConfigured();
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      console.error('getProjects error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    try { ensureConfigured();
      const { data, error } = await supabase.from('plans').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      const plans = toCamelCase(data || []);
      return plans.map((p: any) => ({
        ...p,
        metric: typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric
      }));
    } catch (e: any) {
      console.error('getPlans error:', e);
      throw new Error(e.message || String(e));
    }
  },

  savePlan: async (plan: Plan): Promise<void> => {
    try { ensureConfigured();
      const dataToSave = toSnakeCase(plan);
      const { error } = await supabase.from('plans').upsert(dataToSave);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('savePlan error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    try { ensureConfigured();
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      console.error('getTasks error:', e, 'url:', import.meta.env.VITE_SUPABASE_URL);
      throw new Error((e.message || String(e)) + ' (URL: ' + import.meta.env.VITE_SUPABASE_URL + ')');
    }
  },

  saveTask: async (task: Task): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('tasks').upsert(toSnakeCase(task));
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('saveTask error:', e);
      throw new Error(e.message || String(e));
    }
  },

  deleteTask: async (taskId: string): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('deleteTask error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Outcomes
  getOutcomes: async (): Promise<Outcome[]> => {
    try { ensureConfigured();
      const { data, error } = await supabase.from('outcomes').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      console.error('getOutcomes error:', e);
      throw new Error(e.message || String(e));
    }
  },

  saveOutcome: async (outcome: Outcome): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('outcomes').upsert(toSnakeCase(outcome));
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('saveOutcome error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Requirements
  getRequirements: async (): Promise<Requirement[]> => {
    try { ensureConfigured();
      const { data: reqData, error: reqError } = await supabase.from('requirements').select('*');
      if (reqError) throw new Error(reqError.message || JSON.stringify(reqError));
      
      let historyMap: Record<string, RequirementHistory[]> = {};
      try { ensureConfigured();
        const { data: histData, error: histError } = await supabase.from('requirement_history').select('*');
        if (!histError && histData) {
          const parsedHist = toCamelCase(histData);
          parsedHist.forEach((h: any) => {
            if (!historyMap[h.requirementId]) {
              historyMap[h.requirementId] = [];
            }
            historyMap[h.requirementId].push(h);
          });
        }
      } catch (e) {
        console.warn('Could not fetch requirement_history. Proceeding without history.', e);
      }

      const parsedData = toCamelCase(reqData || []);
      return parsedData.map((d: any) => {
          d.history = historyMap[d.id] || [];
          return d;
      });
    } catch (error: any) {
      throw new Error(error.message || JSON.stringify(error));
    }
  },

  saveRequirement: async (req: Requirement & { newHistoryEntry?: RequirementHistory }): Promise<void> => {
    try { ensureConfigured();
      const { newHistoryEntry, history, ...rest } = req;
      
      // Convert requirement to snake case
      const reqData = toSnakeCase(rest);
      
      const { error } = await supabase.from('requirements').upsert(reqData);
      if (error) {
        console.error('Failed to save requirement:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      if (newHistoryEntry) {
        try { ensureConfigured();
          const histData = toSnakeCase(newHistoryEntry);
          // ensure relation
          histData.requirement_id = req.id;
          const { error: histError } = await supabase.from('requirement_history').upsert(histData);
          if (histError) console.warn('Failed to save requirement history:', histError);
        } catch (e) {
          console.warn('Could not save requirement_history.', e);
        }
      } 
    } catch (error: any) {
      throw new Error(error.message || JSON.stringify(error));
    }
  },

  deleteRequirement: async (id: string): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('requirements').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('deleteRequirement error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Release Goals
  getReleaseGoals: async (): Promise<ReleaseGoal[]> => {
    try { ensureConfigured();
      const { data, error } = await supabase.from('release_goals').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      console.error('getReleaseGoals error:', e);
      throw new Error(e.message || String(e));
    }
  },

  saveReleaseGoal: async (goal: ReleaseGoal): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('release_goals').upsert(toSnakeCase(goal));
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('saveReleaseGoal error:', e);
      throw new Error(e.message || String(e));
    }
  },

  deleteReleaseGoal: async (id: string): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('release_goals').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('deleteReleaseGoal error:', e);
      throw new Error(e.message || String(e));
    }
  },

  // Project Trackings
  getProjectTrackings: async (): Promise<ProjectTracking[]> => {
    try { ensureConfigured();
      const { data, error } = await supabase.from('project_trackings').select('*');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      console.error('getProjectTrackings error:', e);
      throw new Error(e.message || String(e));
    }
  },

  saveProjectTracking: async (track: ProjectTracking): Promise<void> => {
    try { ensureConfigured();
      const trackData: any = { ...track };
      if (trackData.signedDate === "") trackData.signedDate = null;
      if (trackData.followupDate === "") trackData.followupDate = null;
      if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;

      const { error } = await supabase.from('project_trackings').upsert(toSnakeCase(trackData));
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('saveProjectTracking error:', e);
      throw new Error(e.message || String(e));
    }
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    try { ensureConfigured();
      const { error } = await supabase.from('project_trackings').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      console.error('deleteProjectTracking error:', e);
      throw new Error(e.message || String(e));
    }
  }
};
