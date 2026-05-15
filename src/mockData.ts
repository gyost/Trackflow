import { format } from 'date-fns';
import { Category, Group, Member, Outcome, Plan, PlanLevel, Project, Status, Task, Requirement } from './types';

// Mock Data
export const mockRequirements: Requirement[] = [
  { 
    id: '4900c41c-0edb-4d2b-b19d-8768365b2233', serialNumber: 'XQ20260501001', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: '搜索结果高亮显示', description: '用户搜索关键词时，在结果列表中高亮显示匹配的内容。', priority: 'medium', status: 'backlog', source: 'customer', submitterId: '01e56734-4960-4a74-89d9-125e1de46cbc', createdAt: '2026-05-01 10:00:00', updatedAt: '2026-05-01 10:00:00',
    history: [{ id: 'd4d126db-d50b-4e37-ad45-56a9acb71bbf', requirementId: '4900c41c-0edb-4d2b-b19d-8768365b2233', status: 'backlog', timestamp: '2026-05-01 10:00:00', note: '需求创建' }]
  },
  { 
    id: 'b343f6a7-f998-4562-84ac-e95afc1b25d6', serialNumber: 'XQ20260502001', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: '支持语音输入', description: '集成 Web Speech API，允许用户通过语音输入指令。', priority: 'low', status: 'reviewing', source: 'tech', submitterId: '6e4493ce-8409-498a-94e5-aa58cf923d03', createdAt: '2026-05-02 11:30:00', updatedAt: '2026-05-02 11:30:00',
    history: [{ id: '8fe1db4d-c264-4822-95d5-1aac72216d5c', requirementId: 'b343f6a7-f998-4562-84ac-e95afc1b25d6', status: 'reviewing', timestamp: '2026-05-02 11:30:00', note: '进入评审阶段' }]
  },
  { 
    id: '701b129f-c7eb-40a7-a631-8b0cb263d50f', serialNumber: 'XQ20260503001', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '大客户续费自动预警', description: '合约到期前3个月，自动向对应客户经理发送系统通知及邮件。', priority: 'high', status: 'planned', source: 'marketing', submitterId: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', createdAt: '2026-05-03 09:15:00', updatedAt: '2026-05-03 09:15:00',
    history: [{ id: 'cba4ddd5-b201-4217-81b2-c03c5fe20d39', requirementId: '701b129f-c7eb-40a7-a631-8b0cb263d50f', status: 'planned', timestamp: '2026-05-03 09:15:00', note: '评审通过，已排期' }]
  },
  { 
    id: '69f56fd0-750a-4484-a5ec-07da18b3a896', serialNumber: 'XQ20260504001', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '多币种结算支持', description: '渠道合作支持美金和欧元结算，自动按实时汇率换算利润。', priority: 'medium', status: 'rejected', source: 'product', submitterId: '96c1caba-15d2-4131-871d-3111d867853f', createdAt: '2026-05-04 14:20:00', updatedAt: '2026-05-04 14:20:00',
    history: [{ id: '88e1d15b-5335-42b0-ba2c-f4c487f8e065', requirementId: '69f56fd0-750a-4484-a5ec-07da18b3a896', status: 'rejected', timestamp: '2026-05-04 14:20:00', note: '由于合规问题暂时驳回' }]
  },
];

