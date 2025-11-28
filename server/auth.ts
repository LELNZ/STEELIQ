import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, authSessions, teamMembers, roles } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { normalizePermissions, clearPermissionCache } from "./permissionMapping";
import { logPermissionCheck as logPermissionCheckPersistent, logLogin, AuditEventType, AuditAction } from "./auditService";

// Permission audit logging for Phase 2 testing
interface PermissionAudit {
  timestamp: Date;
  userId: number | null;
  username: string;
  role: string;
  roleName?: string;
  permission: string;
  granted: boolean;
  source: 'database' | 'legacy' | 'default';
  details?: string;
}

const permissionAudits: PermissionAudit[] = [];

// Updated to use synchronous persistent audit logging for critical operations
export async function logPermissionCheck(
  user: any,
  permission: string,
  granted: boolean,
  source: 'database' | 'legacy' | 'default',
  details?: string,
  request?: any
): Promise<void> {
  // Determine if this is a critical operation
  const criticalPermissions = ['manageUsers', 'systemSettings', 'manageFinancials', 'deleteJobs'];
  const isCritical = !granted || criticalPermissions.includes(permission);
  
  const audit: PermissionAudit = {
    timestamp: new Date(),
    userId: user?.id || null,
    username: user?.username || 'anonymous',
    role: user?.role || 'unknown',
    roleName: user?.roleName,
    permission,
    granted,
    source,
    details
  };
  
  // Keep in-memory for backward compatibility during transition
  permissionAudits.push(audit);
  
  // Keep only last 1000 entries to prevent memory issues
  if (permissionAudits.length > 1000) {
    permissionAudits.shift();
  }
  
  // For critical operations, await the audit log write
  // For non-critical, fire and forget
  if (isCritical) {
    try {
      await logPermissionCheckPersistent(
        user,
        permission,
        granted,
        source,
        details,
        request
      );
    } catch (err) {
      console.error("Failed to persist critical permission audit:", err);
      // For critical operations, throw to prevent access
      throw new Error("Audit logging failed for critical operation");
    }
  } else {
    // Non-critical: fire and forget
    logPermissionCheckPersistent(
      user,
      permission,
      granted,
      source,
      details,
      request
    ).catch(err => {
      console.error("Failed to persist non-critical permission audit:", err);
    });
  }
  
  // Log to console for Phase 2 testing
  console.log(`[PERMISSION AUDIT] User: ${audit.username} (${audit.roleName || audit.role}) | Permission: ${permission} | Granted: ${granted} | Source: ${source}`);
}

