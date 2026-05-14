import { format } from 'date-fns';
import { Category, Group, Member, Outcome, Plan, PlanLevel, Project, Status, Task, Requirement } from './types';

// Mock Data
export const mockRequirements: Requirement[] = [
  { 
    id: 'r1', serialNumber: 'XQ20260501001', projectId: 'p3', title: '搜索结果高亮显示', description: '用户搜索关键词时，在结果列表中高亮显示匹配的内容。', priority: 'medium', status: 'backlog', source: 'customer', submitterId: 'm1', createdAt: '2026-05-01 10:00:00', updatedAt: '2026-05-01 10:00:00',
    history: [{ id: 'rh1', requirementId: 'r1', status: 'backlog', timestamp: '2026-05-01 10:00:00', note: '需求创建' }]
  },
  { 
    id: 'r2', serialNumber: 'XQ20260502001', projectId: 'p3', title: '支持语音输入', description: '集成 Web Speech API，允许用户通过语音输入指令。', priority: 'low', status: 'reviewing', source: 'tech', submitterId: 'm3', createdAt: '2026-05-02 11:30:00', updatedAt: '2026-05-02 11:30:00',
    history: [{ id: 'rh2', requirementId: 'r2', status: 'reviewing', timestamp: '2026-05-02 11:30:00', note: '进入评审阶段' }]
  },
  { 
    id: 'r3', serialNumber: 'XQ20260503001', projectId: 'p1', title: '大客户续费自动预警', description: '合约到期前3个月，自动向对应客户经理发送系统通知及邮件。', priority: 'high', status: 'planned', source: 'marketing', submitterId: 'm2', createdAt: '2026-05-03 09:15:00', updatedAt: '2026-05-03 09:15:00',
    history: [{ id: 'rh3', requirementId: 'r3', status: 'planned', timestamp: '2026-05-03 09:15:00', note: '评审通过，已排期' }]
  },
  { 
    id: 'r4', serialNumber: 'XQ20260504001', projectId: 'p2', title: '多币种结算支持', description: '渠道合作支持美金和欧元结算，自动按实时汇率换算利润。', priority: 'medium', status: 'rejected', source: 'product', submitterId: 'm6', createdAt: '2026-05-04 14:20:00', updatedAt: '2026-05-04 14:20:00',
    history: [{ id: 'rh4', requirementId: 'r4', status: 'rejected', timestamp: '2026-05-04 14:20:00', note: '由于合规问题暂时驳回' }]
  },
];

export const mockGroups: Group[] = [
  { id: 'g_1', name: '能源管控组', category: 'marketing' },
  { id: 'g_2', name: '数字化转型组', category: 'marketing' },
  { id: 'g_3', name: '能源管理建设组', category: 'rnd' },
  { id: 'g_4', name: '数字化建设组', category: 'rnd' },
  { id: 'g_5', name: '制造建设组', category: 'rnd' },
  { id: 'g_6', name: '智能设备组', category: 'rnd' },
  { id: 'g_7', name: 'AI与数据资产组', category: 'rnd' },
  { id: 'g_8', name: '平台建设组', category: 'rnd' },
];

