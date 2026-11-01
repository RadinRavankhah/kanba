import { randomBytes } from 'crypto';
import type { Prisma } from '@/prisma/generated/client';
import { prisma } from '@/lib/db/prisma';
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
  SubscriptionInfo,
  SubscriptionStatus,
  Task,
  TaskAssignment,
  TaskComment,
} from '@/lib/types';
import type {
  BookmarkInput,
  CreateProjectInput,
  CreateTaskInput,
  DataProvider,
  PublicProjectRecord,
  ServerStore,
  StripeOrderData,
  StripeSubscriptionData,
  UpdateProjectInput,
  UpdateTaskInput,
  UserStore,
} from '@/lib/db/store';

const publicProfileSelect = {
  id: true,
  email: true,
  full_name: true,
  avatar_url: true,
} as const;

const toPublicProfile = (p: { id: string; email: string; full_name: string | null; avatar_url: string | null }): PublicProfile => ({
  id: p.id,
  email: p.email,
  full_name: p.full_name,
  avatar_url: p.avatar_url,
});

const toAuthUser = (p: {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: 'free' | 'pro';
}): AuthUser => ({
  id: p.id,
  email: p.email,
  full_name: p.full_name,
  avatar_url: p.avatar_url,
  subscription_status: p.subscription_status,
});

const toDate = (value: Date | null | undefined) => (value ? value.toISOString() : null);

const toProject = (p: {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  user_id: string;
  public_share_token: string | null;
  created_at: Date;
  updated_at: Date;
}): Project => ({
  id: p.id,
  name: p.name,
  description: p.description,
  slug: p.slug,
  user_id: p.user_id,
  public_share_token: p.public_share_token,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

const toTask = (t: {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  priority: 'low' | 'medium' | 'high';
  due_date: Date | null;
  is_done: boolean;
  created_by: string | null;
  updated_by: string | null;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
  assignee?: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null;
}): Task => ({
  id: t.id,
  title: t.title,
  description: t.description,
  column_id: t.column_id,
  position: t.position,
  priority: t.priority,
  due_date: toDate(t.due_date),
  is_done: t.is_done,
  created_by: t.created_by,
  updated_by: t.updated_by,
  assigned_to: t.assigned_to,
  created_at: t.created_at.toISOString(),
  updated_at: t.updated_at.toISOString(),
  profiles: t.assignee ? toPublicProfile(t.assignee) : null,
});

const assertProjectAccess = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ user_id: userId }, { project_members: { some: { user_id: userId } } }],
    },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found or access denied');
};

const assertProjectOwner = async (projectId: string, userId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, user_id: userId },
    select: { id: true },
  });
  if (!project) throw new Error('Only the project owner can do this');
};

const assertColumnAccess = async (columnId: string, userId: string) => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { project_id: true },
  });
  if (!column) throw new Error('Column not found');
  await assertProjectAccess(column.project_id, userId);
  return column.project_id;
};

const assertTaskAccess = async (taskId: string, userId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { column: { select: { project_id: true } } },
  });
  if (!task) throw new Error('Task not found');
  await assertProjectAccess(task.column.project_id, userId);
};

