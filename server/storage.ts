import { 
  users, materials, materialCategories, inventory, jobs, jobMaterials, 
  cuttingPlans, cutSequences, remnants, optimizationSimulations, coatingSystems, surfaceAreaConfigs,
  suppliers, materialSuppliers, supplierPriceHistory, supplierContacts,
  clients, clientContacts, locations, savedFilters,
  estimationProjects, estimationData, estimationMaterials, estimationLabor, estimationEquipment, estimationConsumables,
  teamMembers, archivedEmployees, employeeAuditLog,
  purchaseRequisitions, requisitionItems, approvalRules, approvalHistory, rfqRequests, rfqResponses, goodsReceipts, goodsReceiptItems,
  purchaseOrders, purchaseOrderItems, poTemplates,
  type User, type InsertUser, type Material, type InsertMaterial,
  type MaterialCategory, type InsertMaterialCategory, type Inventory, type InsertInventory,
  type Job, type InsertJob, type JobMaterial, type InsertJobMaterial,
  type CuttingPlan, type InsertCuttingPlan, type CutSequence, type InsertCutSequence,
  type Remnant, type InsertRemnant, type OptimizationSimulation, type InsertOptimizationSimulation,
  type CoatingSystem, type InsertCoatingSystem, type SurfaceAreaConfig, type InsertSurfaceAreaConfig,
  type Supplier, type InsertSupplier, type MaterialSupplier, type InsertMaterialSupplier,
  type SupplierPriceHistory, type InsertSupplierPriceHistory, type SupplierContact, type InsertSupplierContact,
  type Client, type InsertClient, type ClientContact, type InsertClientContact,
  type Location, type InsertLocation, type SavedFilter, type InsertSavedFilter,
  type EstimationProject, type InsertEstimationProject, type TeamMember, type InsertTeamMember,
  type ArchivedEmployee, type InsertArchivedEmployee, type EmployeeAuditLog, type InsertEmployeeAuditLog,
  type PurchaseRequisition, type InsertPurchaseRequisition, type RequisitionItem, type InsertRequisitionItem,
  type ApprovalRule, type InsertApprovalRule, type ApprovalHistory, type InsertApprovalHistory,
  type RfqRequest, type InsertRfqRequest, type RfqResponse, type InsertRfqResponse,
  type GoodsReceipt, type InsertGoodsReceipt, type GoodsReceiptItem, type InsertGoodsReceiptItem,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderItem, type InsertPurchaseOrderItem,
  quotes, quoteHistory, quoteViews,
  type Quote, type InsertQuote, type QuoteHistory, type InsertQuoteHistory, type QuoteView, type InsertQuoteView
} from "@shared/schema";
import { desc, eq, lt, asc, like, and, or, sql, inArray, not, ne } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<void>;
  deleteUser(id: number): Promise<void>;
  
  // Team Members
  getTeamMemberByUserId(userId: number): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<void>;
  
  // Employee Archive
  archiveUser(data: InsertArchivedEmployee): Promise<ArchivedEmployee>;
  logEmployeeAudit(data: InsertEmployeeAuditLog): Promise<EmployeeAuditLog>;

  // Material Categories
  getMaterialCategories(): Promise<MaterialCategory[]>;
  createMaterialCategory(category: InsertMaterialCategory): Promise<MaterialCategory>;

  // Materials
  getMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  getMaterialByCode(code: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: number): Promise<void>;
  searchMaterials(query: string): Promise<Material[]>;
  getMaterialsByCategories(categories: string[]): Promise<Material[]>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryByMaterial(materialId: number): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory>;
  getLowStockItems(threshold?: number): Promise<Inventory[]>;

  // Jobs
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  getJobByNumber(jobNumber: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job>;
  getJobsWithMaterials(): Promise<(Job & { materials: JobMaterial[] })[]>;
  getActiveJobs(): Promise<Job[]>;

  // Job Materials
  getJobMaterials(jobId: number): Promise<JobMaterial[]>;
  createJobMaterial(jobMaterial: InsertJobMaterial): Promise<JobMaterial>;
  updateJobMaterial(id: number, jobMaterial: Partial<InsertJobMaterial>): Promise<JobMaterial>;

  // Cutting Plans
  getCuttingPlans(jobId: number): Promise<CuttingPlan[]>;
  createCuttingPlan(plan: InsertCuttingPlan): Promise<CuttingPlan>;
  updateCuttingPlan(id: number, plan: Partial<InsertCuttingPlan>): Promise<CuttingPlan>;

  // Cut Sequences
  getCutSequences(cuttingPlanId: number): Promise<CutSequence[]>;
  createCutSequence(sequence: InsertCutSequence): Promise<CutSequence>;
  updateCutSequence(id: number, sequence: Partial<InsertCutSequence>): Promise<CutSequence>;

  // Remnants
  getRemnants(): Promise<Remnant[]>;
  createRemnant(remnant: InsertRemnant): Promise<Remnant>;
  updateRemnant(id: number, remnant: Partial<InsertRemnant>): Promise<Remnant>;

  // Analytics
  getJobStats(): Promise<{
    activeJobs: number;
    completedJobs: number;
    totalValue: number;
    avgEfficiency: number;
    weeklyVolume: number;
  }>;

  // Optimization Simulations
  getOptimizationSimulations(): Promise<OptimizationSimulation[]>;
  getOptimizationSimulation(id: string): Promise<OptimizationSimulation | undefined>;
  createOptimizationSimulation(simulation: InsertOptimizationSimulation): Promise<OptimizationSimulation>;
  deleteExpiredSimulations(): Promise<void>;

  // Coating Systems
  getCoatingSystems(): Promise<CoatingSystem[]>;
  getCoatingSystem(id: number): Promise<CoatingSystem | undefined>;
  createCoatingSystem(system: InsertCoatingSystem): Promise<CoatingSystem>;
  updateCoatingSystem(id: number, system: Partial<InsertCoatingSystem>): Promise<CoatingSystem>;
  deleteCoatingSystem(id: number): Promise<void>;

  // Surface Area Configurations
  getSurfaceAreaConfigs(materialId: number): Promise<SurfaceAreaConfig[]>;
  createSurfaceAreaConfig(config: InsertSurfaceAreaConfig): Promise<SurfaceAreaConfig>;
  updateSurfaceAreaConfig(id: number, config: Partial<InsertSurfaceAreaConfig>): Promise<SurfaceAreaConfig>;

  // Supplier Management
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<boolean>;

  // Material-Supplier Relationships
  getMaterialSuppliers(materialId: number): Promise<(MaterialSupplier & { supplier: Supplier })[]>;
  getMaterialSupplierById(id: number): Promise<(MaterialSupplier & { material: Material, supplier: Supplier }) | undefined>;
  createMaterialSupplier(materialSupplier: InsertMaterialSupplier): Promise<MaterialSupplier>;
  updateMaterialSupplier(id: number, materialSupplier: Partial<InsertMaterialSupplier>): Promise<MaterialSupplier>;
  deleteMaterialSupplier(id: number): Promise<boolean>;
  setPrimarySupplier(id: number): Promise<MaterialSupplier>;

  // Price History
  getSupplierPriceHistory(materialSupplierId: number): Promise<(SupplierPriceHistory & { enteredByUser: User })[]>;
  createSupplierPriceHistory(priceHistory: InsertSupplierPriceHistory): Promise<SupplierPriceHistory>;

  // Supplier Contacts
  getSupplierContacts(supplierId?: number | null): Promise<SupplierContact[]>;
  createSupplierContact(contact: InsertSupplierContact): Promise<SupplierContact>;
  updateSupplierContact(id: number, contact: Partial<InsertSupplierContact>): Promise<SupplierContact | undefined>;
  deleteSupplierContact(id: number): Promise<void>;
  setPrimarySupplierContact(id: number): Promise<SupplierContact | undefined>;

  // Client Contacts
  getClientContacts(clientId?: number | null): Promise<ClientContact[]>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: number, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined>;
  deleteClientContact(id: number): Promise<void>;
  setPrimaryClientContact(id: number): Promise<ClientContact | undefined>;

  // Client Management
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;

  // Location Management
  getLocations(entityType: 'supplier' | 'client', entityId: number): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location>;
  deleteLocation(id: number): Promise<boolean>;

  // Estimation Management
  getEstimationProjects(): Promise<any[]>;
  getEstimationProject(id: number): Promise<any | undefined>;
  createEstimationProject(project: any): Promise<any>;
  updateEstimationProject(id: number, project: any): Promise<any>;
  saveEstimationData(projectId: number, estimationData: any): Promise<any>;

  // Saved Filters
  getSavedFilters(filterType?: string, userId?: number): Promise<SavedFilter[]>;
  getSavedFilter(id: number): Promise<SavedFilter | undefined>;
  createSavedFilter(filter: InsertSavedFilter): Promise<SavedFilter>;
  updateSavedFilter(id: number, filter: Partial<InsertSavedFilter>): Promise<SavedFilter>;
  deleteSavedFilter(id: number): Promise<boolean>;
  applySavedFilter(id: number): Promise<SavedFilter>;

  // Quotes
  getQuotes(estimationId?: number): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote>;
  deleteQuote(id: number): Promise<boolean>;
  getQuoteVersions(estimationId: number): Promise<Quote[]>;
  getLatestQuoteVersion(estimationId: number): Promise<Quote | undefined>;
  
  // Quote History
  addQuoteHistory(history: InsertQuoteHistory): Promise<QuoteHistory>;
  getQuoteHistory(quoteId: number): Promise<QuoteHistory[]>;
  
  // Quote Views
  recordQuoteView(view: InsertQuoteView): Promise<QuoteView>;
  getQuoteViews(quoteId: number): Promise<QuoteView[]>;

  // Procurement - Purchase Requisitions
  getRequisitions(filters?: { status?: string; department?: string; requestedBy?: number }): Promise<PurchaseRequisition[]>;
  getRequisition(id: number): Promise<PurchaseRequisition | undefined>;
  createRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition>;
  updateRequisition(id: number, requisition: Partial<InsertPurchaseRequisition>): Promise<PurchaseRequisition>;
  generateRequisitionNumber(): Promise<string>;
  
  // Procurement - Requisition Items
  getRequisitionItems(requisitionId: number): Promise<RequisitionItem[]>;
  createRequisitionItem(item: InsertRequisitionItem): Promise<RequisitionItem>;
  updateRequisitionItem(id: number, item: Partial<InsertRequisitionItem>): Promise<RequisitionItem>;
  deleteRequisitionItem(id: number): Promise<void>;
  
  // Procurement - Approval Rules
  getApprovalRules(amount?: number, category?: string): Promise<ApprovalRule[]>;
  getApprovalRule(id: number): Promise<ApprovalRule | undefined>;
  createApprovalRule(rule: InsertApprovalRule): Promise<ApprovalRule>;
  updateApprovalRule(id: number, rule: Partial<InsertApprovalRule>): Promise<ApprovalRule>;
  deleteApprovalRule(id: number): Promise<void>;
  
  // Procurement - Approval History
  getApprovalHistory(requisitionId: number): Promise<ApprovalHistory[]>;
  createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory>;
  getPendingApprovals(approverId: number): Promise<PurchaseRequisition[]>;
  approveRequisition(requisitionId: number, approverId: number, comments?: string): Promise<void>;
  rejectRequisition(requisitionId: number, approverId: number, comments: string): Promise<void>;
  
  // Procurement - RFQs
  getRfqRequests(filters?: { status?: string; jobId?: number }): Promise<RfqRequest[]>;
  getRfqRequest(id: number): Promise<RfqRequest | undefined>;
  createRfqRequest(rfq: InsertRfqRequest): Promise<RfqRequest>;
  updateRfqRequest(id: number, rfq: Partial<InsertRfqRequest>): Promise<RfqRequest>;
  generateRfqNumber(): Promise<string>;
  
  // Procurement - RFQ Responses
  getRfqResponses(rfqId: number): Promise<RfqResponse[]>;
  getRfqResponse(id: number): Promise<RfqResponse | undefined>;
  createRfqResponse(response: InsertRfqResponse): Promise<RfqResponse>;
  updateRfqResponse(id: number, response: Partial<InsertRfqResponse>): Promise<RfqResponse>;
  selectWinningResponse(rfqId: number, responseId: number, justification?: string | null, userId?: number): Promise<void>;
  compareRfqResponses(rfqId: number): Promise<RfqResponse[]>;
  
  // Procurement - Purchase Orders
  getPurchaseOrders(filters?: { status?: string; supplierId?: number; jobId?: number; includeArchived?: boolean; showArchived?: boolean }): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  generatePONumber(): Promise<string>;
  convertRequisitionToPO(requisitionId: number, supplierId: number, userId: number): Promise<PurchaseOrder>;
  createPOFromRfqResponse(rfqResponseId: number, userId: number): Promise<PurchaseOrder>;
  
  // Procurement - Purchase Order Items
  getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: number, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem>;
  deletePurchaseOrderItem(id: number): Promise<void>;
  
  // Purchase Order Archive Management
  archivePurchaseOrder(poId: number, archiverId: number, reason?: string): Promise<PurchaseOrder>;
  unarchivePurchaseOrder(poId: number): Promise<void>;
  getArchivedPurchaseOrders(): Promise<PurchaseOrder[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Team Members
  async getTeamMemberByUserId(userId: number): Promise<any | undefined> {
    // Direct SQL query to avoid ORM schema mismatch issues
    const result = await db.execute(sql`
      SELECT id, user_id, role_id, department_id, hire_date, hourly_rate, is_active, created_at 
      FROM team_members 
      WHERE user_id = ${userId}
    `);
    
    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0];
    return {
      id: row[0],
      userId: row[1],
      roleId: row[2],
      departmentId: row[3],
      hireDate: row[4],
      hourlyRate: row[5],
      isActive: row[6],
      createdAt: row[7]
    };
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Employee Archive
  async archiveUser(data: InsertArchivedEmployee): Promise<ArchivedEmployee> {
    const [archivedEmployee] = await db.insert(archivedEmployees).values(data).returning();
    return archivedEmployee;
  }

  async logEmployeeAudit(data: InsertEmployeeAuditLog): Promise<EmployeeAuditLog> {
    const [auditLog] = await db.insert(employeeAuditLog).values(data).returning();
    return auditLog;
  }

  // Material Categories
  async getMaterialCategories(): Promise<MaterialCategory[]> {
    return await db.select().from(materialCategories).orderBy(asc(materialCategories.name));
  }

  async createMaterialCategory(category: InsertMaterialCategory): Promise<MaterialCategory> {
    const [newCategory] = await db.insert(materialCategories).values(category).returning();
    return newCategory;
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials).where(eq(materials.isActive, true)).orderBy(asc(materials.code));
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async getMaterialByCode(code: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.code, code));
    return material || undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    // Explicitly remove any id field to prevent conflicts
    const { id, ...materialWithoutId } = material as any;
    const [newMaterial] = await db.insert(materials).values(materialWithoutId).returning();
    return newMaterial;
  }

  async updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db.update(materials).set(material).where(eq(materials.id, id)).returning();
    return updatedMaterial;
  }

  async deleteMaterial(id: number): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  async searchMaterials(query: string): Promise<Material[]> {
    return await db.select().from(materials).where(
      and(
        eq(materials.isActive, true),
        or(
          like(materials.code, `%${query}%`),
          like(materials.name, `%${query}%`)
        )
      )
    ).orderBy(asc(materials.code));
  }

  async getMaterialsByCategories(categories: string[]): Promise<Material[]> {
    return await db.select().from(materials).where(
      and(
        eq(materials.isActive, true),
        inArray(materials.category, categories)
      )
    );
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.createdAt));
  }

  async getInventoryByMaterial(materialId: number): Promise<Inventory[]> {
    return await db.select().from(inventory).where(eq(inventory.materialId, materialId));
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory> {
    const [updatedItem] = await db.update(inventory).set(item).where(eq(inventory.id, id)).returning();
    return updatedItem;
  }

  async getLowStockItems(threshold: number = 5): Promise<Inventory[]> {
    return await db.select().from(inventory).where(
      sql`${inventory.quantityInStock} < ${threshold}`
    ).orderBy(asc(inventory.quantityInStock));
  }

  // Jobs
  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getJobByNumber(jobNumber: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.jobNumber, jobNumber));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job> {
    const [updatedJob] = await db.update(jobs).set(job).where(eq(jobs.id, id)).returning();
    return updatedJob;
  }

  async getJobsWithMaterials(): Promise<(Job & { materials: JobMaterial[] })[]> {
    const jobsData = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    const jobsWithMaterials = await Promise.all(
      jobsData.map(async (job) => {
        const materials = await this.getJobMaterials(job.id);
        return { ...job, materials };
      })
    );
    return jobsWithMaterials;
  }

  async getActiveJobs(): Promise<Job[]> {
    return await db.select().from(jobs).where(
      or(
        eq(jobs.status, "pending"),
        eq(jobs.status, "in_progress")
      )
    ).orderBy(desc(jobs.createdAt));
  }

  // Job Materials
  async getJobMaterials(jobId: number): Promise<JobMaterial[]> {
    return await db.select().from(jobMaterials).where(eq(jobMaterials.jobId, jobId));
  }

  async createJobMaterial(jobMaterial: InsertJobMaterial): Promise<JobMaterial> {
    const [newJobMaterial] = await db.insert(jobMaterials).values(jobMaterial).returning();
    return newJobMaterial;
  }

  async updateJobMaterial(id: number, jobMaterial: Partial<InsertJobMaterial>): Promise<JobMaterial> {
    const [updatedJobMaterial] = await db.update(jobMaterials).set(jobMaterial).where(eq(jobMaterials.id, id)).returning();
    return updatedJobMaterial;
  }

  // Cutting Plans
  async getCuttingPlans(jobId: number): Promise<CuttingPlan[]> {
    return await db.select().from(cuttingPlans).where(eq(cuttingPlans.jobId, jobId));
  }

  async createCuttingPlan(plan: InsertCuttingPlan): Promise<CuttingPlan> {
    const [newPlan] = await db.insert(cuttingPlans).values(plan).returning();
    return newPlan;
  }

  async updateCuttingPlan(id: number, plan: Partial<InsertCuttingPlan>): Promise<CuttingPlan> {
    const [updatedPlan] = await db.update(cuttingPlans).set(plan).where(eq(cuttingPlans.id, id)).returning();
    return updatedPlan;
  }

  // Cut Sequences
  async getCutSequences(cuttingPlanId: number): Promise<CutSequence[]> {
    return await db.select().from(cutSequences).where(eq(cutSequences.cuttingPlanId, cuttingPlanId));
  }

  async createCutSequence(sequence: InsertCutSequence): Promise<CutSequence> {
    const [newSequence] = await db.insert(cutSequences).values(sequence).returning();
    return newSequence;
  }

  async updateCutSequence(id: number, sequence: Partial<InsertCutSequence>): Promise<CutSequence> {
    const [updatedSequence] = await db.update(cutSequences).set(sequence).where(eq(cutSequences.id, id)).returning();
    return updatedSequence;
  }

  // Remnants
  async getRemnants(): Promise<Remnant[]> {
    return await db.select().from(remnants).orderBy(desc(remnants.createdAt));
  }

  async createRemnant(remnant: InsertRemnant): Promise<Remnant> {
    const [newRemnant] = await db.insert(remnants).values(remnant).returning();
    return newRemnant;
  }

  async updateRemnant(id: number, remnant: Partial<InsertRemnant>): Promise<Remnant> {
    const [updatedRemnant] = await db.update(remnants).set(remnant).where(eq(remnants.id, id)).returning();
    return updatedRemnant;
  }

  // Analytics
  async getOptimizationSimulations(): Promise<OptimizationSimulation[]> {
    return await db.select().from(optimizationSimulations).orderBy(desc(optimizationSimulations.createdAt));
  }

  async getOptimizationSimulation(id: string): Promise<OptimizationSimulation | undefined> {
    const result = await db.select().from(optimizationSimulations).where(eq(optimizationSimulations.id, parseInt(id)));
    return result[0];
  }

  async createOptimizationSimulation(simulation: InsertOptimizationSimulation): Promise<OptimizationSimulation> {
    const result = await db.insert(optimizationSimulations).values(simulation).returning();
    return result[0];
  }

  // Coating systems methods
  async getCoatingSystems(): Promise<any[]> {
    try {
      const result = await db.query(`SELECT * FROM coating_systems WHERE is_active = true ORDER BY name`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching coating systems:', error);
      return [];
    }
  }

  async createCoatingSystem(coatingData: any): Promise<any> {
    try {
      const result = await db.query(`
        INSERT INTO coating_systems (name, coating_type, pricing_method, price_per_unit, coverage_rate, preparation_required, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        coatingData.name,
        coatingData.coating_type,
        coatingData.pricing_method,
        coatingData.price_per_unit,
        coatingData.coverage_rate,
        coatingData.preparation_required,
        coatingData.is_active
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating coating system:', error);
      throw error;
    }
  }

  async deleteExpiredSimulations(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db.delete(optimizationSimulations).where(lt(optimizationSimulations.createdAt, sevenDaysAgo));
  }

  async getJobStats(): Promise<{
    activeJobs: number;
    completedJobs: number;
    totalValue: number;
    avgEfficiency: number;
    weeklyVolume: number;
  }> {
    const [activeJobsResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(jobs).where(
      or(
        eq(jobs.status, "pending"),
        eq(jobs.status, "in_progress")
      )
    );

    const [completedJobsResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(jobs).where(eq(jobs.status, "completed"));

    const [totalValueResult] = await db.select({
      total: sql<number>`coalesce(sum(estimated_value), 0)`
    }).from(jobs).where(eq(jobs.status, "completed"));

    // Calculate average efficiency from cutting plans
    const [avgEfficiencyResult] = await db.select({
      avg: sql<number>`coalesce(avg(efficiency), 0)`
    }).from(cuttingPlans);

    // Calculate weekly volume (simplified)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const [weeklyVolumeResult] = await db.select({
      count: sql<number>`count(*)`
    }).from(jobs).where(
      sql`created_at >= ${weekStart}`
    );

    return {
      activeJobs: activeJobsResult.count,
      completedJobs: completedJobsResult.count,
      totalValue: totalValueResult.total,
      avgEfficiency: avgEfficiencyResult.avg,
      weeklyVolume: weeklyVolumeResult.count,
    };
  }

  // Coating Systems
  async getCoatingSystems(): Promise<CoatingSystem[]> {
    return await db.select().from(coatingSystems).where(eq(coatingSystems.isActive, true));
  }

  async getCoatingSystem(id: number): Promise<CoatingSystem | undefined> {
    const [system] = await db.select().from(coatingSystems).where(eq(coatingSystems.id, id));
    return system || undefined;
  }

  async createCoatingSystem(system: InsertCoatingSystem): Promise<CoatingSystem> {
    const [createdSystem] = await db.insert(coatingSystems).values(system).returning();
    return createdSystem;
  }

  async updateCoatingSystem(id: number, system: Partial<InsertCoatingSystem>): Promise<CoatingSystem> {
    const [updatedSystem] = await db.update(coatingSystems)
      .set(system)
      .where(eq(coatingSystems.id, id))
      .returning();
    return updatedSystem;
  }

  async deleteCoatingSystem(id: number): Promise<void> {
    await db.update(coatingSystems)
      .set({ isActive: false })
      .where(eq(coatingSystems.id, id));
  }

  // Surface Area Configurations
  async getSurfaceAreaConfigs(materialId: number): Promise<SurfaceAreaConfig[]> {
    return await db.select().from(surfaceAreaConfigs).where(eq(surfaceAreaConfigs.materialId, materialId));
  }

  async createSurfaceAreaConfig(config: InsertSurfaceAreaConfig): Promise<SurfaceAreaConfig> {
    const [createdConfig] = await db.insert(surfaceAreaConfigs).values(config).returning();
    return createdConfig;
  }

  async updateSurfaceAreaConfig(id: number, config: Partial<InsertSurfaceAreaConfig>): Promise<SurfaceAreaConfig> {
    const [updatedConfig] = await db.update(surfaceAreaConfigs)
      .set(config)
      .where(eq(surfaceAreaConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  // Supplier Management Implementation
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(asc(suppliers.name));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [createdSupplier] = await db.insert(suppliers).values(supplier).returning();
    return createdSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db.update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    // First delete all associated contacts
    await db.delete(supplierContacts).where(eq(supplierContacts.supplierId, id));
    
    // Then delete the supplier
    const result = await db.delete(suppliers)
      .where(eq(suppliers.id, id))
      .returning();
    return result.length > 0;
  }

  // Material-Supplier Relationships Implementation
  async getMaterialSuppliers(materialId: number): Promise<(MaterialSupplier & { supplier: Supplier })[]> {
    const result = await db
      .select({
        id: materialSuppliers.id,
        materialId: materialSuppliers.materialId,
        supplierId: materialSuppliers.supplierId,
        isPrimary: materialSuppliers.isPrimary,
        pricePerMeter: materialSuppliers.pricePerMeter,
        pricePerKg: materialSuppliers.pricePerKg,
        currency: materialSuppliers.currency,
        validFrom: materialSuppliers.validFrom,
        validUntil: materialSuppliers.validUntil,
        leadTime: materialSuppliers.leadTime,
        minimumQuantity: materialSuppliers.minimumQuantity,
        notes: materialSuppliers.notes,
        isActive: materialSuppliers.isActive,
        createdAt: materialSuppliers.createdAt,
        updatedAt: materialSuppliers.updatedAt,
        supplier: suppliers
      })
      .from(materialSuppliers)
      .innerJoin(suppliers, eq(materialSuppliers.supplierId, suppliers.id))
      .where(and(
        eq(materialSuppliers.materialId, materialId),
        eq(materialSuppliers.isActive, true),
        eq(suppliers.isActive, true)
      ))
      .orderBy(desc(materialSuppliers.isPrimary), asc(suppliers.name));
    
    return result as (MaterialSupplier & { supplier: Supplier })[];
  }

  async getMaterialSupplierById(id: number): Promise<(MaterialSupplier & { material: Material, supplier: Supplier }) | undefined> {
    const [result] = await db
      .select({
        id: materialSuppliers.id,
        materialId: materialSuppliers.materialId,
        supplierId: materialSuppliers.supplierId,
        isPrimary: materialSuppliers.isPrimary,
        pricePerMeter: materialSuppliers.pricePerMeter,
        pricePerKg: materialSuppliers.pricePerKg,
        currency: materialSuppliers.currency,
        validFrom: materialSuppliers.validFrom,
        validUntil: materialSuppliers.validUntil,
        leadTime: materialSuppliers.leadTime,
        minimumQuantity: materialSuppliers.minimumQuantity,
        notes: materialSuppliers.notes,
        isActive: materialSuppliers.isActive,
        createdAt: materialSuppliers.createdAt,
        updatedAt: materialSuppliers.updatedAt,
        material: materials,
        supplier: suppliers
      })
      .from(materialSuppliers)
      .innerJoin(materials, eq(materialSuppliers.materialId, materials.id))
      .innerJoin(suppliers, eq(materialSuppliers.supplierId, suppliers.id))
      .where(eq(materialSuppliers.id, id));
    
    return result as (MaterialSupplier & { material: Material, supplier: Supplier }) || undefined;
  }

  async createMaterialSupplier(materialSupplier: InsertMaterialSupplier): Promise<MaterialSupplier> {
    const [createdMaterialSupplier] = await db.insert(materialSuppliers).values(materialSupplier).returning();
    return createdMaterialSupplier;
  }

  async updateMaterialSupplier(id: number, materialSupplier: Partial<InsertMaterialSupplier>): Promise<MaterialSupplier> {
    const [updatedMaterialSupplier] = await db.update(materialSuppliers)
      .set({ ...materialSupplier, updatedAt: new Date() })
      .where(eq(materialSuppliers.id, id))
      .returning();
    return updatedMaterialSupplier;
  }

  async deleteMaterialSupplier(id: number): Promise<boolean> {
    const result = await db.update(materialSuppliers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(materialSuppliers.id, id))
      .returning();
    return result.length > 0;
  }

  async setPrimarySupplier(id: number): Promise<MaterialSupplier> {
    // Get the material supplier to find the material
    const materialSupplier = await this.getMaterialSupplierById(id);
    if (!materialSupplier) {
      throw new Error("Material supplier not found");
    }

    // First, unset all primary suppliers for this material
    await db.update(materialSuppliers)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(materialSuppliers.materialId, materialSupplier.materialId));

    // Then set this supplier as primary
    const [updatedMaterialSupplier] = await db.update(materialSuppliers)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(materialSuppliers.id, id))
      .returning();
    
    return updatedMaterialSupplier;
  }

  // Price History Implementation
  async getSupplierPriceHistory(materialSupplierId: number): Promise<(SupplierPriceHistory & { enteredByUser: User })[]> {
    const result = await db
      .select({
        id: supplierPriceHistory.id,
        materialSupplierId: supplierPriceHistory.materialSupplierId,
        pricePerMeter: supplierPriceHistory.pricePerMeter,
        pricePerKg: supplierPriceHistory.pricePerKg,
        currency: supplierPriceHistory.currency,
        effectiveDate: supplierPriceHistory.effectiveDate,
        priceChangeReason: supplierPriceHistory.priceChangeReason,
        enteredBy: supplierPriceHistory.enteredBy,
        notes: supplierPriceHistory.notes,
        createdAt: supplierPriceHistory.createdAt,
        enteredByUser: users
      })
      .from(supplierPriceHistory)
      .leftJoin(users, eq(supplierPriceHistory.enteredBy, users.id))
      .where(eq(supplierPriceHistory.materialSupplierId, materialSupplierId))
      .orderBy(desc(supplierPriceHistory.effectiveDate));
    
    return result as (SupplierPriceHistory & { enteredByUser: User })[];
  }

  async createSupplierPriceHistory(priceHistory: InsertSupplierPriceHistory): Promise<SupplierPriceHistory> {
    const [createdPriceHistory] = await db.insert(supplierPriceHistory).values(priceHistory).returning();
    return createdPriceHistory;
  }

  // Supplier Contacts Implementation
  async getSupplierContacts(supplierId?: number | null): Promise<SupplierContact[]> {
    if (supplierId) {
      return await db.select().from(supplierContacts)
        .where(eq(supplierContacts.supplierId, supplierId))
        .orderBy(supplierContacts.firstName, supplierContacts.lastName);
    }
    
    return await db.select().from(supplierContacts)
      .orderBy(supplierContacts.firstName, supplierContacts.lastName);
  }

  async createSupplierContact(contact: InsertSupplierContact): Promise<SupplierContact> {
    const [createdContact] = await db.insert(supplierContacts)
      .values(contact)
      .returning();
    return createdContact;
  }

  async updateSupplierContact(id: number, contact: Partial<InsertSupplierContact>): Promise<SupplierContact | undefined> {
    const [updatedContact] = await db
      .update(supplierContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(supplierContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteSupplierContact(id: number): Promise<void> {
    await db.delete(supplierContacts).where(eq(supplierContacts.id, id));
  }

  async setPrimarySupplierContact(id: number): Promise<SupplierContact | undefined> {
    return await db.transaction(async (tx) => {
      // First get the contact to find the supplier ID
      const [contact] = await tx.select().from(supplierContacts).where(eq(supplierContacts.id, id));
      if (!contact) return undefined;

      // Set all contacts for this supplier to non-primary in a single operation
      await tx.update(supplierContacts)
        .set({ isPrimaryContact: false, updatedAt: new Date() })
        .where(eq(supplierContacts.supplierId, contact.supplierId));

      // Set this specific contact as primary
      const [updatedContact] = await tx.update(supplierContacts)
        .set({ isPrimaryContact: true, updatedAt: new Date() })
        .where(eq(supplierContacts.id, id))
        .returning();

      // Update supplier with primary contact details
      if (updatedContact) {
        await tx.update(suppliers)
          .set({
            contactName: `${updatedContact.firstName} ${updatedContact.lastName}`,
            email: updatedContact.email || '',
            phone: updatedContact.phoneMobile || updatedContact.phonePrimary || '',
            updatedAt: new Date()
          })
          .where(eq(suppliers.id, contact.supplierId));
      }

      return updatedContact;
    });
  }

  // Client Contacts Implementation
  async getClientContacts(clientId?: number | null): Promise<ClientContact[]> {
    if (clientId) {
      return await db.select().from(clientContacts)
        .where(eq(clientContacts.clientId, clientId))
        .orderBy(clientContacts.firstName, clientContacts.lastName);
    }
    
    return await db.select().from(clientContacts)
      .orderBy(clientContacts.firstName, clientContacts.lastName);
  }

  async createClientContact(contact: InsertClientContact): Promise<ClientContact> {
    const [createdContact] = await db.insert(clientContacts)
      .values(contact)
      .returning();
    return createdContact;
  }

  async updateClientContact(id: number, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined> {
    const [updatedContact] = await db
      .update(clientContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteClientContact(id: number): Promise<void> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  async setPrimaryClientContact(id: number): Promise<ClientContact | undefined> {
    return await db.transaction(async (tx) => {
      // First get the contact to find the client ID
      const [contact] = await tx.select().from(clientContacts).where(eq(clientContacts.id, id));
      if (!contact) return undefined;

      // Set all contacts for this client to non-primary in a single operation
      await tx.update(clientContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(clientContacts.clientId, contact.clientId));

      // Set this specific contact as primary
      const [updatedContact] = await tx.update(clientContacts)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(eq(clientContacts.id, id))
        .returning();

      // Update client with primary contact details
      if (updatedContact) {
        await tx.update(clients)
          .set({
            contactName: `${updatedContact.firstName} ${updatedContact.lastName}`,
            email: updatedContact.email || '',
            phone: updatedContact.mobile || updatedContact.workPhone || '',
            updatedAt: new Date()
          })
          .where(eq(clients.id, contact.clientId));
      }

      return updatedContact;
    });
  }

  // Client Management Implementation
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [createdClient] = await db.insert(clients)
      .values(client)
      .returning();
    return createdClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    // First delete all associated contacts
    await db.delete(clientContacts).where(eq(clientContacts.clientId, id));
    
    // Then delete the client
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Location Management
  async getLocations(entityType: 'supplier' | 'client', entityId: number): Promise<Location[]> {
    return await db.select().from(locations).where(
      and(
        eq(locations.entityType, entityType),
        eq(locations.entityId, entityId)
      )
    );
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [createdLocation] = await db.insert(locations)
      .values(location)
      .returning();
    return createdLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Estimation Management
  async getEstimationProjects(): Promise<any[]> {
    try {
      const projects = await db.execute(sql`
        SELECT 
          ep.*,
          c.name as client_name
        FROM estimation_projects ep
        LEFT JOIN clients c ON ep.client_id = c.id
        ORDER BY ep.updated_at DESC
      `);
      
      return projects.rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        clientId: p.client_id,
        clientName: p.client_name,
        status: p.status,
        totalCost: p.total_cost,
        margin: p.margin,
        deliveryDate: p.delivery_date,
        estimatedHours: p.estimated_hours,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        lifecycleProgress: p.lifecycle_progress || 0,
        currentPhase: p.current_phase,
        projectNumber: p.project_number || `EST-${p.id}`
      }));
    } catch (error) {
      console.log('Error fetching estimation projects:', error);
      return [];
    }
  }

  async getEstimationProject(id: number): Promise<any | undefined> {
    // Use direct SQL to avoid schema mismatches
    const projectResult = await db.execute(sql`
      SELECT id, name, description, client_id, status, total_cost, margin, created_at, updated_at
      FROM estimation_projects WHERE id = ${id}
    `);
    
    if (!projectResult.rows[0]) return undefined;
    const project = projectResult.rows[0];
    
    console.log('Found project:', project.name, 'ID:', project.id);

    // Get estimation data if it exists
    let estData = null;
    try {
      const estDataResult = await db.execute(sql`
        SELECT materials, labor, equipment, consumables, coatings, overheads, margin, totals
        FROM estimation_data WHERE project_id = ${id}
      `);
      estData = estDataResult.rows[0] || null;
    } catch (error) {
      console.log('No estimation data found for project', id);
      estData = null;
    }
    
    return {
      id: project.id,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        clientId: project.client_id,
        status: project.status,
        totalCost: parseFloat(project.total_cost) || 0,
        margin: project.margin || 20,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      },
      materials: estData?.materials || [],
      labor: estData?.labor || [],
      equipment: estData?.equipment || [],
      consumables: estData?.consumables || [],
      coatings: estData?.coatings || [],
      overheads: estData?.overheads || { percentage: 20, amount: 0 },
      margin: estData?.margin || { percentage: 20, amount: 0 },
      totals: estData?.totals || {}
    };
  }

  async createEstimationProject(project: InsertEstimationProject): Promise<EstimationProject> {
    // Remove projectData field as it doesn't exist in the database yet
    const { projectData, ...projectToInsert } = project;
    
    // Convert deliveryDate string to Date object if it exists
    if (projectToInsert.deliveryDate && typeof projectToInsert.deliveryDate === 'string') {
      projectToInsert.deliveryDate = new Date(projectToInsert.deliveryDate);
    }
    
    const [created] = await db.insert(estimationProjects)
      .values(projectToInsert)
      .returning();
    return created;
  }

  async updateEstimationProject(id: number, project: Partial<InsertEstimationProject>): Promise<EstimationProject> {
    const [updated] = await db
      .update(estimationProjects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(estimationProjects.id, id))
      .returning();
    return updated;
  }

  async getEstimationData(projectId: number): Promise<any> {
    const [data] = await db
      .select()
      .from(estimationData)
      .where(eq(estimationData.projectId, projectId));
    
    if (!data) {
      return null;
    }
    
    return {
      materials: data.materials,
      labor: data.labor,
      equipment: data.equipment,
      consumables: data.consumables,
      coatings: data.coatings,
      overheads: data.overheads,
      margin: data.margin,
      totals: data.totals,
      overhead_percentage: data.overheadPercentage,
      margin_percentage: data.marginPercentage
    };
  }

  async saveEstimationData(projectId: number, estimationData: any): Promise<any> {
    return await db.transaction(async (tx) => {
      // Update the main project with totals using direct SQL to avoid column mismatch
      const result = await tx.execute(sql`
        UPDATE estimation_projects 
        SET total_cost = ${estimationData.totals?.total || 0},
            margin = ${estimationData.margin?.percentage || 20},
            updated_at = NOW()
        WHERE id = ${projectId}
        RETURNING *
      `);
      
      // Upsert estimation data
      await tx.execute(sql`
        INSERT INTO estimation_data (
          project_id, materials, labor, equipment, consumables, coatings, 
          overheads, margin, totals, overhead_percentage, margin_percentage
        )
        VALUES (
          ${projectId},
          ${JSON.stringify(estimationData.materials || [])},
          ${JSON.stringify(estimationData.labor || [])}, 
          ${JSON.stringify(estimationData.equipment || [])},
          ${JSON.stringify(estimationData.consumables || [])},
          ${JSON.stringify(estimationData.coatings || [])},
          ${JSON.stringify(estimationData.overheads || {})},
          ${JSON.stringify(estimationData.margin || {})},
          ${JSON.stringify(estimationData.totals || {})},
          ${estimationData.overheads?.percentage || 20},
          ${estimationData.margin?.percentage || 20}
        )
        ON CONFLICT (project_id) 
        DO UPDATE SET
          materials = EXCLUDED.materials,
          labor = EXCLUDED.labor,
          equipment = EXCLUDED.equipment, 
          consumables = EXCLUDED.consumables,
          coatings = EXCLUDED.coatings,
          overheads = EXCLUDED.overheads,
          margin = EXCLUDED.margin,
          totals = EXCLUDED.totals,
          overhead_percentage = EXCLUDED.overhead_percentage,
          margin_percentage = EXCLUDED.margin_percentage,
          updated_at = NOW()
      `);

      return {
        success: true,
        projectId,
        totalCost: estimationData.totals?.total || 0,
        estimationData
      };
    });
  }

  async updateEstimationStatus(id: number, status: string): Promise<void> {
    await db
      .update(estimationProjects)
      .set({ status, updatedAt: new Date() })
      .where(eq(estimationProjects.id, id));
  }

  async getJobByEstimationId(estimationId: number): Promise<Job | null> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.estimationId, estimationId))
      .limit(1);
    return job || null;
  }

  async createJobFromEstimation(jobData: any): Promise<Job> {
    // Get client details
    let clientDetails = { name: '', contact: '', phone: '', email: '', address: '' };
    if (jobData.clientId) {
      const client = await this.getClient(jobData.clientId);
      if (client) {
        clientDetails = {
          name: client.name || '',
          contact: client.primaryContactName || '',
          phone: client.primaryContactPhone || '',
          email: client.primaryContactEmail || '',
          address: client.address || ''
        };
      }
    }
    
    const [job] = await db
      .insert(jobs)
      .values({
        jobNumber: jobData.number,
        clientName: clientDetails.name,
        clientContact: clientDetails.contact,
        clientPhone: clientDetails.phone,
        clientEmail: clientDetails.email,
        clientAddress: clientDetails.address,
        projectDescription: jobData.description,
        status: jobData.status,
        priority: 'medium',
        estimatedValue: jobData.totalCost,
        materialCost: jobData.projectData?.materials?.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0) || 0,
        laborCost: jobData.projectData?.labor?.reduce((sum: number, l: any) => sum + (l.totalCost || 0), 0) || 0,
        overheadCost: jobData.projectData?.overheadCost || 0,
        profitMargin: jobData.margin,
        createdAt: new Date(),
        notes: `Created from estimation #${jobData.estimationId}`,
        estimationId: jobData.estimationId
      })
      .returning();
    
    return job;
  }

  async createResourceAllocations(jobId: number, laborData: any[]): Promise<void> {
    // Create resource allocations for the job based on labor requirements
    for (const labor of laborData) {
      await db.execute(sql`
        INSERT INTO resource_allocations (
          job_id,
          resource_type,
          description,
          hours,
          rate,
          skill_level,
          location,
          created_at
        ) VALUES (
          ${jobId},
          'labor',
          ${labor.description},
          ${labor.hours},
          ${labor.rate},
          ${labor.skillLevel || 'standard'},
          ${labor.location || 'workshop'},
          NOW()
        )
      `);
    }
  }

  // Quotes
  async getQuotes(estimationId?: number): Promise<Quote[]> {
    if (estimationId) {
      return await db.select().from(quotes)
        .where(eq(quotes.estimationId, estimationId))
        .orderBy(desc(quotes.version));
    }
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.quoteNumber, quoteNumber));
    return quote || undefined;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updatedQuote] = await db.update(quotes)
      .set({ ...quote, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return !!result;
  }

  async getQuoteVersions(estimationId: number): Promise<Quote[]> {
    return await db.select().from(quotes)
      .where(eq(quotes.estimationId, estimationId))
      .orderBy(desc(quotes.version));
  }

  async getLatestQuoteVersion(estimationId: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes)
      .where(eq(quotes.estimationId, estimationId))
      .orderBy(desc(quotes.version))
      .limit(1);
    return quote || undefined;
  }

  // Quote History
  async addQuoteHistory(history: InsertQuoteHistory): Promise<QuoteHistory> {
    const [newHistory] = await db.insert(quoteHistory).values(history).returning();
    return newHistory;
  }

  async getQuoteHistory(quoteId: number): Promise<QuoteHistory[]> {
    return await db.select().from(quoteHistory)
      .where(eq(quoteHistory.quoteId, quoteId))
      .orderBy(desc(quoteHistory.performedAt));
  }

  // Quote Views
  async recordQuoteView(view: InsertQuoteView): Promise<QuoteView> {
    const [newView] = await db.insert(quoteViews).values(view).returning();
    return newView;
  }

  async getQuoteViews(quoteId: number): Promise<QuoteView[]> {
    return await db.select().from(quoteViews)
      .where(eq(quoteViews.quoteId, quoteId))
      .orderBy(desc(quoteViews.viewedAt));
  }

  // Procurement - Purchase Requisitions
  async getRequisitions(filters?: { status?: string; department?: string; requestedBy?: number }): Promise<PurchaseRequisition[]> {
    let query = db.select().from(purchaseRequisitions);
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(purchaseRequisitions.status, filters.status));
      if (filters.department) conditions.push(eq(purchaseRequisitions.department, filters.department));
      if (filters.requestedBy) conditions.push(eq(purchaseRequisitions.requestedBy, filters.requestedBy));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(purchaseRequisitions.createdAt));
  }

  async getRequisition(id: number): Promise<PurchaseRequisition | undefined> {
    const [requisition] = await db.select().from(purchaseRequisitions).where(eq(purchaseRequisitions.id, id));
    return requisition || undefined;
  }

  async createRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition> {
    const [newRequisition] = await db.insert(purchaseRequisitions).values(requisition).returning();
    return newRequisition;
  }

  async updateRequisition(id: number, requisition: Partial<InsertPurchaseRequisition>): Promise<PurchaseRequisition> {
    const [updated] = await db.update(purchaseRequisitions)
      .set({ ...requisition, updatedAt: new Date() })
      .where(eq(purchaseRequisitions.id, id))
      .returning();
    return updated;
  }

  async generateRequisitionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Use proper query to get the latest requisition number
    const latestReq = await db.select({ requisitionNumber: purchaseRequisitions.requisitionNumber })
      .from(purchaseRequisitions)
      .where(sql`"requisition_number" LIKE ${`REQ-${year}${month}-%`}`)
      .orderBy(desc(purchaseRequisitions.requisitionNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (latestReq.length > 0 && latestReq[0].requisitionNumber) {
      const match = latestReq[0].requisitionNumber.match(/REQ-\d{6}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const paddedNumber = String(nextNumber).padStart(3, '0');
    return `REQ-${year}${month}-${paddedNumber}`;
  }

  // Procurement - Requisition Items
  async getRequisitionItems(requisitionId: number): Promise<RequisitionItem[]> {
    return await db.select().from(requisitionItems)
      .where(eq(requisitionItems.requisitionId, requisitionId))
      .orderBy(asc(requisitionItems.id));
  }

  async createRequisitionItem(item: InsertRequisitionItem): Promise<RequisitionItem> {
    const [newItem] = await db.insert(requisitionItems).values(item).returning();
    return newItem;
  }

  async updateRequisitionItem(id: number, item: Partial<InsertRequisitionItem>): Promise<RequisitionItem> {
    const [updated] = await db.update(requisitionItems)
      .set(item)
      .where(eq(requisitionItems.id, id))
      .returning();
    return updated;
  }

  async deleteRequisitionItem(id: number): Promise<void> {
    await db.delete(requisitionItems).where(eq(requisitionItems.id, id));
  }

  // Procurement - Approval Rules
  async getApprovalRules(amount?: number, category?: string): Promise<ApprovalRule[]> {
    let query = db.select().from(approvalRules).where(eq(approvalRules.isActive, true));
    
    if (amount !== undefined) {
      query = query.where(
        and(
          sql`${approvalRules.minAmount} <= ${amount}`,
          or(
            sql`${approvalRules.maxAmount} IS NULL`,
            sql`${approvalRules.maxAmount} >= ${amount}`
          )
        )
      );
    }
    
    if (category) {
      query = query.where(
        or(
          eq(approvalRules.category, category),
          sql`${approvalRules.category} IS NULL`
        )
      );
    }
    
    return await query.orderBy(asc(approvalRules.approvalLevel));
  }

  async getApprovalRule(id: number): Promise<ApprovalRule | undefined> {
    const [rule] = await db.select().from(approvalRules).where(eq(approvalRules.id, id));
    return rule || undefined;
  }

  async createApprovalRule(rule: InsertApprovalRule): Promise<ApprovalRule> {
    const [newRule] = await db.insert(approvalRules).values(rule).returning();
    return newRule;
  }

  async updateApprovalRule(id: number, rule: Partial<InsertApprovalRule>): Promise<ApprovalRule> {
    const [updated] = await db.update(approvalRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(approvalRules.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalRule(id: number): Promise<void> {
    await db.delete(approvalRules).where(eq(approvalRules.id, id));
  }

  // Procurement - Approval History
  async getApprovalHistory(requisitionId: number): Promise<ApprovalHistory[]> {
    try {
      return await db.select().from(approvalHistory)
        .where(eq(approvalHistory.requisitionId, requisitionId))
        .orderBy(desc(approvalHistory.actionAt));
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  }

  async createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory> {
    const [newHistory] = await db.insert(approvalHistory).values({
      ...history,
      actionAt: new Date(), // Ensure timestamp is set
    }).returning();
    return newHistory;
  }

  async getPendingApprovals(approverId: number): Promise<PurchaseRequisition[]> {
    // For now, return all pending requisitions 
    // In production, this would check user's approval authority level
    return await db.select().from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.status, 'pending_approval'))
      .orderBy(desc(purchaseRequisitions.priority), asc(purchaseRequisitions.createdAt));
  }

  async approveRequisition(requisitionId: number, approverId: number, comments?: string): Promise<void> {
    const requisition = await this.getRequisition(requisitionId);
    if (!requisition) throw new Error('Requisition not found');

    // Check if approver is CEO/Owner (Adam Green - ID 9) - can approve at any level
    const isCEO = approverId === 9;
    
    const currentLevel = requisition.currentApprovalLevel || 0;
    const nextLevel = isCEO ? (requisition.maxApprovalLevel || 1) : currentLevel + 1;

    console.log(`Approving requisition ${requisitionId}: Level ${currentLevel} -> ${nextLevel} (max: ${requisition.maxApprovalLevel}) ${isCEO ? '(CEO approval - skipping to final level)' : ''}`);

    // Record approval in history
    try {
      await this.createApprovalHistory({
        requisitionId,
        approvalLevel: nextLevel,
        approverId,
        action: 'approved',
        comments,
        amount: requisition.estimatedTotal,
      });
      console.log('Approval history created');
    } catch (error) {
      console.error('Error creating approval history:', error);
    }

    // Check if this is final approval
    if (nextLevel >= (requisition.maxApprovalLevel || 1)) {
      console.log('Final approval reached, setting status to approved');
      await this.updateRequisition(requisitionId, {
        status: 'approved',
        currentApprovalLevel: nextLevel,
        approvalNotes: comments,
      });
    } else {
      console.log(`Partial approval, level ${nextLevel} of ${requisition.maxApprovalLevel}`);
      await this.updateRequisition(requisitionId, {
        currentApprovalLevel: nextLevel,
        approvalNotes: comments,
        // Keep status as pending_approval for multi-level approvals
        status: 'pending_approval',
      });
    }
  }

  async rejectRequisition(requisitionId: number, approverId: number, comments: string): Promise<void> {
    const requisition = await this.getRequisition(requisitionId);
    if (!requisition) throw new Error('Requisition not found');

    // Record rejection
    await this.createApprovalHistory({
      requisitionId,
      approvalLevel: requisition.currentApprovalLevel || 1,
      approverId,
      action: 'rejected',
      comments,
      amount: requisition.estimatedTotal,
    });

    // Update requisition status
    await this.updateRequisition(requisitionId, {
      status: 'rejected',
      approvalNotes: comments,
    });
  }

  // PO Templates Management
  async getPOTemplates(): Promise<any[]> {
    return await db.select({
      id: poTemplates.id,
      templateName: poTemplates.templateName,
      templateCode: poTemplates.templateCode,
      category: poTemplates.category,
      showPrices: poTemplates.showPrices,
      showGst: poTemplates.showGst,
      showDeliveryDate: poTemplates.showDeliveryDate,
      showItemCodes: poTemplates.showItemCodes,
      primaryColor: poTemplates.primaryColor,
      secondaryColor: poTemplates.secondaryColor,
      termsAndConditions: poTemplates.termsAndConditions,
      isDefault: poTemplates.isDefault,
      isActive: poTemplates.isActive,
    }).from(poTemplates).orderBy(asc(poTemplates.templateName));
  }

  async getPOTemplate(templateIdOrCode: string): Promise<any> {
    // Check if it's a number (ID) or string (code)
    const isId = !isNaN(Number(templateIdOrCode));
    
    if (isId) {
      const [template] = await db.select({
        id: poTemplates.id,
        templateName: poTemplates.templateName,
        templateCode: poTemplates.templateCode,
        category: poTemplates.category,
        showPrices: poTemplates.showPrices,
        showGst: poTemplates.showGst,
        showDeliveryDate: poTemplates.showDeliveryDate,
        showItemCodes: poTemplates.showItemCodes,
        primaryColor: poTemplates.primaryColor,
        secondaryColor: poTemplates.secondaryColor,
        termsAndConditions: poTemplates.termsAndConditions,
        isDefault: poTemplates.isDefault,
        isActive: poTemplates.isActive,
      }).from(poTemplates)
        .where(eq(poTemplates.id, Number(templateIdOrCode)));
      return template;
    } else {
      const [template] = await db.select({
        id: poTemplates.id,
        templateName: poTemplates.templateName,
        templateCode: poTemplates.templateCode,
        category: poTemplates.category,
        showPrices: poTemplates.showPrices,
        showGst: poTemplates.showGst,
        showDeliveryDate: poTemplates.showDeliveryDate,
        showItemCodes: poTemplates.showItemCodes,
        primaryColor: poTemplates.primaryColor,
        secondaryColor: poTemplates.secondaryColor,
        termsAndConditions: poTemplates.termsAndConditions,
        isDefault: poTemplates.isDefault,
        isActive: poTemplates.isActive,
      }).from(poTemplates)
        .where(eq(poTemplates.templateCode, templateIdOrCode));
      return template;
    }
  }

  async createPOTemplate(template: any): Promise<any> {
    const [newTemplate] = await db.insert(poTemplates).values(template).returning();
    return newTemplate;
  }

  async updatePOTemplate(id: number, template: any): Promise<any> {
    const [updated] = await db.update(poTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(poTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePOTemplate(id: number): Promise<void> {
    await db.delete(poTemplates).where(eq(poTemplates.id, id));
  }

  // Archive management
  async archiveRequisition(requisitionId: number, archiverId: number): Promise<void> {
    await db.update(purchaseRequisitions)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: archiverId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseRequisitions.id, requisitionId));
  }

  async unarchiveRequisition(requisitionId: number): Promise<void> {
    await db.update(purchaseRequisitions)
      .set({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(purchaseRequisitions.id, requisitionId));
  }

  async getArchivedRequisitions(): Promise<PurchaseRequisition[]> {
    return await db.select().from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.isArchived, true))
      .orderBy(desc(purchaseRequisitions.archivedAt));
  }

  // Purchase Orders Implementation
  async getPurchaseOrders(filters?: { status?: string; supplierId?: number; jobId?: number; includeArchived?: boolean; showArchived?: boolean }): Promise<PurchaseOrder[]> {
    // Start with base query
    let baseQuery = db.select().from(purchaseOrders);
    
    // Filter by status, supplier, or job if provided
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(purchaseOrders.status, filters.status));
      }
      
      if (filters.supplierId) {
        conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
      }
      
      if (filters.jobId) {
        conditions.push(eq(purchaseOrders.jobId, filters.jobId));
      }
      
      // Only show archived if explicitly requested
      if (filters.showArchived) {
        conditions.push(eq(purchaseOrders.isArchived, true));
      } else if (!filters.includeArchived) {
        // Default: hide archived 
        conditions.push(eq(purchaseOrders.isArchived, false));
      }
      
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }
    } else {
      // Default: hide archived only
      baseQuery = baseQuery.where(eq(purchaseOrders.isArchived, false));
    }
    
    // Get all orders and then filter out 'returned_to_requisition' in memory
    const orders = await baseQuery.orderBy(desc(purchaseOrders.createdAt));
    
    // Filter out returned_to_requisition status in memory
    return orders.filter(order => order.status !== 'returned_to_requisition');
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return order || undefined;
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [newOrder] = await db.insert(purchaseOrders).values(order).returning();
    return newOrder;
  }

  async updatePurchaseOrder(id: number, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [updated] = await db.update(purchaseOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return updated;
  }

  async generatePONumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Get the highest PO number for this year
    const latestPO = await db.select({ poNumber: purchaseOrders.poNumber })
      .from(purchaseOrders)
      .where(sql`po_number LIKE ${`PO-${year}-%`}`)
      .orderBy(sql`po_number DESC`)
      .limit(1);
    
    let nextNumber = 1;
    if (latestPO.length > 0 && latestPO[0].poNumber) {
      // Extract the number from the last PO (format: PO-YYYY-NNNN)
      const match = latestPO[0].poNumber.match(/PO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Format with 4 digits but increase if needed
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `PO-${year}-${paddedNumber}`;
  }

  async convertRequisitionToPO(requisitionId: number, supplierId: number, userId: number): Promise<PurchaseOrder> {
    // Get the requisition and its items
    const requisition = await this.getRequisition(requisitionId);
    if (!requisition) throw new Error('Requisition not found');
    
    const requisitionItems = await this.getRequisitionItems(requisitionId);
    
    // Generate PO number
    const poNumber = await this.generatePONumber();
    
    // Create the Purchase Order
    const purchaseOrder = await this.createPurchaseOrder({
      poNumber,
      supplierId,
      jobId: requisition.jobId,
      requisitionId: requisitionId, // Link to original requisition
      status: 'draft',
      orderDate: new Date(),
      requestedDeliveryDate: requisition.requiredByDate,
      subtotal: requisition.estimatedTotal,
      gstAmount: requisition.estimatedTotal ? (parseFloat(requisition.estimatedTotal as any) * 0.15) : 0,
      totalAmount: requisition.estimatedTotal ? (parseFloat(requisition.estimatedTotal as any) * 1.15) : 0,
      currency: requisition.currency || 'NZD',
      deliveryAddress: requisition.deliveryLocation,
      createdBy: userId,
    });
    
    // Create PO items from requisition items
    for (const item of requisitionItems) {
      await this.createPurchaseOrderItem({
        purchaseOrderId: purchaseOrder.id,
        materialId: item.materialId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.estimatedUnitPrice || 0,
        totalPrice: item.estimatedTotal || 0,
        unitOfMeasure: item.unit || 'each',
        deliveryDate: item.requiredByDate,
        notes: item.notes,
      });
    }
    
    // Update the requisition to mark it as converted
    await this.updateRequisition(requisitionId, {
      status: 'converted_to_po',
      convertedToPoId: purchaseOrder.id,
      convertedAt: new Date(),
      convertedBy: userId,
    });
    
    return purchaseOrder;
  }

  // Purchase Order Items Implementation
  async getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    return await db.select().from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId))
      .orderBy(asc(purchaseOrderItems.id));
  }

  async createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    // Ensure lineTotal is calculated if not provided
    const calculatedTotal = item.lineTotal || item.totalPrice || (parseFloat(item.unitPrice as any) * parseFloat(item.quantity as any));
    
    const [newItem] = await db.insert(purchaseOrderItems).values({
      purchaseOrderId: item.purchaseOrderId,
      materialId: item.materialId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: calculatedTotal,
      unitOfMeasure: item.unitOfMeasure || 'each',
      deliveryDate: item.deliveryDate,
      receivedQuantity: item.receivedQuantity || 0,
      status: item.status || 'ordered',
      notes: item.notes,
      lineTotal: calculatedTotal,
    }).returning();
    return newItem;
  }

  async updatePurchaseOrderItem(id: number, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem> {
    const [updated] = await db.update(purchaseOrderItems)
      .set(item)
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    return updated;
  }

  async deletePurchaseOrderItem(id: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
  }
  
  // Purchase Order Archive Management
  async archivePurchaseOrder(poId: number, archiverId: number, reason?: string): Promise<PurchaseOrder> {
    const [archived] = await db.update(purchaseOrders)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: archiverId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId))
      .returning();
    return archived;
  }

  async unarchivePurchaseOrder(poId: number): Promise<void> {
    await db.update(purchaseOrders)
      .set({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId));
  }

  async getArchivedPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.isArchived, true))
      .orderBy(desc(purchaseOrders.archivedAt));
  }

  // RFQ Management Implementation
  async getRfqRequests(filters?: { status?: string; jobId?: number }): Promise<any[]> {
    let query = db.select().from(rfqRequests);
    
    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(rfqRequests.status, filters.status));
      if (filters.jobId) conditions.push(eq(rfqRequests.jobId, filters.jobId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    const rfqs = await query.orderBy(desc(rfqRequests.createdAt));
    
    // Add response counts to each RFQ
    const rfqsWithCounts = await Promise.all(rfqs.map(async (rfq) => {
      const responseCount = await db.select({ count: sql<number>`count(*)` })
        .from(rfqResponses)
        .where(eq(rfqResponses.rfqId, rfq.id));
      
      return {
        ...rfq,
        responseCount: Number(responseCount[0]?.count || 0)
      };
    }));
    
    return rfqsWithCounts;
  }

  async getRfqRequest(id: number): Promise<RfqRequest | undefined> {
    const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, id));
    return rfq;
  }

  async createRfqRequest(rfq: InsertRfqRequest): Promise<RfqRequest> {
    const [created] = await db.insert(rfqRequests).values(rfq).returning();
    return created;
  }

  async updateRfqRequest(id: number, rfq: Partial<InsertRfqRequest>): Promise<RfqRequest> {
    const [updated] = await db.update(rfqRequests)
      .set({ ...rfq, updatedAt: new Date() })
      .where(eq(rfqRequests.id, id))
      .returning();
    return updated;
  }

  async updateRfqStatus(id: number, status: string): Promise<RfqRequest> {
    const [updated] = await db.update(rfqRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(rfqRequests.id, id))
      .returning();
    return updated;
  }

  async generateRfqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const latestRfq = await db.select({ rfqNumber: rfqRequests.rfqNumber })
      .from(rfqRequests)
      .where(sql`"rfq_number" LIKE ${`RFQ-${year}${month}-%`}`)
      .orderBy(desc(rfqRequests.rfqNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (latestRfq.length > 0 && latestRfq[0].rfqNumber) {
      const match = latestRfq[0].rfqNumber.match(/RFQ-\d{6}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const paddedNumber = String(nextNumber).padStart(3, '0');
    return `RFQ-${year}${month}-${paddedNumber}`;
  }

  // RFQ Responses Implementation
  async getRfqResponses(rfqId: number): Promise<any[]> {
    const responses = await db.select({
      id: rfqResponses.id,
      rfqId: rfqResponses.rfqId,
      supplierId: rfqResponses.supplierId,
      supplierName: suppliers.name,
      supplierCompany: suppliers.company,
      responseNumber: rfqResponses.responseNumber,
      status: rfqResponses.status,
      totalAmount: rfqResponses.totalAmount,
      currency: rfqResponses.currency,
      validityDays: rfqResponses.validityDays,
      deliveryDays: rfqResponses.deliveryDays,
      paymentTermsOffered: rfqResponses.paymentTermsOffered,
      warrantyOffered: rfqResponses.warrantyOffered,
      priceScore: rfqResponses.priceScore,
      qualityScore: rfqResponses.qualityScore,
      deliveryScore: rfqResponses.deliveryScore,
      totalScore: rfqResponses.totalScore,
      ranking: rfqResponses.ranking,
      notes: rfqResponses.notes,
      attachments: rfqResponses.attachments,
      lineItems: rfqResponses.lineItems,
      reviewedBy: rfqResponses.reviewedBy,
      reviewedAt: rfqResponses.reviewedAt,
      rejectionReason: rfqResponses.rejectionReason,
      submittedAt: rfqResponses.submittedAt,
      createdAt: rfqResponses.createdAt,
      updatedAt: rfqResponses.updatedAt,
    })
    .from(rfqResponses)
    .leftJoin(suppliers, eq(rfqResponses.supplierId, suppliers.id))
    .where(eq(rfqResponses.rfqId, rfqId))
    .orderBy(asc(rfqResponses.totalScore));
    
    return responses;
  }

  async getRfqResponse(id: number): Promise<RfqResponse | undefined> {
    const [response] = await db.select().from(rfqResponses).where(eq(rfqResponses.id, id));
    return response;
  }

  async createRfqResponse(response: InsertRfqResponse): Promise<RfqResponse> {
    const [created] = await db.insert(rfqResponses).values(response).returning();
    return created;
  }

  async updateRfqResponse(id: number, response: Partial<InsertRfqResponse>): Promise<RfqResponse> {
    const [updated] = await db.update(rfqResponses)
      .set({ ...response, updatedAt: new Date() })
      .where(eq(rfqResponses.id, id))
      .returning();
    return updated;
  }

  async selectWinningResponse(rfqId: number, responseId: number, justification?: string | null, userId?: number): Promise<void> {
    // Update the winning response with justification if override
    const updateData: any = { 
      status: 'selected', 
      updatedAt: new Date(),
      reviewedBy: userId || null,
      reviewedAt: new Date()
    };
    
    // If justification provided, it's an override - store it
    if (justification) {
      updateData.notes = `OVERRIDE JUSTIFICATION: ${justification}`;
    }
    
    await db.update(rfqResponses)
      .set(updateData)
      .where(eq(rfqResponses.id, responseId));
    
    // Update other responses to rejected
    await db.update(rfqResponses)
      .set({ 
        status: 'rejected', 
        updatedAt: new Date(),
        reviewedBy: userId || null,
        reviewedAt: new Date(),
        rejectionReason: 'Another quote was selected'
      })
      .where(and(
        eq(rfqResponses.rfqId, rfqId),
        ne(rfqResponses.id, responseId)
      ));
    
    // Update the RFQ with the winning response
    await db.update(rfqRequests)
      .set({ 
        winningResponseId: responseId,
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(rfqRequests.id, rfqId));
  }

  async compareRfqResponses(rfqId: number): Promise<RfqResponse[]> {
    const responses = await this.getRfqResponses(rfqId);
    
    // Calculate scores for comparison
    responses.forEach((response, index) => {
      response.ranking = index + 1;
    });
    
    return responses;
  }

  async createPOFromRfqResponse(rfqResponseId: number, userId: number): Promise<PurchaseOrder> {
    const response = await this.getRfqResponse(rfqResponseId);
    if (!response) throw new Error('RFQ Response not found');
    
    const rfq = await this.getRfqRequest(response.rfqId);
    if (!rfq) throw new Error('RFQ not found');
    
    const poNumber = await this.generatePONumber();
    
    // Create PO from winning RFQ response
    const purchaseOrder = await this.createPurchaseOrder({
      poNumber,
      supplierId: response.supplierId,
      jobId: rfq.jobId,
      requisitionId: rfq.requisitionId,
      rfqId: rfq.id,
      rfqResponseId: response.id,
      status: 'draft',
      orderDate: new Date(),
      requestedDeliveryDate: rfq.deliveryRequiredBy,
      subtotal: response.totalAmount,
      gstAmount: response.totalAmount ? (parseFloat(response.totalAmount as any) * 0.15) : 0,
      totalAmount: response.totalAmount ? (parseFloat(response.totalAmount as any) * 1.15) : 0,
      currency: response.currency || 'NZD',
      paymentTerms: response.paymentTermsOffered,
      createdBy: userId,
    });
    
    // Update the requisition status to 'converted' so it shows in the right view
    if (rfq.requisitionId) {
      await db.update(purchaseRequisitions)
        .set({ 
          status: 'converted',
          updatedAt: new Date() 
        })
        .where(eq(purchaseRequisitions.id, rfq.requisitionId));
    }
    
    // Update the RFQ status to 'completed' so it remains visible but marked as done
    await db.update(rfqRequests)
      .set({ 
        status: 'completed',
        updatedAt: new Date() 
      })
      .where(eq(rfqRequests.id, rfq.id));
    
    return purchaseOrder;
  }
}

export const storage = new DatabaseStorage();