export const mockMembers: Member[] = [
  // 能源管控组 (Marketing)
  { id: 'm1', name: '苏鹏', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=supeng', roles: [], department: 'marketing', groupId: 'g_1' },
  { id: 'm2', name: '张国林', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangguolin', roles: [], department: 'marketing', groupId: 'g_1' },
  { id: 'm7', name: '庞春秋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=pangchunqiu', roles: [], department: 'marketing', groupId: 'g_1' },

  // 数字化转型组 (Marketing)
  { id: 'm6', name: '张珊珊', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangshanshan', roles: [], department: 'marketing', groupId: 'g_2' },
  { id: 'm8', name: '张海滨', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanghaibin', roles: [], department: 'marketing', groupId: 'g_2' },
  { id: 'm9', name: '李鸿基', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=lihongji', roles: [], department: 'marketing', groupId: 'g_2' },

  // 能源管理建设组 (R&D)
  { id: 'm3', name: '亓新明', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=qixinming', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm4', name: '巩蕊', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gongrui', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm10', name: '王亚', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wangya', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm11', name: '王海川', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wanghaichuan', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm12', name: '石丰源', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=shifengyuan', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm13', name: '高朋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gaopeng', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm14', name: '任昊宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=renhaoyu1', roles: [], department: 'rnd', groupId: 'g_3' },
  { id: 'm15', name: '张涛（后端）', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangtaohou', roles: [], department: 'rnd', groupId: 'g_3' },

  // 数字化建设组 (R&D)
  { id: 'm5', name: '陈鹏飞', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=chenpengfei', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm16', name: '梁冬雪', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liangdongxue', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm17', name: '李婷婷', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=litingting', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm18', name: '张国栋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangguodong', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm19', name: '王高山', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wanggaoshan', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm20', name: '张涛（前端）', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangtaoqian', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm21', name: '吴伟', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wuwei', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm22', name: '杨含笑', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yanghanxiao1', roles: [], department: 'rnd', groupId: 'g_4' },
  { id: 'm23', name: '李燕', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liyan', roles: [], department: 'rnd', groupId: 'g_4' },

  // 制造建设组 (R&D)
  { id: 'm24', name: '黄其萌', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=huangqimeng', roles: [], department: 'rnd', groupId: 'g_5' },
  { id: 'm25', name: '于妍卉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yuyanhui', roles: [], department: 'rnd', groupId: 'g_5' },
  { id: 'm26', name: '蔡浩然', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=caihaoran', roles: [], department: 'rnd', groupId: 'g_5' },
  { id: 'm27', name: '崔恩泉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=cuienquan', roles: [], department: 'rnd', groupId: 'g_5' },
  { id: 'm28', name: '沈利', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=shenli', roles: [], department: 'rnd', groupId: 'g_5' },
  { id: 'm29', name: '杨含笑', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yanghanxiao2', roles: [], department: 'rnd', groupId: 'g_5' },

  // 智能设备组 (R&D)
  { id: 'm30', name: '朱清凡', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhuqingfan', roles: [], department: 'rnd', groupId: 'g_6' },
  { id: 'm31', name: '翟玉星', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhaiyuxing', roles: [], department: 'rnd', groupId: 'g_6' },
  { id: 'm32', name: '公佩宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gongpeiyu', roles: [], department: 'rnd', groupId: 'g_6' },
  { id: 'm33', name: '刘金鑫', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liujinxin', roles: [], department: 'rnd', groupId: 'g_6' },
  { id: 'm34', name: '任昊宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=renhaoyu2', roles: [], department: 'rnd', groupId: 'g_6' },

  // AI与数据资产组 (R&D)
  { id: 'm35', name: '刘中志', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuzhongzhi', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm36', name: '张路路', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanglulu', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm37', name: '马树成', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=mashucheng', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm38', name: '安鸿效', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=anhongxiao', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm39', name: '刘广鑫', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuguangxin', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm40', name: '张厚诚', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanghoucheng', roles: [], department: 'rnd', groupId: 'g_7' },
  { id: 'm41', name: '邢子璠', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=xingzifan', roles: [], department: 'rnd', groupId: 'g_7' },

  // 平台建设组 (R&D)
  { id: 'm42', name: '王云飞', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wangyunfei', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm43', name: '张传梅', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangchuanmei', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm44', name: '马永辉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=mayonghui', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm45', name: '韩冰', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=hanbing', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm46', name: '宋庆松', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=songqingsong', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm47', name: '周大鹏', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhoudapeng', roles: [], department: 'rnd', groupId: 'g_8' },
  { id: 'm48', name: '高先泽', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gaoxianze', roles: [], department: 'rnd', groupId: 'g_8' },

  // 管理人员 (Admin)
  { id: 'm49', name: '李克秋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=likeqiu', roles: ['部门经理'], department: 'admin', groupId: undefined },
  { id: 'm50', name: '刘杰', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liujie', roles: ['部门经理'], department: 'admin', groupId: undefined },
  { id: 'm51', name: '刘习', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuxi', roles: ['部门经理'], department: 'admin', groupId: undefined },
];

export const mockProjects: Project[] = [
  { id: 'p1', title: 'Q2 大客户攻坚专项', description: '针对Top 20目标头部客户的定制化覆盖与转化。', category: 'marketing', status: 'in_progress', progress: 55, startDate: '2026-04-01', endDate: '2026-06-30', managerId: 'm1' },
  { id: 'p2', title: '华东区新渠道拓展计划', description: '建立并激活至少10家区域核心代理商。', category: 'marketing', status: 'in_progress', progress: 30, startDate: '2026-05-01', endDate: '2026-07-31', managerId: 'm6' },
  { id: 'p3', title: 'AI Copilot 智能助手研发', description: '在现有系统中集成大语言模型，提供智能问答功能。', category: 'rnd', status: 'in_progress', progress: 60, startDate: '2026-03-01', endDate: '2026-08-31', managerId: 'm3' },
  { id: 'p4', title: '移动端底座重构', description: 'React Native 架构升级与性能优化。', category: 'rnd', status: 'completed', progress: 100, startDate: '2026-01-01', endDate: '2026-04-30', managerId: 'm3' },
];

export const mockPlans: Plan[] = [
  // Marketing P1
  { id: 'pl1', projectId: 'p1', title: 'Q2 大客户拓展目标', level: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'in_progress', progress: 55 },
  { id: 'pl_lead_1', projectId: 'p1', title: '5月 潜在客户挖掘', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 80, metric: { type: 'number', target: 50, current: 40, unit: '家', funnelStage: 'lead' } },
  { id: 'pl_active_1', projectId: 'p1', title: '5月 意向客户跟进', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 60, metric: { type: 'number', target: 30, current: 18, unit: '家', funnelStage: 'active' } },
  { id: 'pl_lost_1', projectId: 'p1', title: '5月 客户流失', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 50, metric: { type: 'number', target: 5, current: 3, unit: '家', funnelStage: 'lost' } },
  { id: 'pl2', projectId: 'p1', title: '4月 新增重点客户', level: 'month', parentId: 'pl1', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100, metric: { type: 'number', target: 3, current: 3, unit: '家', funnelStage: 'signed' } },
  { id: 'pl13', projectId: 'p1', title: '4月 目标利润额', level: 'month', parentId: 'pl1', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100, metric: { type: 'currency', target: 80, current: 95, actualCompleted: 95, unit: '万' } },
  { id: 'pl3', projectId: 'p1', title: '5月 目标合同签署额', level: 'month', parentId: 'pl1', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 40, metric: { type: 'currency', target: 500, current: 200, unit: '万' } },
  { id: 'pl12', projectId: 'p1', title: '5月 目标利润额', level: 'month', parentId: 'pl1', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 30, metric: { type: 'currency', target: 120, current: 36, unit: '万' } },
  { id: 'pl4', projectId: 'p1', title: '5月第一周 头部客户走访', level: 'week', parentId: 'pl3', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 60 },
  
  // Marketing P2
  { id: 'pl9', projectId: 'p2', title: '5月 渠道保底回款额', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 30, metric: { type: 'currency', target: 150, current: 45, unit: '万' } },
  { id: 'pl10', projectId: 'p2', title: '5月第一周 代理商资质审核', level: 'week', parentId: 'pl9', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 50 },

  // RND P3
  { id: 'pl5', projectId: 'p3', title: 'Q2 研发迭代计划', level: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'in_progress', progress: 60 },
  { id: 'pl6', projectId: 'p3', title: '4月 模型集成与联调', level: 'month', parentId: 'pl5', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100 },
  { id: 'pl7', projectId: 'p3', title: '5月 UI/UX 优化与灰度', level: 'month', parentId: 'pl5', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 40 },
  { id: 'pl8', projectId: 'p3', title: '5月第一周 前端组件改造', level: 'week', parentId: 'pl7', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 80 },
];

export const mockTasks: Task[] = [
  { id: 't1', projectId: 'p1', planId: 'pl4', title: '拜访A集团技术决策人', assigneeId: 'm2', status: 'completed', priority: 'high', progress: 100, endDate: '2026-05-05' },
  { id: 't2', projectId: 'p1', planId: 'pl4', title: '提交B公司年度服务框架协议', assigneeId: 'm2', status: 'in_progress', priority: 'high', progress: 70, endDate: '2026-05-07' },
  { id: 't5', projectId: 'p2', planId: 'pl10', title: '审查3家意向代理商资质', assigneeId: 'm6', status: 'completed', priority: 'medium', progress: 100, endDate: '2026-05-03' },
  { id: 't6', projectId: 'p2', planId: 'pl10', title: '组织渠道政策线上宣讲会', assigneeId: 'm6', status: 'not_started', priority: 'medium', progress: 0, endDate: '2026-05-06' },
  { id: 't3', projectId: 'p3', planId: 'pl8', title: '对话框组件虚拟滚动支持', assigneeId: 'm4', status: 'completed', priority: 'medium', progress: 100, endDate: '2026-05-04' },
  { id: 't4', projectId: 'p3', planId: 'pl8', title: '流式输出接口重连逻辑', assigneeId: 'm5', status: 'in_progress', priority: 'high', progress: 60, endDate: '2026-05-07' },
];

export const mockOutcomes: Outcome[] = [
  { id: 'o1', projectId: 'p1', title: 'A集团合作意向书备忘录', description: '确立了首期300万的合作意向', submitterId: 'm2', date: '2026-05-05', status: 'approved' },
  { id: 'o3', projectId: 'p2', title: '代理商入驻资质审核表', description: '完成3家代理的背景调查及资质审核', submitterId: 'm6', date: '2026-05-03', status: 'approved' },
  { id: 'o4', projectId: 'p1', title: '4月新拓客户签单合约', description: '带来利润额95万元', submitterId: 'm2', date: '2026-04-28', status: 'approved' },
  { id: 'o5', projectId: 'p2', title: '华东区合作渠道打通', description: '首批打款完成', submitterId: 'm6', date: '2026-04-29', status: 'approved' },
  { id: 'o2', projectId: 'p3', title: 'API 集成文档', description: '后端接口交互及字段说明', submitterId: 'm5', date: '2026-04-28', status: 'approved' },
  { id: 'o6', projectId: 'p4', title: 'RN 框架底层重构提测', description: '完成各项兼容性测试', submitterId: 'm4', date: '2026-03-20', status: 'approved' },
  { id: 'o7', projectId: 'p4', title: '移动端新版全量发布', description: '性能提升30%，崩溃率下降90%', submitterId: 'm3', date: '2026-04-30', status: 'approved' },
];
