import { db } from "./db";
import { roles, departments, teamMembers, auditLog, users } from "@shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import type { 
  Role, 
  InsertRole, 
  Department, 
  InsertDepartment, 
  TeamMember, 
  InsertTeamMember,
  AuditLog,
  InsertAuditLog 
} from "@shared/schema";

export interface ITeamStorage {
  // Roles
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  getRoleById(id: number): Promise<Role | undefined>;

  // Departments
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  getDepartmentById(id: number): Promise<Department | undefined>;

  // Team Members
  getTeamMembers(): Promise<any[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<void>;
  getTeamMemberById(id: number): Promise<any | undefined>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]>;

  // Users for assignment
  getAllUsers(): Promise<any[]>;
}

export class TeamStorage implements ITeamStorage {
  
  // Roles
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(desc(roles.createdAt));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db
      .update(roles)
      .set({ ...roleData, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(desc(departments.createdAt));
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  async updateDepartment(id: number, departmentData: Partial<InsertDepartment>): Promise<Department> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({ ...departmentData, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async getDepartmentById(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  // Team Members
  async getTeamMembers(): Promise<any[]> {
    return await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      roleId: teamMembers.roleId,
      departmentId: teamMembers.departmentId,
      isActive: teamMembers.isActive,
      hourlyRate: teamMembers.hourlyRate,
      userName: users.name,
      userUsername: users.username,
      roleName: roles.name,
      departmentName: departments.name
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .leftJoin(roles, eq(teamMembers.roleId, roles.id))
    .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
    .orderBy(desc(teamMembers.createdAt));
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: number, memberData: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ ...memberData, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async getTeamMemberById(id: number): Promise<any | undefined> {
    const [member] = await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      roleId: teamMembers.roleId,
      departmentId: teamMembers.departmentId,
      isActive: teamMembers.isActive,
      hourlyRate: teamMembers.hourlyRate,
      userName: users.name,
      userUsername: users.username,
      roleName: roles.name,
      departmentName: departments.name
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .leftJoin(roles, eq(teamMembers.roleId, roles.id))
    .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
    .where(eq(teamMembers.id, id));
    return member;
  }

  // Audit
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(log).returning();
    return newLog;
  }

  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    let query = db.query.auditLog.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: [desc(auditLog.timestamp)]
    });

    if (entityType && entityId) {
      return await db.query.auditLog.findMany({
        where: and(
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId)
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: [desc(auditLog.timestamp)]
      });
    }

    return await query;
  }

  // Users for assignment
  async getAllUsers(): Promise<any[]> {
    return await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      department: users.department,
      isActive: users.isActive,
    }).from(users).where(eq(users.isActive, true));
  }
}

export const teamStorage = new TeamStorage();

// Default system roles
export const DEFAULT_SYSTEM_ROLES = [
  {
    name: "Owner/Admin",
    description: "Full system access with user management and financial controls",
    isSystemRole: true,
    permissions: [
      { module: "estimation", actions: ["view", "create", "edit", "delete", "approve"] },
      { module: "materials", actions: ["view", "create", "edit", "delete", "import", "export"] },
      { module: "cutting", actions: ["view", "create", "edit", "delete", "optimize"] },
      { module: "jobs", actions: ["view", "create", "edit", "delete", "manage"] },
      { module: "inventory", actions: ["view", "create", "edit", "delete", "adjust"] },
      { module: "reports", actions: ["view", "create", "export", "schedule"] },
      { module: "settings", actions: ["view", "edit", "manage"] },
      { module: "users", actions: ["view", "create", "edit", "delete", "manage"] },
      { module: "clients", actions: ["view", "create", "edit", "delete"] },
      { module: "suppliers", actions: ["view", "create", "edit", "delete"] },
      { module: "financial", actions: ["view", "edit", "approve", "manage"] },
    ]
  },
  {
    name: "Project Manager",
    description: "Job creation, estimation, and client management",
    isSystemRole: true,
    permissions: [
      { module: "estimation", actions: ["view", "create", "edit", "approve"] },
      { module: "materials", actions: ["view", "create", "edit"] },
      { module: "cutting", actions: ["view", "create", "edit", "optimize"] },
      { module: "jobs", actions: ["view", "create", "edit", "manage"] },
      { module: "inventory", actions: ["view"] },
      { module: "reports", actions: ["view", "create", "export"] },
      { module: "clients", actions: ["view", "create", "edit"] },
      { module: "suppliers", actions: ["view"] },
      { module: "financial", actions: ["view"] },
    ]
  },
  {
    name: "Estimator",
    description: "Estimation access, material library, and cutting plans",
    isSystemRole: true,
    permissions: [
      { module: "estimation", actions: ["view", "create", "edit"] },
      { module: "materials", actions: ["view", "create", "edit", "import"] },
      { module: "cutting", actions: ["view", "create", "edit", "optimize"] },
      { module: "jobs", actions: ["view"] },
      { module: "inventory", actions: ["view"] },
      { module: "reports", actions: ["view", "create"] },
      { module: "clients", actions: ["view"] },
      { module: "suppliers", actions: ["view"] },
    ]
  },
  {
    name: "Workshop Foreman",
    description: "Job execution, inventory, and labor tracking",
    isSystemRole: true,
    permissions: [
      { module: "jobs", actions: ["view", "edit"] },
      { module: "inventory", actions: ["view", "edit", "adjust"] },
      { module: "cutting", actions: ["view", "edit"] },
      { module: "materials", actions: ["view"] },
      { module: "reports", actions: ["view", "create"] },
    ]
  },
  {
    name: "Operator",
    description: "Limited access to assigned jobs and cutting plans",
    isSystemRole: true,
    permissions: [
      { module: "jobs", actions: ["view"] },
      { module: "cutting", actions: ["view"] },
      { module: "inventory", actions: ["view"] },
    ]
  },
  {
    name: "Viewer",
    description: "Read-only access for reporting and dashboard",
    isSystemRole: true,
    permissions: [
      { module: "reports", actions: ["view"] },
      { module: "jobs", actions: ["view"] },
      { module: "materials", actions: ["view"] },
      { module: "inventory", actions: ["view"] },
    ]
  }
];