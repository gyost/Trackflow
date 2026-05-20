import { supabase, isSupabaseConfigured } from './supabase';
import { generateId } from './utils';

let orgPromise: Promise<string> | null = null;

export async function getOrganizationId(): Promise<string> {
  if (!isSupabaseConfigured) return 'local-mock-org';
  
  if (orgPromise) return orgPromise;
  
  orgPromise = (async () => {
    try {
      const cachedOrgId = localStorage.getItem('current_org_id');
      if (cachedOrgId) {
        const { data, error } = await supabase.from('organizations').select('id').eq('id', cachedOrgId).limit(1);
        if (!error && data && data.length > 0) {
          return cachedOrgId;
        }
      }
      
      // If no valid cached org, try to get ANY organization
      const { data, error } = await supabase.from('organizations').select('id').limit(1);
      if (!error && data && data.length > 0) {
        localStorage.setItem('current_org_id', data[0].id);
        return data[0].id;
      }
      
      const newOrgId = generateId();
      const { error: insertError } = await supabase.from('organizations').insert({ id: newOrgId, name: '默认组织' });
      
      if (insertError) {
        if (insertError.message?.includes('security policy') || insertError.code === '42501') {
            throw new Error('Supabase 权限拒绝 (RLS受阻): 请前往 Supabase Dashboard 选择 Authentication -> Policies，关闭 organizations 表的 Row Level Security (RLS) 或添加允许匿名访问的策略。详情: ' + insertError.message);
        }
        throw new Error('Failed to create organization: ' + insertError.message);
      }
      
      localStorage.setItem('current_org_id', newOrgId);
      return newOrgId;
    } catch (e: any) {
      orgPromise = null;
      console.error('Org init error:', e);
      throw new Error(e.message || String(e));
    }
  })();
  
  return orgPromise;
}

export async function injectOrgId(data: any): Promise<any> {
  const orgId = await getOrganizationId();
  if (Array.isArray(data)) {
    data.forEach(item => { item.organization_id = orgId; });
  } else {
    data.organization_id = orgId;
  }
  return data;
}

export function clearOrganizationCache() {
  localStorage.removeItem('current_org_id');
  orgPromise = null;
}
