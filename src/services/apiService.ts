import { injectOrgId } from '../lib/orgService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Plan, Task, Outcome, Project, Requirement, RequirementHistory, ReleaseGoal, ProjectTracking, FollowupRecord, Member, Group, RolePermission } from '../types';
import { mockProjects, mockPlans, mockTasks, mockOutcomes, mockRequirements, mockMembers, mockGroups } from '../mockData';

// Central Error Reporting Types
export interface CentralError {
  id: string;
  message: string;
  context: string;
  timestamp: string;
  severity: 'warning' | 'error';
  originalError?: any;
}

type ErrorListener = (error: CentralError) => void;
const listeners = new Set<ErrorListener>();

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

// SQLite Fetch Utility
const fetchSQLite = async (url: string, options: RequestInit = {}) => {
  const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const response = await fetch(absoluteUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`SQLite API response failed with status ${response.status}`);
  }
  return response.json();
};

// Retry Wrap Helper function
async function executeWithRetry<T>(
  action: () => Promise<T>,
  contextName: string,
  retries = 3,
  delayMs = 300
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await action();
    } catch (err: any) {
      lastError = err;
      console.warn(`[DATA SERVICE RETRY] 「${contextName}」尝试 #${attempt} 失败:`, err.message || err);
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(1.5, attempt - 1)));
      }
    }
  }

  const errMsg = lastError?.message || String(lastError);
  console.error(`[DATA SERVICE FATAL] 「${contextName}」最终失败:`, errMsg);

  // Trigger centralized error monitors
  apiService.triggerCentralError(
    `数据接口异常 [${contextName}]: ${errMsg}`,
    contextName,
    lastError,
    'error'
  );

  throw lastError;
}

