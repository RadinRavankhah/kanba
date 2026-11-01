export type SubscriptionStatus = 'free' | 'pro';
export type ProjectRole = 'owner' | 'admin' | 'member';
export type TaskPriority = 'low' | 'medium' | 'high';
export type StripeSubscriptionStatus =
  | 'not_started'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export interface PublicProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Profile extends PublicProfile {
  subscription_status: SubscriptionStatus | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  user_id: string;
  public_share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRole extends Project {
  project_members?: { role: ProjectRole }[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  priority: TaskPriority;
  due_date: string | null;
  is_done: boolean;
  created_by: string | null;
  updated_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  profiles?: PublicProfile | null;
}

export interface Column {
  id: string;
  name: string;
  project_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  tasks: Task[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  updated_at: string;
  profiles: PublicProfile;
}

export interface ProjectDetails extends Project {
  columns: Column[];
}

export interface TaskAssignment {
  id: string;
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  column_name: string;
  project_id: string;
  project_name: string;
  project_slug: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  icon_url: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: PublicProfile;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  created_at: string;
  profiles: PublicProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data: unknown;
  created_at: string;
}

export interface SubscriptionInfo {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus | null;
}
