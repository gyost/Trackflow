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
        (key.endsWith('Id') && value === '') ? null : toSnakeCase(value),
      ])
    );
  }
  return obj;
}

// 自动检测并写入缺失的关联项目与计划，以防违反外键约束（例如 tasks_project_id_fkey 或 plans_project_id_fkey）
async function ensureReferencedProjectsAndPlansExist(items: any[]) {
  const referencedProjectIds = new Set<string>();
  const referencedPlanIds = new Set<string>();

  items.forEach(item => {
    const projectId = item.projectId || item.project_id;
    const planId = item.planId || item.plan_id;
    if (projectId) referencedProjectIds.add(projectId);
    if (planId) referencedPlanIds.add(planId);
  });

  if (referencedProjectIds.size > 0) {
    try {
      const { data: existingProjects, error: prjErr } = await supabase.from('projects').select('id');
      if (!prjErr && existingProjects) {
        const existingPrjIds = new Set(existingProjects.map(p => p.id));
        const missingProjectIds = Array.from(referencedProjectIds).filter(id => !existingPrjIds.has(id));

        if (missingProjectIds.length > 0) {
          console.log(`[Self-Healing] 检测到引用的项目 ID 缺失，正在补充写入 mock 关联项目:`, missingProjectIds);
          const projectsToInsert = mockProjects.filter(p => missingProjectIds.includes(p.id));
          if (projectsToInsert.length > 0) {
            const { error: insErr } = await supabase.from('projects').insert(await injectOrgId(toSnakeCase(projectsToInsert), 'projects'));
            if (insErr) {
              console.warn('[Self-Healing] 自动补充项目失败:', insErr);
            } else {
              console.log('[Self-Healing] 自动补充项目成功！');
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Self-Healing] 检测现有项目时发生异常:', e);
    }
  }

  if (referencedPlanIds.size > 0) {
    try {
      const { data: existingPlans, error: plnErr } = await supabase.from('plans').select('id');
      if (!plnErr && existingPlans) {
        const existingPlnIds = new Set(existingPlans.map(p => p.id));
        const missingPlanIds = Array.from(referencedPlanIds).filter(id => !existingPlnIds.has(id));

        if (missingPlanIds.length > 0) {
          console.log(`[Self-Healing] 检测到引用的计划 ID 缺失，正在补充写入 mock 新计划:`, missingPlanIds);
          const plansToInsert = mockPlans.filter(p => missingPlanIds.includes(p.id));
          if (plansToInsert.length > 0) {
            // 递归确保计划本身的关联项目也是存在的
            await ensureReferencedProjectsAndPlansExist(plansToInsert);
            const { error: insErr } = await supabase.from('plans').insert(await injectOrgId(toSnakeCase(plansToInsert), 'plans'));
            if (insErr) {
              console.warn('[Self-Healing] 自动补充计划失败:', insErr);
            } else {
              console.log('[Self-Healing] 自动补充计划成功！');
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Self-Healing] 检测现有计划时发生异常:', e);
    }
  }
}

// 增量填充每张表
export const seedSupabase = async (): Promise<boolean> => {
  try {
    ensureConfigured();
    console.log('--- 启动 Supabase 各张表的细粒度增量检查与注入 ---');
    let seededAtLeastOne = false;

    // 1. Projects (设置 manager_id 为 null 绕过外键)
    try {
      const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockProjects.length > 0) {
        console.log('Seeding: projects 表为空，正在注入数据...');
        const projectsToSeed = mockProjects.map(p => ({
          ...p,
          managerId: '' // toSnakeCase 映射为 null 绕过 projects_manager_id_fkey
        }));
        const { error: insErr } = await supabase.from('projects').insert(await injectOrgId(toSnakeCase(projectsToSeed), 'projects'));
        if (insErr) console.warn('Projects 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Projects 增量检查失败:', e);
    }

    // 2. Plans (序列化 metric 到 title 绕过不存在的 metric 列)
    try {
      const { count, error } = await supabase.from('plans').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockPlans.length > 0) {
        console.log('Seeding: plans 表为空，正在注入数据...');
        const plansToSeed = mockPlans.map(p => {
          const serialized = { ...p };
          if (p.metric) {
            serialized.title = `${p.title} [metric:${JSON.stringify(p.metric)}]`;
          }
          delete (serialized as any).metric; // 绕过未 migrate 的 metric 列
          return serialized;
        });
        // 确保关联的 project 先存在以避免约束错误
        await ensureReferencedProjectsAndPlansExist(plansToSeed);
        const { error: insErr } = await supabase.from('plans').insert(await injectOrgId(toSnakeCase(plansToSeed), 'plans'));
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
        // 确保关联的 project & plan 先存在以避免约束错误
        const tasksToSeed = mockTasks.map(t => {
          const serialized = { ...t };
          if (t.assigneeId) {
            serialized.title = `${t.title} [assignee_id:${t.assigneeId}]`;
          }
          serialized.assigneeId = ''; // map as NULL in supabase
          return serialized;
        });
        await ensureReferencedProjectsAndPlansExist(tasksToSeed);
        const { error: insErr } = await supabase.from('tasks').insert(await injectOrgId(toSnakeCase(tasksToSeed), 'tasks'));
        if (insErr) console.warn('Tasks 表注入失败:', insErr);
        else seededAtLeastOne = true;
      }
    } catch (e) {
      console.warn('Tasks 增量检查失败:', e);
    }

    // 4. Outcomes (序列化 date 到 title 绕过不存在的 date 列)
    try {
      const { count, error } = await supabase.from('outcomes').select('*', { count: 'exact', head: true });
      if (!error && (count === null || count === 0) && mockOutcomes.length > 0) {
        console.log('Seeding: outcomes 表为空，正在注入数据...');
        const outcomesToSeed = mockOutcomes.map(o => {
          const serialized = { ...o };
          if (o.date) {
            serialized.title = `${o.title} [date:${o.date}]`;
          }
          delete (serialized as any).date; // 绕过未 migrate 的 date 列
          return serialized;
        });
        // 确保关联的 project 先存在以避免约束错误
        await ensureReferencedProjectsAndPlansExist(outcomesToSeed);
        const { error: insErr } = await supabase.from('outcomes').insert(await injectOrgId(toSnakeCase(outcomesToSeed), 'outcomes'));
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
        // 确保关联的 project 先存在以避免约束错误
        await ensureReferencedProjectsAndPlansExist(newReqs);
        const { error: insErr } = await supabase.from('requirements').insert(await injectOrgId(toSnakeCase(newReqs), 'requirements'));
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
            const { error: histErr } = await supabase.from('requirement_history').insert(await injectOrgId(toSnakeCase(histories), 'requirement_history'));
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
    if (tableName === 'projects') {
      dataToInsert = mockProjects.map(p => ({
        ...p,
        managerId: '' // map as NULL to bypass fk constraint
      }));
    }
    else if (tableName === 'plans') {
      dataToInsert = mockPlans.map(p => {
        const serialized = { ...p };
        if (p.metric) {
          serialized.title = `${p.title} [metric:${JSON.stringify(p.metric)}]`;
        }
        delete (serialized as any).metric; // bypass missing core metric column
        return serialized;
      });
    }
    else if (tableName === 'tasks') {
      dataToInsert = mockTasks.map(t => {
        const serialized = { ...t };
        if (t.assigneeId) {
          serialized.title = `${t.title} [assignee_id:${t.assigneeId}]`;
        }
        serialized.assigneeId = ''; // map as NULL in supabase
        return serialized;
      });
    }
    else if (tableName === 'outcomes') {
      dataToInsert = mockOutcomes.map(o => {
        const serialized = { ...o };
        if (o.date) {
          serialized.title = `${o.title} [date:${o.date}]`;
        }
        delete (serialized as any).date; // bypass missing date column
        return serialized;
      });
    }
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

    // 确保关联的 project/plan 如果在 mock 中有就先写入
    await ensureReferencedProjectsAndPlansExist(dataToInsert);

    // 尝试先清空已有数据
    try {
      await supabase.from(tableName).delete().neq('id', 'force_delete_non_existent_placeholder');
    } catch (delErr) {
      console.warn(`清空先前 ${tableName} 数据时失败，跳过清空，直接插入：`, delErr);
    }

    // 写入
    const injected = await injectOrgId(toSnakeCase(dataToInsert), tableName);
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
          const { error: histErr } = await supabase.from('requirement_history').insert(await injectOrgId(toSnakeCase(histories), 'requirement_history'));
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
