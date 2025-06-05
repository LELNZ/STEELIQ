import { 
  users, materials, materialCategories, inventory, jobs, jobMaterials, 
  cuttingPlans, cutSequences, remnants, optimizationSimulations, coatingSystems, surfaceAreaConfigs,
  suppliers, materialSuppliers, supplierPriceHistory,
  type User, type InsertUser, type Material, type InsertMaterial,
  type MaterialCategory, type InsertMaterialCategory, type Inventory, type InsertInventory,
  type Job, type InsertJob, type JobMaterial, type InsertJobMaterial,
  type CuttingPlan, type InsertCuttingPlan, type CutSequence, type InsertCutSequence,
  type Remnant, type InsertRemnant, type OptimizationSimulation, type InsertOptimizationSimulation,
  type CoatingSystem, type InsertCoatingSystem, type SurfaceAreaConfig, type InsertSurfaceAreaConfig,
  type Supplier, type InsertSupplier, type MaterialSupplier, type InsertMaterialSupplier,
  type SupplierPriceHistory, type InsertSupplierPriceHistory
} from "@shared/schema";
import { desc, eq, lt, asc, like, and, or, sql } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<void>;

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
    const [newMaterial] = await db.insert(materials).values(material).returning();
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
    const result = await db.select().from(optimizationSimulations).where(eq(optimizationSimulations.id, id));
    return result[0];
  }

  async createOptimizationSimulation(simulation: InsertOptimizationSimulation): Promise<OptimizationSimulation> {
    const result = await db.insert(optimizationSimulations).values(simulation).returning();
    return result[0];
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
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.isActive, true)));
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
    const result = await db.update(suppliers)
      .set({ isActive: false, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
