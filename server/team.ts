import { db } from "./db";
import { roles, departments, teamMembers, auditLog, users } from "@shared/schema";
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
        
        // Employment information
        employeeNumber: member.employeeNumber,
        startDate: member.startDate,
        endDate: member.endDate,
        employmentType: member.employmentType,
        
        // Contact information
        personalEmail: member.personalEmail,
        personalPhone: member.personalPhone,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        emergencyContactRelation: member.emergencyContactRelation,
        
        // Address information
        streetAddress: member.streetAddress,
        suburb: member.suburb,
        city: member.city,
        state: member.state,
        postcode: member.postcode,
        country: member.country,
        
        // Position & Skills
        position: member.position,
        jobTitle: member.jobTitle,
        skillLevel: member.skillLevel,
        primarySkills: member.primarySkills,
        secondarySkills: member.secondarySkills,
        experienceYears: member.experienceYears,
        
        // Rates & Compensation
        hourlyRate: member.hourlyRate,
        overtimeRate: member.overtimeRate,
        siteAllowance: member.siteAllowance,
        travelAllowance: member.travelAllowance,
        annualSalary: member.annualSalary,
        payFrequency: member.payFrequency,
        
        // Certifications & Qualifications
        certifications: member.certifications,
        qualifications: member.qualifications,
        licenses: member.licenses,
        trainingRecords: member.trainingRecords,
        
        // Health & Safety
        inductionCompleted: member.inductionCompleted,
        inductionDate: member.inductionDate,
        safetyTrainingExpiry: member.safetyTrainingExpiry,
        medicalClearance: member.medicalClearance,
        medicalExpiryDate: member.medicalExpiryDate,
        
        // Review information
        performanceRating: member.performanceRating,
        lastReviewDate: member.lastReviewDate,
        nextReviewDate: member.nextReviewDate,
        
        // Additional information
        notes: member.notes,
        internalNotes: member.internalNotes,
        profilePhoto: member.profilePhoto,
        
        // Leave balances
        annualLeaveEntitlement: member.annualLeaveEntitlement,
        sickLeaveEntitlement: member.sickLeaveEntitlement,
        currentLeaveBalance: member.currentLeaveBalance,
        
        // Timestamps
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        
        // Related data from joins
        userName: user?.name,
        userUsername: user?.username,
        roleName: role?.name,
        departmentName: department?.name,
        
        // Certificate fields - map from the existing JSON fields
        weldingCertificates: member.weldingCertificates || [],
        tradeLicenses: member.tradeLicenses || [],
        equipmentCertificates: member.equipmentCertificates || [],
        safetyCertificates: member.safetyCertificates || [],
        firstAidCertifications: member.firstAidCertifications || [],
        workingAtHeightsCerts: member.workingAtHeightsCerts || [],
        driversLicenses: member.driversLicenses || []
      };
    });
  }



  // Generate automatic employee number
  private async generateEmployeeNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Get the count of team members created this year
    const yearStart = new Date(currentYear, 0, 1);
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(gte(teamMembers.createdAt, yearStart));
    
    const nextNumber = (count[0]?.count || 0) + 1;
    return `EMP${currentYear}${nextNumber.toString().padStart(3, '0')}`;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    // Generate employee number if not provided
    const employeeNumber = member.employeeNumber || await this.generateEmployeeNumber();
    
    // Create comprehensive member record with all provided data
    const memberData = {
      userId: member.userId,
      roleId: member.roleId,
      departmentId: member.departmentId,
      isActive: member.isActive ?? true,
      employeeNumber,
      startDate: member.startDate ? new Date(member.startDate as any) : new Date(),
      endDate: member.endDate ? new Date(member.endDate as any) : null,
      employmentType: member.employmentType || 'full_time',
      firstName: member.firstName,
      lastName: member.lastName,
      preferredName: member.preferredName,
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth as any) : null,
      personalEmail: member.personalEmail,
      personalPhone: member.personalPhone,
      emergencyContactName: member.emergencyContactName,
      emergencyContactPhone: member.emergencyContactPhone,
      emergencyContactRelation: member.emergencyContactRelation,
      streetAddress: member.streetAddress,
      suburb: member.suburb,
      city: member.city,
      state: member.state,
      postcode: member.postcode,
      country: member.country || 'New Zealand',
      position: member.position,
      jobTitle: member.jobTitle,
      skillLevel: member.skillLevel,
      hourlyRate: member.hourlyRate ? parseFloat(member.hourlyRate.toString()) : null,
      payFrequency: member.payFrequency || 'weekly',
      primarySkills: member.primarySkills || [],
      secondarySkills: member.secondarySkills || [],
      certifications: member.certifications || [],
      qualifications: member.qualifications || [],
      licenses: member.licenses || [],
      inductionCompleted: member.inductionCompleted || false,
      inductionDate: member.inductionDate ? new Date(member.inductionDate as any) : null,
      safetyTrainingExpiry: member.safetyTrainingExpiry ? new Date(member.safetyTrainingExpiry as any) : null,
      medicalClearance: member.medicalClearance || false,
      medicalExpiryDate: member.medicalExpiryDate ? new Date(member.medicalExpiryDate as any) : null,
      lastReviewDate: member.lastReviewDate ? new Date(member.lastReviewDate as any) : null,
      nextReviewDate: member.nextReviewDate ? new Date(member.nextReviewDate as any) : null,
      annualLeaveEntitlement: member.annualLeaveEntitlement || 20,
      sickLeaveEntitlement: member.sickLeaveEntitlement || 5,
      currentLeaveBalance: member.currentLeaveBalance || 0,
      notes: member.notes,
      internalNotes: member.internalNotes,
    };

    console.log("Creating team member with employee number:", employeeNumber);
    const [newMember] = await db.insert(teamMembers).values(memberData).returning();
    return newMember;
  }

  async updateTeamMember(id: number, memberData: any): Promise<TeamMember> {
    
    // Now we can update all fields since we added them to the database
    const updateData: any = {};
    
    // Basic required fields
    if (memberData.userId) updateData.userId = memberData.userId;
    if (memberData.roleId) updateData.roleId = memberData.roleId;
    if (memberData.departmentId) updateData.departmentId = memberData.departmentId;
    if (memberData.isActive !== undefined) updateData.isActive = memberData.isActive;
    
    // Employment information
    if (memberData.employeeNumber) {
      updateData.employeeNumber = memberData.employeeNumber;
    } else {
      // Auto-generate employee number if it's missing
      const currentMember = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
      if (currentMember.length > 0 && (!currentMember[0].employeeNumber || currentMember[0].employeeNumber === '')) {
        updateData.employeeNumber = await this.generateEmployeeNumber();
      }
    }
    if (memberData.employmentType) updateData.employmentType = memberData.employmentType;
    if (memberData.startDate) updateData.startDate = new Date(memberData.startDate);
    if (memberData.endDate) updateData.endDate = new Date(memberData.endDate);
    if (memberData.hourlyRate !== undefined) updateData.hourlyRate = parseFloat(memberData.hourlyRate?.toString() || "0");
    if (memberData.overtimeRate !== undefined) updateData.overtimeRate = parseFloat(memberData.overtimeRate?.toString() || "0");
    if (memberData.siteAllowance !== undefined) updateData.siteAllowance = parseFloat(memberData.siteAllowance?.toString() || "0");
    if (memberData.travelAllowance !== undefined) updateData.travelAllowance = parseFloat(memberData.travelAllowance?.toString() || "0");
    if (memberData.annualSalary !== undefined) updateData.annualSalary = parseFloat(memberData.annualSalary?.toString() || "0");
    if (memberData.payFrequency) updateData.payFrequency = memberData.payFrequency;
    
    // Personal information
    if (memberData.firstName) updateData.firstName = memberData.firstName;
    if (memberData.lastName) updateData.lastName = memberData.lastName;
    if (memberData.preferredName) updateData.preferredName = memberData.preferredName;
    if (memberData.dateOfBirth) updateData.dateOfBirth = new Date(memberData.dateOfBirth);
    
    // Contact information
    if (memberData.personalEmail) updateData.personalEmail = memberData.personalEmail;
    if (memberData.personalPhone) updateData.personalPhone = memberData.personalPhone;
    if (memberData.emergencyContactName) updateData.emergencyContactName = memberData.emergencyContactName;
    if (memberData.emergencyContactPhone) updateData.emergencyContactPhone = memberData.emergencyContactPhone;
    if (memberData.emergencyContactRelation) updateData.emergencyContactRelation = memberData.emergencyContactRelation;
    
    // Address information
    if (memberData.streetAddress) updateData.streetAddress = memberData.streetAddress;
    if (memberData.suburb) updateData.suburb = memberData.suburb;
    if (memberData.city) updateData.city = memberData.city;
    if (memberData.state) updateData.state = memberData.state;
    if (memberData.postcode) updateData.postcode = memberData.postcode;
    if (memberData.country) updateData.country = memberData.country;
    
    // Job information
    if (memberData.position) updateData.position = memberData.position;
    if (memberData.jobTitle) updateData.jobTitle = memberData.jobTitle;
    if (memberData.skillLevel) updateData.skillLevel = memberData.skillLevel;
    if (memberData.experienceYears !== undefined) updateData.experienceYears = parseInt(memberData.experienceYears?.toString() || "0");
    
    // Arrays and JSON fields
    if (memberData.primarySkills) updateData.primarySkills = memberData.primarySkills;
    if (memberData.secondarySkills) updateData.secondarySkills = memberData.secondarySkills;
    if (memberData.certifications) updateData.certifications = memberData.certifications;
    if (memberData.qualifications) updateData.qualifications = memberData.qualifications;
    if (memberData.licenses) updateData.licenses = memberData.licenses;
    
    // Certificate fields for Trade Qualifications
    if (memberData.weldingCertificates) updateData.weldingCertificates = memberData.weldingCertificates;
    if (memberData.tradeLicenses) updateData.tradeLicenses = memberData.tradeLicenses;
    if (memberData.equipmentCertificates) updateData.equipmentCertificates = memberData.equipmentCertificates;
    if (memberData.safetyCertificates) updateData.safetyCertificates = memberData.safetyCertificates;
    
    // Safety and compliance
    if (memberData.inductionCompleted !== undefined) updateData.inductionCompleted = memberData.inductionCompleted;
    if (memberData.inductionDate) updateData.inductionDate = new Date(memberData.inductionDate);
    if (memberData.safetyTrainingExpiry) updateData.safetyTrainingExpiry = new Date(memberData.safetyTrainingExpiry);
    if (memberData.medicalClearance !== undefined) updateData.medicalClearance = memberData.medicalClearance;
    if (memberData.medicalExpiryDate) updateData.medicalExpiryDate = new Date(memberData.medicalExpiryDate);
    
    // Review dates
    if (memberData.lastReviewDate) updateData.lastReviewDate = new Date(memberData.lastReviewDate);
    if (memberData.nextReviewDate) updateData.nextReviewDate = new Date(memberData.nextReviewDate);
    
    // Leave entitlements
    if (memberData.annualLeaveEntitlement !== undefined) updateData.annualLeaveEntitlement = parseInt(memberData.annualLeaveEntitlement?.toString() || "0");
    if (memberData.sickLeaveEntitlement !== undefined) updateData.sickLeaveEntitlement = parseInt(memberData.sickLeaveEntitlement?.toString() || "0");
    if (memberData.currentLeaveBalance !== undefined) updateData.currentLeaveBalance = parseFloat(memberData.currentLeaveBalance?.toString() || "0");
    
    // Training and Performance
    if (memberData.trainingRecords) updateData.trainingRecords = memberData.trainingRecords;
    if (memberData.performanceRating) updateData.performanceRating = memberData.performanceRating;
    
    // Banking and Financial
    if (memberData.bankAccountName) updateData.bankAccountName = memberData.bankAccountName;
    if (memberData.bankAccountNumber) updateData.bankAccountNumber = memberData.bankAccountNumber;
    if (memberData.bankSortCode) updateData.bankSortCode = memberData.bankSortCode;
    if (memberData.taxNumber) updateData.taxNumber = memberData.taxNumber;
    if (memberData.kiwisaverRate !== undefined) updateData.kiwisaverRate = parseFloat(memberData.kiwisaverRate?.toString() || "0");
    
    // Profile and Additional Information
    if (memberData.profilePhoto) updateData.profilePhoto = memberData.profilePhoto;
    if (memberData.visaType) updateData.visaType = memberData.visaType;
    if (memberData.visaExpiry) updateData.visaExpiry = new Date(memberData.visaExpiry);
    if (memberData.nextOfKinName) updateData.nextOfKinName = memberData.nextOfKinName;
    if (memberData.nextOfKinPhone) updateData.nextOfKinPhone = memberData.nextOfKinPhone;
    if (memberData.nextOfKinRelation) updateData.nextOfKinRelation = memberData.nextOfKinRelation;
    
    // Notes
    if (memberData.notes) updateData.notes = memberData.notes;
    if (memberData.internalNotes) updateData.internalNotes = memberData.internalNotes;
    
    // Always update the updated_at timestamp
    updateData.updatedAt = new Date();
    
    console.log("Comprehensive update data:", updateData);
    
    const [updatedMember] = await db
      .update(teamMembers)
      .set(updateData)
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async getTeamMemberById(id: number): Promise<any | undefined> {
    // First get the team member with basic joins
    const result = await db
      .select()
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(teamMembers.id, id));
    
    if (!result || result.length === 0) {
      return undefined;
    }
    
    const row = result[0];
    
    // Manually construct the response object
    return {
      // Basic info
      id: row.team_members.id,
      userId: row.team_members.userId,
      roleId: row.team_members.roleId,
      departmentId: row.team_members.departmentId,
      employeeNumber: row.team_members.employeeNumber,
      isActive: row.team_members.isActive,
      hourlyRate: row.team_members.hourlyRate,
      startDate: row.team_members.startDate,
      endDate: row.team_members.endDate,
      employmentType: row.team_members.employmentType,
      // Personal Information
      firstName: row.team_members.firstName,
      lastName: row.team_members.lastName,
      preferredName: row.team_members.preferredName,
      dateOfBirth: row.team_members.dateOfBirth,
      // Contact Information
      personalEmail: row.team_members.personalEmail,
      personalPhone: row.team_members.personalPhone,
      emergencyContactName: row.team_members.emergencyContactName,
      emergencyContactPhone: row.team_members.emergencyContactPhone,
      emergencyContactRelation: row.team_members.emergencyContactRelation,
      // Address
      streetAddress: row.team_members.streetAddress,
      suburb: row.team_members.suburb,
      city: row.team_members.city,
      state: row.team_members.state,
      postcode: row.team_members.postcode,
      country: row.team_members.country,
      // Job Information
      position: row.team_members.position,
      jobTitle: row.team_members.jobTitle,
      skillLevel: row.team_members.skillLevel,
      experienceYears: row.team_members.experienceYears,
      primarySkills: row.team_members.primarySkills,
      secondarySkills: row.team_members.secondarySkills,
      // Compensation
      overtimeRate: row.team_members.overtimeRate,
      siteAllowance: row.team_members.siteAllowance,
      travelAllowance: row.team_members.travelAllowance,
      annualSalary: row.team_members.annualSalary,
      payFrequency: row.team_members.payFrequency,
      // Certifications
      certifications: row.team_members.certifications,
      qualifications: row.team_members.qualifications,
      licenses: row.team_members.licenses,
      trainingRecords: row.team_members.trainingRecords,
      // Health & Safety
      medicalClearance: row.team_members.medicalClearance,
      medicalExpiryDate: row.team_members.medicalExpiryDate,
      inductionCompleted: row.team_members.inductionCompleted,
      inductionDate: row.team_members.inductionDate,
      safetyCardNumber: row.team_members.safetyCardNumber,
      safetyCardExpiry: row.team_members.safetyCardExpiry,
      workingAtHeightsExpiry: row.team_members.workingAtHeightsExpiry,
      firstAidExpiry: row.team_members.firstAidExpiry,
      weldingCertificates: row.team_members.weldingCertificates || [],
      driverLicenseType: row.team_members.driverLicenseType,
      driverLicenseExpiry: row.team_members.driverLicenseExpiry,
      tradeCertificates: row.team_members.tradeCertificates,
      tradeLicenses: row.team_members.tradeLicenses || [],
      equipmentCertificates: row.team_members.equipmentCertificates || [],
      safetyCertificates: row.team_members.safetyCertificates || [],
      // Leave
      annualLeaveBalance: row.team_members.annualLeaveBalance,
      sickLeaveBalance: row.team_members.sickLeaveBalance,
      annualLeaveEntitlement: row.team_members.annualLeaveEntitlement,
      sickLeaveEntitlement: row.team_members.sickLeaveEntitlement,
      // Banking
      bankAccountName: row.team_members.bankAccountName,
      bankAccountNumber: row.team_members.bankAccountNumber,
      bankSortCode: row.team_members.bankSortCode,
      taxNumber: row.team_members.taxNumber,
      kiwisaverRate: row.team_members.kiwisaverRate,
      // Additional
      visaType: row.team_members.visaType,
      visaExpiry: row.team_members.visaExpiry,
      nextOfKinName: row.team_members.nextOfKinName,
      nextOfKinPhone: row.team_members.nextOfKinPhone,
      nextOfKinRelation: row.team_members.nextOfKinRelation,
      performanceRating: row.team_members.performanceRating,
      lastReviewDate: row.team_members.lastReviewDate,
      nextReviewDate: row.team_members.nextReviewDate,
      notes: row.team_members.notes,
      internalNotes: row.team_members.internalNotes,
      profilePhoto: row.team_members.profilePhoto,
      // Related data from joins
      userName: row.users?.name,
      userUsername: row.users?.username,
      roleName: row.roles?.name,
      departmentName: row.departments?.name
    };
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
      email: users.email,
      phone: users.phone,
      role: users.role,
      department: users.department,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      // Include team member information
      teamMemberId: teamMembers.id,
      teamMemberFirstName: teamMembers.firstName,
      teamMemberLastName: teamMembers.lastName,
      teamMemberEmployeeNumber: teamMembers.employeeNumber,
      teamMemberIsActive: teamMembers.isActive,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .orderBy(desc(users.createdAt));
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