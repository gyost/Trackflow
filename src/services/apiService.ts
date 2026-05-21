import { injectOrgId } from '../lib/orgService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Plan, Task, Outcome, Project, Requirement, RequirementHistory, ReleaseGoal, ProjectTracking, FollowupRecord, Member, Group } from '../types';
import { mockProjects, mockPlans, mockTasks, mockOutcomes, mockRequirements, mockMembers, mockGroups } from '../mockData';

// Utility functions for converting between camelCase and snake_case
const toSnakeCaseStr = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCaseStr = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

let localMockOverride = false;

function getLocalData<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function setLocalData<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

function upsertLocalItem<T extends { id: string }>(key: string, item: T, defaultValue: T[]) {
  const list = getLocalData<T[]>(key, defaultValue);
  const idx = list.findIndex(i => i.id === item.id);
  if (idx > -1) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  setLocalData(key, list);
}

function deleteLocalItem<T extends { id: string }>(key: string, id: string, defaultValue: T[]) {
  const list = getLocalData<T[]>(key, defaultValue);
  const filtered = list.filter(i => i.id !== id);
  setLocalData(key, filtered);
}

function ensureConfigured() {
  if (!isSupabaseConfigured && !localMockOverride) {
    const u = import.meta.env.VITE_SUPABASE_URL;
    throw new Error(`Supabase 未配置或 URL 格式无效（当前为: ${u}）。`);
  }
}

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toSnakeCaseStr(key),
        (key.endsWith('Id') && value === '') ? null : toSnakeCase(value)
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
  setLocalMockOverride: (val: boolean) => {
    localMockOverride = val;
  },
  isLocalMockActive: (): boolean => {
    return !isSupabaseConfigured || localMockOverride;
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_projects', mockProjects);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        const plans = getLocalData<Plan[]>('mock_plans', mockPlans);
        return plans.map((p: any) => ({
          ...p,
          metric: typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric
        }));
      }
      ensureConfigured();
      const { data, error } = await supabase.from('plans').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      const plans = toCamelCase(data || []);
      return plans.map((p: any) => {
        let metric = typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric;
        let title = p.title || '';
        const match = title.match(/(.*) \[(?:metric):(.+)\]$/);
        if (match) {
          title = match[1].trim();
          try {
            metric = JSON.parse(match[2]);
          } catch (e) {}
        }
        return {
          ...p,
          title,
          metric
        };
      });
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  savePlan: async (plan: Plan): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_plans', plan, mockPlans);
        return;
      }
      ensureConfigured();
      
      const serializedPlan = { ...plan };
      if (plan.metric) {
        serializedPlan.title = `${plan.title} [metric:${JSON.stringify(plan.metric)}]`;
      }
      delete (serializedPlan as any).metric; // delete to prevent column write error
      
      const dataToSave = toSnakeCase(serializedPlan);
      const { error } = await supabase.from('plans').upsert(await injectOrgId(dataToSave, 'plans'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_tasks', mockTasks);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      
      const parsedTasks = toCamelCase(data || []);
      return parsedTasks.map((t: Task) => {
        const match = t.title.match(/(.*) \[(?:assignee_id|assigneeId):([a-f0-9-]+)\]$/);
        if (match) {
          return {
            ...t,
            title: match[1].trim(),
            assigneeId: match[2]
          };
        }
        return t;
      });
    } catch (e: any) {
      throw new Error((e.message || String(e)) + ' (URL: ' + import.meta.env.VITE_SUPABASE_URL + ')');
    }
  },

  saveTask: async (task: Task): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_tasks', task, mockTasks);
        return;
      }
      ensureConfigured();
      
      const serializedTask = { ...task };
      if (task.assigneeId) {
        serializedTask.title = `${task.title} [assignee_id:${task.assigneeId}]`;
      }
      serializedTask.assigneeId = ''; // Set to empty string so toSnakeCase maps it as null in supabase to bypass fk constraint
      
      const { error } = await supabase.from('tasks').upsert(await injectOrgId(toSnakeCase(serializedTask), 'tasks'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  deleteTask: async (taskId: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_tasks', taskId, mockTasks);
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Outcomes
  getOutcomes: async (): Promise<Outcome[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_outcomes', mockOutcomes);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('outcomes').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      
      const parsedOutcomes = toCamelCase(data || []);
      return parsedOutcomes.map((o: any) => {
        let title = o.title || '';
        let date = o.date;
        const match = title.match(/(.*) \[(?:date):([0-9-]+)\]$/);
        if (match) {
          title = match[1].trim();
          date = match[2];
        }
        return {
          ...o,
          title,
          date
        };
      });
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveOutcome: async (outcome: Outcome): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_outcomes', outcome, mockOutcomes);
        return;
      }
      ensureConfigured();
      
      const serializedOutcome = { ...outcome };
      if (outcome.date) {
        serializedOutcome.title = `${outcome.title} [date:${outcome.date}]`;
      }
      delete (serializedOutcome as any).date; // bypass missing date column
      
      const { error } = await supabase.from('outcomes').upsert(await injectOrgId(toSnakeCase(serializedOutcome), 'outcomes'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Requirements
  getRequirements: async (): Promise<Requirement[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_requirements', mockRequirements);
      }
      ensureConfigured();
      let reqData: any[] = [];
      try {
        const { data, error } = await supabase.from('requirements').select('*');
        if (error) throw error;
        reqData = data || [];
      } catch (dbErr: any) {
        console.warn('Failed to fetch requirements from Supabase. Falling back to local data.', dbErr);
        return getLocalData('mock_requirements', mockRequirements);
      }
      
      let historyMap: Record<string, RequirementHistory[]> = {};
      try {
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

      const parsedData = toCamelCase(reqData);
      const cloudReqs = parsedData.map((d: any) => {
          d.history = historyMap[d.id] || [];
          return d;
      });

      // Merge local added requirements
      const localReqs = getLocalData<Requirement[]>('mock_requirements', []);
      const mergedReqs = [...cloudReqs];
      localReqs.forEach(lr => {
        if (!mergedReqs.some(cr => cr.id === lr.id)) {
          mergedReqs.unshift(lr);
        }
      });
      return mergedReqs;
    } catch (error: any) {
      console.warn('Failed to query requirements completely. Reverting to empty/mock data.', error);
      return getLocalData('mock_requirements', mockRequirements);
    }
  },

  saveRequirement: async (req: Requirement & { newHistoryEntry?: RequirementHistory }): Promise<void> => {
    // Synchronously back up to localStorage to guarantee submission success locally under any network/RLS issues
    const { newHistoryEntry, history, ...rest } = req;
    const cached = getLocalData<Requirement[]>('mock_requirements', mockRequirements);
    const idx = cached.findIndex(r => r.id === req.id);
    
    const targetReq = { ...rest, history: history || [] };
    if (newHistoryEntry) {
      targetReq.history = [...targetReq.history, newHistoryEntry];
    }
    
    if (idx > -1) {
      cached[idx] = targetReq;
    } else {
      cached.push(targetReq);
    }
    setLocalData('mock_requirements', cached);

    if (apiService.isLocalMockActive()) {
      return;
    }

    try {
      ensureConfigured();
      const reqData = toSnakeCase(rest);
      const { error } = await supabase.from('requirements').upsert(await injectOrgId(reqData, 'requirements'));
      if (error) {
        console.warn('Supabase requirements upsert failed. Saved to local storage fallback only.', error);
      }
      
      if (newHistoryEntry) {
        try {
          const histData = toSnakeCase(newHistoryEntry);
          histData.requirement_id = req.id;
          const { error: histError } = await supabase.from('requirement_history').upsert(await injectOrgId(histData, 'requirement_history'));
          if (histError) console.warn('Failed to save requirement history:', histError);
        } catch (e) {
          console.warn('Could not save requirement_history.', e);
        }
      } 
    } catch (error: any) {
      console.warn('Supabase requirements operation failed. Local storage saved successfully.', error);
    }
  },

  deleteRequirement: async (id: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_requirements', id, mockRequirements);
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('requirements').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Release Goals
  getReleaseGoals: async (): Promise<ReleaseGoal[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_release_goals', []);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('release_goals').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveReleaseGoal: async (goal: ReleaseGoal): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_release_goals', goal, []);
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('release_goals').upsert(await injectOrgId(toSnakeCase(goal), 'release_goals'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  deleteReleaseGoal: async (id: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_release_goals', id, []);
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('release_goals').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Project Trackings
  getProjectTrackings: async (): Promise<ProjectTracking[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('mock_project_trackings', []);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('project_trackings').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveProjectTracking: async (track: ProjectTracking): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        const trackData: any = { ...track };
        if (trackData.signedDate === "") trackData.signedDate = null;
        if (trackData.followupDate === "") trackData.followupDate = null;
        if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;
        upsertLocalItem('mock_project_trackings', trackData, []);
        return;
      }
      ensureConfigured();
      const trackData: any = { ...track };
      if (trackData.signedDate === "") trackData.signedDate = null;
      if (trackData.followupDate === "") trackData.followupDate = null;
      if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;

      const { error } = await supabase.from('project_trackings').upsert(await injectOrgId(toSnakeCase(trackData), 'project_trackings'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_project_trackings', id, []);
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('project_trackings').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Groups
  getGroups: async (): Promise<Group[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('groups', []);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('groups').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveGroups: async (groups: Group[]): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        setLocalData('groups', groups);
        return;
      }
      ensureConfigured();
      const dataToSave = toSnakeCase(groups);
      const injected = await injectOrgId(dataToSave, 'groups');
      const { error } = await supabase.from('groups').upsert(injected);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  deleteGroup: async (id: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // Members
  getMembers: async (): Promise<Member[]> => {
    try {
      if (apiService.isLocalMockActive()) {
        return getLocalData('members', []);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('members').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      const parsed = toCamelCase(data || []);
      return parsed.map((m: any) => {
        let roles: string[] = [];
        if (Array.isArray(m.roles)) {
          roles = m.roles;
        } else if (typeof m.roles === 'string') {
          try {
            roles = JSON.parse(m.roles);
          } catch {
            roles = m.roles.split(',').filter(Boolean);
          }
        }
        return {
          ...m,
          roles
        };
      });
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveMembers: async (members: Member[]): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        setLocalData('members', members);
        return;
      }
      ensureConfigured();
      const dataToSave = members.map(m => {
        const serialized = { ...m };
        if (m.roles) {
          (serialized as any).roles = JSON.stringify(m.roles);
        }
        return serialized;
      });
      const snaked = toSnakeCase(dataToSave);
      const injected = await injectOrgId(snaked, 'members');
      const { error } = await supabase.from('members').upsert(injected);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  deleteMember: async (id: string): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  // System Settings (授权公司、业务参数、说明书)
  getSystemSettings: async (): Promise<{
    authorizedCompanies: string[];
    annualTargetProfit: number;
    guideContent: string;
  } | null> => {
    try {
      if (apiService.isLocalMockActive()) {
        const companies = getLocalData<string[]>('authorizedCompanies', ['Apple Inc.', 'Test Company']);
        const profit = getLocalData<number>('annualTargetProfit', 1000);
        const guide = getLocalData<string>('guideContent', '');
        return { authorizedCompanies: companies, annualTargetProfit: profit, guideContent: guide };
      }
      ensureConfigured();
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): ' + error.message : error.message || JSON.stringify(error));
      if (!data || data.length === 0) {
        return null;
      }
      const item = data[0];
      let authCompanies: string[] = [];
      if (typeof item.authorized_companies === 'string') {
        try {
          authCompanies = JSON.parse(item.authorized_companies);
        } catch {
          authCompanies = item.authorized_companies.split(',').filter(Boolean);
        }
      } else if (Array.isArray(item.authorized_companies)) {
        authCompanies = item.authorized_companies;
      }
      return {
        authorizedCompanies: authCompanies,
        annualTargetProfit: Number(item.annual_target_profit || 1000),
        guideContent: item.guide_content || ''
      };
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  },

  saveSystemSettings: async (settings: {
    authorizedCompanies: string[];
    annualTargetProfit: number;
    guideContent: string;
  }): Promise<void> => {
    try {
      if (apiService.isLocalMockActive()) {
        setLocalData('authorizedCompanies', settings.authorizedCompanies);
        setLocalData('annualTargetProfit', settings.annualTargetProfit);
        setLocalData('guideContent', settings.guideContent);
        return;
      }
      ensureConfigured();
      const payload = {
        id: 'global_config',
        authorized_companies: JSON.stringify(settings.authorizedCompanies),
        annual_target_profit: settings.annualTargetProfit,
        guide_content: settings.guideContent
      };
      const injected = await injectOrgId(payload, 'system_settings');
      const { error } = await supabase.from('system_settings').upsert(injected);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): ' + error.message : error.message || JSON.stringify(error));
    } catch (e: any) {
      throw new Error(e.message || String(e));
    }
  }
};
