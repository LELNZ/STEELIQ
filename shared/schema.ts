import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("operator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Material categories and types
export const materialCategories = pgTable("material_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Materials library
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => materialCategories.id),
  category: text("category"), // Direct category from CSV
  width: decimal("width", { precision: 10, scale: 2 }), // Width (mm)
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // Thickness (mm)
  diameter: decimal("diameter", { precision: 10, scale: 2 }), // Diameter (mm)
  depth: decimal("depth", { precision: 10, scale: 2 }), // Depth (mm)
  flangeTf: decimal("flange_tf", { precision: 10, scale: 2 }), // Flange TF (mm)
  webTw: decimal("web_tw", { precision: 10, scale: 2 }), // Web TW (mm)
  length: decimal("length", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }), // Weight (kg/m)
  lengthOptions: text("length_options"), // Length Options (m) - stored as text for multiple values
  grade: text("grade"),
  standard: text("standard"), // Standard (e.g., AS/NZS 1163)
  coating: text("coating"),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  supplier: text("supplier"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inventory tracking
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  batchNumber: text("batch_number"),
  heatNumber: text("heat_number"),
  millCertificate: text("mill_certificate"),
  quantityInStock: integer("quantity_in_stock").notNull().default(0),
  lengthAvailable: decimal("length_available", { precision: 10, scale: 2 }),
  location: text("location"),
  receivedDate: timestamp("received_date"),
  expiryDate: timestamp("expiry_date"),
  qrCode: text("qr_code"),
  isRemnant: boolean("is_remnant").default(false),
  parentInventoryId: integer("parent_inventory_id").references(() => inventory.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Jobs
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  projectDescription: text("project_description"),
  status: text("status").notNull().default("draft"), // draft, planning, ready_to_cut, cutting, cut_complete, fabrication, quality_check, completed, on_hold, backcosting
  priority: text("priority").notNull().default("standard"), // standard, high, rush, urgent
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }),
  estimatedTime: integer("estimated_time_minutes"),
  actualTime: integer("actual_time_minutes"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  assignedTo: integer("assigned_to").references(() => users.id),
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }),
  isRushOrder: boolean("is_rush_order").default(false),
  rushPremium: decimal("rush_premium", { precision: 5, scale: 2 }),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  deliveryInstructions: text("delivery_instructions"),
  specialRequirements: text("special_requirements"),
  optimizationId: text("optimization_id"), // Link to optimization result
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job materials (what materials are needed for each job)
export const jobMaterials = pgTable("job_materials", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  requiredLength: decimal("required_length", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  cutAngle: decimal("cut_angle", { precision: 5, scale: 2 }).default("90"),
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
});

// Cutting plans (optimization results)
export const cuttingPlans = pgTable("cutting_plans", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  stockLength: decimal("stock_length", { precision: 10, scale: 2 }).notNull(),
  cuts: jsonb("cuts").notNull(), // Array of cut lengths and positions
  wasteLength: decimal("waste_length", { precision: 10, scale: 2 }),
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }),
  estimatedCutTime: integer("estimated_cut_time_minutes"),
  algorithmUsed: text("algorithm_used"),
  isOptimized: boolean("is_optimized").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cut sequences (actual cutting operations)
export const cutSequences = pgTable("cut_sequences", {
  id: serial("id").primaryKey(),
  cuttingPlanId: integer("cutting_plan_id").references(() => cuttingPlans.id).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id).notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  cutLength: decimal("cut_length", { precision: 10, scale: 2 }).notNull(),
  cutAngle: decimal("cut_angle", { precision: 5, scale: 2 }).default("90"),
  actualLength: decimal("actual_length", { precision: 10, scale: 2 }),
  isCompleted: boolean("is_completed").default(false),
  cutTime: integer("cut_time_minutes"),
  operatorId: integer("operator_id").references(() => users.id),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  completedAt: timestamp("completed_at"),
});

