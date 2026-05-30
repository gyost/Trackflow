export type Category = 'marketing' | 'rnd';
export type Status = 'not_started' | 'in_progress' | 'completed' | 'delayed';
export type Priority = 'low' | 'medium' | 'high';
export type PlanLevel = 'quarter' | 'month' | 'week';
export type RequirementStatus = 'backlog' | 'reviewing' | 'approved' | 'rejected' | 'planned' | 'completed';
export type TrackingStatus = 'followup' | 'implementing' | 'accepting' | 'quoted' | 'terminated' | 'archived';

export interface Group {
  id: string;
  name: string;
  category: Category;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  roles: string[];
  department: Category | 'admin';
  groupId?: string;
  account?: string;
  password?: string;
  phone?: string;
}

export interface ProjectTracking {
  id: string;
  customerName: string;
  status: TrackingStatus;
  product: string;
  cityManager: string;
  projectManager: string;
  expectedContractAmount: number;
  actualContractAmount: number;
  signedDate?: string;
  followupDate?: string;
  lastFollowupDate?: string;
  contactName: string;
  contactPhone: string;
  updatedAt: string;
  createdAt?: string;
  followupRecords?: FollowupRecord[];
  terminationReason?: string;
}

export interface FollowupRecord {
  id: string;
  date: string;
  content: string; // rich text
}

export interface RequirementHistory {
  id: string;
  requirementId: string;
  status: RequirementStatus;
  timestamp: string;
  note: string;
}

export interface Requirement {
  id: string;
  serialNumber?: string;
  projectId?: string;
  title: string;
  description: string;
  linkUrl?: string;
  priority: Priority;
  status: RequirementStatus;
  source: string;
  customerName?: string;
  internalSourceDetail?: string;
  submitterId: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
  history?: RequirementHistory[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  progress: number;
  startDate: string;
  endDate: string;
  managerId: string;
}

export interface Plan {
  id: string;
  projectId: string;
  title: string;
  level: PlanLevel;
  parentId?: string; // Week belongs to Month, Month belongs to Quarter
  startDate: string;
  endDate: string;
  status: Status;
  progress: number;
  metric?: {
    type: 'currency' | 'number';
    target: number;
    current: number;
    unit: string;
    isModified?: boolean;
    actualCompleted?: number;
    funnelStage?: 'lead' | 'active' | 'signed' | 'lost';
  };
}

export interface Task {
  id: string;
  projectId: string; // backward compatibility
  projectName?: string; // manual input string
  planId: string; // Links to weekly plan
  title: string;
  assigneeId: string;
  status: Status;
  priority: Priority;
  progress: number;
  plannedProgress?: number;
  startDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  endDate: string;
  outcome?: string; // 产出成果
}

export interface ReleaseGoal {
  id: string;
  groupId: string;
  title: string;
  targetMonth: string;
  targetDate: string;
  actualVersion?: string;
  actualReleaseDate?: string;
  status: 'planned' | 'released' | 'delayed';
  note?: string;
  createdAt: string;
}

export interface Outcome {
  id: string;
  projectId: string;
  title: string;
  description: string;
  fileUrl?: string;
  submitterId: string;
  date: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

export interface RolePermission {
  roleName: string;
  permissions: string[];
}