export const apiService = {
  setLocalMockOverride: (val: boolean) => {
    localMockOverride = val;
  },
  isLocalMockActive: (): boolean => {
    return !isSupabaseConfigured || localMockOverride;
  },

  // Central Error Hook Registration
  onError: (listener: ErrorListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Centrally dispatch error reports
  triggerCentralError: (message: string, context: string, originalError?: any, severity: 'warning' | 'error' = 'error') => {
    const error: CentralError = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      context,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity,
      originalError
    };
    listeners.forEach(l => {
      try {
        l(error);
      } catch (err) {
        console.error('Error listener execution failed:', err);
      }
    });
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        try {
          const res = await fetchSQLite('/api/projects');
          return toCamelCase(res);
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取项目失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_projects', mockProjects);
        }
      }
      ensureConfigured();
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    }, '获取项目列表');
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    return executeWithRetry(async () => {
      let rawPlans: any[] = [];
      if (apiService.isLocalMockActive()) {
        try {
          rawPlans = await fetchSQLite('/api/plans');
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取计划失败, 使用本地存储:', sqliteErr);
          const plans = getLocalData<Plan[]>('mock_plans', mockPlans);
          return plans.map((p: any) => ({
            ...p,
            metric: typeof p.metric === 'string' ? JSON.parse(p.metric) : p.metric
          }));
        }
      } else {
        ensureConfigured();
        const { data, error } = await supabase.from('plans').select('*');
        if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
        rawPlans = data || [];
      }

      const plans = toCamelCase(rawPlans);
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
    }, '获取计划列表');
  },

  savePlan: async (plan: Plan): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_plans', plan, mockPlans);
        try {
          await fetchSQLite('/api/plans', {
            method: 'POST',
            body: JSON.stringify(plan),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 保存计划失败, 本地存储已就绪:', sqliteErr);
        }
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
    }, '保存开发计划');
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    return executeWithRetry(async () => {
      let rawTasks: any[] = [];
      if (apiService.isLocalMockActive()) {
        try {
          rawTasks = await fetchSQLite('/api/tasks');
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取任务失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_tasks', mockTasks);
        }
      } else {
        ensureConfigured();
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
        rawTasks = data || [];
      }
      
      const parsedTasks = toCamelCase(rawTasks);
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
    }, '获取任务列表');
  },

  saveTask: async (task: Task): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_tasks', task, mockTasks);
        try {
          await fetchSQLite('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(task),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 保存任务失败, 本地存储已就绪:', sqliteErr);
        }
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
    }, '保存任务');
  },

  deleteTask: async (taskId: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_tasks', taskId, mockTasks);
        try {
          await fetchSQLite(`/api/tasks/${taskId}`, {
            method: 'DELETE',
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 删除任务失败, 本地存储已被清除:', sqliteErr);
        }
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '删除任务');
  },

  // Outcomes
  getOutcomes: async (): Promise<Outcome[]> => {
    return executeWithRetry(async () => {
      let rawOutcomes: any[] = [];
      if (apiService.isLocalMockActive()) {
        try {
          rawOutcomes = await fetchSQLite('/api/outcomes');
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取进展失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_outcomes', mockOutcomes);
        }
      } else {
        ensureConfigured();
        const { data, error } = await supabase.from('outcomes').select('*');
        if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
        rawOutcomes = data || [];
      }
      
      const parsedOutcomes = toCamelCase(rawOutcomes);
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
    }, '获取业务成果进展');
  },

  saveOutcome: async (outcome: Outcome): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_outcomes', outcome, mockOutcomes);
        try {
          await fetchSQLite('/api/outcomes', {
            method: 'POST',
            body: JSON.stringify(outcome),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 保存进展失败, 本地存储已就绪:', sqliteErr);
        }
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
    }, '保存业务成果进展');
  },

  // Requirements
  getRequirements: async (): Promise<Requirement[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        try {
          const res = await fetchSQLite('/api/requirements');
          return toCamelCase(res);
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取需求库失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_requirements', mockRequirements);
        }
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
    }, '获取需求规划库');
  },

  saveRequirement: async (req: Requirement & { newHistoryEntry?: RequirementHistory }): Promise<void> => {
    return executeWithRetry(async () => {
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
        try {
          await fetchSQLite('/api/requirements', {
            method: 'POST',
            body: JSON.stringify(req),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite保存需求失败, 本地存储已就绪:', sqliteErr);
        }
        return;
      }

      ensureConfigured();
      const reqData = toSnakeCase(rest);
      const { error } = await supabase.from('requirements').upsert(await injectOrgId(reqData, 'requirements'));
      if (error) {
        console.warn('Supabase requirements upsert failed. Saved to local storage fallback only.', error);
        throw error;
      }
      
      if (newHistoryEntry) {
        try {
          const histData = toSnakeCase(newHistoryEntry);
          histData.requirement_id = req.id;
          const { error: histError } = await supabase.from('requirement_history').upsert(await injectOrgId(histData, 'requirement_history'));
          if (histError) console.warn('Failed to save requirement history:', histError);
        } catch (e) {
          console.warn('Could not save requirement_history to Supabase.', e);
        }
      } 
    }, '保存需求规划和演进状态');
  },

  deleteRequirement: async (id: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_requirements', id, mockRequirements);
        try {
          await fetchSQLite(`/api/requirements/${id}`, {
            method: 'DELETE',
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite删除需求失败, 本地存储已清除:', sqliteErr);
        }
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('requirements').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '删除开发需求');
  },

  // Release Goals
  getReleaseGoals: async (): Promise<ReleaseGoal[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        try {
          const res = await fetchSQLite('/api/releaseGoals');
          return toCamelCase(res);
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取发布计划失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_release_goals', []);
        }
      }
      ensureConfigured();
      const { data, error } = await supabase.from('release_goals').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    }, '获取发布版目标计划');
  },

  saveReleaseGoal: async (goal: ReleaseGoal): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_release_goals', goal, []);
        try {
          await fetchSQLite('/api/releaseGoals', {
            method: 'POST',
            body: JSON.stringify(goal),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite保存目标失败, 本地存储已准备:', sqliteErr);
        }
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('release_goals').upsert(await injectOrgId(toSnakeCase(goal), 'release_goals'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '保存版本发布目标');
  },

  deleteReleaseGoal: async (id: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_release_goals', id, []);
        try {
          await fetchSQLite(`/api/releaseGoals/${id}`, {
            method: 'DELETE',
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite删除目标失败, 本地存储已删除:', sqliteErr);
        }
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('release_goals').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '删除版本发布目标');
  },

  // Project Trackings
  getProjectTrackings: async (): Promise<ProjectTracking[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        try {
          const res = await fetchSQLite('/api/projectTrackings');
          return toCamelCase(res);
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取客户跟踪失败, 使用本地存储:', sqliteErr);
          return getLocalData('mock_project_trackings', []);
        }
      }
      ensureConfigured();
      const { data, error } = await supabase.from('project_trackings').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    }, '获取销售跟进项目列表');
  },

  saveProjectTracking: async (track: ProjectTracking): Promise<void> => {
    return executeWithRetry(async () => {
      const trackData: any = { ...track };
      if (trackData.signedDate === "") trackData.signedDate = null;
      if (trackData.followupDate === "") trackData.followupDate = null;
      if (trackData.lastFollowupDate === "") trackData.lastFollowupDate = null;

      if (apiService.isLocalMockActive()) {
        upsertLocalItem('mock_project_trackings', trackData, []);
        try {
          await fetchSQLite('/api/projectTrackings', {
            method: 'POST',
            body: JSON.stringify(trackData),
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite保存跟进项目失败, 本地存储已同步:', sqliteErr);
        }
        return;
      }
      ensureConfigured();

      const { error } = await supabase.from('project_trackings').upsert(await injectOrgId(toSnakeCase(trackData), 'project_trackings'));
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '保存销售项目跟进信息');
  },

  deleteProjectTracking: async (id: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        deleteLocalItem('mock_project_trackings', id, []);
        try {
          await fetchSQLite(`/api/projectTrackings/${id}`, {
            method: 'DELETE',
          });
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] SQLite删除跟进项目失败, 本地存储已更新:', sqliteErr);
        }
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('project_trackings').delete().eq('id', id);
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
    }, '删除销售项目跟进');
  },

  // Groups
  getGroups: async (): Promise<Group[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        return getLocalData('groups', []);
      }
      ensureConfigured();
      const { data, error } = await supabase.from('groups').select('*');
      if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      return toCamelCase(data || []);
    }, '获取业务小组架构');
  },

  saveGroups: async (groups: Group[]): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        setLocalData('groups', groups);
        return;
      }
      ensureConfigured();

      // Calculate groups to delete
      const { data: dbGroups, error: getErr } = await supabase.from('groups').select('id');
      if (!getErr && dbGroups) {
        const dbIds = dbGroups.map((g: any) => g.id);
        const currentIds = groups.map(g => g.id);
        const toDelete = dbIds.filter(id => !currentIds.includes(id));
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from('groups').delete().in('id', toDelete);
          if (delErr) console.warn('自动同步删除小组到数据库失败 (RLS或其他原因):', delErr.message);
        }
      }

      if (groups.length > 0) {
        const dataToSave = toSnakeCase(groups);
        const injected = await injectOrgId(dataToSave, 'groups');
        const { error } = await supabase.from('groups').upsert(injected);
        if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭 groups 表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      }
    }, '保存业务团队架构');
  },

  deleteGroup: async (id: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    }, '删除小组架构');
  },

  // Members
  getMembers: async (): Promise<Member[]> => {
    return executeWithRetry(async () => {
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
    }, '获取团队成员名册');
  },

  saveMembers: async (members: Member[]): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        setLocalData('members', members);
        return;
      }
      ensureConfigured();

      // Calculate members to delete
      const { data: dbMembers, error: getErr } = await supabase.from('members').select('id');
      if (!getErr && dbMembers) {
        const dbIds = dbMembers.map((m: any) => m.id);
        const currentIds = members.map(m => m.id);
        const toDelete = dbIds.filter(id => !currentIds.includes(id));
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from('members').delete().in('id', toDelete);
          if (delErr) console.warn('自动同步删除成员到数据库失败 (RLS或其他原因):', delErr.message);
        }
      }

      if (members.length > 0) {
        // 过滤数据库中不存在的冗余字段（如 category），防止 Supabase Schema 列名不匹配报错
        const sanitizedMembers = members.map(m => {
          const { category, ...rest } = m as any;
          return rest;
        });
        const snaked = toSnakeCase(sanitizedMembers);
        const injected = await injectOrgId(snaked, 'members');
        const { error } = await supabase.from('members').upsert(injected);
        if (error) throw new Error(error.message?.includes('security policy') ? 'Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭 members 表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + error.message : error.message || JSON.stringify(error));
      }
    }, '保存团队成员');
  },

  deleteMember: async (id: string): Promise<void> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        return;
      }
      ensureConfigured();
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
    }, '移出团队成员');
  },

  // System Settings
  getSystemSettings: async (): Promise<{
    authorizedCompanies: string[];
    annualTargetProfit: number;
    guideContent: string;
  } | null> => {
    return executeWithRetry(async () => {
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
    }, '获取业务指标与系统设置');
  },

  saveSystemSettings: async (settings: {
    authorizedCompanies: string[];
    annualTargetProfit: number;
    guideContent: string;
  }): Promise<void> => {
    return executeWithRetry(async () => {
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
    }, '保存业务指标与系统设置');
  },

  getPermissions: async (): Promise<RolePermission[]> => {
    return executeWithRetry(async () => {
      if (apiService.isLocalMockActive()) {
        try {
          const res = await fetchSQLite('/api/permissions');
          return toCamelCase(res);
        } catch (sqliteErr) {
          console.warn('[SQLite Fallback] 获取权限设置失败, 使用本地存储:', sqliteErr);
          const stored = getLocalData<RolePermission[]>('role_permissions', []);
          if (stored.length > 0) return stored;
          return [
            { roleName: '项目经理', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'] },
            { roleName: '部门经理', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_PLAN_TASK', 'EDIT_RELEASE_GOAL', 'REVIEW_DELIVERABLE'] },
            { roleName: '产品总监', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT', 'EDIT_RELEASE_GOAL'] },
            { roleName: '市场总监', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL'] },
            { roleName: '组长', permissions: ['VIEW_DASHBOARD', 'VIEW_TRACKING', 'VIEW_MARKETING', 'VIEW_RND', 'VIEW_REQUIREMENTS', 'EDIT_RELEASE_GOAL', 'MANAGE_PLAN_TASK'] },
            { roleName: '产品经理', permissions: ['VIEW_DASHBOARD', 'VIEW_REQUIREMENTS', 'MANAGE_REQUIREMENT'] },
            { roleName: '研发经理', permissions: ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'] },
            { roleName: '测试经理', permissions: ['VIEW_DASHBOARD', 'VIEW_RND', 'MANAGE_PLAN_TASK'] },
            { roleName: '市场人员', permissions: ['VIEW_DASHBOARD', 'VIEW_MARKETING'] }
          ];
        }
      }
      ensureConfigured();
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) {
        try {
          const res = await fetchSQLite('/api/permissions');
          return toCamelCase(res);
        } catch {
          throw new Error('Supabase 权限加载失败且 SQLite 不可用: ' + error.message);
        }
      }
      return data.map((d: any) => ({
        roleName: d.role_name || d.roleName,
        permissions: typeof d.permissions === 'string' ? JSON.parse(d.permissions) : d.permissions
      }));
    }, '获取角色权限配置');
  },

  savePermissions: async (permissions: RolePermission[]): Promise<void> => {
    return executeWithRetry(async () => {
      try {
        await fetchSQLite('/api/permissions', {
          method: 'POST',
          body: JSON.stringify(permissions)
        });
      } catch (sqliteErr) {
        console.warn('[SQLite Fallback] 保存权限配置到 SQLite 失败，仅存入 localStorage:', sqliteErr);
      }
      
      setLocalData('role_permissions', permissions);

      if (!apiService.isLocalMockActive()) {
        ensureConfigured();
        const snaked = permissions.map(p => ({
          role_name: p.roleName,
          permissions: JSON.stringify(p.permissions)
        }));
        const injected = await injectOrgId(snaked, 'role_permissions');
        const { error } = await supabase.from('role_permissions').upsert(injected);
        if (error) console.warn('Supabase 保存角色权限失败:', error.message);
      }
    }, '保存角色权限配置');
  }
};
