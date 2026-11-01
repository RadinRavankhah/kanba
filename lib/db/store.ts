import type {
  ActivityEntry,
  AuthUser,
  Bookmark,
  Column,
  Notification,
  Profile,
  Project,
  ProjectDetails,
  ProjectMember,
  ProjectRole,
  ProjectWithRole,
  PublicProfile,
  StripeSubscriptionStatus,
  SubscriptionInfo,
  SubscriptionStatus,
  Task,
  TaskAssignment,
  TaskComment,
  TaskPriority,
} from '@/lib/types';

export interface CreateTaskInput {
  column_id: string;
  title: string;
  description?: string | null;
  position: number;
  priority: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  column_id?: string;
  position?: number;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  is_done?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  slug: string;
  columns: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  slug?: string;
}

export interface BookmarkInput {
  url: string;
  title?: string | null;
  description?: string | null;
  icon_url?: string | null;
}

export interface UserStore {
  getProfile(): Promise<Profile | null>;
  updateFullName(fullName: string): Promise<void>;
  countOwnedProjects(): Promise<number>;

  listProjects(): Promise<ProjectWithRole[]>;
  listOwnedProjectSummaries(limit?: number): Promise<Pick<Project, 'id' | 'name' | 'slug' | 'user_id'>[]>;
  getProjectBySlug(slug: string): Promise<ProjectDetails | null>;
  getProjectSummaryBySlug(slug: string): Promise<Project | null>;
  isSlugTaken(slug: string): Promise<boolean>;
  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(projectId: string, input: UpdateProjectInput): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  ensureShareToken(projectId: string): Promise<string>;

  createColumn(projectId: string, name: string, position: number): Promise<void>;
  renameColumn(columnId: string, name: string): Promise<void>;
  deleteColumn(columnId: string): Promise<void>;

  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(taskId: string, input: UpdateTaskInput): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  setTaskPositions(updates: { id: string; position: number; column_id?: string }[]): Promise<void>;
  listAssignedTasks(limit?: number): Promise<TaskAssignment[]>;

  listMembers(projectId: string): Promise<ProjectMember[]>;
  findMember(projectId: string, userId: string): Promise<{ id: string } | null>;
  addMember(projectId: string, userId: string, role: ProjectRole): Promise<void>;
  updateMemberRole(memberId: string, role: ProjectRole): Promise<void>;
  removeMember(memberId: string): Promise<void>;

  listComments(taskId: string): Promise<TaskComment[]>;
  createComment(taskId: string, content: string): Promise<void>;
  updateComment(commentId: string, content: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;

  listActivity(projectId: string, limit: number): Promise<ActivityEntry[]>;

  listNotifications(limit?: number): Promise<Notification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;

  listBookmarks(): Promise<Bookmark[]>;
  createBookmark(input: BookmarkInput): Promise<Bookmark>;
  deleteBookmark(bookmarkId: string): Promise<void>;

  getSubscription(): Promise<SubscriptionInfo | null>;

  searchUsers(query: string, limit?: number): Promise<PublicProfile[]>;
}

export interface StripeSubscriptionData {
  subscription_id?: string;
  price_id?: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  payment_method_brand?: string | null;
  payment_method_last4?: string | null;
  status: StripeSubscriptionStatus;
}

export interface StripeOrderData {
  checkout_session_id: string;
  payment_intent_id: string;
  customer_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
}

export interface PublicProjectRecord {
  id: string;
  name: string;
  description: string | null;
  columns: Column[];
}

export interface ServerStore {
  findUserById(userId: string): Promise<AuthUser | null>;
  findUserByEmail(email: string): Promise<(AuthUser & { password_hash: string | null }) | null>;
  createUser(input: { email: string; password_hash: string; full_name: string | null }): Promise<AuthUser>;

  getPublicProjectByToken(token: string): Promise<PublicProjectRecord | null>;

  findStripeCustomerByUserId(userId: string): Promise<{ customer_id: string } | null>;
  createStripeCustomer(userId: string, customerId: string): Promise<void>;
  findStripeCustomerUserId(customerId: string): Promise<string | null>;
  ensureStripeSubscription(customerId: string): Promise<void>;
  upsertStripeSubscription(customerId: string, data: StripeSubscriptionData): Promise<void>;
  createStripeOrder(order: StripeOrderData): Promise<void>;
  setSubscriptionStatus(userId: string, status: SubscriptionStatus): Promise<void>;
}

export interface DataProvider {
  readonly name: string;
  forUser(userId: string): UserStore;
  server: ServerStore;
}
