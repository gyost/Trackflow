import { injectOrgId } from '../lib/orgService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockProjects, mockPlans, mockTasks, mockOutcomes, mockRequirements } from '../mockData';

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 未配置，无法写入初始数据：请确保 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY 已正确配置。');
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

// 增量填充每张表
export const seedSupabase = async (): Promise<boolean> => {
  try {
    ensureConfigured();
    console.log('--- 启动 Supabase 各张表的细粒度增量检查与注入 ---');
    let seededAtLeastOne = false;

    // 1. Projects
    try {
      const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockProjects.length > 0) {
        console.log('Seeding: projects 表为空，正在注入数据...');
        const { error: insErr } = await supabase.from('projects').insert(await injectOrgId(toSnakeCase(mockProjects)));
        if (insErr) console.warn('Projects 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Projects 增量检查失败:', e);
    }

    // 2. Plans
    try {
      const { count, error } = await supabase.from('plans').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockPlans.length > 0) {
        console.log('Seeding: plans 表为空，正在注入数据...');
        const { error: insErr } = await supabase.from('plans').insert(await injectOrgId(toSnakeCase(mockPlans)));
        if (insErr) console.warn('Plans 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Plans 增量检查失败:', e);
    }

    // 3. Tasks
    try {
      const { count, error } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockTasks.length > 0) {
        console.log('Seeding: tasks 表为空，正在注入数据...');
        const { error: insErr } = await supabase.from('tasks').insert(await injectOrgId(toSnakeCase(mockTasks)));
        if (insErr) console.warn('Tasks 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Tasks 增量检查失败:', e);
    }

    // 4. Outcomes
    try {
      const { count, error } = await supabase.from('outcomes').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockOutcomes.length > 0) {
        console.log('Seeding: outcomes 表为空，正在注入数据...');
        const { error: insErr } = await supabase.from('outcomes').insert(await injectOrgId(toSnakeCase(mockOutcomes)));
        if (insErr) console.warn('Outcomes 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Outcomes 增量检查失败:', e);
    }

    // 5. Requirements (产品需求)
    try {
      const { count, error } = await supabase.from('requirements').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockRequirements.length > 0) {
        console.log('Seeding: requirements 表为空，正在注入演示数据...');
        const newReqs = mockRequirements.map(r => {
          const { history, ...rest } = r;
          return rest;
        });
        const { error: insErr } = await supabase.from('requirements').insert(await injectOrgId(toSnakeCase(newReqs)));
        if (insErr) {
          console.warn('Requirements 表注入失败:', insErr);
        } else {
          seededAtLeastOne = true;
          
          // Seed History
          const histories: any[] = [];
          mockRequirements.forEach(r => {
            if (r.history) {
              r.history.forEach(h => {
                histories.push(h);
              });
            }
          });
          if (histories.length > 0) {
            const { error: histErr } = await supabase.from('requirement_history').insert(await injectOrgId(toSnakeCase(histories)));
            if (histErr) console.warn('Requirement_history 注入失败:', histErr);
          }
        }
      }
    } catch (e) {
      console.warn('Requirements 增量检查失败:', e);
    }

    return seededAtLeastOne;
  } catch (error: any) {
    console.warn('Granular supabase seed check exited:', error);
    return false;
  }
};

// 强制清空/覆盖写入各张表，返回每一步的状态，用于前端手动触发和精准排障
export const forceSeedTable = async (tableName: string): Promise<string> => {
  ensureConfigured();
  try {
    let dataToInsert: any = [];
    if (tableName === 'projects') dataToInsert = mockProjects;
    else if (tableName === 'plans') dataToInsert = mockPlans;
    else if (tableName === 'tasks') dataToInsert = mockTasks;
    else if (tableName === 'outcomes') dataToInsert = mockOutcomes;
    else if (tableName === 'requirements') {
      dataToInsert = mockRequirements.map(r => {
        const { history, ...rest } = r;
        return rest;
      });
    } else {
      throw new Error(`未知的表名称: ${tableName}`);
    }

    if (dataToInsert.length === 0) {
      return `表 ${tableName} 无对应 mock 数据。`;
    }

    // 尝试先清空已有数据
    try {
      await supabase.from(tableName).delete().neq('id', 'force_delete_non_existent_placeholder');
    } catch (delErr) {
      console.warn(`清空先前 ${tableName} 数据时失败，跳过清空，直接插入：`, delErr);
    }

    // 写入
    const injected = await injectOrgId(toSnakeCase(dataToInsert));
    const { error } = await supabase.from(tableName).insert(injected);
    if (error) {
      throw new Error(`写入失败: ${error.message} (代码: ${error.code})。如果此表在您的数据库中不存在，请先登录 Supabase 并运行 SQL 创建该表。`);
    }

    // 如果是需求，还应该写入对应的历史记录
    if (tableName === 'requirements') {
      const histories: any[] = [];
      mockRequirements.forEach(r => {
        if (r.history) {
          r.history.forEach(h => {
            histories.push(h);
          });
        }
      });
      if (histories.length > 0) {
        try {
          await supabase.from('requirement_history').delete().neq('id', 'force_delete_placeholder');
          const { error: histErr } = await supabase.from('requirement_history').insert(await injectOrgId(toSnakeCase(histories)));
          if (histErr) console.warn('历史关联记录写入失败:', histErr);
        } catch (hErr) {
          console.warn('历史关联清空或写入时发生异常:', hErr);
        }
      }
    }

    return `成功重置并写入 ${tableName} 表共 ${dataToInsert.length} 条本系统预制的业务数据！`;
  } catch (err: any) {
    throw new Error(`[${tableName}] 写入失败: ${err.message || String(err)}`);
  }
};