export const mockGroups: Group[] = [
  { id: '378350bc-913c-40c8-9d16-d714bb76ff27', name: '能源管控组', category: 'marketing' },
  { id: '8533fd69-fde5-4b30-ba04-430d960441ce', name: '数字化转型组', category: 'marketing' },
  { id: 'cf2dcece-b683-49d6-95a0-d866d99c0a57', name: '能源管理建设组', category: 'rnd' },
  { id: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748', name: '数字化建设组', category: 'rnd' },
  { id: '87b2fdec-65c1-49bf-b331-ace9842bd8a8', name: '制造建设组', category: 'rnd' },
  { id: 'f605bb3f-840b-457f-8128-213c2afc14de', name: '智能设备组', category: 'rnd' },
  { id: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47', name: 'AI与数据资产组', category: 'rnd' },
  { id: '16ceb7e8-21b3-491c-9753-239a9e810a39', name: '平台建设组', category: 'rnd' },
];

export const mockMembers: Member[] = [
  // 能源管控组 (Marketing)
  { id: '01e56734-4960-4a74-89d9-125e1de46cbc', name: '苏鹏', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=supeng', roles: [], department: 'marketing', groupId: '378350bc-913c-40c8-9d16-d714bb76ff27' },
  { id: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', name: '张国林', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangguolin', roles: [], department: 'marketing', groupId: '378350bc-913c-40c8-9d16-d714bb76ff27' },
  { id: '3393c073-e8d7-48f2-9594-0569b5e62328', name: '庞春秋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=pangchunqiu', roles: [], department: 'marketing', groupId: '378350bc-913c-40c8-9d16-d714bb76ff27' },

  // 数字化转型组 (Marketing)
  { id: '96c1caba-15d2-4131-871d-3111d867853f', name: '张珊珊', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangshanshan', roles: [], department: 'marketing', groupId: '8533fd69-fde5-4b30-ba04-430d960441ce' },
  { id: '12024aaa-d8b8-488e-a845-38a9a0993202', name: '张海滨', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanghaibin', roles: [], department: 'marketing', groupId: '8533fd69-fde5-4b30-ba04-430d960441ce' },
  { id: 'bbaccd81-8135-4b67-bb8b-da87d08cfec0', name: '李鸿基', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=lihongji', roles: [], department: 'marketing', groupId: '8533fd69-fde5-4b30-ba04-430d960441ce' },

  // 能源管理建设组 (R&D)
  { id: '6e4493ce-8409-498a-94e5-aa58cf923d03', name: '亓新明', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=qixinming', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '867d5a3b-d910-4263-b9bf-29142b910c59', name: '巩蕊', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gongrui', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: 'e198521b-7393-4ffd-b01c-495812253873', name: '王亚', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wangya', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '6f693aed-6c9b-49d2-92dd-2b2575cb6113', name: '王海川', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wanghaichuan', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '0fa89656-f070-45dc-aa8d-6710ef454dbf', name: '石丰源', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=shifengyuan', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '344da960-b2d0-498d-9fe5-e1ed0145437c', name: '高朋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gaopeng', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '6ed3704f-1bf8-485f-8e05-aaa16370f93f', name: '任昊宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=renhaoyu1', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },
  { id: '34ba4a3e-2191-4d3a-8a20-7116b7120ceb', name: '张涛（后端）', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangtaohou', roles: [], department: 'rnd', groupId: 'cf2dcece-b683-49d6-95a0-d866d99c0a57' },

  // 数字化建设组 (R&D)
  { id: 'fd8c5858-6254-4e62-b187-048fb65133e6', name: '陈鹏飞', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=chenpengfei', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'ed91acf0-5b0e-401e-ba16-ebc82f92a7da', name: '梁冬雪', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liangdongxue', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'ca8c7a3e-4f78-4b30-a582-1b97a71bfc6d', name: '李婷婷', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=litingting', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'a22d1122-ad27-4af6-a211-c9455f16f463', name: '张国栋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangguodong', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'fb7b5301-6ff7-4cc0-ab97-d4905df4bf81', name: '王高山', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wanggaoshan', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: '1f57634b-e0db-4854-8cd7-1e83df8c2497', name: '张涛（前端）', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangtaoqian', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'f8a11968-bdf1-4abb-ad45-e68e95f42ec0', name: '吴伟', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wuwei', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: '0e16fff7-d942-4c34-9c64-bb90f881f346', name: '杨含笑', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yanghanxiao1', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },
  { id: 'cd076cd7-e239-4214-b494-8bc3f979d696', name: '李燕', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liyan', roles: [], department: 'rnd', groupId: '18adfc35-0c56-4c5a-bdc4-ec0a5f915748' },

  // 制造建设组 (R&D)
  { id: 'f700c1eb-ebea-4a76-951e-20b5acd6a212', name: '黄其萌', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=huangqimeng', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },
  { id: '254ad1d6-c4e1-433c-ba97-4fec7512a364', name: '于妍卉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yuyanhui', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },
  { id: '6a6ac51b-6c96-4ca7-8752-a509d4e117c7', name: '蔡浩然', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=caihaoran', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },
  { id: 'bf1ed1c8-19af-452d-b8f0-838fb958a4e8', name: '崔恩泉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=cuienquan', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },
  { id: '80d69bcc-ffd1-4047-b84e-2781fc7c2c9c', name: '沈利', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=shenli', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },
  { id: 'd7c924c9-4c70-4668-b62b-8e6d0d94a0e6', name: '杨含笑', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=yanghanxiao2', roles: [], department: 'rnd', groupId: '87b2fdec-65c1-49bf-b331-ace9842bd8a8' },

  // 智能设备组 (R&D)
  { id: '52c0d669-52ec-4a57-ac80-43f35c3bf4e5', name: '朱清凡', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhuqingfan', roles: [], department: 'rnd', groupId: 'f605bb3f-840b-457f-8128-213c2afc14de' },
  { id: '77a7adff-3568-4e66-80fb-b51503bd5b8e', name: '翟玉星', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhaiyuxing', roles: [], department: 'rnd', groupId: 'f605bb3f-840b-457f-8128-213c2afc14de' },
  { id: '033980da-7c2d-4aa6-8e68-55e14cbc0219', name: '公佩宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gongpeiyu', roles: [], department: 'rnd', groupId: 'f605bb3f-840b-457f-8128-213c2afc14de' },
  { id: 'ba1fdf88-02a9-45c2-afd0-ea71fb0ecf12', name: '刘金鑫', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liujinxin', roles: [], department: 'rnd', groupId: 'f605bb3f-840b-457f-8128-213c2afc14de' },
  { id: '78c1a792-fea7-4874-bfe5-5c82f8540ae9', name: '任昊宇', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=renhaoyu2', roles: [], department: 'rnd', groupId: 'f605bb3f-840b-457f-8128-213c2afc14de' },

  // AI与数据资产组 (R&D)
  { id: '1cbeec01-cdc4-49ff-93b8-078e3cc2a93e', name: '刘中志', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuzhongzhi', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: '193023c4-7590-4ddc-8041-f717c106ea40', name: '张路路', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanglulu', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: 'f98ac4af-65da-4e3a-ae66-ebcb70912814', name: '马树成', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=mashucheng', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: 'd6955e02-24d5-41ac-bbf3-244fb16488d7', name: '安鸿效', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=anhongxiao', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: '31071bfa-71d3-4136-9929-68f71e92db62', name: '刘广鑫', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuguangxin', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: '220b2d6a-27a4-4882-b36a-d711f9121cb7', name: '张厚诚', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhanghoucheng', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },
  { id: 'ccab8712-7f93-43e7-86db-f68e81d49b75', name: '邢子璠', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=xingzifan', roles: [], department: 'rnd', groupId: 'a17a2f01-27b4-4e51-b10f-b6e8df04fb47' },

  // 平台建设组 (R&D)
  { id: '6e9bae99-a9ab-461b-af85-c5813e4d3ac1', name: '王云飞', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=wangyunfei', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: 'cf970e28-3391-4dea-9f1d-bbe92bf5a796', name: '张传梅', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhangchuanmei', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: '83cfd279-6b96-46fc-8631-a01736057119', name: '马永辉', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=mayonghui', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: 'ec9edb04-d136-42f8-82b9-767645f6dd91', name: '韩冰', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=hanbing', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: 'ac95cf85-7842-43f6-b685-639cd3bbd6fe', name: '宋庆松', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=songqingsong', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: '7afcd60f-dedb-4e2e-a1dc-6f80e74a49c0', name: '周大鹏', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=zhoudapeng', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },
  { id: '100490ec-245b-4717-a9b5-472c7db59531', name: '高先泽', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=gaoxianze', roles: [], department: 'rnd', groupId: '16ceb7e8-21b3-491c-9753-239a9e810a39' },

  // 管理人员 (Admin)
  { id: '00e249fd-440a-4c25-b984-6503a637027c', name: '李克秋', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=likeqiu', roles: ['部门经理'], department: 'admin', groupId: undefined },
  { id: '94b0d954-cc94-41d0-b858-4c8502d413f6', name: '刘杰', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liujie', roles: ['部门经理'], department: 'admin', groupId: undefined },
  { id: 'd306de27-a6b3-434a-be15-2ba3d73a7385', name: '刘习', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuxi', roles: ['部门经理'], department: 'admin', groupId: undefined },
];

export const mockProjects: Project[] = [
  { id: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: 'Q2 大客户攻坚专项', description: '针对Top 20目标头部客户的定制化覆盖与转化。', category: 'marketing', status: 'in_progress', progress: 55, startDate: '2026-04-01', endDate: '2026-06-30', managerId: '01e56734-4960-4a74-89d9-125e1de46cbc' },
  { id: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '华东区新渠道拓展计划', description: '建立并激活至少10家区域核心代理商。', category: 'marketing', status: 'in_progress', progress: 30, startDate: '2026-05-01', endDate: '2026-07-31', managerId: '96c1caba-15d2-4131-871d-3111d867853f' },
  { id: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: 'AI Copilot 智能助手研发', description: '在现有系统中集成大语言模型，提供智能问答功能。', category: 'rnd', status: 'in_progress', progress: 60, startDate: '2026-03-01', endDate: '2026-08-31', managerId: '6e4493ce-8409-498a-94e5-aa58cf923d03' },
  { id: 'f1a0afe6-9761-4188-8401-6730b8cee031', title: '移动端底座重构', description: 'React Native 架构升级与性能优化。', category: 'rnd', status: 'completed', progress: 100, startDate: '2026-01-01', endDate: '2026-04-30', managerId: '6e4493ce-8409-498a-94e5-aa58cf923d03' },
];

export const mockPlans: Plan[] = [
  // Marketing P1
  { id: '34fec626-20cb-4ce4-9bf4-02180bb83695', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: 'Q2 大客户拓展目标', level: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'in_progress', progress: 55 },
  { id: '210e78f4-848e-4531-b467-35c97db0f208', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月 潜在客户挖掘', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 80, metric: { type: 'number', target: 50, current: 40, unit: '家', funnelStage: 'lead' } },
  { id: '1374c284-9b73-4a5c-8b7d-137f388e934e', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月 意向客户跟进', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 60, metric: { type: 'number', target: 30, current: 18, unit: '家', funnelStage: 'active' } },
  { id: 'a5a2d066-0296-437e-8041-9459f4eb6d7b', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月 客户流失', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 50, metric: { type: 'number', target: 5, current: 3, unit: '家', funnelStage: 'lost' } },
  { id: '3d55c50d-8b72-44e0-958c-17f146a93260', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '4月 新增重点客户', level: 'month', parentId: '34fec626-20cb-4ce4-9bf4-02180bb83695', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100, metric: { type: 'number', target: 3, current: 3, unit: '家', funnelStage: 'signed' } },
  { id: '6b0dcd82-6520-4ba4-afd4-cf000182a183', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '4月 目标利润额', level: 'month', parentId: '34fec626-20cb-4ce4-9bf4-02180bb83695', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100, metric: { type: 'currency', target: 80, current: 95, actualCompleted: 95, unit: '万' } },
  { id: '74ae96d4-c35a-40c3-aa5b-8e5d79226862', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月 目标合同签署额', level: 'month', parentId: '34fec626-20cb-4ce4-9bf4-02180bb83695', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 40, metric: { type: 'currency', target: 500, current: 200, unit: '万' } },
  { id: 'f7d4f9ed-0115-4efd-b96b-e1844f642319', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月 目标利润额', level: 'month', parentId: '34fec626-20cb-4ce4-9bf4-02180bb83695', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 30, metric: { type: 'currency', target: 120, current: 36, unit: '万' } },
  { id: '70ed3e9d-cc97-4ecd-ad15-ca4a7bbf909b', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '5月第一周 头部客户走访', level: 'week', parentId: '74ae96d4-c35a-40c3-aa5b-8e5d79226862', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 60 },
  
  // Marketing P2
  { id: '4a9a6d57-9614-4ebe-8ec9-c7399c9ec9da', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '5月 渠道保底回款额', level: 'month', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 30, metric: { type: 'currency', target: 150, current: 45, unit: '万' } },
  { id: '35e2769b-1b26-4514-a4fe-f512a986a630', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '5月第一周 代理商资质审核', level: 'week', parentId: '4a9a6d57-9614-4ebe-8ec9-c7399c9ec9da', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 50 },

  // RND P3
  { id: '34914f30-42f0-4cf5-97e6-c62cd6bf7e1a', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: 'Q2 研发迭代计划', level: 'quarter', startDate: '2026-04-01', endDate: '2026-06-30', status: 'in_progress', progress: 60 },
  { id: 'f006b5b2-4f1c-40cb-9d35-66048e00a9c4', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: '4月 模型集成与联调', level: 'month', parentId: '34914f30-42f0-4cf5-97e6-c62cd6bf7e1a', startDate: '2026-04-01', endDate: '2026-04-30', status: 'completed', progress: 100 },
  { id: '59dee833-8a0f-429f-94d8-5a79bcccf8be', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: '5月 UI/UX 优化与灰度', level: 'month', parentId: '34914f30-42f0-4cf5-97e6-c62cd6bf7e1a', startDate: '2026-05-01', endDate: '2026-05-31', status: 'in_progress', progress: 40 },
  { id: '0d81b0b0-d9e5-4079-8f07-4cff260eb0b2', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: '5月第一周 前端组件改造', level: 'week', parentId: '59dee833-8a0f-429f-94d8-5a79bcccf8be', startDate: '2026-05-01', endDate: '2026-05-07', status: 'in_progress', progress: 80 },
];

export const mockTasks: Task[] = [
  { id: '21a70d0a-6edb-4017-bae8-fbe599a49553', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', planId: '70ed3e9d-cc97-4ecd-ad15-ca4a7bbf909b', title: '拜访A集团技术决策人', assigneeId: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', status: 'completed', priority: 'high', progress: 100, endDate: '2026-05-05' },
  { id: '396d483a-237a-4a12-8f6f-2a3fb04aa8d9', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', planId: '70ed3e9d-cc97-4ecd-ad15-ca4a7bbf909b', title: '提交B公司年度服务框架协议', assigneeId: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', status: 'in_progress', priority: 'high', progress: 70, endDate: '2026-05-07' },
  { id: '8c0c02da-0a7d-46ec-9507-4c9e30b64229', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', planId: '35e2769b-1b26-4514-a4fe-f512a986a630', title: '审查3家意向代理商资质', assigneeId: '96c1caba-15d2-4131-871d-3111d867853f', status: 'completed', priority: 'medium', progress: 100, endDate: '2026-05-03' },
  { id: '43f85de0-ea9e-442d-9d53-1dff1ed16525', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', planId: '35e2769b-1b26-4514-a4fe-f512a986a630', title: '组织渠道政策线上宣讲会', assigneeId: '96c1caba-15d2-4131-871d-3111d867853f', status: 'not_started', priority: 'medium', progress: 0, endDate: '2026-05-06' },
  { id: '0b663333-f077-4eac-81f0-4c3b5acb6882', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', planId: '0d81b0b0-d9e5-4079-8f07-4cff260eb0b2', title: '对话框组件虚拟滚动支持', assigneeId: '867d5a3b-d910-4263-b9bf-29142b910c59', status: 'completed', priority: 'medium', progress: 100, endDate: '2026-05-04' },
  { id: 'fe4c21f7-a8b8-4e46-b165-8de664adfc18', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', planId: '0d81b0b0-d9e5-4079-8f07-4cff260eb0b2', title: '流式输出接口重连逻辑', assigneeId: 'fd8c5858-6254-4e62-b187-048fb65133e6', status: 'in_progress', priority: 'high', progress: 60, endDate: '2026-05-07' },
];

export const mockOutcomes: Outcome[] = [
  { id: '071bc5d7-4622-407d-8d47-be38353e1557', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: 'A集团合作意向书备忘录', description: '确立了首期300万的合作意向', submitterId: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', date: '2026-05-05', status: 'approved' },
  { id: '76ab37f8-c367-46d3-9ce1-59d781dd358d', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '代理商入驻资质审核表', description: '完成3家代理的背景调查及资质审核', submitterId: '96c1caba-15d2-4131-871d-3111d867853f', date: '2026-05-03', status: 'approved' },
  { id: '8dc5854f-2369-4653-b7e4-c5a60b4b0cd2', projectId: 'e5aa40e1-1b1b-4ebe-bab9-83934d4525f8', title: '4月新拓客户签单合约', description: '带来利润额95万元', submitterId: 'd994f820-3db6-4ae8-9587-33b0b6ee3024', date: '2026-04-28', status: 'approved' },
  { id: '349a204b-2223-4991-92e2-b43af145e612', projectId: 'b512a2ab-1a9c-4cf1-a0b4-1b39b440df4f', title: '华东区合作渠道打通', description: '首批打款完成', submitterId: '96c1caba-15d2-4131-871d-3111d867853f', date: '2026-04-29', status: 'approved' },
  { id: 'a602c4e9-690a-4968-8ff9-f39b59972b3c', projectId: '881e62f4-15d8-439a-88be-ec4d5ab406e0', title: 'API 集成文档', description: '后端接口交互及字段说明', submitterId: 'fd8c5858-6254-4e62-b187-048fb65133e6', date: '2026-04-28', status: 'approved' },
  { id: 'd2185401-fed3-4956-aff6-71bf1ed6d2d8', projectId: 'f1a0afe6-9761-4188-8401-6730b8cee031', title: 'RN 框架底层重构提测', description: '完成各项兼容性测试', submitterId: '867d5a3b-d910-4263-b9bf-29142b910c59', date: '2026-03-20', status: 'approved' },
  { id: '409bcc72-d900-4bfc-abc0-e6bae628c3b1', projectId: 'f1a0afe6-9761-4188-8401-6730b8cee031', title: '移动端新版全量发布', description: '性能提升30%，崩溃率下降90%', submitterId: '6e4493ce-8409-498a-94e5-aa58cf923d03', date: '2026-04-30', status: 'approved' },
];
