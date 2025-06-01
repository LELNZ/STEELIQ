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
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 2 }), // m²/m for coating calculations
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
  status: text("status").notNull().default("quote"), // quote, client_confirmation, shop_drawings, materials_ordered, processing, fabrication, welding, finishing, coatings, delivery, site_works, variations, completed, on_hold, backcosting
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

// Coating Systems
export const coatingSystems = pgTable("coating_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coatingType: text("coating_type").notNull(), // galvanizing, paint, intumescent, etc.
  pricingMethod: text("pricing_method").notNull().default("per_sqm"), // per_sqm, per_kg, per_piece
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  coverageRate: decimal("coverage_rate", { precision: 10, scale: 2 }), // m²/L for paints
  applicationMethod: text("application_method"), // spray, brush, dip, roller
  preparationRequired: text("preparation_required"), // blast, grind, degrease - shown as tags
  dryingTime: integer("drying_time"), // minutes
  coatsRequired: integer("coats_required").default(1), // number of coats
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Estimates - STRUMIS-style estimation system
export const jobEstimates = pgTable("job_estimates", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  estimateNumber: text("estimate_number").notNull().unique(),
  version: integer("version").default(1),
  estimateType: text("estimate_type").notNull().default("initial"), // initial, variation, revised
  totalMaterialCost: decimal("total_material_cost", { precision: 12, scale: 2 }),
  totalLaborCost: decimal("total_labor_cost", { precision: 12, scale: 2 }),
  totalSubcontractorCost: decimal("total_subcontractor_cost", { precision: 12, scale: 2 }),
  totalOverheadCost: decimal("total_overhead_cost", { precision: 12, scale: 2 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }),
  totalEstimateValue: decimal("total_estimate_value", { precision: 12, scale: 2 }),
  retentionPercentage: decimal("retention_percentage", { precision: 5, scale: 2 }).default("5.0"),
  retentionAmount: decimal("retention_amount", { precision: 12, scale: 2 }),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  tonnage: decimal("tonnage", { precision: 10, scale: 3 }),
  costPerTonne: decimal("cost_per_tonne", { precision: 10, scale: 2 }),
  wasteFactorPercentage: decimal("waste_factor_percentage", { precision: 5, scale: 2 }).default("5.0"),
  estimatorId: integer("estimator_id").references(() => users.id),
  approvalStatus: text("approval_status").default("draft"), // draft, pending_approval, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Estimate Line Items - detailed breakdown following STRUMIS methodology
export const estimateLineItems = pgTable("estimate_line_items", {
  id: serial("id").primaryKey(),
  estimateId: integer("estimate_id").references(() => jobEstimates.id).notNull(),
  phase: text("phase"), // Foundation, Structure, Connections, etc.
  element: text("element"), // Beams, Columns, Bracing, Plates, etc.
  assembly: text("assembly"), // Frame Assembly, Connection Assembly, etc.
  materialId: integer("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }),
  unit: text("unit").notNull(), // m, kg, pcs, m², etc.
  unitMaterialCost: decimal("unit_material_cost", { precision: 10, scale: 2 }),
  totalMaterialCost: decimal("total_material_cost", { precision: 12, scale: 2 }),
  laborRate: text("labor_rate").default("workshop"), // workshop, site, subcontractor
  laborHoursPerUnit: decimal("labor_hours_per_unit", { precision: 8, scale: 3 }),
  totalLaborHours: decimal("total_labor_hours", { precision: 10, scale: 2 }),
  laborCostPerHour: decimal("labor_cost_per_hour", { precision: 8, scale: 2 }),
  totalLaborCost: decimal("total_labor_cost", { precision: 12, scale: 2 }),
  complexityFactor: decimal("complexity_factor", { precision: 3, scale: 2 }).default("1.0"),
  wasteAllowance: decimal("waste_allowance", { precision: 5, scale: 2 }),
  totalLineCost: decimal("total_line_cost", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Variations - change order management
export const jobVariations = pgTable("job_variations", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  variationNumber: text("variation_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  requestedBy: text("requested_by"), // client, engineer, site
  reason: text("reason"), // design_change, site_conditions, client_request
  costImpact: decimal("cost_impact", { precision: 12, scale: 2 }),
  timeImpact: integer("time_impact_days"),
  status: text("status").default("draft"), // draft, submitted, client_review, engineer_review, approved, rejected, implemented
  estimateId: integer("estimate_id").references(() => jobEstimates.id),
  submittedAt: timestamp("submitted_at"),
  clientApprovedAt: timestamp("client_approved_at"),
  engineerApprovedAt: timestamp("engineer_approved_at"),
  implementedAt: timestamp("implemented_at"),
  communications: text("communications"), // JSON array of communication records
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Retention Tracking - 5-10% retention management
export const retentions = pgTable("retentions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  totalJobValue: decimal("total_job_value", { precision: 12, scale: 2 }),
  retentionPercentage: decimal("retention_percentage", { precision: 5, scale: 2 }),
  retentionAmount: decimal("retention_amount", { precision: 12, scale: 2 }),
  retentionReleaseDate: timestamp("retention_release_date"),
  status: text("status").default("held"), // held, claimed, received, disputed
  claimSubmittedAt: timestamp("claim_submitted_at"),
  receivedAt: timestamp("received_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rate Cards - labor rates by operation type
export const rateCards = pgTable("rate_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rateType: text("rate_type").notNull(), // workshop, site, subcontractor
  operationType: text("operation_type").notNull(), // cutting, drilling, welding, grinding, fitting, painting, erection
  ratePerHour: decimal("rate_per_hour", { precision: 8, scale: 2 }),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  travelTimeRate: decimal("travel_time_rate", { precision: 8, scale: 2 }),
  riskPremium: decimal("risk_premium", { precision: 5, scale: 2 }), // percentage for high-risk work
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customer specific pricing agreements
export const customerRates = pgTable("customer_rates", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(), // Will reference customers table when created
  customerName: text("customer_name").notNull(),
  rateCardId: integer("rate_card_id").references(() => rateCards.id),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  markupPercentage: decimal("markup_percentage", { precision: 5, scale: 2 }),
  specialTerms: text("special_terms"),
  contractReference: text("contract_reference"),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Surface Area Configurations - for material-specific surface selections
export const surfaceAreaConfigs = pgTable("surface_area_configs", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  surfaceType: text("surface_type").notNull(), // external_top, external_bottom, external_left, external_right, internal_web, internal_flange
  includeInCalculation: boolean("include_in_calculation").default(true),
  areaMultiplier: decimal("area_multiplier", { precision: 5, scale: 3 }).default("1.0"), // adjustment factor
  selectionMethod: text("selection_method").default("checklist"), // checklist, 3d_interactive, percentage_override
  percentageOverride: decimal("percentage_override", { precision: 5, scale: 2 }), // for complex situations
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
  surfaceAreaConfigs: many(surfaceAreaConfigs),
}));

export const coatingSystemsRelations = relations(coatingSystems, ({ many }) => ({
  // Future: coating applications, job coatings, etc.
}));

export const surfaceAreaConfigsRelations = relations(surfaceAreaConfigs, ({ one }) => ({
  material: one(materials, {
    fields: [surfaceAreaConfigs.materialId],
    references: [materials.id],
  }),
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

export const insertCoatingSystemSchema = createInsertSchema(coatingSystems).omit({
  id: true,
  createdAt: true,
});

export const insertSurfaceAreaConfigSchema = createInsertSchema(surfaceAreaConfigs).omit({
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

export type CoatingSystem = typeof coatingSystems.$inferSelect;
export type InsertCoatingSystem = z.infer<typeof insertCoatingSystemSchema>;

export type SurfaceAreaConfig = typeof surfaceAreaConfigs.$inferSelect;
export type InsertSurfaceAreaConfig = z.infer<typeof insertSurfaceAreaConfigSchema>;