export function getPermissionAudits() {
  return [...permissionAudits];
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // Get permissions from database based on user's team member role
  static async getPermissionsForUser(userId: number) {
    try {
      // First try to get permissions from team_members -> roles relationship
      const teamMemberResult = await db
        .select({
          roleId: teamMembers.roleId,
          roleName: roles.name,
          rolePermissions: roles.permissions
        })
        .from(teamMembers)
        .leftJoin(roles, eq(teamMembers.roleId, roles.id))
        .where(eq(teamMembers.userId, userId))
        .limit(1);

      if (teamMemberResult.length > 0) {
        const { rolePermissions, roleName } = teamMemberResult[0];
        
        // SECURITY: Require explicit permissions JSON - no fallback to legacy
        if (rolePermissions && typeof rolePermissions === 'object' && Object.keys(rolePermissions).length > 0) {
          // Validate that permissions are in expected format
          try {
            // Basic validation - ensure it's an object with expected structure
            const perms = rolePermissions as any;
            if (typeof perms !== 'object') {
              console.error(`Invalid permissions format for user ${userId}, role ${roleName}: not an object`);
              return { roleName: 'Guest', permissions: {} };
            }
            
            // Log successful permission load from database (await for critical audit)
            await logPermissionCheck(
              { id: userId, roleName }, 
              'database_permissions', 
              true, 
              'database', 
              `Role: ${roleName}, Permissions loaded from database`
            );
            
            return {
              roleName: roleName || 'Unknown',
              permissions: perms
            };
          } catch (validationError) {
            console.error(`Failed to validate permissions for user ${userId}, role ${roleName}:`, validationError);
            return { roleName: 'Guest', permissions: {} };
          }
        } else {
          // Log misconfiguration - role exists but no permissions defined
          console.warn(`Role ${roleName} (ID: ${teamMemberResult[0].roleId}) has no permissions defined for user ${userId}`);
        }
      }

      // NO LEGACY FALLBACK - Fortune 50 database is the sole source of truth
      // Users without team_members entry get no permissions
      console.warn(`User ${userId} has no Fortune 50 role assignment - access denied`);

      // SECURITY: Fail closed - no permissions by default
      return {
        roleName: 'Guest',
        permissions: {}
      };
    } catch (error) {
      console.error('Critical error fetching permissions for user', userId, ':', error);
      // SECURITY: Fail closed on any error
      return {
        roleName: 'Guest',
        permissions: {}
      };
    }
  }

  // Legacy permissions removed - Fortune 50 database is the only source
  // Phase 2 complete: No hardcoded permissions remain

  // Hash password with bcrypt
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure session token
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Secret for JWT signing/verification - must match WebSocketService
  // Fortune 50: Fail-fast on missing secret to prevent insecure token operations
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('[Security] CRITICAL: JWT_SECRET or SESSION_SECRET must be configured for WebSocket auth');
    }
    return secret;
  }

  // Generate short-lived JWT token for WebSocket authentication
  // This provides a secure bridge between session-based HTTP auth and WebSocket connections
  static generateWebSocketToken(userId: number, sessionToken?: string): string {
    const secret = this.getJwtSecret();
    return jwt.sign(
      { 
        userId, 
        sid: sessionToken, // Bind to active HTTP session for revocation
        purpose: 'websocket',
        iat: Math.floor(Date.now() / 1000)
      },
      secret,
      { 
        expiresIn: '1h',  // Short-lived for security
        algorithm: 'HS256'
      }
    );
  }

  // Verify WebSocket JWT token - exported for WebSocketService
  static verifyWebSocketToken(token: string): { userId: number; sid?: string; purpose: string } {
    const secret = this.getJwtSecret();
    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.purpose !== 'websocket') {
      throw new Error('Invalid token purpose');
    }
    
    return decoded;
  }

  // Generate 2FA secret (Base32 encoded)
  static generate2FASecret(): string {
    const secret = crypto.randomBytes(20);
    return secret.toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  // Generate backup codes for 2FA
  static generate2FABackupCodes(count: number = 8): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Verify 2FA TOTP code (simplified - in production use speakeasy library)
  static verify2FACode(secret: string, code: string): boolean {
    // Simplified TOTP verification for demo
    // In production, use speakeasy.totp.verify()
    const timeStep = Math.floor(Date.now() / 30000);
    const expectedCode = crypto
      .createHmac('sha1', Buffer.from(secret, 'base64'))
      .update(Buffer.from(timeStep.toString()))
      .digest('hex')
      .slice(-6);
    
    return code === expectedCode.substring(0, 6);
  }

  // Create user with hashed password
  static async createUser(userData: {
    username: string;
    password: string;
    name: string;
    email?: string;
    role?: string;
    department?: string;
  }) {
    const hashedPassword = await this.hashPassword(userData.password);
    
    const [user] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
    }).returning();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Use the new declarative permission mapping system
  static normalizePermissions(dbPermissions: any) {
    return normalizePermissions(dbPermissions);
  }

  // Old normalizePermissions implementation removed - replaced by declarative mapping
  static _oldNormalizePermissions(dbPermissions: any) {
    // Start with all legacy permissions as false
    const legacyPermissions: any = {
      // Job Management
      viewJobs: false,
      createJobs: false,
      editJobs: false,
      deleteJobs: false,
      approveJobs: false,
      
      // User Management
      viewUsers: false,
      createUsers: false,
      editUsers: false,
      deleteUsers: false,
      manageUsers: false,
      
      // Reports & Analytics
      viewReports: false,
      generateReports: false,
      exportReports: false,
      viewAnalytics: false,
      
      // Financial
      viewFinancials: false,
      manageFinancials: false,
      viewCosts: false,
      editCosts: false,
      manageRates: false,
      viewPricing: false,
      editPricing: false,
      managePricing: false,
      
      // Settings & System
      manageSettings: false,
      systemSettings: false,
      manageIntegrations: false,
      auditLogs: false,
      backupRestore: false,
      
      // Documents
      viewDocuments: false,
      uploadDocuments: false,
      editDocuments: false,
      deleteDocuments: false,
      manageDocuments: false,
      
      // Materials & Inventory
      viewMaterials: false,
      editMaterials: false,
      deleteMaterials: false,
      viewInventory: false,
      editInventory: false,
      stockMovements: false,
      
      // Suppliers
      viewSuppliers: false,
      editSuppliers: false,
      deleteSuppliers: false,
      managePriceHistory: false,
      
      // Cutting Plans
      viewCuttingPlans: false,
      createCuttingPlans: false,
      editCuttingPlans: false,
      runOptimization: false,
      
      // Time & Payroll (critical for Time Analytics)
      viewTimesheets: false,
      editTimesheets: false,
      approveTimesheets: false,
      viewTimeReports: false,
      manageTimeCards: false,
      clockInOut: false,
      manageLeaveRequests: false,
      
      // Production
      viewProduction: false,
      editProduction: false,
      manageQualityControl: false,
      updateJobStatus: false,
      
      // Quality
      viewQuality: false,
      conductInspections: false,
      manageCompliance: false,
      recordNonConformance: false
    };

    // Map Fortune 50 permissions to legacy format
    if (dbPermissions && typeof dbPermissions === 'object') {
      // Jobs permissions
      const jobs = dbPermissions.jobs;
      if (Array.isArray(jobs)) {
        legacyPermissions.viewJobs = jobs.includes('view');
        legacyPermissions.createJobs = jobs.includes('create');
        legacyPermissions.editJobs = jobs.includes('edit');
        legacyPermissions.deleteJobs = jobs.includes('delete');
        legacyPermissions.approveJobs = jobs.includes('approve') || jobs.includes('manage');
      }
      
      // Projects permissions (map to jobs)
      const projects = dbPermissions.projects;
      if (Array.isArray(projects)) {
        legacyPermissions.viewJobs = legacyPermissions.viewJobs || projects.includes('view_projects');
        legacyPermissions.createJobs = legacyPermissions.createJobs || projects.includes('create_projects');
        legacyPermissions.editJobs = legacyPermissions.editJobs || projects.includes('edit_projects');
        legacyPermissions.deleteJobs = legacyPermissions.deleteJobs || projects.includes('delete_projects');
      }
      
      // Users permissions
      const users = dbPermissions.users;
      if (Array.isArray(users)) {
        legacyPermissions.viewUsers = users.includes('view') || users.includes('view_users');
        legacyPermissions.createUsers = users.includes('create') || users.includes('create_users');
        legacyPermissions.editUsers = users.includes('edit') || users.includes('edit_users');
        legacyPermissions.deleteUsers = users.includes('delete') || users.includes('delete_users');
        legacyPermissions.manageUsers = users.includes('manage') || users.includes('manage_users') || 
                                         users.includes('manage_roles') || users.includes('manage_permissions');
      }
      
      // Reports permissions
      const reports = dbPermissions.reports;
      if (Array.isArray(reports)) {
        legacyPermissions.viewReports = reports.includes('view') || reports.includes('view_reports');
        legacyPermissions.generateReports = reports.includes('create') || reports.includes('create_reports') || reports.includes('generate');
        legacyPermissions.exportReports = reports.includes('export') || reports.includes('export_reports');
        legacyPermissions.viewAnalytics = reports.includes('view_analytics') || reports.includes('view_kpis') || reports.includes('access_business_intelligence');
      }
      
      // Financial permissions
      const financial = dbPermissions.financial;
      if (Array.isArray(financial)) {
        legacyPermissions.viewFinancials = financial.includes('view') || financial.includes('view_financial_data');
        legacyPermissions.manageFinancials = financial.includes('manage') || financial.includes('manage_invoices') || financial.includes('manage_payments');
        legacyPermissions.viewCosts = financial.includes('view_costs') || financial.includes('view_profit_margins');
        legacyPermissions.editCosts = financial.includes('edit_costs') || financial.includes('edit');
        legacyPermissions.manageRates = financial.includes('edit_overhead_rates') || financial.includes('manage_rates');
        legacyPermissions.viewPricing = financial.includes('view_pricing') || financial.includes('edit_pricing');
        legacyPermissions.editPricing = financial.includes('edit_pricing');
        legacyPermissions.managePricing = financial.includes('approve_quotes') || financial.includes('approve');
      }
      
      // Settings & System permissions
      const settings = dbPermissions.settings;
      const system = dbPermissions.system;
      if (Array.isArray(settings)) {
        legacyPermissions.manageSettings = settings.includes('manage') || settings.includes('edit');
      }
      if (Array.isArray(system)) {
        legacyPermissions.systemSettings = system.includes('manage_system_config');
        legacyPermissions.manageIntegrations = system.includes('manage_integrations');
        legacyPermissions.auditLogs = system.includes('view_audit_logs');
        legacyPermissions.backupRestore = system.includes('manage_backups');
      }
      
      // Documents permissions
      const documents = dbPermissions.documents;
      if (Array.isArray(documents)) {
        legacyPermissions.viewDocuments = documents.includes('view') || documents.includes('view_documents');
        legacyPermissions.uploadDocuments = documents.includes('upload') || documents.includes('upload_documents');
        legacyPermissions.editDocuments = documents.includes('edit') || documents.includes('edit_documents');
        legacyPermissions.deleteDocuments = documents.includes('delete') || documents.includes('delete_documents');
        legacyPermissions.manageDocuments = documents.includes('manage') || documents.includes('manage_document_approval') || documents.includes('control_document_access');
      }
      
      // Materials & Inventory permissions
      const materials = dbPermissions.materials;
      const inventory = dbPermissions.inventory;
      if (Array.isArray(materials)) {
        legacyPermissions.viewMaterials = materials.includes('view') || materials.includes('view_materials');
        legacyPermissions.editMaterials = materials.includes('edit') || materials.includes('edit_materials');
        legacyPermissions.deleteMaterials = materials.includes('delete');
        legacyPermissions.managePricing = legacyPermissions.managePricing || materials.includes('edit_pricing');
      }
      if (Array.isArray(inventory)) {
        legacyPermissions.viewInventory = inventory.includes('view');
        legacyPermissions.editInventory = inventory.includes('edit') || inventory.includes('adjust');
        legacyPermissions.stockMovements = inventory.includes('adjust') || inventory.includes('create');
      }
      // Also check materials for inventory permissions
      if (Array.isArray(materials)) {
        legacyPermissions.viewInventory = legacyPermissions.viewInventory || materials.includes('view_stock_levels');
        legacyPermissions.editInventory = legacyPermissions.editInventory || materials.includes('manage_inventory');
      }
      
      // Suppliers permissions
      const suppliers = dbPermissions.suppliers;
      if (Array.isArray(suppliers)) {
        legacyPermissions.viewSuppliers = suppliers.includes('view');
        legacyPermissions.editSuppliers = suppliers.includes('edit') || suppliers.includes('create');
        legacyPermissions.deleteSuppliers = suppliers.includes('delete');
      }
      // Also check materials for supplier permissions
      if (Array.isArray(materials)) {
        legacyPermissions.viewSuppliers = legacyPermissions.viewSuppliers || materials.includes('manage_suppliers');
        legacyPermissions.editSuppliers = legacyPermissions.editSuppliers || materials.includes('manage_suppliers');
        legacyPermissions.managePriceHistory = materials.includes('manage_suppliers') || materials.includes('approve_purchases');
      }
      
      // Cutting permissions  
      const cutting = dbPermissions.cutting;
      const production = dbPermissions.production;
      if (Array.isArray(cutting)) {
        legacyPermissions.viewCuttingPlans = cutting.includes('view');
        legacyPermissions.createCuttingPlans = cutting.includes('create');
        legacyPermissions.editCuttingPlans = cutting.includes('edit');
        legacyPermissions.runOptimization = cutting.includes('optimize');
      }
      // Also check production for cutting permissions
      if (Array.isArray(production)) {
        legacyPermissions.viewCuttingPlans = legacyPermissions.viewCuttingPlans || production.includes('edit_cutting_plans');
        legacyPermissions.editCuttingPlans = legacyPermissions.editCuttingPlans || production.includes('edit_cutting_plans');
      }
      
      // Time & Payroll permissions
      const time = dbPermissions.time;
      const timesheets = dbPermissions.timesheets; // New structure for Site Supervisor
      const payroll = dbPermissions.payroll;
      const attendance = dbPermissions.attendance;
      const schedules = dbPermissions.schedules;
      
      if (Array.isArray(time)) {
        legacyPermissions.viewTimesheets = time.includes('view_timesheets');
        legacyPermissions.editTimesheets = time.includes('edit_own_timesheet') || time.includes('edit_all_timesheets');
        legacyPermissions.approveTimesheets = time.includes('approve_timesheets');
        legacyPermissions.viewTimeReports = time.includes('view_time_reports');
        legacyPermissions.manageTimeCards = time.includes('manage_time_codes');
        legacyPermissions.clockInOut = time.includes('clock_in_out');
        legacyPermissions.manageLeaveRequests = time.includes('manage_leave_requests');
      }
      
      // Also map from new structure
      if (Array.isArray(timesheets)) {
        legacyPermissions.viewTimesheets = timesheets.includes('view');
        legacyPermissions.editTimesheets = timesheets.includes('edit');
        legacyPermissions.approveTimesheets = timesheets.includes('approve');
        legacyPermissions.exportReports = legacyPermissions.exportReports || timesheets.includes('export');
        legacyPermissions.viewTimeReports = timesheets.includes('view') || timesheets.includes('export');
      }
      
      if (Array.isArray(payroll)) {
        legacyPermissions.viewPayroll = payroll.includes('view');
        legacyPermissions.approvePayroll = payroll.includes('approve');
      }
      
      if (Array.isArray(attendance)) {
        legacyPermissions.viewAttendance = attendance.includes('view');
        legacyPermissions.editAttendance = attendance.includes('edit');
        legacyPermissions.approveAttendance = attendance.includes('approve');
      }
      
      if (Array.isArray(schedules)) {
        legacyPermissions.viewSchedules = schedules.includes('view');
        legacyPermissions.editSchedules = schedules.includes('edit');
        legacyPermissions.createSchedules = schedules.includes('create');
      }
      
      // Production permissions
      if (Array.isArray(production)) {
        legacyPermissions.viewProduction = production.includes('view_production_schedule') || production.includes('view_work_orders');
        legacyPermissions.editProduction = production.includes('update_job_status') || production.includes('manage_job_sequences');
        legacyPermissions.manageQualityControl = production.includes('manage_quality_control');
        legacyPermissions.updateJobStatus = production.includes('update_job_status');
      }
      
      // Quality permissions
      const quality = dbPermissions.quality;
      const inspections = dbPermissions.inspections;
      const ncrs = dbPermissions.ncrs;
      const testCertificates = dbPermissions.testCertificates;
      
      if (Array.isArray(quality)) {
        legacyPermissions.viewQuality = quality.includes('view') || quality.includes('view_safety_reports');
        legacyPermissions.conductInspections = quality.includes('conduct_inspections') || quality.includes('create') || quality.includes('edit');
        legacyPermissions.manageCompliance = quality.includes('manage_compliance') || quality.includes('approve');
        legacyPermissions.recordNonConformance = quality.includes('record_non_conformance');
      }
      
      // Map new Fortune 50 structure for Quality Inspector
      if (Array.isArray(inspections)) {
        legacyPermissions.viewQuality = legacyPermissions.viewQuality || inspections.includes('view');
        legacyPermissions.conductInspections = legacyPermissions.conductInspections || inspections.includes('conduct') || inspections.includes('schedule');
        legacyPermissions.manageCompliance = legacyPermissions.manageCompliance || inspections.includes('approve');
      }
      
      if (Array.isArray(ncrs)) {
        legacyPermissions.recordNonConformance = legacyPermissions.recordNonConformance || ncrs.includes('create') || ncrs.includes('edit');
        legacyPermissions.manageNCRs = ncrs.includes('create') || ncrs.includes('edit') || ncrs.includes('close');
      }
      
      if (Array.isArray(testCertificates)) {
        legacyPermissions.manageCertificates = testCertificates.includes('create') || testCertificates.includes('approve');
      }
    }

    // Return combined permissions (Fortune 50 + legacy for backward compatibility)
    return {
      ...dbPermissions,
      ...legacyPermissions
    };
  }

  // Authenticate user
  static async authenticateUser(username: string, password: string, twoFactorCode?: string) {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.isActive, true)
      ));

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error("Account temporarily locked due to too many failed attempts");
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, user.password);
    
    if (!passwordValid) {
      // Increment login attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const lockUntil = newAttempts >= this.MAX_LOGIN_ATTEMPTS 
        ? new Date(Date.now() + this.LOCKOUT_DURATION)
        : null;

      await db.update(users)
        .set({
          loginAttempts: newAttempts,
          lockedUntil: lockUntil,
        })
        .where(eq(users.id, user.id));

      throw new Error("Invalid credentials");
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { requires2FA: true };
      }

      const codeValid = this.verify2FACode(user.twoFactorSecret!, twoFactorCode);
      if (!codeValid) {
        // Check backup codes
        const backupCodes = user.twoFactorBackupCodes as string[] || [];
        const codeIndex = backupCodes.indexOf(twoFactorCode);
        
        if (codeIndex === -1) {
          throw new Error("Invalid 2FA code");
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await db.update(users)
          .set({ twoFactorBackupCodes: backupCodes })
          .where(eq(users.id, user.id));
      }
    }

    // Reset login attempts on successful login
    await db.update(users)
      .set({
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    await db.insert(authSessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    // Return user without sensitive data
    const { password: __, twoFactorSecret, twoFactorBackupCodes, sessionToken: _, ...userResponse } = user;
    
    // Get permissions from database
    const permissionData = await this.getPermissionsForUser(user.id);
    const normalizedPermissions = this.normalizePermissions(permissionData.permissions);
    
    return {
      user: {
        ...userResponse,
        roleName: permissionData.roleName,
        permissions: normalizedPermissions
      },
      token: sessionToken,
      expiresAt,
    };
  }

  // Extract token from request with fallback methods
  static extractToken(req: any): string | null {
    // Method 1: Check parsed cookies (if cookie-parser is working)
    if (req.cookies?.auth_token) {
      return req.cookies.auth_token;
    }
    
    // Method 2: Check Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Method 3: Manually parse cookie header as fallback
    const rawCookie = req.headers?.cookie;
    if (rawCookie) {
      const cookies = rawCookie.split(';').map(s => s.trim());
      const authCookie = cookies.find(s => s.startsWith('auth_token='));
      if (authCookie) {
        return decodeURIComponent(authCookie.split('=')[1]);
      }
    }
    
    return null;
  }

  // Get authenticated user from request
  static async getAuthenticatedUser(req: any) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        return null;
      }
      return await this.validateSession(token);
    } catch (error) {
      console.error('Get authenticated user error:', error);
      return null;
    }
  }

  // Validate session token
  static async validateSession(token: string) {
    try {
      const sessions = await db
        .select()
        .from(authSessions)
        .where(and(
          eq(authSessions.token, token),
          gt(authSessions.expiresAt, new Date())
        ))
        .limit(1);

      if (!sessions || sessions.length === 0) {
        return null;
      }

      const session = sessions[0];

      // Get user data
      const users_result = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!users_result || users_result.length === 0) {
        return null;
      }

      const user = users_result[0];

      if (!user.isActive) {
        return null;
      }

      // Remove sensitive data
      const { password, twoFactorSecret, twoFactorBackupCodes, ...userResponse } = user;
      
      // Get permissions from database
      const permissionData = await this.getPermissionsForUser(user.id);
      const normalizedPermissions = this.normalizePermissions(permissionData.permissions);
      
      return {
        ...userResponse,
        roleName: permissionData.roleName,
        permissions: normalizedPermissions
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout user (invalidate session)
  static async logout(token: string) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  // Setup 2FA for user
  static async setup2FA(userId: number) {
    const secret = this.generate2FASecret();
    const backupCodes = this.generate2FABackupCodes();

    await db.update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      })
      .where(eq(users.id, userId));

    return {
      secret,
      backupCodes,
      qrCodeUrl: `otpauth://totp/Lateral%20Engineering?secret=${secret}&issuer=Lateral%20Engineering`,
    };
  }

  // Enable 2FA after verification
  static async enable2FA(userId: number, verificationCode: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user?.twoFactorSecret) {
      throw new Error("2FA not set up");
    }

    const codeValid = this.verify2FACode(user.twoFactorSecret, verificationCode);
    if (!codeValid) {
      throw new Error("Invalid verification code");
    }

    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));

    return true;
  }

  // Disable 2FA
  static async disable2FA(userId: number, password: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) {
      throw new Error("Invalid password");
    }

    await db.update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(users.id, userId));

    return true;
  }

  /**
   * Async alias for checkPermission - used by routes that call userHasPermission
   * @param user The user object with permissions
   * @param permission The permission key to check
   * @returns Promise<boolean> indicating if permission is granted
   */
  static async userHasPermission(user: any, permission: string): Promise<boolean> {
    return this.checkPermission(user, permission, false);
  }

  /**
   * Check if a user has a specific permission
   * @param user The user object with permissions
   * @param permission The permission key to check
   * @param throwOnFail If true, throws an error when permission is denied
   * @returns Boolean indicating if permission is granted
   */
  static checkPermission(
    user: any, 
    permission: string, 
    throwOnFail: boolean = false
  ): boolean {
    if (!user || !user.permissions) {
      if (throwOnFail) {
        throw new Error(`Access denied: No permissions available`);
      }
      return false;
    }

    const hasPermission = user.permissions[permission] === true;

    // Log the permission check
    logPermissionCheck(
      user,
      permission,
      hasPermission,
      'database',
      `Permission check via checkPermission method`
    ).catch(err => {
      console.error("Failed to log permission check:", err);
    });

    if (!hasPermission && throwOnFail) {
      throw new Error(`Access denied: Missing permission '${permission}'`);
    }

    return hasPermission;
  }

  /**
   * Check if user has any of the specified permissions
   * @param user The user object with permissions
   * @param permissions Array of permission keys to check
   * @param throwOnFail If true, throws an error when all permissions are denied
   * @returns Boolean indicating if any permission is granted
   */
  static checkAnyPermission(
    user: any,
    permissions: string[],
    throwOnFail: boolean = false
  ): boolean {
    if (!user || !user.permissions) {
      if (throwOnFail) {
        throw new Error(`Access denied: No permissions available`);
      }
      return false;
    }

    const hasAnyPermission = permissions.some(perm => user.permissions[perm] === true);

    // Log the permission check
    const permissionList = permissions.join(', ');
    logPermissionCheck(
      user,
      `any of [${permissionList}]`,
      hasAnyPermission,
      'database',
      `Permission check via checkAnyPermission method`
    ).catch(err => {
      console.error("Failed to log permission check:", err);
    });

    if (!hasAnyPermission && throwOnFail) {
      throw new Error(`Access denied: Missing any of permissions [${permissionList}]`);
    }

    return hasAnyPermission;
  }

  /**
   * Check if user has all of the specified permissions
   * @param user The user object with permissions
   * @param permissions Array of permission keys to check
   * @param throwOnFail If true, throws an error when any permission is denied
   * @returns Boolean indicating if all permissions are granted
   */
  static checkAllPermissions(
    user: any,
    permissions: string[],
    throwOnFail: boolean = false
  ): boolean {
    if (!user || !user.permissions) {
      if (throwOnFail) {
        throw new Error(`Access denied: No permissions available`);
      }
      return false;
    }

    const hasAllPermissions = permissions.every(perm => user.permissions[perm] === true);
    const missingPermissions = permissions.filter(perm => user.permissions[perm] !== true);

    // Log the permission check
    const permissionList = permissions.join(', ');
    logPermissionCheck(
      user,
      `all of [${permissionList}]`,
      hasAllPermissions,
      'database',
      missingPermissions.length > 0 
        ? `Missing permissions: ${missingPermissions.join(', ')}`
        : `All permissions granted`
    ).catch(err => {
      console.error("Failed to log permission check:", err);
    });

    if (!hasAllPermissions && throwOnFail) {
      throw new Error(`Access denied: Missing permissions [${missingPermissions.join(', ')}]`);
    }

    return hasAllPermissions;
  }

  // Change password
  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await this.verifyPassword(currentPassword, user.password);
    if (!passwordValid) {
      throw new Error("Current password is incorrect");
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    
    await db.update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, userId));

    return true;
  }

  // Clean expired sessions
  static async cleanExpiredSessions() {
    const now = new Date();
    await db.delete(authSessions).where(gt(authSessions.expiresAt, now));
  }
}