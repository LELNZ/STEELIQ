import { db } from "./db";
import { roles, departments, teamMembers, auditLog, users, laborRates } from "@shared/schema";
import { eq, and, desc, isNull, sql, gte } from "drizzle-orm";
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
    return await db.select().from(roles).orderBy(roles.name);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, roleData: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db
      .update(roles)
      .set(roleData)
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    try {
      // Check dependencies in existing tables only
      let dependencies = [];
      
      // Check labor_rates table (exists in schema)
      try {
        const [laborRateResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(laborRates)
          .where(eq(laborRates.roleId, id));
        
        const laborRateCount = laborRateResult?.count || 0;
        if (laborRateCount > 0) {
          dependencies.push(`${laborRateCount} labor rate${laborRateCount !== 1 ? 's' : ''}`);
        }
      } catch (e) {
        console.log("Could not check labor_rates:", e);
      }

      // Check team_members table (exists in schema) 
      try {
        const [teamMemberResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(teamMembers)
          .where(eq(teamMembers.roleId, id));
        
        const teamMemberCount = teamMemberResult?.count || 0;
        if (teamMemberCount > 0) {
          dependencies.push(`${teamMemberCount} team member${teamMemberCount !== 1 ? 's' : ''}`);
        }
      } catch (e) {
        console.log("Could not check team_members:", e);
      }

      // Check role_rates table directly via raw SQL (not in schema but exists in DB)
      try {
        const roleRateResult = await db.execute(sql`
          SELECT COUNT(*) as count 
          FROM role_rates 
          WHERE role_id = ${id}
        `);
        const roleRateCount = Number(roleRateResult.rows[0]?.count || 0);
        if (roleRateCount > 0) {
          dependencies.push(`${roleRateCount} role rate${roleRateCount !== 1 ? 's' : ''}`);
        }
      } catch (e) {
        // Table might not exist, silently continue
      }

      // If there are dependencies, throw an error with details
      if (dependencies.length > 0) {
        throw new Error(`Cannot delete role. It is currently being used by: ${dependencies.join(', ')}. Please remove or reassign these dependencies first.`);
      }
      
      // Delete related data that won't cause issues
      try {
        // Delete any orphaned permissions or audit logs
        await db.execute(sql`
          DELETE FROM audit_log 
          WHERE entity_type = 'role' 
          AND entity_id = ${id.toString()}
        `);
      } catch (e) {
        // Continue even if audit cleanup fails
      }

      // If no blocking dependencies, proceed with deletion
      await db.delete(roles).where(eq(roles.id, id));
      
      console.log(`Successfully deleted role with id ${id}`);
      
      // Create audit log for the deletion
      await this.createAuditLog({
        userId: 0, // System action
        action: 'DELETE',
        entityType: 'role',
        entityId: id.toString(),
        description: `Role deleted (ID: ${id})`,
        timestamp: new Date()
      });
      
    } catch (error: any) {
      // Re-throw our custom error messages
      if (error.message && error.message.includes('Cannot delete role')) {
        throw error;
      }
      
      // If it's a foreign key constraint error, provide a helpful message
      if (error.code === '23503') {
        const table = error.table || 'unknown table';
        const detail = error.detail || '';
        throw new Error(`Cannot delete role. It is still being referenced by ${table}. ${detail ? `Details: ${detail}` : 'Please remove all associated data first.'}`);
      }
      
      console.error("Error in deleteRole:", error);
      throw new Error(`Failed to delete role: ${error.message || 'Unknown error'}`);
    }
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
      .set(departmentData)
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
  
  // Team Members
  
  // Team Members - Simple query using only existing fields
  async getTeamMembers(): Promise<any[]> {
    const members = await db.select()
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id));

    return members.map(row => {
      const member = row.team_members;
      const user = row.users;
      const role = row.roles;
      const department = row.departments;
      
      return {
        // Core team member data
        id: member.id,
        userId: member.userId,
        roleId: member.roleId,
        departmentId: member.departmentId,
        isActive: member.isActive,
        
        // Personal information
        firstName: member.firstName,
        lastName: member.lastName,
        preferredName: member.preferredName,
        dateOfBirth: member.dateOfBirth,
        
        // Contact information
        email: member.email,
        phone: member.phone,
        address: member.address,
        city: member.city,
        country: member.country,
        postalCode: member.postalCode,
        
        // Emergency contact
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        emergencyContactRelation: member.emergencyContactRelation,
        
        // Employment information
        employeeNumber: member.employeeNumber,
        hireDate: member.hireDate,
        employmentType: member.employmentType,
        contractEndDate: member.contractEndDate,
        
        // Work scheduling
        workHoursPerWeek: member.workHoursPerWeek,
        shiftPattern: member.shiftPattern,
        overtimeEligible: member.overtimeEligible,
        
        // Skills and certifications
        skills: member.skills || [],
        primarySkill: member.primarySkill,
        experienceYears: member.experienceYears,
        certifications: member.certifications || {},
        certificateExpiryDates: member.certificateExpiryDates || {},
        
        // Availability
        availabilityNotes: member.availabilityNotes,
        leaveBalance: member.leaveBalance || {},
        
        // Health & Safety
        medicalConditions: member.medicalConditions,
        allergies: member.allergies,
        bloodType: member.bloodType,
        safetyTrainingDates: member.safetyTrainingDates || {},
        ppe: member.ppe || {},
        
        // Notes
        notes: member.notes,
        
        // Labor rate management
        baseRate: member.baseRate,
        overtimeRate: member.overtimeRate,
        weekendRate: member.weekendRate,
        allowances: member.allowances || {},
        
        // Banking
        bankName: member.bankName,
        accountNumber: member.accountNumber,
        taxNumber: member.taxNumber,
        superannuation: member.superannuation,
        
        // Vehicle and equipment
        vehicleDetails: member.vehicleDetails || {},
        licenseTypes: member.licenseTypes || [],
        toolsProvided: member.toolsProvided || [],
        
        // Access and security
        accessLevel: member.accessLevel,
        keyCardNumber: member.keyCardNumber,
        lockerNumber: member.lockerNumber,
        parkingSpace: member.parkingSpace,
        
        // Performance
        performanceReviews: member.performanceReviews || [],
        kpis: member.kpis || {},
        trainingCompleted: member.trainingCompleted || [],
        trainingRequired: member.trainingRequired || [],
        
        // Projects
        currentProjects: member.currentProjects || [],
        projectHistory: member.projectHistory || [],
        specializations: member.specializations || [],
        
        // Timestamps
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        lastReviewDate: member.lastReviewDate,
        nextReviewDate: member.nextReviewDate,
        
        // Related data from joins
        userName: user?.name || null,
        userEmail: user?.email || null,
        roleName: role?.name || null,
        departmentName: department?.name || null,
        
        // GPS location (for field workers)
        lastKnownLocation: member.lastKnownLocation || null,
        lastLocationUpdate: member.lastLocationUpdate || null,
        
        // Profile photo
        photoUrl: member.photoUrl || null,
        
        // Compliance
        visaStatus: member.visaStatus,
        visaExpiry: member.visaExpiry,
        workPermitNumber: member.workPermitNumber,
        clearances: member.clearances || {}
      };
    });
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: number, memberData: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set(memberData)
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async getTeamMemberById(id: number): Promise<any | undefined> {
    console.log('getTeamMemberById called with id:', id);
    const members = await db.select()
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(teamMembers.id, id));

    if (members.length === 0) {
      console.log('No member found with id:', id);
      return undefined;
    }

    const row = members[0];
    const member = row.team_members;
    const user = row.users;
    const role = row.roles;
    const department = row.departments;
    
    // Parse certifications from the member data
    const certifications = member.certifications || {};
    
    // Ensure the structure is correct with all required categories
    const safetyCertificates = certifications.safetyCertificates || [];
    const weldingCertificates = certifications.weldingCertificates || [];
    const tradeLicenses = certifications.tradeLicenses || [];
    const equipmentCertificates = certifications.equipmentCertificates || [];
    
    // Create structured certificate data
    const certificateData = {
      safetyCertificates,
      weldingCertificates,
      tradeLicenses,
      equipmentCertificates
    };
    
    console.log('getTeamMemberById - Certificate data from DB:', certificateData);
    
    return {
      // Core team member data
      id: member.id,
      userId: member.userId,
      roleId: member.roleId,
      departmentId: member.departmentId,
      isActive: member.isActive,
      
      // Personal information
      firstName: member.firstName,
      lastName: member.lastName,
      preferredName: member.preferredName,
      dateOfBirth: member.dateOfBirth,
      
      // Contact information
      email: member.email,
      phone: member.phone,
      address: member.address,
      city: member.city,
      country: member.country,
      postalCode: member.postalCode,
      
      // Emergency contact
      emergencyContactName: member.emergencyContactName,
      emergencyContactPhone: member.emergencyContactPhone,
      emergencyContactRelation: member.emergencyContactRelation,
      
      // Employment information
      employeeNumber: member.employeeNumber,
      hireDate: member.hireDate,
      employmentType: member.employmentType,
      contractEndDate: member.contractEndDate,
      
      // Work scheduling
      workHoursPerWeek: member.workHoursPerWeek,
      shiftPattern: member.shiftPattern,
      overtimeEligible: member.overtimeEligible,
      
      // Skills and certifications with proper structure
      skills: member.skills || [],
      primarySkill: member.primarySkill,
      experienceYears: member.experienceYears,
      certifications: certificateData, // Use structured certificate data
      certificateExpiryDates: member.certificateExpiryDates || {},
      
      // Availability
      availabilityNotes: member.availabilityNotes,
      leaveBalance: member.leaveBalance || {},
      
      // Health & Safety
      medicalConditions: member.medicalConditions,
      allergies: member.allergies,
      bloodType: member.bloodType,
      safetyTrainingDates: member.safetyTrainingDates || {},
      ppe: member.ppe || {},
      
      // Notes
      notes: member.notes,
      
      // Labor rate management
      baseRate: member.baseRate,
      overtimeRate: member.overtimeRate,
      weekendRate: member.weekendRate,
      allowances: member.allowances || {},
      
      // Banking
      bankName: member.bankName,
      accountNumber: member.accountNumber,
      taxNumber: member.taxNumber,
      superannuation: member.superannuation,
      
      // Vehicle and equipment
      vehicleDetails: member.vehicleDetails || {},
      licenseTypes: member.licenseTypes || [],
      toolsProvided: member.toolsProvided || [],
      
      // Access and security
      accessLevel: member.accessLevel,
      keyCardNumber: member.keyCardNumber,
      lockerNumber: member.lockerNumber,
      parkingSpace: member.parkingSpace,
      
      // Performance
      performanceReviews: member.performanceReviews || [],
      kpis: member.kpis || {},
      trainingCompleted: member.trainingCompleted || [],
      trainingRequired: member.trainingRequired || [],
      
      // Projects
      currentProjects: member.currentProjects || [],
      projectHistory: member.projectHistory || [],
      specializations: member.specializations || [],
      
      // Timestamps
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      lastReviewDate: member.lastReviewDate,
      nextReviewDate: member.nextReviewDate,
      
      // Related data from joins
      userName: user?.name || null,
      userEmail: user?.email || null,
      roleName: role?.name || null,
      departmentName: department?.name || null,
      
      // GPS location (for field workers)
      lastKnownLocation: member.lastKnownLocation || null,
      lastLocationUpdate: member.lastLocationUpdate || null,
      
      // Profile photo
      photoUrl: member.photoUrl || null,
      
      // Compliance
      visaStatus: member.visaStatus,
      visaExpiry: member.visaExpiry,
      workPermitNumber: member.workPermitNumber,
      clearances: member.clearances || {}
    };
  }

  // Audit Log
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(log).returning();
    return newLog;
  }

  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    let query = db.select().from(auditLog);
    
    const conditions = [];
    if (entityType) {
      conditions.push(eq(auditLog.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLog.entityId, entityId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(auditLog.timestamp));
  }

  // Get all users for assignment dropdown
  async getAllUsers(): Promise<any[]> {
    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(users.name);
  }
}