const createUserStore = (userId: string): UserStore => ({
  async getProfile() {
    const p = await prisma.profile.findUnique({ where: { id: userId } });
    if (!p) return null;
    return { ...toPublicProfile(p), subscription_status: p.subscription_status };
  },

  async updateFullName(fullName) {
    await prisma.profile.update({ where: { id: userId }, data: { full_name: fullName } });
  },

  async countOwnedProjects() {
    return prisma.project.count({ where: { user_id: userId } });
  },

  async listProjects() {
    const projects = await prisma.project.findMany({
      where: {
        OR: [{ user_id: userId }, { project_members: { some: { user_id: userId } } }],
      },
      include: {
        project_members: { where: { user_id: userId }, select: { role: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return projects.map((p): ProjectWithRole => ({
      ...toProject(p),
      project_members: p.project_members.map((m) => ({ role: m.role })),
    }));
  },

  async listOwnedProjectSummaries(limit = 10) {
    const projects = await prisma.project.findMany({
      where: { user_id: userId },
      select: { id: true, name: true, slug: true, user_id: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return projects;
  },

  async getProjectBySlug(slug) {
    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: { assignee: { select: publicProfileSelect } },
            },
          },
        },
      },
    });
    if (!project) return null;
    await assertProjectAccess(project.id, userId);

    return {
      ...toProject(project),
      columns: project.columns.map((c): Column => ({
        id: c.id,
        name: c.name,
        project_id: c.project_id,
        position: c.position,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        tasks: c.tasks.map(toTask),
      })),
    } satisfies ProjectDetails;
  },

  async getProjectSummaryBySlug(slug) {
    const project = await prisma.project.findUnique({ where: { slug } });
    if (!project) return null;
    await assertProjectAccess(project.id, userId);
    return toProject(project);
  },

  async isSlugTaken(slug) {
    const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
    return existing !== null;
  },

  async createProject(input: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        slug: input.slug,
        user_id: userId,
        created_by: userId,
        updated_by: userId,
        columns: {
          create: input.columns.map((name, position) => ({
            name,
            position,
            created_by: userId,
            updated_by: userId,
          })),
        },
      },
    });
    return toProject(project);
  },

  async updateProject(projectId, input: UpdateProjectInput) {
    await assertProjectOwner(projectId, userId);
    await prisma.project.update({
      where: { id: projectId },
      data: { ...input, updated_by: userId },
    });
  },

  async deleteProject(projectId) {
    await assertProjectOwner(projectId, userId);
    await prisma.project.delete({ where: { id: projectId } });
  },

  async ensureShareToken(projectId) {
    await assertProjectOwner(projectId, userId);
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { public_share_token: true },
    });
    if (project.public_share_token) return project.public_share_token;
    const token = randomBytes(12).toString('base64url');
    await prisma.project.update({ where: { id: projectId }, data: { public_share_token: token } });
    return token;
  },

  async createColumn(projectId, name, position) {
    await assertProjectAccess(projectId, userId);
    await prisma.column.create({
      data: { name, position, project_id: projectId, created_by: userId, updated_by: userId },
    });
  },

  async renameColumn(columnId, name) {
    await assertColumnAccess(columnId, userId);
    await prisma.column.update({ where: { id: columnId }, data: { name, updated_by: userId } });
  },

  async deleteColumn(columnId) {
    await assertColumnAccess(columnId, userId);
    await prisma.column.delete({ where: { id: columnId } });
  },

  async createTask(input: CreateTaskInput) {
    await assertColumnAccess(input.column_id, userId);
    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        column_id: input.column_id,
        position: input.position,
        priority: input.priority,
        due_date: input.due_date ? new Date(input.due_date) : null,
        assigned_to: input.assigned_to ?? null,
        created_by: userId,
        updated_by: userId,
      },
    });
    return toTask(task);
  },

  async updateTask(taskId, input: UpdateTaskInput) {
    await assertTaskAccess(taskId, userId);
    const { due_date, ...rest } = input;
    const data: Prisma.TaskUncheckedUpdateInput = {
      ...rest,
      updated_by: userId,
      ...(due_date !== undefined ? { due_date: due_date ? new Date(due_date) : null } : {}),
    };
    if (input.column_id) await assertColumnAccess(input.column_id, userId);
    await prisma.task.update({ where: { id: taskId }, data });
  },

  async deleteTask(taskId) {
    await assertTaskAccess(taskId, userId);
    await prisma.task.delete({ where: { id: taskId } });
  },

  async setTaskPositions(updates) {
    for (const u of updates) {
      await assertTaskAccess(u.id, userId);
    }
    await prisma.$transaction(
      updates.map((u) =>
        prisma.task.update({
          where: { id: u.id },
          data: {
            position: u.position,
            ...(u.column_id ? { column_id: u.column_id } : {}),
            updated_by: userId,
          },
        })
      )
    );
  },

  async listAssignedTasks(limit = 10) {
    const tasks = await prisma.task.findMany({
      where: { assigned_to: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        column: { select: { name: true, project: { select: { id: true, name: true, slug: true } } } },
      },
    });
    return tasks.map((t): TaskAssignment => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      due_date: toDate(t.due_date),
      column_name: t.column.name,
      project_id: t.column.project.id,
      project_name: t.column.project.name,
      project_slug: t.column.project.slug,
    }));
  },

  async listMembers(projectId) {
    await assertProjectAccess(projectId, userId);
    const members = await prisma.projectMember.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'asc' },
      include: { user: { select: publicProfileSelect } },
    });
    return members.map((m): ProjectMember => ({
      id: m.id,
      project_id: m.project_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),
      profiles: toPublicProfile(m.user),
    }));
  },

  async findMember(projectId, memberUserId) {
    return prisma.projectMember.findUnique({
      where: { project_id_user_id: { project_id: projectId, user_id: memberUserId } },
      select: { id: true },
    });
  },

  async addMember(projectId, memberUserId, role) {
    await assertProjectOwner(projectId, userId);
    await prisma.projectMember.create({
      data: { project_id: projectId, user_id: memberUserId, role },
    });
  },

  async updateMemberRole(memberId, role) {
    const member = await prisma.projectMember.findUnique({ where: { id: memberId }, select: { project_id: true } });
    if (!member) throw new Error('Member not found');
    await assertProjectOwner(member.project_id, userId);
    await prisma.projectMember.update({ where: { id: memberId }, data: { role } });
  },

  async removeMember(memberId) {
    const member = await prisma.projectMember.findUnique({ where: { id: memberId }, select: { project_id: true } });
    if (!member) throw new Error('Member not found');
    await assertProjectOwner(member.project_id, userId);
    await prisma.projectMember.delete({ where: { id: memberId } });
  },

  async listComments(taskId) {
    await assertTaskAccess(taskId, userId);
    const comments = await prisma.taskComment.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'asc' },
      include: { user: { select: publicProfileSelect } },
    });
    return comments.map((c): TaskComment => ({
      id: c.id,
      task_id: c.task_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString(),
      profiles: toPublicProfile(c.user),
    }));
  },

  async createComment(taskId, content) {
    await assertTaskAccess(taskId, userId);
    await prisma.taskComment.create({ data: { task_id: taskId, user_id: userId, content } });
  },

  async updateComment(commentId, content) {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { user_id: true },
    });
    if (!comment || comment.user_id !== userId) throw new Error('Comment not found');
    await prisma.taskComment.update({ where: { id: commentId }, data: { content } });
  },

  async deleteComment(commentId) {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { user_id: true },
    });
    if (!comment || comment.user_id !== userId) throw new Error('Comment not found');
    await prisma.taskComment.delete({ where: { id: commentId } });
  },

  async listActivity(projectId, limit) {
    await assertProjectAccess(projectId, userId);
    const logs = await prisma.activityLog.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { user: { select: publicProfileSelect } },
    });
    return logs.map((l): ActivityEntry => ({
      id: l.id,
      project_id: l.project_id,
      user_id: l.user_id,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      details: l.details,
      created_at: l.created_at.toISOString(),
      profiles: toPublicProfile(l.user),
    }));
  },

  async listNotifications(limit = 20) {
    const items = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return items.map((n): Notification => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      data: n.data,
      created_at: n.created_at.toISOString(),
    }));
  },

  async markNotificationRead(notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { read: true },
    });
  },

  async markAllNotificationsRead() {
    await prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
  },

  async deleteNotification(notificationId) {
    await prisma.notification.deleteMany({ where: { id: notificationId, user_id: userId } });
  },

  async listBookmarks() {
    const items = await prisma.bookmark.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return items.map((b): Bookmark => ({
      id: b.id,
      user_id: b.user_id,
      url: b.url,
      title: b.title,
      description: b.description,
      icon_url: b.icon_url,
      created_at: b.created_at.toISOString(),
    }));
  },

  async createBookmark(input: BookmarkInput) {
    const b = await prisma.bookmark.create({
      data: {
        user_id: userId,
        url: input.url,
        title: input.title ?? null,
        description: input.description ?? null,
        icon_url: input.icon_url ?? null,
      },
    });
    return {
      id: b.id,
      user_id: b.user_id,
      url: b.url,
      title: b.title,
      description: b.description,
      icon_url: b.icon_url,
      created_at: b.created_at.toISOString(),
    };
  },

  async deleteBookmark(bookmarkId) {
    await prisma.bookmark.deleteMany({ where: { id: bookmarkId, user_id: userId } });
  },

  async getSubscription() {
    const customer = await prisma.stripeCustomer.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { customer_id: true },
    });
    if (!customer) return null;
    const sub = await prisma.stripeSubscription.findFirst({
      where: { customer_id: customer.customer_id, deleted_at: null },
    });
    if (!sub) return null;
    return {
      subscription_status: sub.status,
      price_id: sub.price_id,
      current_period_end: sub.current_period_end !== null ? Number(sub.current_period_end) : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      payment_method_brand: sub.payment_method_brand,
      payment_method_last4: sub.payment_method_last4,
    } satisfies SubscriptionInfo;
  },

  async searchUsers(query, limit = 10) {
    const term = query.trim();
    if (term.length < 2) return [];
    const users = await prisma.profile.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { full_name: { contains: term, mode: 'insensitive' } },
            ],
          },
          { id: { not: userId } },
        ],
      },
      select: publicProfileSelect,
      take: limit,
    });
    return users.map(toPublicProfile);
  },
});