// Remnants tracking
export const remnants = pgTable("remnants", {
  id: serial("id").primaryKey(),
  originalInventoryId: integer("original_inventory_id").references(() => inventory.id).notNull(),
  newInventoryId: integer("new_inventory_id").references(() => inventory.id).notNull(),
  originalLength: decimal("original_length", { precision: 10, scale: 2 }).notNull(),
  remnantLength: decimal("remnant_length", { precision: 10, scale: 2 }).notNull(),
  isLabeled: boolean("is_labeled").default(false),
  photoUploaded: boolean("photo_uploaded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Optimization simulations tracking
export const optimizationSimulations = pgTable("optimization_simulations", {
  id: serial("id").primaryKey(),
  simulationId: text("simulation_id").notNull().unique(),
  description: text("description"),
  optimizationData: text("optimization_data").notNull(), // JSON string of optimization result
  cutRequests: text("cut_requests").notNull(), // JSON string of cut requests
  stockItems: text("stock_items").notNull(), // JSON string of stock items
  summary: text("summary").notNull(), // JSON string of optimization summary
  isConverted: boolean("is_converted").default(false),
  convertedJobId: integer("converted_job_id").references(() => jobs.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// PDF Export Configuration table
export const pdfExportConfigs = pgTable("pdf_export_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  showCheckboxes: boolean("show_checkboxes").default(true),
  checkboxPosition: text("checkbox_position").default("right"), // "left" or "right"
  compactLayout: boolean("compact_layout").default(true),
  showMaterialSpecs: boolean("show_material_specs").default(true),
  showEfficiency: boolean("show_efficiency").default(true),
  showWaste: boolean("show_waste").default(true),
  showAngles: boolean("show_angles").default(true),
  fontSize: integer("font_size").default(10),
  lineSpacing: decimal("line_spacing", { precision: 3, scale: 1 }).default("1.2"),
  includeRemnants: boolean("include_remnants").default(true),
  headerStyle: text("header_style").default("colored"), // "colored" or "simple"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedJobs: many(jobs),
  cutSequences: many(cutSequences),
}));

export const materialCategoriesRelations = relations(materialCategories, ({ many }) => ({
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  category: one(materialCategories, {
    fields: [materials.categoryId],
    references: [materialCategories.id],
  }),
  inventory: many(inventory),
  jobMaterials: many(jobMaterials),
  cuttingPlans: many(cuttingPlans),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  material: one(materials, {
    fields: [inventory.materialId],
    references: [materials.id],
  }),
  parentInventory: one(inventory, {
    fields: [inventory.parentInventoryId],
    references: [inventory.id],
  }),
  childInventory: many(inventory),
  cutSequences: many(cutSequences),
  originalRemnants: many(remnants, { relationName: "originalInventory" }),
  newRemnants: many(remnants, { relationName: "newInventory" }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [jobs.assignedTo],
    references: [users.id],
  }),
  jobMaterials: many(jobMaterials),
  cuttingPlans: many(cuttingPlans),
}));

export const jobMaterialsRelations = relations(jobMaterials, ({ one }) => ({
  job: one(jobs, {
    fields: [jobMaterials.jobId],
    references: [jobs.id],
  }),
  material: one(materials, {
    fields: [jobMaterials.materialId],
    references: [materials.id],
  }),
}));

export const cuttingPlansRelations = relations(cuttingPlans, ({ one, many }) => ({
  job: one(jobs, {
    fields: [cuttingPlans.jobId],
    references: [jobs.id],
  }),
  material: one(materials, {
    fields: [cuttingPlans.materialId],
    references: [materials.id],
  }),
  cutSequences: many(cutSequences),
}));

export const cutSequencesRelations = relations(cutSequences, ({ one }) => ({
  cuttingPlan: one(cuttingPlans, {
    fields: [cutSequences.cuttingPlanId],
    references: [cuttingPlans.id],
  }),
  inventory: one(inventory, {
    fields: [cutSequences.inventoryId],
    references: [inventory.id],
  }),
  operator: one(users, {
    fields: [cutSequences.operatorId],
    references: [users.id],
  }),
}));

export const remnantsRelations = relations(remnants, ({ one }) => ({
  originalInventory: one(inventory, {
    fields: [remnants.originalInventoryId],
    references: [inventory.id],
    relationName: "originalInventory",
  }),
  newInventory: one(inventory, {
    fields: [remnants.newInventoryId],
    references: [inventory.id],
    relationName: "newInventory",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialCategorySchema = createInsertSchema(materialCategories).omit({
  id: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertJobMaterialSchema = createInsertSchema(jobMaterials).omit({
  id: true,
});

export const insertCuttingPlanSchema = createInsertSchema(cuttingPlans).omit({
  id: true,
  createdAt: true,
});

export const insertCutSequenceSchema = createInsertSchema(cutSequences).omit({
  id: true,
});

export const insertRemnantSchema = createInsertSchema(remnants).omit({
  id: true,
  createdAt: true,
});

export const insertOptimizationSimulationSchema = createInsertSchema(optimizationSimulations).omit({
  id: true,
  createdAt: true,
});

export const insertPdfExportConfigSchema = createInsertSchema(pdfExportConfigs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = z.infer<typeof insertMaterialCategorySchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobMaterial = typeof jobMaterials.$inferSelect;
export type InsertJobMaterial = z.infer<typeof insertJobMaterialSchema>;

export type CuttingPlan = typeof cuttingPlans.$inferSelect;
export type InsertCuttingPlan = z.infer<typeof insertCuttingPlanSchema>;

export type CutSequence = typeof cutSequences.$inferSelect;
export type InsertCutSequence = z.infer<typeof insertCutSequenceSchema>;

export type Remnant = typeof remnants.$inferSelect;
export type InsertRemnant = z.infer<typeof insertRemnantSchema>;

export type OptimizationSimulation = typeof optimizationSimulations.$inferSelect;
export type InsertOptimizationSimulation = z.infer<typeof insertOptimizationSimulationSchema>;

export type PdfExportConfig = typeof pdfExportConfigs.$inferSelect;
export type InsertPdfExportConfig = z.infer<typeof insertPdfExportConfigSchema>;