const serverStore: ServerStore = {
  async findUserById(userId) {
    const p = await prisma.profile.findUnique({ where: { id: userId } });
    return p ? toAuthUser(p) : null;
  },

  async findUserByEmail(email) {
    const p = await prisma.profile.findUnique({ where: { email } });
    return p ? { ...toAuthUser(p), password_hash: p.password_hash } : null;
  },

  async createUser({ email, password_hash, full_name }) {
    const p = await prisma.profile.create({ data: { email, password_hash, full_name } });
    return toAuthUser(p);
  },

  async getPublicProjectByToken(token): Promise<PublicProjectRecord | null> {
    const project = await prisma.project.findUnique({
      where: { public_share_token: token },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: { tasks: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!project) return null;
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      columns: project.columns.map((c): Column => ({
        id: c.id,
        name: c.name,
        project_id: c.project_id,
        position: c.position,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        tasks: c.tasks.map(toTask),
      })),
    };
  },

  async findStripeCustomerByUserId(userId) {
    return prisma.stripeCustomer.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { customer_id: true },
    });
  },

  async createStripeCustomer(userId, customerId) {
    await prisma.stripeCustomer.create({ data: { user_id: userId, customer_id: customerId } });
  },

  async findStripeCustomerUserId(customerId) {
    const customer = await prisma.stripeCustomer.findFirst({
      where: { customer_id: customerId, deleted_at: null },
      select: { user_id: true },
    });
    return customer?.user_id ?? null;
  },

  async ensureStripeSubscription(customerId) {
    const existing = await prisma.stripeSubscription.findUnique({ where: { customer_id: customerId } });
    if (!existing) {
      await prisma.stripeSubscription.create({ data: { customer_id: customerId, status: 'not_started' } });
    }
  },

  async upsertStripeSubscription(customerId, data) {
    const { current_period_start, current_period_end, ...rest } = data;
    const fields = {
      ...rest,
      ...(current_period_start !== undefined ? { current_period_start: BigInt(current_period_start) } : {}),
      ...(current_period_end !== undefined ? { current_period_end: BigInt(current_period_end) } : {}),
    };
    await prisma.stripeSubscription.upsert({
      where: { customer_id: customerId },
      create: { customer_id: customerId, ...fields },
      update: fields,
    });
  },

  async createStripeOrder(order: StripeOrderData) {
    await prisma.stripeOrder.create({
      data: {
        ...order,
        amount_subtotal: BigInt(order.amount_subtotal),
        amount_total: BigInt(order.amount_total),
        status: 'completed',
      },
    });
  },

  async setSubscriptionStatus(userId: string, status: SubscriptionStatus) {
    await prisma.profile.update({
      where: { id: userId },
      data: { subscription_status: status, updated_at: new Date() },
    });
  },
};

export const postgresProvider: DataProvider = {
  name: 'postgresql',
  forUser: createUserStore,
  server: serverStore,
};
