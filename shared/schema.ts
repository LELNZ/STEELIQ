import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, varchar, numeric, date, index, bigint, bigserial, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with comprehensive permission system
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("basic"), // owner, operator, basic, planning, accounting, supervisor, admin, full
  permissions: jsonb("permissions"), // Detailed permissions object
  department: text("department"), // fabrication, office, management, etc.
  employeeId: text("employee_id"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  twoFactorSecret: text("two_factor_secret"), // Base32 encoded secret for TOTP
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: jsonb("two_factor_backup_codes"), // Array of backup codes
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"), // Account lockout
  sessionToken: text("session_token"), // Current session token
  profileImageUrl: text("profile_image_url"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Authentication sessions table
export const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"), // Browser/device details
  ipAddress: text("ip_address"),
  location: text("location"), // Geographic location
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email Cost Import System Tables

// Email accounts configuration for cost import
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // gmail, outlook, imap
  email: text("email").notNull().unique(),
  accessToken: text("access_token"), // Encrypted OAuth token
  refreshToken: text("refresh_token"), // Encrypted refresh token
  imapConfig: jsonb("imap_config"), // IMAP server details if needed
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email imported costs - costs extracted from emails
export const emailImportedCosts = pgTable("email_imported_costs", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id),
  emailId: text("email_id"), // Unique email identifier
  subject: text("subject"),
  sender: text("sender"),
  attachmentName: text("attachment_name"),
  supplierName: text("supplier_name"),
  invoiceNumber: text("invoice_number"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("NZD"),
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending"), // pending, matched, ignored, error
  jobId: integer("job_id").references(() => jobs.id),
  purchaseOrderId: integer("purchase_order_id"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  extractedData: jsonb("extracted_data"), // Full extracted data from OCR/parsing
  notes: text("notes"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Drawing Intelligence tables
export const drawingProjects = pgTable("drawing_projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // general, structural, assembly, detail, workshop
  standards: varchar("standards", { length: 50 }).default("AS/NZS"),
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const drawings = pgTable("drawings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => drawingProjects.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, analyzing, analyzed, error
  analysisResult: jsonb("analysis_result"),
  steelMembers: integer("steel_members").default(0),
  connections: integer("connections").default(0),
  totalWeight: decimal("total_weight", { precision: 10, scale: 2 }).default("0"),
  revisionNumber: varchar("revision_number", { length: 10 }),
  baseDrawingId: integer("base_drawing_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const drawingRevisions = pgTable("drawing_revisions", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => drawings.id).notNull(),
  baseRevisionId: integer("base_revision_id").references(() => drawings.id).notNull(),
  compareRevisionId: integer("compare_revision_id").references(() => drawings.id).notNull(),
  comparisonResult: jsonb("comparison_result"),
  changedMembers: integer("changed_members").default(0),
  changedConnections: integer("changed_connections").default(0),
  weightChange: decimal("weight_change", { precision: 10, scale: 2 }).default("0"),
  costImpact: decimal("cost_impact", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialTakeoffs = pgTable("material_takeoffs", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => drawings.id).notNull(),
  projectId: integer("project_id").references(() => drawingProjects.id).notNull(),
  mark: varchar("mark", { length: 50 }).notNull(),
  section: varchar("section", { length: 100 }).notNull(),
  grade: varchar("grade", { length: 50 }),
  length: integer("length").notNull(),
  quantity: integer("quantity").notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  drawingRef: varchar("drawing_ref", { length: 50 }),
  phase: varchar("phase", { length: 100 }),
  wastage: integer("wastage").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier invoice parsing templates
export const supplierTemplates = pgTable("supplier_templates", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierEmail: text("supplier_email"), // Email domain to match
  templateName: text("template_name").notNull(),
  parsingRules: jsonb("parsing_rules"), // AI training data and patterns
  fieldMappings: jsonb("field_mappings"), // Maps invoice fields to our system
  sampleInvoices: jsonb("sample_invoices"), // Sample data for training
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // Template accuracy percentage
  lastUsedAt: timestamp("last_used_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Imported cost records from emails
export const importedCosts = pgTable("imported_costs", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id),
  emailMessageId: text("email_message_id"), // Unique email ID
  emailSubject: text("email_subject"),
  emailDate: timestamp("email_date"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  supplierName: text("supplier_name"),
  invoiceNumber: text("invoice_number"),
  purchaseOrderNumber: text("purchase_order_number"),
  jobId: integer("job_id").references(() => jobs.id),
  jobNumber: text("job_number"), // For display/matching
  status: text("status").notNull().default("pending"), // pending, matched, reviewed, approved, rejected
  matchConfidence: decimal("match_confidence", { precision: 5, scale: 2 }), // AI confidence score
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }),
  currency: text("currency").default("NZD"),
  invoiceDate: date("invoice_date"),
  dueDate: date("due_date"),
  attachments: jsonb("attachments"), // File references
  extractedData: jsonb("extracted_data"), // Raw extracted data
  lineItems: jsonb("line_items"), // Detailed line items
  reviewNotes: text("review_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cost variance tracking
export const costVariances = pgTable("cost_variances", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  costCategory: text("cost_category").notNull(), // materials, labor, subcontractor, equipment, consumables
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  variance: decimal("variance", { precision: 10, scale: 2 }), // actual - estimated
  variancePercentage: decimal("variance_percentage", { precision: 5, scale: 2 }),
  notes: text("notes"),
  reportDate: date("report_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email sync logs
export const emailSyncLogs = pgTable("email_sync_logs", {
  id: serial("id").primaryKey(),
  emailAccountId: integer("email_account_id").references(() => emailAccounts.id),
  syncType: text("sync_type"), // manual, scheduled, webhook
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status"), // running, completed, failed
  messagesProcessed: integer("messages_processed").default(0),
  costsImported: integer("costs_imported").default(0),
  errors: jsonb("errors"),
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
  width1: decimal("width1", { precision: 10, scale: 2 }), // Width1/W1 for unequal angles (mm)
  width2: decimal("width2", { precision: 10, scale: 2 }), // Width2/W2 for unequal angles (mm)
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // Thickness (mm)
  diameter: decimal("diameter", { precision: 10, scale: 2 }), // Diameter (mm)
  depth: decimal("depth", { precision: 10, scale: 2 }), // Depth (mm)
  flangeTf: decimal("flange_tf", { precision: 10, scale: 2 }), // Flange TF (mm)
  webTw: decimal("web_tw", { precision: 10, scale: 2 }), // Web TW (mm)
  length: decimal("length", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }), // Weight (kg/m)
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }), // For consumables (per piece/can/bottle)
  lengthOptions: text("length_options"), // Length Options (m) - stored as text for multiple values
  grade: text("grade"),
  standard: text("standard"), // Standard (e.g., AS/NZS 1163)
  coating: text("coating"),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 2 }), // m²/m for coating calculations
  coatingConfig: jsonb("coating_config"), // Stores surface area calculation preferences
  coverageRate: decimal("coverage_rate", { precision: 10, scale: 3 }), // Coverage rate for coatings
  coverageUnit: text("coverage_unit"), // "kg_per_m2", "m2_per_kg", "L_per_m2", etc.
  // Coating system specific fields
  layersDft: text("layers_dft"), // Layers & DFT (µm)
  durabilityYears: text("durability_years"), // Durability (Years to 1st Major Maintenance)
  asNzsReference: text("as_nzs_reference"), // Reference Clause (AS/NZS 2312)
  applicationMethod: text("application_method"), // Application Method
  inHouseSubcontracted: text("in_house_subcontracted"), // In-house/Subcontracted
  fireRating: text("fire_rating"), // Fire Rating (if Intumescent)
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
  parentInventoryId: integer("parent_inventory_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced Projects with Three-Phase Estimation Workflow
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNumber: text("project_number").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  projectDescription: text("project_description"),
  
  // Three-Phase Workflow Status
  currentPhase: text("current_phase").notNull().default("initial_simulation"), // initial_simulation, professional_estimate, job_creation
  phaseStatus: text("phase_status").notNull().default("in_progress"), // in_progress, pending_review, approved, rejected
  
  // Phase 1: Initial Simulation
  initialSimulationData: jsonb("initial_simulation_data"),
  initialSimulationDate: timestamp("initial_simulation_date"),
  initialEstimatedValue: decimal("initial_estimated_value", { precision: 10, scale: 2 }),
  
  // Phase 2: Professional Estimate
  professionalEstimateData: jsonb("professional_estimate_data"),
  professionalEstimateDate: timestamp("professional_estimate_date"),
  professionalEstimatedValue: decimal("professional_estimated_value", { precision: 10, scale: 2 }),
  engineerApprovalRequired: boolean("engineer_approval_required").default(false),
  engineerApprovalStatus: text("engineer_approval_status"), // pending, approved, rejected
  engineerComments: text("engineer_comments"),
  
  // Phase 3: Job Creation
  jobCreationData: jsonb("job_creation_data"),
  jobCreationDate: timestamp("job_creation_date"),
  finalEstimatedValue: decimal("final_estimated_value", { precision: 10, scale: 2 }),
  
  // Standard Job Fields
  status: text("status").notNull().default("quote"),
  priority: text("priority").notNull().default("standard"),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  equipmentCost: decimal("equipment_cost", { precision: 10, scale: 2 }),
  consumablesCost: decimal("consumables_cost", { precision: 10, scale: 2 }),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }),
  estimatedTime: integer("estimated_time_minutes"),
  actualTime: integer("actual_time_minutes"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  createdBy: integer("created_by"),
  assignedEstimator: integer("assigned_estimator"),
  riskAssessmentData: jsonb("risk_assessment_data"),
  qualityChecklistData: jsonb("quality_checklist_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Multi-Drawing Batch Processing
export const drawingBatches = pgTable("drawing_batches", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  batchName: text("batch_name").notNull(),
  drawingType: text("drawing_type").notNull(), // structural_plan, elevation, section, shop_drawing, detailer_drawing, workshop_cutlist
  analysisStatus: text("analysis_status").notNull().default("pending"), // pending, processing, completed, failed
  totalDrawings: integer("total_drawings").notNull().default(0),
  processedDrawings: integer("processed_drawings").notNull().default(0),
  overallConfidence: decimal("overall_confidence", { precision: 5, scale: 2 }),
  analysisResults: jsonb("analysis_results"),
  qualityIssues: jsonb("quality_issues"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual Drawing Analysis (Enhanced Multi-Format Support)
export const enhancedDrawingAnalysis = pgTable("enhanced_drawing_analysis", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => drawingBatches.id).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  fileFormat: text("file_format"), // pdf, dwg, dxf
  drawingType: text("drawing_type").notNull(),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  elementsFound: integer("elements_found").default(0),
  analysisResults: jsonb("analysis_results"),
  extractedElements: jsonb("extracted_elements"),
  qualityIssues: jsonb("quality_issues"),
  userMarkups: jsonb("user_markups"), // User added/removed items
  revisionComparison: jsonb("revision_comparison"), // Changes from previous version
  processingTime: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Drawing Revisions and Comparison
export const enhancedDrawingRevisions = pgTable("enhanced_drawing_revisions", {
  id: serial("id").primaryKey(),
  originalDrawingId: integer("original_drawing_id").references(() => enhancedDrawingAnalysis.id).notNull(),
  revisionDrawingId: integer("revision_drawing_id").references(() => enhancedDrawingAnalysis.id).notNull(),
  revisionNumber: text("revision_number"),
  changesDetected: jsonb("changes_detected"),
  addedElements: jsonb("added_elements"),
  removedElements: jsonb("removed_elements"),
  modifiedElements: jsonb("modified_elements"),
  impactAssessment: jsonb("impact_assessment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced Material Take-off with AI Analysis
export const materialTakeoff = pgTable("material_takeoff", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  drawingAnalysisId: integer("drawing_analysis_id").references(() => enhancedDrawingAnalysis.id),
  partMark: text("part_mark").notNull(),
  elementType: text("element_type").notNull(), // beam, column, purlin, brace, connection, base_plate, stiffener
  materialCode: text("material_code").notNull(),
  materialId: integer("material_id").references(() => materials.id),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  weight: decimal("weight", { precision: 10, scale: 3 }),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 2 }),
  coordinates: jsonb("coordinates"), // Drawing coordinates
  dimensions: jsonb("dimensions"),
  connections: jsonb("connections"),
  weldDetails: jsonb("weld_details"),
  isUserAdded: boolean("is_user_added").default(false),
  isUserRemoved: boolean("is_user_removed").default(false),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Crane Lift Planning with H&S Integration
export const craneLiftPlans = pgTable("crane_lift_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  liftSequence: integer("lift_sequence").notNull(),
  elementsToBeLift: jsonb("elements_to_be_lift"),
  craneType: text("crane_type").notNull(), // mobile, tower, overhead
  craneCapacity: decimal("crane_capacity", { precision: 10, scale: 2 }), // tonnes
  liftWeight: decimal("lift_weight", { precision: 10, scale: 2 }), // tonnes
  liftRadius: decimal("lift_radius", { precision: 10, scale: 2 }), // metres
  liftHeight: decimal("lift_height", { precision: 10, scale: 2 }), // metres
  cranePosition: jsonb("crane_position"), // coordinates
  riggerRequirements: jsonb("rigger_requirements"),
  safetyRequirements: jsonb("safety_requirements"),
  hsTemplateUsed: text("hs_template_used"),
  riskAssessment: jsonb("risk_assessment"),
  weatherConstraints: jsonb("weather_constraints"),
  estimatedDuration: integer("estimated_duration_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// WPS (Welding Procedure Specifications) Database
export const weldingProcedures = pgTable("welding_procedures", {
  id: serial("id").primaryKey(),
  wpsNumber: text("wps_number").notNull().unique(),
  title: text("title").notNull(),
  baseMaterial: text("base_material"),
  fillerMaterial: text("filler_material"),
  weldingProcess: text("welding_process"), // GMAW, SMAW, FCAW, SAW
  jointType: text("joint_type"), // butt, fillet, corner, edge
  weldingPosition: text("welding_position"), // flat, horizontal, vertical, overhead
  preheatingRequired: boolean("preheating_required").default(false),
  preheatingTemp: decimal("preheating_temp", { precision: 5, scale: 1 }),
  interpassTemp: decimal("interpass_temp", { precision: 5, scale: 1 }),
  postWeldHeatTreatment: boolean("post_weld_heat_treatment").default(false),
  qualificationStatus: text("qualification_status").notNull().default("active"), // active, expired, pending
  qualificationDate: date("qualification_date"),
  expiryDate: date("expiry_date"),
  approvedBy: text("approved_by"),
  procedureDocument: text("procedure_document"), // File path or URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// WPS Alerts and Notifications
export const wpsAlerts = pgTable("wps_alerts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  wpsId: integer("wps_id").references(() => weldingProcedures.id),
  alertType: text("alert_type").notNull(), // new_wps_required, wps_expiring, wps_expired
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("open"), // open, acknowledged, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Operations Standards Tables

// Welding Standards
export const weldingStandards = pgTable("welding_standards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  weld_type: varchar("weld_type", { length: 50 }).notNull(), // fillet, butt_single_v, butt_double_v, seal, plug
  size: decimal("size", { precision: 10, scale: 2 }), // in mm
  time_per_meter: decimal("time_per_meter", { precision: 10, scale: 2 }).notNull(), // minutes per meter
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Drilling Standards
export const drillingStandards = pgTable("drilling_standards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  method: varchar("method", { length: 50 }).notNull(), // mag_drill, hand_drill, laser, plasma, punch
  diameter_min: decimal("diameter_min", { precision: 10, scale: 2 }), // mm
  diameter_max: decimal("diameter_max", { precision: 10, scale: 2 }), // mm
  time_per_hole: decimal("time_per_hole", { precision: 10, scale: 2 }).notNull(), // minutes
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Cutting Standards
export const cuttingStandards = pgTable("cutting_standards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  material_type: varchar("material_type", { length: 50 }).notNull(), // mild_steel, stainless, aluminum, high_tensile
  thickness_min: decimal("thickness_min", { precision: 10, scale: 2 }), // mm
  thickness_max: decimal("thickness_max", { precision: 10, scale: 2 }), // mm
  time_per_meter: decimal("time_per_meter", { precision: 10, scale: 2 }).notNull(), // minutes
  equipment: varchar("equipment", { length: 100 }), // bandsaw, plasma, laser, oxy
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Edge Preparations Standards
export const edgePreparations = pgTable("edge_preparations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  preparation_type: varchar("preparation_type", { length: 50 }).notNull(), // bevel, chamfer, square, j_groove, v_groove, u_groove
  angle_degrees: decimal("angle_degrees", { precision: 5, scale: 2 }), // e.g., 30, 45, 60
  root_gap_mm: decimal("root_gap_mm", { precision: 10, scale: 2 }), // gap at root of weld prep
  land_thickness_mm: decimal("land_thickness_mm", { precision: 10, scale: 2 }), // flat part at root
  radius_mm: decimal("radius_mm", { precision: 10, scale: 2 }), // for u_groove
  applicable_thickness_min: decimal("applicable_thickness_min", { precision: 10, scale: 2 }), // mm
  applicable_thickness_max: decimal("applicable_thickness_max", { precision: 10, scale: 2 }), // mm
  time_per_meter: decimal("time_per_meter", { precision: 10, scale: 2 }).notNull(), // minutes
  equipment: varchar("equipment", { length: 100 }), // flame_cut, plasma_bevel, machining, grinding
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

export const insertEdgePreparationSchema = createInsertSchema(edgePreparations).omit({
  id: true,
  created_at: true,
  updated_at: true
});
export type InsertEdgePreparation = z.infer<typeof insertEdgePreparationSchema>;
export type EdgePreparation = typeof edgePreparations.$inferSelect;

// Position Factors
export const positionFactors = pgTable("position_factors", {
  id: serial("id").primaryKey(),
  position: varchar("position", { length: 50 }).notNull().unique(), // flat, horizontal, vertical, overhead
  factor: decimal("factor", { precision: 4, scale: 2 }).notNull(), // multiplier e.g., 1.0, 1.2, 1.5, 2.0
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Blasting Standards - Industry best practice fields
export const blastingStandards = pgTable("blasting_standards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  surface_profile: varchar("surface_profile", { length: 20 }).notNull(), // Sa1, Sa2, Sa2.5, Sa3 (ISO 8501-1)
  grit_type: varchar("grit_type", { length: 50 }).notNull(), // steel_shot, aluminum_oxide, garnet, glass_bead
  grit_size: varchar("grit_size", { length: 50 }), // 0.5-2.5mm ranges
  pressure_psi_min: integer("pressure_psi_min"), // 60-120 typical
  pressure_psi_max: integer("pressure_psi_max"),
  coverage_rate_m2_per_hour: decimal("coverage_rate_m2_per_hour", { precision: 10, scale: 2 }).notNull(),
  consumption_kg_per_m2: decimal("consumption_kg_per_m2", { precision: 10, scale: 2 }).notNull(),
  labor_hours_per_m2: decimal("labor_hours_per_m2", { precision: 10, scale: 4 }).notNull(),
  dust_collection_required: boolean("dust_collection_required").default(true),
  surface_cleanliness: varchar("surface_cleanliness", { length: 50 }), // commercial, near_white, white_metal
  preparation_type: varchar("preparation_type", { length: 50 }), // blast, wire_brush, wipe_down
  equipment: varchar("equipment", { length: 100 }), // blast_pot, wire_brush_mechanical, manual
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Assembly Templates
export const assemblyTemplates = pgTable("assembly_templates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g., COL-A1
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  main_material: varchar("main_material", { length: 100 }), // e.g., 250UC89.5
  components: jsonb("components"), // Array of component details
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Labor Defaults
export const laborDefaults = pgTable("labor_defaults", {
  id: serial("id").primaryKey(),
  operation_type: varchar("operation_type", { length: 100 }).notNull().unique(),
  default_allocation: varchar("default_allocation", { length: 50 }).notNull(), // workshop, onsite, subcontractor
  site_premium_percentage: decimal("site_premium_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  description: text("description"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull()
});

// Skill Levels
export const skillLevels = pgTable("skill_levels", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  requiredExperience: integer("required_experience").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Master Labor Rates
export const laborRates = pgTable("labor_rates", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id),
  skillLevelId: integer("skill_level_id").references(() => skillLevels.id),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 4, scale: 2 }).default("1.5"),
  doubleTimeMultiplier: decimal("double_time_multiplier", { precision: 4, scale: 2 }).default("2.0"),
  siteAllowanceRate: decimal("site_allowance_rate", { precision: 10, scale: 2 }).default("0"),
  siteAllowanceType: varchar("site_allowance_type", { length: 20 }).default("fixed"), // fixed or percentage
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Labor Rate History
export const laborRateHistory = pgTable("labor_rate_history", {
  id: serial("id").primaryKey(),
  rateId: integer("rate_id").references(() => laborRates.id),
  previousRate: decimal("previous_rate", { precision: 10, scale: 2 }),
  newRate: decimal("new_rate", { precision: 10, scale: 2 }).notNull(),
  changeReason: text("change_reason"),
  changedBy: integer("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow()
});

// Project Labor Rate Overrides
export const projectLaborRates = pgTable("project_labor_rates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  roleId: integer("role_id").references(() => roles.id),
  skillLevelId: integer("skill_level_id").references(() => skillLevels.id),
  customRate: decimal("custom_rate", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Labor Allowances
export const laborAllowances = pgTable("labor_allowances", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  description: text("description"), // Add description field
  type: varchar("type", { length: 20 }).notNull(), // percentage, fixed, multiplier
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  conditions: jsonb("conditions"), // e.g., {"minHours": 4, "locations": ["remote"], "weather": ["rain"]}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  allowanceType: varchar("allowance_type", { length: 20 }), // New field for frontend compatibility
  amount: decimal("amount", { precision: 10, scale: 2 }) // New field for frontend compatibility
});

// Role-Allowance Mappings
export const roleAllowances = pgTable("role_allowances", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id),
  allowanceId: integer("allowance_id").references(() => laborAllowances.id),
  isMandatory: boolean("is_mandatory").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Connection Components Library (Master reference for standard connection components)
export const connectionComponents = pgTable("connection_components", {
  id: serial("id").primaryKey(),
  component_type: varchar("component_type", { length: 50 }).notNull(), // end_plate, stiffener_plate, base_plate, cleat, etc.
  section_compatibility: varchar("section_compatibility", { length: 100 }).notNull(), // 50PFC, 65PFC, 80PFC, ALL, CUSTOM
  name: varchar("name", { length: 200 }).notNull(), // Descriptive name
  
  // Physical dimensions
  height: decimal("height", { precision: 10, scale: 2 }), // mm
  width: decimal("width", { precision: 10, scale: 2 }), // mm  
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // mm
  holes: integer("holes").default(0), // Number of holes (for end plates, base plates, cleats)
  
  // Labor and processing
  weld_time_per_hour: decimal("weld_time_per_hour", { precision: 10, scale: 4 }), // from Excel data
  labor_time: decimal("labor_time", { precision: 10, scale: 2 }), // total labor time in minutes
  
  // Material properties
  material_grade: varchar("material_grade", { length: 50 }).default("250"), // Steel grade
  weight: decimal("weight", { precision: 10, scale: 3 }), // kg
  surface_area: decimal("surface_area", { precision: 10, scale: 3 }), // m²
  
  // Cost information
  material_cost: decimal("material_cost", { precision: 10, scale: 2 }), // cost per unit
  unit: varchar("unit", { length: 20 }).notNull().default("each"), // each, kg, m²
  
  // Template and categorization
  category: varchar("category", { length: 50 }).notNull(), // connections, fabrication, hardware
  subcategory: varchar("subcategory", { length: 50 }), // structural, architectural, miscellaneous
  
  // Standards and specifications
  standard: varchar("standard", { length: 100 }), // AS/NZS, AWS, etc.
  specification: text("specification"), // Additional technical specifications
  
  // Usage and availability
  is_standard: boolean("is_standard").default(true), // true for standard components, false for custom
  is_active: boolean("is_active").default(true),
  usage_frequency: integer("usage_frequency").default(0), // track how often this component is used
  
  // Metadata
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by: integer("created_by").references(() => users.id)
});

// Unified Operation Items - Central hub for all fabrication operations
export const operationItems = pgTable("operation_items", {
  id: serial("id").primaryKey(),
  estimationId: integer("estimation_id").references(() => estimationProjects.id).notNull(),
  parentMaterialId: varchar("parent_material_id", { length: 100 }), // Link to parent material
  
  // Core operation classification
  category: varchar("category", { length: 50 }).notNull(), // fabrication, connection, assembly, surface, handling
  type: varchar("type", { length: 50 }).notNull(), // cutting, drilling, welding, grinding, blasting, painting, stiffener, endplate, etc
  description: text("description").notNull(),
  
  // Quantities and measurements
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unit: varchar("unit", { length: 20 }).notNull().default("each"), // each, m, kg, m², hours
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0"),
  
  // Physical dimensions (when applicable)
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // mm
  size: varchar("size", { length: 100 }), // Size description
  length: decimal("length", { precision: 10, scale: 2 }), // mm or meters
  width: decimal("width", { precision: 10, scale: 2 }), // mm
  diameter: decimal("diameter", { precision: 10, scale: 2 }), // mm for holes
  area: decimal("area", { precision: 10, scale: 2 }), // m² for surface treatment
  
  // Labor allocation
  laborHours: decimal("labor_hours", { precision: 10, scale: 2 }).default("0"),
  laborLocation: varchar("labor_location", { length: 50 }).default("workshop"), // workshop, site, both
  skillLevel: varchar("skill_level", { length: 50 }).default("standard"), // apprentice, standard, senior, specialist
  weldTime: decimal("weld_time", { precision: 10, scale: 2 }), // minutes from library component
  
  // Consumables data
  consumablesData: jsonb("consumables_data"), // Array of consumables required
  
  // Coatings data
  coatingData: jsonb("coating_data"), // Coating specifications and requirements
  
  // Source tracking
  sourceType: varchar("source_type", { length: 50 }).default("manual"), // manual, library, standard
  sourceId: integer("source_id"), // ID from library/standards
  libraryComponentId: integer("library_component_id").references(() => connectionComponents.id),
  
  // Processing details
  method: varchar("method", { length: 100 }), // plasma, saw, laser, mag_drill, etc
  position: varchar("position", { length: 50 }), // flat, vertical, overhead, etc
  
  // Routing flags
  includeInLabor: boolean("include_in_labor").default(true),
  includeInMaterials: boolean("include_in_materials").default(false),
  includeInConsumables: boolean("include_in_consumables").default(false),
  includeInCoatings: boolean("include_in_coatings").default(false),
  
  // Metadata
  notes: text("notes"),
  sequence: integer("sequence"), // Order of operations
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id)
});

// Material Sub Items
export const materialSubItems = pgTable("material_sub_items", {
  id: serial("id").primaryKey(),
  material_id: integer("material_id").notNull(), // Parent material in estimation
  estimation_id: integer("estimation_id").references(() => estimationProjects.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // stiffener, end_plate, base_plate, cleat, holes, bolts, welding
  name: varchar("name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // each, meters, kg
  unit_cost: decimal("unit_cost", { precision: 10, scale: 2 }),
  total_cost: decimal("total_cost", { precision: 10, scale: 2 }),
  
  // Link to connection components library
  connection_component_id: integer("connection_component_id").references(() => connectionComponents.id), // Reference to standard component
  
  // Labor allocation
  labor_allocation: varchar("labor_allocation", { length: 50 }).notNull().default("workshop"), // workshop, onsite, subcontractor
  labor_hours: decimal("labor_hours", { precision: 10, scale: 2 }),
  
  // Technical details
  material_spec: varchar("material_spec", { length: 100 }), // e.g., FL100x10
  dimensions: jsonb("dimensions"), // { length: 100, width: 50, thickness: 10 }
  weight: decimal("weight", { precision: 10, scale: 3 }), // kg
  
  // Operations
  welding_length: decimal("welding_length", { precision: 10, scale: 2 }), // mm
  welding_type: varchar("welding_type", { length: 50 }), // fillet, butt, etc.
  holes_diameter: decimal("holes_diameter", { precision: 10, scale: 2 }), // mm
  holes_count: integer("holes_count"),
  
  // Processing
  processing_time: decimal("processing_time", { precision: 10, scale: 2 }), // total time in minutes
  
  // Metadata
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  created_by: integer("created_by")
});

// Legacy Jobs table for compatibility
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  projectDescription: text("project_description"),
  status: text("status").notNull().default("quote"),
  priority: text("priority").notNull().default("standard"),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }),
  completedDate: timestamp("completed_date"),
  assignedTo: integer("assigned_to").references(() => users.id),
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }),
  isRushOrder: boolean("is_rush_order").default(false),
  rushPremium: decimal("rush_premium", { precision: 5, scale: 2 }),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }), // Added for production tracking
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  deliveryInstructions: text("delivery_instructions"),
  specialRequirements: text("special_requirements"),
  optimizationId: text("optimization_id"), // Link to optimization result
  estimationId: integer("estimation_id"), // Link to estimation project
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
  originalMaterialId: integer("original_material_id").references(() => materials.id),
  materialCode: varchar("material_code", { length: 50 }).notNull(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 3 }),
  location: varchar("location", { length: 100 }),
  rackNumber: varchar("rack_number", { length: 50 }),
  binNumber: varchar("bin_number", { length: 50 }),
  millCertNumber: varchar("mill_cert_number", { length: 100 }),
  heatNumber: varchar("heat_number", { length: 100 }),
  parentJobId: integer("parent_job_id").references(() => jobs.id),
  parentJobNumber: varchar("parent_job_number", { length: 50 }),
  createdDate: timestamp("created_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  status: varchar("status", { length: 20 }).default("available"),
  qrCode: varchar("qr_code", { length: 255 }).unique(),
  barcode: varchar("barcode", { length: 255 }).unique(),
  costPerKg: decimal("cost_per_kg", { precision: 10, scale: 2 }),
  originalValue: decimal("original_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  reuseCount: integer("reuse_count").default(0),
  reservedForJobId: integer("reserved_for_job_id").references(() => jobs.id),
  consumedDate: timestamp("consumed_date"),
  notes: text("notes"),
  photoUrl: varchar("photo_url", { length: 500 }),
  colorCode: varchar("color_code", { length: 7 }),
  materialGrade: varchar("material_grade", { length: 50 }),
  surfaceFinish: varchar("surface_finish", { length: 50 }),
  complianceStandards: text("compliance_standards").array().default(sql`'{}'::text[]`),
  isPrimeMaterial: boolean("is_prime_material").default(false),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  // Legacy fields
  originalInventoryId: integer("original_inventory_id").references(() => inventory.id),
  newInventoryId: integer("new_inventory_id").references(() => inventory.id),
  originalLength: decimal("original_length", { precision: 10, scale: 2 }),
  remnantLength: decimal("remnant_length", { precision: 10, scale: 2 }),
  isLabeled: boolean("is_labeled").default(false),
  photoUploaded: boolean("photo_uploaded").default(false)
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

// Clients - customer/client management with professional requirements
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Primary company/client name
  company: text("company"), // Company name (optional like supplier)
  type: text("type").notNull().default("client"), // client, prospect, main_contractor, etc.
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country").default("New Zealand"),
  nzbn: text("nzbn"), // New Zealand Business Number
  gstNumber: text("gst_number"),
  companyNumber: text("company_number"), // NZ company registration number
  website: text("website"),
  phone: text("phone"), // Primary phone number
  email: text("email"), // Primary email address
  contactName: text("contact_name"), // Primary contact person name
  industry: text("industry"),
  customerSince: timestamp("customer_since"),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  paymentTerms: text("payment_terms").default("30 days"),
  discountRate: text("discount_rate").default("0"), // Changed to text for consistency
  projectManager: text("project_manager"), // Assigned project manager
  accountManager: text("account_manager"), // Account manager (matching supplier)
  billingSchedule: text("billing_schedule"), // Monthly, Per Project, etc.
  deliveryInstructions: text("delivery_instructions"),
  specialRequirements: text("special_requirements"),
  // Adding comprehensive supplier-matching fields
  leadTimeStandard: integer("lead_time_standard").default(7), // days
  leadTimeExpress: integer("lead_time_express").default(3), // days
  minimumOrderQuantity: decimal("minimum_order_quantity", { precision: 10, scale: 2 }).default("0"),
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }).default("0"),
  deliveryAreas: text("delivery_areas"), // Service areas
  certifications: text("certifications"), // Client certifications/requirements
  standardsCompliance: text("standards_compliance"), // Standards they require
  isActive: boolean("is_active").default(true),
  isPreferredClient: boolean("is_preferred_client").default(false),
  preferredCurrency: text("preferred_currency").default("NZD"),
  notes: text("notes"),
  internalReference: text("internal_reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client Contacts - multiple contacts per client
export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  department: text("department"),
  email: text("email"),
  mobile: text("mobile"),
  workPhone: text("work_phone"),
  directPhone: text("direct_phone"),
  isPrimary: boolean("is_primary").default(false),
  canPlaceOrders: boolean("can_place_orders").default(false),
  canReceiveInvoices: boolean("can_receive_invoices").default(false),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Suppliers - professional supplier management with NZ requirements
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Primary company/supplier name
  company: text("company"), // Legal company name (optional)
  type: text("type").notNull().default("supplier"), // supplier, vendor, client, user
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country").default("New Zealand"),
  nzbn: text("nzbn"), // New Zealand Business Number
  gstNumber: text("gst_number"), // GST registration number
  companyNumber: text("company_number"), // NZ company registration number
  website: text("website"), // Company website
  phone: text("phone"), // Primary phone number
  email: text("email"), // Primary email address
  contactName: text("contact_name"), // Primary contact person name
  industry: text("industry"), // Industry sector
  paymentTerms: text("payment_terms").default("30 days"), // 30 days, 7 days, COD, etc.
  accountManager: text("account_manager"),
  leadTimeStandard: integer("lead_time_standard").default(7), // days
  leadTimeExpress: integer("lead_time_express").default(3), // days (renamed from leadTimeRush)
  minimumOrderQuantity: decimal("minimum_order_quantity", { precision: 10, scale: 2 }).default("0"),
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }).default("0"),
  deliveryAreas: text("delivery_areas"), // JSON array or comma-separated
  certifications: text("certifications"), // ISO, AS/NZS standards
  standardsCompliance: text("standards_compliance"), // Additional standards compliance
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }), // 1-5 rating
  reliabilityRating: decimal("reliability_rating", { precision: 3, scale: 2 }), // 1-5 rating
  isPreferredSupplier: boolean("is_preferred_supplier").default(false), // Preferred supplier status
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Location Management - multiple locations per supplier/client
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'supplier' or 'client'
  entityId: integer("entity_id").notNull(), // supplier_id or client_id
  locationType: text("location_type").default("primary"), // primary, warehouse, office, billing
  locationName: text("location_name"), // Optional name for the location
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  stateProvince: text("state_province"),
  postalCode: text("postal_code"),
  country: text("country").default("New Zealand"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  isPrimary: boolean("is_primary").default(false),
  isBillingAddress: boolean("is_billing_address").default(false),
  isShippingAddress: boolean("is_shipping_address").default(false),
  notes: text("notes"),
  googlePlaceId: text("google_place_id"),
  formattedAddress: text("formatted_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supplier Contacts - multiple contacts per supplier
export const supplierContacts = pgTable("supplier_contacts", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position"), // Sales Manager, Account Manager, etc.
  department: text("department"), // Sales, Accounts, Technical, etc.
  email: text("email"),
  phonePrimary: text("phone_primary"),
  phoneMobile: text("phone_mobile"),
  phoneDirect: text("phone_direct"),
  isPrimaryContact: boolean("is_primary_contact").default(false),
  isAccountsContact: boolean("is_accounts_contact").default(false),
  isTechnicalContact: boolean("is_technical_contact").default(false),
  isSalesContact: boolean("is_sales_contact").default(false),
  preferredContactMethod: text("preferred_contact_method").default("email"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Material Suppliers - linking materials to suppliers with pricing and history
export const materialSuppliers = pgTable("material_suppliers", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  isPrimary: boolean("is_primary").default(false), // favorite/primary supplier
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  currency: text("currency").default("NZD"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  leadTime: integer("lead_time"), // days override for this material
  minimumQuantity: decimal("minimum_quantity", { precision: 10, scale: 2 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supplier Price History - historical tracking for all price changes
export const supplierPriceHistory = pgTable("supplier_price_history", {
  id: serial("id").primaryKey(),
  materialSupplierId: integer("material_supplier_id").references(() => materialSuppliers.id).notNull(),
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  currency: text("currency").default("AUD"),
  effectiveDate: timestamp("effective_date").defaultNow().notNull(),
  priceChangeReason: text("price_change_reason"), // market_change, volume_discount, promotion, etc.
  enteredBy: integer("entered_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Purchase Orders - comprehensive PO management
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id), // Keep optional for now to avoid breaking existing data
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id), // Link to original requisition
  rfqId: integer("rfq_id").references(() => rfqRequests.id), // Link to RFQ
  rfqResponseId: integer("rfq_response_id").references(() => rfqResponses.id), // Link to winning quote
  status: text("status").notNull().default("draft"), // draft, sent, acknowledged, partial, completed, cancelled
  orderDate: timestamp("order_date").defaultNow().notNull(),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  confirmedDeliveryDate: timestamp("confirmed_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("NZD"),
  deliveryAddress: text("delivery_address"),
  specialInstructions: text("special_instructions"),
  paymentTerms: text("payment_terms"),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  // Archive tracking
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Purchase Order Items - line items for POs
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  materialId: integer("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  unitOfMeasure: text("unit_of_measure").default("meter"), // m, kg, each, etc.
  deliveryDate: timestamp("delivery_date"),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("ordered"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }),
})

// PO Document Configuration - stores template and granular options per PO
export const poDocumentConfig = pgTable("po_document_config", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id")
    .references(() => purchaseOrders.id)
    .notNull()
    .unique(), // One config per PO
  templateCode: text("template_code").notNull(), // e.g., 'PO_STANDARD', 'PO_DETAILED', 'PO_SIMPLE'
  granularOptions: jsonb("granular_options").notNull(), // JSON object with all granular control settings
  status: text("status").default("active"), // active, locked (after sending)
  lockedAt: timestamp("locked_at"), // When config was locked
  lockedBy: integer("locked_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Company Divisions - for multi-division branding
export const companyDivisions = pgTable("company_divisions", {
  id: serial("id").primaryKey(),
  divisionName: text("division_name").notNull(),
  divisionCode: text("division_code").unique().notNull(),
  companyName: text("company_name").notNull(),
  tradingName: text("trading_name"),
  
  // Address Details
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default("New Zealand"),
  
  // Contact Details
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  
  // Legal Details
  businessNumber: text("business_number"),
  gstNumber: text("gst_number"),
  
  // Branding
  logoPath: text("logo_path"),
  letterheadPath: text("letterhead_path"),
  brandColor: text("brand_color"),
  
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Purchase Order Templates - for customized PO formats
export const poTemplates = pgTable("po_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateCode: text("template_code").unique().notNull(),
  divisionId: integer("division_id").references(() => companyDivisions.id),
  supplierId: integer("supplier_id").references(() => suppliers.id), // supplier-specific template
  category: text("category"), // materials, services, equipment
  region: text("region"), // for regional T&Cs
  
  // Layout Configuration
  headerConfig: jsonb("header_config"), // logo position, company details display
  columnsConfig: jsonb("columns_config"), // which columns to show/hide
  footerConfig: jsonb("footer_config"), // signatures, terms position
  
  // Content Settings
  showLogo: boolean("show_logo").default(true),
  showPrices: boolean("show_prices").default(true),
  showDeliveryDate: boolean("show_delivery_date").default(true),
  showPaymentTerms: boolean("show_payment_terms").default(true),
  showGst: boolean("show_gst").default(true),
  showItemCodes: boolean("show_item_codes").default(true),
  showContactDetails: boolean("show_contact_details").default(true),
  
  // Terms & Conditions
  termsAndConditions: text("terms_and_conditions"),
  specialInstructions: text("special_instructions"),
  
  // Branding
  primaryColor: text("primary_color").default("#1e3a8a"),
  secondaryColor: text("secondary_color").default("#0369a1"),
  fontFamily: text("font_family").default("Arial"),
  
  // QR Code Settings
  enableQrCode: boolean("enable_qr_code").default(false),
  qrCodeContent: text("qr_code_content"), // URL or tracking info
  
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// PO Status Change Log - audit trail for all status changes
export const poStatusLog = pgTable("po_status_log", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  
  // Status Change Details
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changeReason: text("change_reason"),
  changeNotes: text("change_notes"),
  
  // User Info
  changedBy: integer("changed_by").references(() => users.id).notNull(),
  changedByName: text("changed_by_name"),
  changedByRole: text("changed_by_role"),
  
  // Additional Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source"), // 'manual', 'system', 'api', 'email'
  
  createdAt: timestamp("created_at").defaultNow(),
})

// PO Distribution Tracking - track PO sending and acknowledgments
export const poDistribution = pgTable("po_distribution", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  templateId: integer("template_id").references(() => poTemplates.id),
  
  // Distribution Details
  sentAt: timestamp("sent_at"),
  sentBy: integer("sent_by").references(() => users.id),
  sentTo: text("sent_to").array(), // array of email addresses
  ccEmails: text("cc_emails").array(),
  bccEmails: text("bcc_emails").array(),
  
  // Delivery Method
  deliveryMethod: text("delivery_method").notNull(), // email, portal, edi, fax
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  
  // File Formats
  pdfPath: text("pdf_path"),
  excelPath: text("excel_path"),
  csvPath: text("csv_path"),
  
  // Tracking
  emailStatus: text("email_status"), // sent, delivered, opened, bounced
  openedAt: timestamp("opened_at"),
  downloadedAt: timestamp("downloaded_at"),
  
  // Acknowledgment
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgmentMethod: text("acknowledgment_method"), // email, portal, manual
  acknowledgmentNotes: text("acknowledgment_notes"),
  
  // E-Signature
  requiresSignature: boolean("requires_signature").default(false),
  signatureStatus: text("signature_status"), // pending, signed, declined
  signedAt: timestamp("signed_at"),
  signedBy: text("signed_by"),
  signatureIp: text("signature_ip"),
  signatureDocumentId: text("signature_document_id"), // DocuSign/Adobe ID
  
  // Reminders
  remindersSent: integer("reminders_sent").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  nextReminderAt: timestamp("next_reminder_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// PO Email Log - detailed email tracking
export const poEmailLog = pgTable("po_email_log", {
  id: serial("id").primaryKey(),
  distributionId: integer("distribution_id").references(() => poDistribution.id).notNull(),
  
  // Email Details
  messageId: text("message_id"), // Email service message ID
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type"), // to, cc, bcc
  
  // Status Tracking
  status: text("status").notNull(), // queued, sent, delivered, opened, clicked, bounced, failed
  statusDetails: text("status_details"),
  
  // Timestamps
  queuedAt: timestamp("queued_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  failedAt: timestamp("failed_at"),
  
  // Tracking Details
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Error Handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
})

// Invoices - supplier invoices and client invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").notNull(), // purchase (from supplier), sales (to client)
  supplierId: integer("supplier_id").references(() => suppliers.id),
  jobId: integer("job_id").references(() => jobs.id),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  status: text("status").notNull().default("draft"), // draft, sent, overdue, paid, cancelled
  invoiceDate: timestamp("invoice_date").defaultNow().notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("NZD"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Quotes - customer quotes and supplier quotes
// NOTE: quotes table has been moved to end of file with estimation-specific quotes
// Old quotes table removed to avoid duplicate declaration

// Payment Records - track all payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentNumber: text("payment_number").notNull().unique(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // bank_transfer, cheque, credit_card, cash
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  referenceNumber: text("reference_number"),
  bankReference: text("bank_reference"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Contact Performance Metrics
export const contactPerformance = pgTable("contact_performance", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  period: text("period").notNull(), // monthly, quarterly, yearly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalOrders: integer("total_orders").default(0),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).default("0"),
  onTimeDeliveries: integer("on_time_deliveries").default(0),
  qualityIssues: integer("quality_issues").default(0),
  averageDeliveryTime: decimal("average_delivery_time", { precision: 5, scale: 2 }), // days
  performanceScore: decimal("performance_score", { precision: 3, scale: 2 }), // 1-5 rating
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Document Management
export const contactDocuments = pgTable("contact_documents", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  documentType: text("document_type").notNull(), // contract, certification, insurance, tax_invoice, delivery_note
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  description: text("description"),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(true),
  uploadedBy: integer("uploaded_by").references(() => users.id),
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

// Saved Filters - user-defined filter presets
export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  filterType: text("filter_type").notNull(), // "consumables", "steel", "coatings", "all"
  filterConfig: jsonb("filter_config").notNull(), // stores all filter criteria
  userId: integer("user_id").references(() => users.id),
  isGlobal: boolean("is_global").default(false), // available to all users
  isDefault: boolean("is_default").default(false), // default filter for category
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Coating Systems
export const coatingSystems = pgTable("coating_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coatingType: text("coating_type").notNull(), // galvanizing, paint, intumescent, primer, etc.
  pricingMethod: text("pricing_method").notNull().default("per_sqm"), // per_sqm, per_kg, per_piece
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  coverageRate: decimal("coverage_rate", { precision: 10, scale: 2 }), // m²/L for paints
  applicationMethod: text("application_method"), // spray, brush, dip, roller
  preparationRequired: text("preparation_required"), // blast, grind, degrease - shown as tags
  preparationMethods: jsonb("preparation_methods").default('[]'), // ["wire_brush", "blast_sa2.5", "blast_sa3"]
  coverageAdjustmentFactors: jsonb("coverage_adjustment_factors").default('{}'), // {"wire_brush": 1.15, "blast_sa2.5": 1.0}
  applicationMethodFactors: jsonb("application_method_factors").default('{}'), // {"spray": 0.9, "brush": 1.2, "roller": 1.1}
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
  materialSuppliers: many(materialSuppliers),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  materialSuppliers: many(materialSuppliers),
}));

export const materialSuppliersRelations = relations(materialSuppliers, ({ one, many }) => ({
  material: one(materials, {
    fields: [materialSuppliers.materialId],
    references: [materials.id],
  }),
  supplier: one(suppliers, {
    fields: [materialSuppliers.supplierId],
    references: [suppliers.id],
  }),
  priceHistory: many(supplierPriceHistory),
}));

export const supplierPriceHistoryRelations = relations(supplierPriceHistory, ({ one }) => ({
  materialSupplier: one(materialSuppliers, {
    fields: [supplierPriceHistory.materialSupplierId],
    references: [materialSuppliers.id],
  }),
  enteredByUser: one(users, {
    fields: [supplierPriceHistory.enteredBy],
    references: [users.id],
  }),
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
  originalMaterial: one(materials, {
    fields: [remnants.originalMaterialId],
    references: [materials.id],
  }),
  parentJob: one(jobs, {
    fields: [remnants.parentJobId],
    references: [jobs.id],
  }),
  reservedForJob: one(jobs, {
    fields: [remnants.reservedForJobId],
    references: [jobs.id],
  }),
  createdByUser: one(users, {
    fields: [remnants.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [remnants.updatedBy],
    references: [users.id],
  }),
  originalInventory: one(inventory, {
    fields: [remnants.originalInventoryId],
    references: [inventory.id],
  }),
  newInventory: one(inventory, {
    fields: [remnants.newInventoryId],
    references: [inventory.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(clientContacts),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
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
}).extend({
  // Allow unitCost to accept both string and number types and convert to string
  unitCost: z.union([z.string(), z.number()]).optional().transform(val => 
    val === undefined || val === null ? undefined : String(val)
  ),
  // Allow pricePerKg to accept both string and number types and convert to string  
  pricePerKg: z.union([z.string(), z.number()]).optional().transform(val => 
    val === undefined || val === null ? undefined : String(val)
  ),
  // Allow pricePerMeter to accept both string and number types and convert to string
  pricePerMeter: z.union([z.string(), z.number()]).optional().transform(val => 
    val === undefined || val === null ? undefined : String(val)
  ),
  // Allow coverageRate to accept both string and number types and convert to string
  coverageRate: z.union([z.string(), z.number()]).optional().transform(val => 
    val === undefined || val === null ? undefined : String(val)
  ),
});

export const insertConnectionComponentSchema = createInsertSchema(connectionComponents).omit({
  id: true,
  created_at: true,
  updated_at: true,
  usage_frequency: true,
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
  id: true
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

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  company: z.string().optional(), // Make company field optional for auto-save
  leadTimeStandard: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  leadTimeExpress: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  minimumOrderQuantity: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  minimumOrderValue: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  qualityRating: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  reliabilityRating: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
});

export const insertMaterialSupplierSchema = createInsertSchema(materialSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierPriceHistorySchema = createInsertSchema(supplierPriceHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierContactSchema = createInsertSchema(supplierContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
});

export const insertPoDocumentConfigSchema = createInsertSchema(poDocumentConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// NOTE: insertQuoteSchema has been moved to end of file with new quotes table
// export const insertQuoteSchema = createInsertSchema(quotes).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertContactDocumentSchema = createInsertSchema(contactDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  creditLimit: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  leadTimeStandard: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  leadTimeExpress: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  minimumOrderQuantity: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  minimumOrderValue: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type MaterialSupplier = typeof materialSuppliers.$inferSelect;
export type InsertMaterialSupplier = z.infer<typeof insertMaterialSupplierSchema>;

export type SupplierPriceHistory = typeof supplierPriceHistory.$inferSelect;
export type InsertSupplierPriceHistory = z.infer<typeof insertSupplierPriceHistorySchema>;

export type SupplierContact = typeof supplierContacts.$inferSelect;
export type InsertSupplierContact = z.infer<typeof insertSupplierContactSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;

// Drawing management types
export type DrawingDocument = typeof drawingDocuments.$inferSelect;
export type InsertDrawingDocument = typeof drawingDocuments.$inferInsert;
export type DrawingAnnotation = typeof drawingAnnotations.$inferSelect;
export type InsertDrawingAnnotation = typeof drawingAnnotations.$inferInsert;
export type DrawingProcessingQueue = typeof drawingProcessingQueue.$inferSelect;
export type InsertDrawingProcessingQueue = typeof drawingProcessingQueue.$inferInsert;

// Drawing document management for AI processing
export const drawingDocuments = pgTable("drawing_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileType: text("file_type").notNull(), // pdf, dxf, dwg, ifc
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(), // server storage path
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  
  // Processing status
  status: text("status").notNull().default('uploaded'), // uploaded, processing, completed, failed
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingError: text("processing_error"),
  
  // Extracted metadata
  pageCount: integer("page_count"),
  drawingNumber: text("drawing_number"),
  drawingTitle: text("drawing_title"),
  drawingScale: text("drawing_scale"),
  drawingDate: timestamp("drawing_date"),
  revision: text("revision"),
  
  // AI processing results
  aiProcessingData: jsonb("ai_processing_data"), // Raw AI extraction results
  extractedElements: jsonb("extracted_elements"), // Structured element data
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // Overall confidence score
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Drawing annotations for marking up elements
export const drawingAnnotations = pgTable("drawing_annotations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => drawingDocuments.id).notNull(),
  pageNumber: integer("page_number").notNull(),
  
  // Annotation details
  annotationType: text("annotation_type").notNull(), // element, dimension, note, markup
  elementId: text("element_id"), // B1, C2, PL1, etc.
  elementType: text("element_type"), // beam, column, plate, connection
  
  // Coordinates (for PDF/image overlays)
  x: decimal("x", { precision: 10, scale: 2 }).notNull(),
  y: decimal("y", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  
  // Annotation data
  text: text("text"),
  color: text("color").default('#FF0000'),
  metadata: jsonb("metadata"), // Additional properties
  
  // User tracking
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Annotation Color Themes for PDF markup consistency
export const annotationThemes = pgTable("annotation_themes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  
  // Color definitions for different element types
  beamColor: varchar("beam_color", { length: 7 }).default('#0000FF'), // Blue
  columnColor: varchar("column_color", { length: 7 }).default('#FF0000'), // Red
  plateColor: varchar("plate_color", { length: 7 }).default('#00FF00'), // Green
  connectionColor: varchar("connection_color", { length: 7 }).default('#FF00FF'), // Magenta
  weldColor: varchar("weld_color", { length: 7 }).default('#FFA500'), // Orange
  boltColor: varchar("bolt_color", { length: 7 }).default('#800080'), // Purple
  dimensionColor: varchar("dimension_color", { length: 7 }).default('#000000'), // Black
  noteColor: varchar("note_color", { length: 7 }).default('#808080'), // Gray
  
  // Line styles
  lineWidth: integer("line_width").default(2),
  lineStyle: varchar("line_style", { length: 20 }).default('solid'), // solid, dashed, dotted
  opacity: decimal("opacity", { precision: 3, scale: 2 }).default("0.7"),
  
  // Font settings
  fontSize: integer("font_size").default(12),
  fontFamily: varchar("font_family", { length: 50 }).default('Arial'),
  
  isDefault: boolean("is_default").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertAnnotationThemeSchema = createInsertSchema(annotationThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertAnnotationTheme = z.infer<typeof insertAnnotationThemeSchema>;
export type AnnotationTheme = typeof annotationThemes.$inferSelect;

// Plate Schedule for nesting optimization
export const plateSchedule = pgTable("plate_schedule", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  
  // Plate identification
  plateId: varchar("plate_id", { length: 50 }).notNull(), // PL001, PL002
  parentPlateSize: varchar("parent_plate_size", { length: 100 }).notNull(), // 6000x2400x12
  parentPlateGrade: varchar("parent_plate_grade", { length: 50 }).notNull(), // 350L0, 250L0
  
  // Nesting details
  nestedParts: jsonb("nested_parts"), // Array of parts cut from this plate
  utilizationPercentage: decimal("utilization_percentage", { precision: 5, scale: 2 }), // 85.5%
  wasteArea: decimal("waste_area", { precision: 10, scale: 2 }), // mm²
  
  // Cut list
  cutSequence: jsonb("cut_sequence"), // Ordered list of cuts
  totalCutLength: decimal("total_cut_length", { precision: 10, scale: 2 }), // mm
  pierceCount: integer("pierce_count"), // Number of pierce points
  
  // Optimization data
  nestingPatternId: varchar("nesting_pattern_id", { length: 100 }), // Reference to pattern
  optimizationMethod: varchar("optimization_method", { length: 50 }), // manual, auto_2d, ai_optimized
  rotationAllowed: boolean("rotation_allowed").default(true),
  grainDirection: varchar("grain_direction", { length: 20 }), // none, horizontal, vertical
  
  // Cost tracking
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }),
  cuttingCost: decimal("cutting_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  
  // Status
  status: varchar("status", { length: 50 }).default('planned'), // planned, nested, cut, complete
  nestingDate: timestamp("nesting_date"),
  cuttingDate: timestamp("cutting_date"),
  
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertPlateScheduleSchema = createInsertSchema(plateSchedule).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertPlateSchedule = z.infer<typeof insertPlateScheduleSchema>;
export type PlateSchedule = typeof plateSchedule.$inferSelect;

// Queue for AI processing tasks
export const drawingProcessingQueue = pgTable("drawing_processing_queue", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => drawingDocuments.id).notNull(),
  taskType: text("task_type").notNull(), // ocr, element_detection, dimension_extraction, mto_generation
  priority: integer("priority").default(5), // 1-10, lower is higher priority
  status: text("status").default('pending'), // pending, processing, completed, failed
  
  // Processing details
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Results
  result: jsonb("result"),
  error: text("error"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at")
});

// AI Drawing Analysis for Three-Phase Workflow
export const aiDrawingAnalysis = pgTable("ai_drawing_analysis", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  drawingType: text("drawing_type").notNull(), // structural_plan, elevation, section, shop_drawing
  analysisStatus: text("analysis_status").notNull().default("pending"), // pending, processing, completed, failed
  confidence: numeric("confidence"), // AI confidence score 0-1
  confidence_score: decimal("confidence_score", { precision: 5, scale: 2 }), // More detailed confidence percentage (0-100)
  extractedElements: jsonb("extracted_elements"), // JSON array of detected elements
  reviewNotes: text("review_notes"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

export const steelElements = pgTable("steel_elements", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id").references(() => aiDrawingAnalysis.id),
  partMark: text("part_mark").notNull(), // S1, B1, C1, etc.
  elementType: text("element_type").notNull(), // beam, column, purlin, brace, connection
  materialCode: text("material_code"), // 310UB40.4, 200UC52.2, etc.
  materialId: integer("material_id").references(() => materials.id),
  length: numeric("length"), // in mm
  quantity: integer("quantity").default(1),
  pageNumber: integer("page_number").notNull(),
  coordinates: jsonb("coordinates"), // {x, y, width, height} for PDF highlighting
  dimensions: jsonb("dimensions"), // extracted dimensions {width, depth, thickness}
  connections: jsonb("connections"), // connection details
  weldDetails: jsonb("weld_details"), // weld specifications
  status: text("status").default("detected"), // detected, reviewed, approved, flagged
  notes: text("notes"),
  detectedAt: timestamp("detected_at").defaultNow(),
});

export const connectionDetails = pgTable("connection_details", {
  id: serial("id").primaryKey(),
  elementId: integer("element_id").references(() => steelElements.id),
  connectionType: text("connection_type").notNull(), // bolted, welded, base_plate
  boltDetails: jsonb("bolt_details"), // {diameter, grade, quantity, spacing}
  weldDetails: jsonb("weld_details"), // {type, size, length, preparation}
  plateDetails: jsonb("plate_details"), // {thickness, dimensions, grade}
  laborTime: decimal("labor_time"), // calculated labor hours
  workshopRate: decimal("workshop_rate").default("80"), // $/hour
  siteRate: decimal("site_rate").default("120"), // $/hour
  location: text("location").default("workshop"), // workshop, site
});

// Pattern Pack Learning System Tables for Self-Learning AI
export const patternPacks = pgTable("pattern_packs", {
  id: serial("id").primaryKey(),
  organizationKey: varchar("organization_key", { length: 100 }), // Link to organization or use 'default'
  projectType: varchar("project_type", { length: 100 }), // warehouse, industrial, commercial
  patternData: jsonb("pattern_data").notNull(), // Complete pattern pack
  version: varchar("version", { length: 20 }),
  checksum: varchar("checksum", { length: 64 }),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Pattern components for querying
  titleBlockLayout: jsonb("title_block_layout"),
  legendAliases: jsonb("legend_aliases"), // {"SP1": "530UB93", "RB2": "300PFC"}
  holePolicyExtracted: jsonb("hole_policy_extracted"),
  boltGradePolicy: jsonb("bolt_grade_policy"),
  weldSymbolFamily: varchar("weld_symbol_family", { length: 50 }),
  excludedPhrases: text("excluded_phrases").array(),
  handrailDetectionTerms: text("handrail_detection_terms").array(),
  measurementGuardrails: jsonb("measurement_guardrails"),
  styleFeatures: jsonb("style_features")
});

export const patternLearningEvents = pgTable("pattern_learning_events", {
  id: serial("id").primaryKey(),
  patternPackId: integer("pattern_pack_id").references(() => patternPacks.id),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiDrawingAnalysis.id),
  eventType: varchar("event_type", { length: 50 }), // conflict, override, enhancement, validation
  originalValue: jsonb("original_value"),
  correctedValue: jsonb("corrected_value"),
  confidenceDelta: decimal("confidence_delta", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const autoConfigurations = pgTable("auto_configurations", {
  id: serial("id").primaryKey(),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiDrawingAnalysis.id),
  regionCodeSet: varchar("region_code_set", { length: 50 }), // AS_NZS, AISC_AWS, EN_ISO
  unitsDefault: varchar("units_default", { length: 10 }),
  ntsDoNotScale: boolean("nts_do_not_scale"),
  weldStandard: varchar("weld_standard", { length: 100 }),
  boltStandard: varchar("bolt_standard", { length: 100 }),
  boltGradePolicy: jsonb("bolt_grade_policy"),
  holeOversizeTable: jsonb("hole_oversize_table"),
  coatingsMacroclimate: varchar("coatings_macroclimate", { length: 100 }),
  excludedByNotesPhrases: text("excluded_by_notes_phrases").array(),
  includeHandrails: boolean("include_handrails"),
  legendMap: jsonb("legend_map"), // Detected mappings
  detectionConfidence: decimal("detection_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const complianceLints = pgTable("compliance_lints", {
  id: serial("id").primaryKey(),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiDrawingAnalysis.id),
  elementId: integer("element_id").references(() => steelElements.id),
  lintCode: varchar("lint_code", { length: 100 }), // LINT_NTS_SCALING, LINT_HOLE_TABLE_MISMATCH
  severity: varchar("severity", { length: 10 }), // INFO, WARN, ERROR
  message: text("message"),
  details: jsonb("details"), // Specific values that triggered the lint
  autoCorrectable: boolean("auto_correctable").default(false),
  correctionApplied: boolean("correction_applied").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const lintRules = pgTable("lint_rules", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).unique(),
  severity: varchar("severity", { length: 10 }), // INFO, WARN, ERROR
  description: text("description"),
  ruleLogic: jsonb("rule_logic"), // Configurable thresholds and conditions
  enabled: boolean("enabled").default(true),
  appliesToStandards: text("applies_to_standards").array(), // ['AS_NZS', 'AISC_AWS', etc.]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const aiRunTelemetry = pgTable("ai_run_telemetry", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").defaultRandom(),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiDrawingAnalysis.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  modelName: varchar("model_name", { length: 100 }),
  promptVersion: varchar("prompt_version", { length: 50 }), // STEELIQ-V4.2-AUTO
  detectorVersions: jsonb("detector_versions"),
  patternPackInHash: varchar("pattern_pack_in_hash", { length: 64 }),
  patternPackUsed: jsonb("pattern_pack_used"), // Merged configuration actually used
  // Statistics
  pagesScanned: integer("pages_scanned"),
  elementsFound: integer("elements_found"),
  elementsFlagged: integer("elements_flagged"),
  conflictsCount: integer("conflicts_count"),
  scaleMissingViews: integer("scale_missing_views"),
  lintsGenerated: integer("lints_generated"),
  // Performance metrics
  processingTimeMs: integer("processing_time_ms"),
  visionApiCalls: integer("vision_api_calls"),
  totalTokensUsed: integer("total_tokens_used"),
  createdAt: timestamp("created_at").defaultNow()
});

export const userCorrections = pgTable("user_corrections", {
  id: serial("id").primaryKey(),
  elementId: integer("element_id").references(() => steelElements.id),
  fieldCorrected: varchar("field_corrected", { length: 100 }),
  originalValue: text("original_value"),
  correctedValue: text("corrected_value"),
  correctionReason: text("correction_reason"),
  appliedToPattern: boolean("applied_to_pattern").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});

export const aiCuttingOptimization = pgTable("ai_cutting_optimization", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  materialType: text("material_type").notNull(), // linear, sheet, angle
  stockLength: integer("stock_length").notNull(), // standard lengths 6000, 9000, 12000
  cutList: jsonb("cut_list").notNull(), // array of required cuts with angles - TO BE DEPRECATED
  optimization: jsonb("optimization"), // optimized nesting solution - TO BE DEPRECATED
  wastePercentage: decimal("waste_percentage"),
  totalStock: integer("total_stock"), // pieces of stock required
  algorithm: text("algorithm").default("genetic"), // genetic, simulated_annealing, ml
  efficiency: decimal("efficiency"), // 0-1 score
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Normalized tables for ai_cutting_optimization
export const cuttingRequirements = pgTable("cutting_requirements", {
  id: serial("id").primaryKey(),
  optimizationId: integer("optimization_id").references(() => aiCuttingOptimization.id).notNull(),
  sequenceNumber: integer("sequence_number").notNull(), // Order of cut in the list
  materialId: integer("material_id").references(() => materials.id),
  length: decimal("length", { precision: 10, scale: 3 }).notNull(), // Required cut length
  quantity: integer("quantity").notNull().default(1), // Number of pieces needed
  angle: decimal("angle", { precision: 5, scale: 2 }), // Cut angle in degrees
  priority: integer("priority").default(1), // 1=high, 2=medium, 3=low
  label: text("label"), // Optional label for the cut
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cuttingPatterns = pgTable("cutting_patterns", {
  id: serial("id").primaryKey(),
  optimizationId: integer("optimization_id").references(() => aiCuttingOptimization.id).notNull(),
  patternNumber: integer("pattern_number").notNull(), // Pattern sequence number
  stockPieceNumber: integer("stock_piece_number").notNull(), // Which stock piece this pattern uses
  stockLength: decimal("stock_length", { precision: 10, scale: 3 }).notNull(), // Length of stock used
  usedLength: decimal("used_length", { precision: 10, scale: 3 }).notNull(), // Total length utilized
  wasteLength: decimal("waste_length", { precision: 10, scale: 3 }).notNull(), // Waste from this pattern
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }).notNull(), // Pattern efficiency %
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cuttingInstructions = pgTable("cutting_instructions", {
  id: serial("id").primaryKey(),
  patternId: integer("pattern_id").references(() => cuttingPatterns.id).notNull(),
  requirementId: integer("requirement_id").references(() => cuttingRequirements.id).notNull(),
  stepNumber: integer("step_number").notNull(), // Order of execution
  startPosition: decimal("start_position", { precision: 10, scale: 3 }).notNull(), // Where to start cut on stock
  endPosition: decimal("end_position", { precision: 10, scale: 3 }).notNull(), // Where to end cut
  cutLength: decimal("cut_length", { precision: 10, scale: 3 }).notNull(), // Length of the cut
  angle: decimal("angle", { precision: 5, scale: 2 }), // Angle of cut if applicable
  toolRequired: text("tool_required"), // plasma, saw, laser, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const globalConfiguration = pgTable("global_configuration", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // labor_rates, material_handling, equipment
  subcategory: text("subcategory"), // workshop, site, crane, manual
  name: text("name").notNull(),
  value: text("value").notNull(),
  unit: text("unit"), // minutes, dollars, percentage
  description: text("description"),
  isEditable: boolean("is_editable").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const qualityControl = pgTable("quality_control", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  elementId: integer("element_id").references(() => steelElements.id),
  issueType: text("issue_type").notNull(), // unrecognized, dimension_conflict, missing_info
  severity: text("severity").default("medium"), // low, medium, high, critical
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  status: text("status").default("open"), // open, reviewing, resolved
  flaggedAt: timestamp("flagged_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const complianceDocuments = pgTable("compliance_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  documentType: text("document_type").notNull(), // mill_certificate, heat_number, cc2_cc3
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  heatNumber: text("heat_number"),
  grade: text("grade"),
  supplier: text("supplier"),
  expiryDate: date("expiry_date"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Enhanced estimation tables
export const enhancedEstimationMaterials = pgTable("enhanced_estimation_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  materialId: integer("material_id").references(() => materials.id),
  materialCode: text("material_code").notNull(),
  materialName: text("material_name").notNull(),
  quantity: decimal("quantity").notNull(),
  unit: text("unit").notNull().default("m"),
  unitCost: decimal("unit_cost").notNull().default("0"),
  totalCost: decimal("total_cost").notNull().default("0"),
  wasteFactor: decimal("waste_factor").notNull().default("0.05"), // 5%
  adjustedQuantity: decimal("adjusted_quantity"),
  handlingTime: decimal("handling_time").notNull().default("0"), // minutes
  handlingCost: decimal("handling_cost").notNull().default("0"),
  handlingCategory: text("handling_category").default("manual"), // crane, heavy_manual, medium_lift, light
  supplier: text("supplier"),
  leadTime: integer("lead_time"), // days
  notes: text("notes"),
  aiSuggested: boolean("ai_suggested").default(false),
  elementIds: jsonb("element_ids"), // array of steel_elements.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const enhancedEstimationLabor = pgTable("enhanced_estimation_labor", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  category: text("category").notNull(), // workshop, onsite, subcontractor
  subcategory: text("subcategory").notNull(), // fabrication, welding, assembly, loading, coatings, erection, demolition
  description: text("description").notNull(),
  hours: decimal("hours").notNull().default("0"),
  rate: decimal("rate").notNull().default("0"), // per hour
  totalCost: decimal("total_cost").notNull().default("0"),
  location: text("location").default("workshop"), // workshop, site
  skillLevel: text("skill_level").default("standard"), // apprentice, standard, senior, specialist
  notes: text("notes"),
  elementIds: jsonb("element_ids"), // related steel elements
});

export const enhancedEstimationEquipment = pgTable("enhanced_estimation_equipment", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  equipmentType: text("equipment_type").notNull(), // inhouse, rental
  category: text("category").notNull(), // truck, hiab, crane, generator, plasma, welding
  name: text("name").notNull(),
  hours: decimal("hours").notNull().default("0"),
  rate: decimal("rate").notNull().default("0"), // per hour
  totalCost: decimal("total_cost").notNull().default("0"),
  fuelCost: decimal("fuel_cost").default("0"),
  operatorCost: decimal("operator_cost").default("0"),
  notes: text("notes"),
});

export const enhancedEstimationConsumables = pgTable("enhanced_estimation_consumables", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  category: text("category").notNull(), // welding, cutting, grinding, fasteners, gas, paint
  itemType: text("item_type").notNull(), // welding_rod, cutting_disc, bolt, paint, etc.
  specification: text("specification"), // 7018, M20x80, etc.
  quantity: decimal("quantity").notNull().default("0"),
  unit: text("unit").notNull(), // kg, pieces, litres
  unitCost: decimal("unit_cost").notNull().default("0"),
  totalCost: decimal("total_cost").notNull().default("0"),
  notes: text("notes"),
});

// PDF Analysis Types
export type DrawingAnalysis = typeof aiDrawingAnalysis.$inferSelect;
export type SteelElement = typeof steelElements.$inferSelect;
export type ConnectionDetail = typeof connectionDetails.$inferSelect;
export type AiCuttingOptimization = typeof aiCuttingOptimization.$inferSelect;
export type GlobalConfiguration = typeof globalConfiguration.$inferSelect;
export type QualityControl = typeof qualityControl.$inferSelect;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;

// Enhanced Estimation Types
export type EnhancedEstimationMaterial = typeof enhancedEstimationMaterials.$inferSelect;
export type EnhancedEstimationLabor = typeof enhancedEstimationLabor.$inferSelect;
export type EnhancedEstimationEquipment = typeof enhancedEstimationEquipment.$inferSelect;
export type EnhancedEstimationConsumable = typeof enhancedEstimationConsumables.$inferSelect;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

export type PoDocumentConfig = typeof poDocumentConfig.$inferSelect;
export type InsertPoDocumentConfig = z.infer<typeof insertPoDocumentConfigSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Quote types moved to line 3096 to avoid duplicates

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type ContactDocument = typeof contactDocuments.$inferSelect;
export type InsertContactDocument = z.infer<typeof insertContactDocumentSchema>;

export type MaterialCategory = typeof materialCategories.$inferSelect;
export type InsertMaterialCategory = z.infer<typeof insertMaterialCategorySchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type ConnectionComponent = typeof connectionComponents.$inferSelect;
export type InsertConnectionComponent = z.infer<typeof insertConnectionComponentSchema>;

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

// Project Lifecycle Tracking Tables
export const projectLifecyclePhases = pgTable("project_lifecycle_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  phaseCode: varchar("phase_code", { length: 50 }).notNull(),
  phaseName: text("phase_name").notNull(),
  phaseCategory: text("phase_category").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  plannedStart: timestamp("planned_start"),
  actualStart: timestamp("actual_start"),
  plannedEnd: timestamp("planned_end"),
  actualEnd: timestamp("actual_end"),
  blockingReason: text("blocking_reason"),
  completionCriteria: jsonb("completion_criteria").default({}),
  automationRules: jsonb("automation_rules").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectLifecycleTasks = pgTable("project_lifecycle_tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").references(() => projectLifecyclePhases.id),
  taskCode: varchar("task_code", { length: 50 }).notNull(),
  taskName: text("task_name").notNull(),
  taskDescription: text("task_description"),
  responsibleParty: varchar("responsible_party", { length: 50 }),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: timestamp("due_date"),
  startedDate: timestamp("started_date"),
  completedDate: timestamp("completed_date"),
  completedBy: integer("completed_by").references(() => users.id),
  requiredDocuments: jsonb("required_documents").default([]),
  attachedDocuments: jsonb("attached_documents").default([]),
  approvalRequired: boolean("approval_required").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  automationTrigger: varchar("automation_trigger", { length: 100 }),
  dependencies: jsonb("dependencies").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectStakeholders = pgTable("project_stakeholders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  stakeholderType: varchar("stakeholder_type", { length: 50 }).notNull(),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  portalAccess: boolean("portal_access").default(false),
  portalRole: varchar("portal_role", { length: 50 }),
  notificationPreferences: jsonb("notification_preferences").default({ email: true, sms: false, in_app: true }),
  accessPermissions: jsonb("access_permissions").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectLifecycleEvents = pgTable("project_lifecycle_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  phaseId: integer("phase_id").references(() => projectLifecyclePhases.id),
  taskId: integer("task_id").references(() => projectLifecycleTasks.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventDescription: text("event_description"),
  triggeredBy: integer("triggered_by").references(() => users.id),
  triggeredBySystem: boolean("triggered_by_system").default(false),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectLifecycleTemplates = pgTable("project_lifecycle_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  templateDescription: text("template_description"),
  projectType: varchar("project_type", { length: 50 }),
  phases: jsonb("phases").notNull(),
  tasks: jsonb("tasks").notNull(),
  automationRules: jsonb("automation_rules").default({}),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Estimation System Tables
export const estimationProjects = pgTable("estimation_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed, sent, accepted, declined
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  margin: decimal("margin", { precision: 5, scale: 2 }).default("0"),
  overheadPercentage: decimal("overhead_percentage", { precision: 5, scale: 2 }).default("15"),
  deliveryDate: timestamp("delivery_date"),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  projectData: jsonb("project_data"), // Complete estimation data structure
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimationData = pgTable("estimation_data", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).unique().notNull(),
  materials: jsonb("materials").default('[]'),
  labor: jsonb("labor").default('[]'),
  equipment: jsonb("equipment").default('[]'),
  consumables: jsonb("consumables").default('[]'),
  coatings: jsonb("coatings").default('[]'),
  overheads: jsonb("overheads").default('{}'),
  margin: jsonb("margin").default('{}'),
  totals: jsonb("totals").default('{}'),
  overheadPercentage: decimal("overhead_percentage", { precision: 5, scale: 2 }).default("20"),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).default("20"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimationMaterials = pgTable("estimation_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  materialId: integer("material_id").references(() => materials.id),
  materialCode: text("material_code").notNull(),
  materialName: text("material_name").notNull(),
  designation: text("designation"), // C1, B2, PL1, etc. - stable reference for material
  length: decimal("length", { precision: 10, scale: 3 }).default("6.0"), // Individual piece length in meters
  lengthUnit: text("length_unit").default("m"), // Unit of measurement (m, mm, ft)
  totalLength: decimal("total_length", { precision: 12, scale: 3 }), // quantity × length
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  wasteFactor: decimal("waste_factor", { precision: 5, scale: 2 }).default("5"), // percentage
  handlingTime: decimal("handling_time", { precision: 6, scale: 2 }).default("0"), // minutes
  handlingCost: decimal("handling_cost", { precision: 10, scale: 2 }).default("0"),
  supplier: text("supplier"),
  leadTime: integer("lead_time"), // days
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimationLabor = pgTable("estimation_labor", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  designation: text("designation"), // C1-cut, B2-drill, PL1-weld - tracks parent material and operation
  parentMaterialId: text("parent_material_id"), // Reference to parent material
  operationType: text("operation_type"), // cut, drill, weld, etc. from operation
  category: text("category").notNull(), // workshop, onsite, subcontractor
  type: text("type").notNull(), // fabrication, welding, assembly, finishing, etc.
  description: text("description").notNull(),
  hours: decimal("hours", { precision: 8, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  skillLevel: text("skill_level"), // apprentice, tradesman, supervisor, specialist
  crew: integer("crew").default(1), // number of people
  notes: text("notes"),
  // Labor rate management fields
  roleId: integer("role_id").references(() => roles.id),
  skillLevelId: integer("skill_level_id").references(() => skillLevels.id),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }),
  allowances: jsonb("allowances"), // Applied allowances and their values
  rateSource: varchar("rate_source", { length: 50 }).default("manual"), // manual, role_based, custom
  teamMemberId: integer("team_member_id").references(() => teamMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimationEquipment = pgTable("estimation_equipment", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  equipment: text("equipment").notNull(),
  type: text("type").notNull(), // inhouse, rental
  duration: decimal("duration", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("hours"), // hours, days, weeks
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  operator: text("operator"), // included, additional
  fuel: boolean("fuel").default(false),
  delivery: boolean("delivery").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimationConsumables = pgTable("estimation_consumables", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  designation: text("designation"), // C1-cut, B2-drill - tracks parent material and operation
  parentMaterialId: text("parent_material_id"), // Reference to parent material
  operationType: text("operation_type"), // cut, drill, weld, etc. from operation
  item: text("item").notNull(),
  category: text("category"), // welding, cutting, finishing, fasteners, etc.
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimationCoatings = pgTable("estimation_coatings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  designation: text("designation"), // C1-coat, B2-prime - tracks parent material and operation
  parentMaterialId: text("parent_material_id"), // Reference to parent material  
  operationType: text("operation_type"), // prime, paint, galvanize, etc. from operation
  coatingSystemId: integer("coating_system_id").references(() => coatingSystems.id),
  coatingType: text("coating_type").notNull(), // primer, paint, galvanizing, etc.
  description: text("description").notNull(),
  surfaceArea: decimal("surface_area", { precision: 10, scale: 3 }).notNull(), // m²
  coatsRequired: integer("coats_required").default(1),
  coverageRate: decimal("coverage_rate", { precision: 10, scale: 3 }), // m²/L
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // liters or kg
  unit: text("unit").notNull().default("L"), // L, kg, m²
  unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  preparationMethod: text("preparation_method"), // blast, grind, degrease
  applicationMethod: text("application_method"), // spray, brush, dip
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Operations tracking table for complete traceability
export const estimationOperations = pgTable("estimation_operations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  materialId: text("material_id").notNull(), // Reference to material in materials table
  materialDesignation: text("material_designation").notNull(), // C1, B2, PL1
  operationType: text("operation_type").notNull(), // cut, drill, weld, grind, coat, etc.
  operationDesignation: text("operation_designation").notNull(), // C1-cut, B2-drill, PL1-weld
  description: text("description").notNull(),
  sequenceOrder: integer("sequence_order"), // Order of operations
  
  // Operation details
  operationData: jsonb("operation_data"), // Stores all operation-specific data
  method: text("method"), // plasma, saw, laser, mag_drill, etc.
  position: text("position"), // flat, vertical, overhead
  
  // Routing flags
  includeInLabor: boolean("include_in_labor").default(false),
  includeInConsumables: boolean("include_in_consumables").default(false),
  includeInCoatings: boolean("include_in_coatings").default(false),
  includeInEquipment: boolean("include_in_equipment").default(false),
  
  // Cost overrides
  laborCostOverride: decimal("labor_cost_override", { precision: 10, scale: 2 }),
  consumablesCostOverride: decimal("consumables_cost_override", { precision: 10, scale: 2 }),
  coatingsCostOverride: decimal("coatings_cost_override", { precision: 10, scale: 2 }),
  
  // References to created items in other tables
  laborItemIds: jsonb("labor_item_ids"), // Array of IDs created in labor table
  consumableItemIds: jsonb("consumable_item_ids"), // Array of IDs created in consumables
  coatingItemIds: jsonb("coating_item_ids"), // Array of IDs created in coatings
  
  // Metadata
  status: text("status").default("planned"), // planned, in-progress, completed
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimationTemplates = pgTable("estimation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // material_rates, labor_rates, equipment_rates, etc.
  templateData: jsonb("template_data").notNull(),
  isDefault: boolean("is_default").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiEstimationHistory = pgTable("ai_estimation_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  inputData: jsonb("input_data").notNull(),
  aiSuggestions: jsonb("ai_suggestions").notNull(),
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Estimation insert schemas
export const insertEstimationProjectSchema = createInsertSchema(estimationProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimationMaterialSchema = createInsertSchema(estimationMaterials).omit({
  id: true,
  createdAt: true,
});

export const insertEstimationLaborSchema = createInsertSchema(estimationLabor).omit({
  id: true,
  createdAt: true,
});

export const insertEstimationEquipmentSchema = createInsertSchema(estimationEquipment).omit({
  id: true,
  createdAt: true,
});

export const insertEstimationConsumableSchema = createInsertSchema(estimationConsumables).omit({
  id: true,
  createdAt: true,
});

export const insertEstimationCoatingsSchema = createInsertSchema(estimationCoatings).omit({
  id: true,
  createdAt: true,
});

export const insertEstimationOperationsSchema = createInsertSchema(estimationOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimationTemplateSchema = createInsertSchema(estimationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiEstimationHistorySchema = createInsertSchema(aiEstimationHistory).omit({
  id: true,
  createdAt: true,
});

// NEW: Normalized tables to replace JSONB in estimationData
export const estimationOverheads = pgTable("estimation_overheads", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  overheadType: text("overhead_type").notNull(), // administration, insurance, transport, site_setup, etc.
  category: text("category").notNull(), // fixed, variable, project_specific
  description: text("description").notNull(),
  calculationMethod: text("calculation_method").notNull(), // percentage, fixed_amount, per_unit
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }), // Base amount for calculation
  percentage: decimal("percentage", { precision: 5, scale: 2 }), // If percentage-based
  appliedTo: text("applied_to"), // materials, labor, both, total
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimationMargins = pgTable("estimation_margins", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).notNull(),
  marginType: text("margin_type").notNull(), // profit, contingency, risk
  category: text("category").notNull(), // standard, premium, discount
  description: text("description").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  appliedTo: text("applied_to").notNull(), // subtotal, materials, labor, total
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }).notNull(), // Amount margin is applied to
  marginAmount: decimal("margin_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const estimationTotals = pgTable("estimation_totals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id).unique().notNull(),
  materialsCost: decimal("materials_cost", { precision: 12, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
  equipmentCost: decimal("equipment_cost", { precision: 12, scale: 2 }).default("0"),
  consumablesCost: decimal("consumables_cost", { precision: 12, scale: 2 }).default("0"),
  coatingsCost: decimal("coatings_cost", { precision: 12, scale: 2 }).default("0"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  overheadsAmount: decimal("overheads_amount", { precision: 12, scale: 2 }).default("0"),
  marginAmount: decimal("margin_amount", { precision: 12, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for new normalized tables
export const insertEstimationOverheadSchema = createInsertSchema(estimationOverheads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimationMarginSchema = createInsertSchema(estimationMargins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimationTotalsSchema = createInsertSchema(estimationTotals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculated: true,
});

export const insertOperationItemSchema = createInsertSchema(operationItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Estimation types
export type EstimationProject = typeof estimationProjects.$inferSelect;
export type InsertEstimationProject = z.infer<typeof insertEstimationProjectSchema>;

export type EstimationMaterial = typeof estimationMaterials.$inferSelect;
export type InsertEstimationMaterial = z.infer<typeof insertEstimationMaterialSchema>;

export type EstimationLabor = typeof estimationLabor.$inferSelect;
export type InsertEstimationLabor = z.infer<typeof insertEstimationLaborSchema>;

export type EstimationEquipment = typeof estimationEquipment.$inferSelect;
export type InsertEstimationEquipment = z.infer<typeof insertEstimationEquipmentSchema>;

export type EstimationConsumable = typeof estimationConsumables.$inferSelect;
export type InsertEstimationConsumable = z.infer<typeof insertEstimationConsumableSchema>;

export type EstimationCoatings = typeof estimationCoatings.$inferSelect;
export type InsertEstimationCoatings = z.infer<typeof insertEstimationCoatingsSchema>;

export type EstimationOperations = typeof estimationOperations.$inferSelect;
export type InsertEstimationOperations = z.infer<typeof insertEstimationOperationsSchema>;

export type EstimationOverhead = typeof estimationOverheads.$inferSelect;
export type InsertEstimationOverhead = z.infer<typeof insertEstimationOverheadSchema>;

export type EstimationMargin = typeof estimationMargins.$inferSelect;
export type InsertEstimationMargin = z.infer<typeof insertEstimationMarginSchema>;

export type EstimationTotal = typeof estimationTotals.$inferSelect;
export type InsertEstimationTotal = z.infer<typeof insertEstimationTotalsSchema>;

export type EstimationTemplate = typeof estimationTemplates.$inferSelect;
export type InsertEstimationTemplate = z.infer<typeof insertEstimationTemplateSchema>;

export type AiEstimationHistory = typeof aiEstimationHistory.$inferSelect;
export type InsertAiEstimationHistory = z.infer<typeof insertAiEstimationHistorySchema>;

export type OperationItem = typeof operationItems.$inferSelect;
export type InsertOperationItem = z.infer<typeof insertOperationItemSchema>;

// Team Management Schema
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  managerId: integer("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  roleId: integer("role_id").notNull().references(() => roles.id),
  departmentId: integer("department_id").references(() => departments.id),
  
  // Basic Employment Information
  isActive: boolean("is_active").default(true),
  employeeNumber: varchar("employee_number", { length: 50 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  employmentType: varchar("employment_type", { length: 50 }).default("full_time"), // full_time, part_time, contractor, casual
  
  // Personal Information (captured from User but can be overridden)
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  preferredName: varchar("preferred_name", { length: 100 }),
  dateOfBirth: date("date_of_birth"),
  
  // Contact Information
  personalEmail: varchar("personal_email", { length: 255 }),
  personalPhone: varchar("personal_phone", { length: 20 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 100 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }),
  
  // Address Information
  streetAddress: varchar("street_address", { length: 200 }),
  suburb: varchar("suburb", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  country: varchar("country", { length: 50 }).default("New Zealand"),
  
  // Position & Skills
  position: varchar("position", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  skillLevel: varchar("skill_level", { length: 50 }), // apprentice, tradesman, advanced, specialist
  primarySkills: jsonb("primary_skills"), // Array of skills
  secondarySkills: jsonb("secondary_skills"),
  experienceYears: integer("experience_years"),
  
  // Rates & Compensation
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  siteAllowance: decimal("site_allowance", { precision: 10, scale: 2 }).default("0"),
  travelAllowance: decimal("travel_allowance", { precision: 10, scale: 2 }).default("0"),
  annualSalary: decimal("annual_salary", { precision: 12, scale: 2 }),
  payFrequency: varchar("pay_frequency", { length: 20 }).default("weekly"), // weekly, fortnightly, monthly
  
  // Certifications & Qualifications
  certifications: jsonb("certifications"), // Array of certification objects
  qualifications: jsonb("qualifications"), // Array of qualification objects
  licenses: jsonb("licenses"), // Array of license objects
  trainingRecords: jsonb("training_records"), // Array of training completion records
  
  // Health & Safety Comprehensive
  inductionCompleted: boolean("induction_completed").default(false),
  inductionDate: date("induction_date"),
  safetyTrainingExpiry: date("safety_training_expiry"),
  medicalClearance: boolean("medical_clearance").default(false),
  medicalExpiryDate: date("medical_expiry_date"),
  
  // Health & Safety Certificate Fields
  safetyCertificates: jsonb("safety_certificates").default("[]"),
  weldingCertificates: jsonb("welding_certificates").default("[]"),
  tradeLicenses: jsonb("trade_licenses").default("[]"),
  equipmentCertificates: jsonb("equipment_certificates").default("[]"),
  
  // Additional H&S fields
  safetyCardNumber: varchar("safety_card_number", { length: 50 }),
  safetyCardExpiry: date("safety_card_expiry"),
  workingAtHeightsExpiry: date("working_at_heights_expiry"),
  firstAidExpiry: date("first_aid_expiry"),
  driverLicenseType: varchar("driver_license_type", { length: 50 }),
  driverLicenseExpiry: date("driver_license_expiry"),
  tradeCertificates: jsonb("trade_certificates"),
  
  // Banking & Financial
  bankAccountName: varchar("bank_account_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankSortCode: varchar("bank_sort_code", { length: 20 }),
  taxNumber: varchar("tax_number", { length: 20 }),
  kiwisaverRate: decimal("kiwisaver_rate", { precision: 5, scale: 2 }),
  
  // Visa & Immigration
  visaType: varchar("visa_type", { length: 50 }),
  visaExpiry: date("visa_expiry"),
  
  // Next of Kin
  nextOfKinName: varchar("next_of_kin_name", { length: 100 }),
  nextOfKinPhone: varchar("next_of_kin_phone", { length: 20 }),
  nextOfKinRelation: varchar("next_of_kin_relation", { length: 50 }),
  
  // Performance & Review
  performanceRating: decimal("performance_rating", { precision: 3, scale: 1 }), // 1.0 to 5.0
  lastReviewDate: date("last_review_date"),
  nextReviewDate: date("next_review_date"),
  
  // Labor Rate Management
  skillLevelId: integer("skill_level_id").references(() => skillLevels.id),
  rateOverride: decimal("rate_override", { precision: 10, scale: 2 }),
  rateEffectiveDate: date("rate_effective_date"),
  
  // Benefits & Leave
  annualLeaveEntitlement: decimal("annual_leave_entitlement", { precision: 5, scale: 2 }).default("20"), // days
  sickLeaveEntitlement: decimal("sick_leave_entitlement", { precision: 5, scale: 2 }).default("5"), // days
  currentLeaveBalance: decimal("current_leave_balance", { precision: 5, scale: 2 }).default("0"),
  annualLeaveBalance: decimal("annual_leave_balance", { precision: 5, scale: 2 }).default("0"),
  sickLeaveBalance: decimal("sick_leave_balance", { precision: 5, scale: 2 }).default("0"),
  
  // System Fields
  profilePhoto: text("profile_photo"), // File path or URL
  notes: text("notes"),
  internalNotes: text("internal_notes"), // HR/Management only
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Time Management Schema
// Time Entries - simpler time tracking for mobile operations
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").references(() => jobs.id),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breakMinutes: integer("break_minutes").default(0),
  totalMinutes: integer("total_minutes"),
  location: text("location"),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 6 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 6 }),
  notes: text("notes"),
  status: text("status").default("active"), // active, completed, cancelled
  deviceId: text("device_id"),
  photoUrl: text("photo_url"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobId: integer("job_id").references(() => jobs.id),
  taskId: integer("task_id").references(() => jobTasks.id),
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakDuration: integer("break_duration").default(0),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  totalPay: decimal("total_pay", { precision: 12, scale: 2 }),
  workLocation: varchar("work_location", { length: 100 }).default("workshop"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("draft"),
  supervisorId: integer("supervisor_id").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at"),
  geolocation: jsonb("geolocation"),
  deviceInfo: jsonb("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobTasks = pgTable("job_tasks", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  taskName: varchar("task_name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 20 }).default("pending"),
  assignedTo: integer("assigned_to").references(() => users.id),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }),
  skillLevel: varchar("skill_level", { length: 50 }),
  dueDate: timestamp("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  materials: jsonb("materials"),
  tools: jsonb("tools"),
  instructions: text("instructions"),
  qualityNotes: text("quality_notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeClocks = pgTable("time_clocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clockType: varchar("clock_type", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  location: varchar("location", { length: 100 }),
  geolocation: jsonb("geolocation"),
  deviceInfo: jsonb("device_info"),
  notes: text("notes"),
  jobId: integer("job_id").references(() => jobs.id),
  taskId: integer("task_id").references(() => jobTasks.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  leaveType: varchar("leave_type", { length: 50 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee Archive & Audit Tables - Industry Standard Data Retention
export const archivedEmployees = pgTable("archived_employees", {
  id: serial("id").primaryKey(),
  originalUserId: integer("original_user_id").notNull(),
  originalTeamMemberId: integer("original_team_member_id"),
  
  // Complete copy of user data at time of archival
  username: varchar("username", { length: 255 }),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  
  // Complete copy of team member data
  roleId: integer("role_id"),
  roleName: varchar("role_name", { length: 100 }),
  departmentId: integer("department_id"),
  departmentName: varchar("department_name", { length: 100 }),
  
  employeeNumber: varchar("employee_number", { length: 50 }),
  employmentType: varchar("employment_type", { length: 50 }),
  isActive: boolean("is_active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // Personal Information
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  preferredName: varchar("preferred_name", { length: 100 }),
  dateOfBirth: date("date_of_birth"),
  personalEmail: varchar("personal_email", { length: 255 }),
  personalPhone: varchar("personal_phone", { length: 20 }),
  
  // Address
  streetAddress: varchar("street_address", { length: 200 }),
  suburb: varchar("suburb", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 10 }),
  country: varchar("country", { length: 50 }),
  
  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name", { length: 100 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }),
  
  // Employment Details
  position: varchar("position", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  skillLevel: varchar("skill_level", { length: 50 }),
  primarySkills: jsonb("primary_skills"),
  secondarySkills: jsonb("secondary_skills"),
  experienceYears: integer("experience_years"),
  
  // Compensation
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  siteAllowance: decimal("site_allowance", { precision: 10, scale: 2 }),
  travelAllowance: decimal("travel_allowance", { precision: 10, scale: 2 }),
  annualSalary: decimal("annual_salary", { precision: 12, scale: 2 }),
  payFrequency: varchar("pay_frequency", { length: 20 }),
  
  // Certifications & Training
  certifications: jsonb("certifications"),
  qualifications: jsonb("qualifications"),
  licenses: jsonb("licenses"),
  trainingRecords: jsonb("training_records"),
  
  // Health & Safety
  inductionCompleted: boolean("induction_completed"),
  inductionDate: date("induction_date"),
  safetyTrainingExpiry: date("safety_training_expiry"),
  medicalClearance: boolean("medical_clearance"),
  medicalExpiryDate: date("medical_expiry_date"),
  
  // Performance
  performanceRating: decimal("performance_rating", { precision: 3, scale: 1 }),
  lastReviewDate: date("last_review_date"),
  nextReviewDate: date("next_review_date"),
  
  // Leave & Benefits
  annualLeaveEntitlement: decimal("annual_leave_entitlement", { precision: 5, scale: 2 }),
  sickLeaveEntitlement: decimal("sick_leave_entitlement", { precision: 5, scale: 2 }),
  currentLeaveBalance: decimal("current_leave_balance", { precision: 5, scale: 2 }),
  
  // Archive Metadata
  archiveReason: varchar("archive_reason", { length: 100 }),
  archivedBy: integer("archived_by"),
  archivedAt: timestamp("archived_at").defaultNow(),
  legalRetentionUntil: date("legal_retention_until"),
  canBeDeleted: boolean("can_be_deleted").default(false),
  
  // Notes
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  exitInterviewNotes: text("exit_interview_notes"),
});

export const employeeAuditLog = pgTable("employee_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  teamMemberId: integer("team_member_id"),
  archivedEmployeeId: integer("archived_employee_id"),
  
  action: varchar("action", { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, ARCHIVE, LOGIN, LOGOUT
  actionBy: integer("action_by").references(() => users.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // USER, TEAM_MEMBER, TIMESHEET, etc
  entityId: varchar("entity_id", { length: 100 }),
  
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Legal & Compliance
  legalBasis: varchar("legal_basis", { length: 100 }), // EMPLOYMENT, HEALTH_SAFETY, TAX_COMPLIANCE
  retentionPeriod: varchar("retention_period", { length: 50 }), // 7_YEARS, 20_YEARS, INDEFINITE
});

export const archivedTimesheets = pgTable("archived_timesheets", {
  id: serial("id").primaryKey(),
  originalTimesheetId: integer("original_timesheet_id"),
  archivedEmployeeId: integer("archived_employee_id").references(() => archivedEmployees.id),
  
  jobId: integer("job_id"),
  jobName: varchar("job_name", { length: 200 }),
  taskId: integer("task_id"),
  taskName: varchar("task_name", { length: 200 }),
  
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakDuration: integer("break_duration"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  totalPay: decimal("total_pay", { precision: 12, scale: 2 }),
  workLocation: varchar("work_location", { length: 100 }),
  notes: text("notes"),
  
  archivedAt: timestamp("archived_at").defaultNow(),
});

export const workSchedules = pgTable("work_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  shiftStart: timestamp("shift_start").notNull(),
  shiftEnd: timestamp("shift_end").notNull(),
  breakDuration: integer("break_duration").default(30),
  location: varchar("location", { length: 100 }).default("workshop"),
  jobId: integer("job_id").references(() => jobs.id),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  teamMembers: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [teamMembers.roleId],
    references: [roles.id],
  }),
  department: one(departments, {
    fields: [teamMembers.departmentId],
    references: [departments.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [timesheets.jobId],
    references: [jobs.id],
  }),
  task: one(jobTasks, {
    fields: [timesheets.taskId],
    references: [jobTasks.id],
  }),
  supervisor: one(users, {
    fields: [timesheets.supervisorId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
  }),
}));

export const jobTasksRelations = relations(jobTasks, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobTasks.jobId],
    references: [jobs.id],
  }),
  assignee: one(users, {
    fields: [jobTasks.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [jobTasks.createdBy],
    references: [users.id],
  }),
  timesheets: many(timesheets),
  timeClocks: many(timeClocks),
}));

export const timeClocksRelations = relations(timeClocks, ({ one }) => ({
  user: one(users, {
    fields: [timeClocks.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [timeClocks.jobId],
    references: [jobs.id],
  }),
  task: one(jobTasks, {
    fields: [timeClocks.taskId],
    references: [jobTasks.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
}));

export const workSchedulesRelations = relations(workSchedules, ({ one }) => ({
  user: one(users, {
    fields: [workSchedules.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [workSchedules.jobId],
    references: [jobs.id],
  }),
  creator: one(users, {
    fields: [workSchedules.createdBy],
    references: [users.id],
  }),
}));

// Team Management Types
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// Time Management Types
export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = typeof timesheets.$inferInsert;
export type JobTask = typeof jobTasks.$inferSelect;
export type InsertJobTask = typeof jobTasks.$inferInsert;
export type TimeClock = typeof timeClocks.$inferSelect;
export type InsertTimeClock = typeof timeClocks.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertWorkSchedule = typeof workSchedules.$inferInsert;

// Performance Reviews Table
export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  teamMemberId: integer("team_member_id").references(() => teamMembers.id).notNull(),
  reviewPeriodStart: timestamp("review_period_start").notNull(),
  reviewPeriodEnd: timestamp("review_period_end").notNull(),
  reviewType: varchar("review_type").notNull(), // 'annual', 'probation', 'project', 'improvement'
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }), // 1.00 to 5.00
  reviewStatus: varchar("review_status").default("pending"), // 'pending', 'completed', 'overdue'
  
  // KPI Scores (1-5 scale) - Steel Fabrication Industry Standard
  productionQuality: decimal("production_quality", { precision: 3, scale: 2 }),
  safetyCompliance: decimal("safety_compliance", { precision: 3, scale: 2 }),
  teamwork: decimal("teamwork", { precision: 3, scale: 2 }),
  technicalSkills: decimal("technical_skills", { precision: 3, scale: 2 }),
  problemSolving: decimal("problem_solving", { precision: 3, scale: 2 }),
  reliability: decimal("reliability", { precision: 3, scale: 2 }),
  communication: decimal("communication", { precision: 3, scale: 2 }),
  initiative: decimal("initiative", { precision: 3, scale: 2 }),
  
  // Quantitative Metrics
  defectRate: decimal("defect_rate", { precision: 5, scale: 2 }), // Percentage
  productivityScore: decimal("productivity_score", { precision: 5, scale: 2 }), // Percentage of target
  attendanceScore: decimal("attendance_score", { precision: 5, scale: 2 }), // Percentage
  safetyIncidents: integer("safety_incidents").default(0),
  
  // Comments and Development
  achievements: text("achievements"),
  areasForImprovement: text("areas_for_improvement"),
  developmentGoals: text("development_goals"),
  trainingRecommendations: text("training_recommendations"),
  employeeComments: text("employee_comments"),
  managerComments: text("manager_comments"),
  
  // Review metadata
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewDate: timestamp("review_date"),
  employeeSignedDate: timestamp("employee_signed_date"),
  managerSignedDate: timestamp("manager_signed_date"),
  hrApprovedDate: timestamp("hr_approved_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Qualification Expiry Tracking & Reminders
export const qualificationReminders = pgTable("qualification_reminders", {
  id: serial("id").primaryKey(),
  teamMemberId: integer("team_member_id").references(() => teamMembers.id).notNull(),
  qualificationType: varchar("qualification_type").notNull(), // 'first_aid', 'welding', 'heights', 'drivers', 'trade'
  qualificationName: varchar("qualification_name").notNull(),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date").notNull(),
  reminderDays: integer("reminder_days").array().default([90, 30, 14, 7, 1]), // Days before expiry to send reminders
  
  // Reminder tracking
  lastReminderSent: timestamp("last_reminder_sent"),
  remindersSent: integer("reminders_sent").default(0),
  isActive: boolean("is_active").default(true),
  
  // Renewal tracking
  renewalRequested: boolean("renewal_requested").default(false),
  renewalRequestDate: timestamp("renewal_request_date"),
  renewalCompletedDate: timestamp("renewal_completed_date"),
  newExpiryDate: timestamp("new_expiry_date"),
  
  // Notification preferences
  notifyEmployee: boolean("notify_employee").default(true),
  notifyManager: boolean("notify_manager").default(true),
  notifyHR: boolean("notify_hr").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance Reviews Relations
export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [performanceReviews.teamMemberId],
    references: [teamMembers.id],
  }),
  reviewer: one(users, {
    fields: [performanceReviews.reviewerId],
    references: [users.id],
  }),
}));

// Qualification Reminders Relations
export const qualificationRemindersRelations = relations(qualificationReminders, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [qualificationReminders.teamMemberId],
    references: [teamMembers.id],
  }),
}));

// Performance Review Types
export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = typeof performanceReviews.$inferInsert;
export type QualificationReminder = typeof qualificationReminders.$inferSelect;
export type InsertQualificationReminder = typeof qualificationReminders.$inferInsert;

// Employee Archive & Audit Types
export type ArchivedEmployee = typeof archivedEmployees.$inferSelect;
export type InsertArchivedEmployee = typeof archivedEmployees.$inferInsert;
export type EmployeeAuditLog = typeof employeeAuditLog.$inferSelect;
export type InsertEmployeeAuditLog = typeof employeeAuditLog.$inferInsert;
export type ArchivedTimesheet = typeof archivedTimesheets.$inferSelect;
export type InsertArchivedTimesheet = typeof archivedTimesheets.$inferInsert;

// ==========================================
// WAVE 1: FORTUNE 50 ANALYTICS & BI PLATFORM
// ==========================================

// Dashboard definitions for customizable BI dashboards
export const dashboardDefinitions = pgTable("dashboard_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // executive, operational, financial, project, custom
  category: text("category").notNull(), // management, operations, finance, hr, sales
  layout: text("layout").notNull(), // grid, flex, masonry
  isPublic: boolean("is_public").default(false),
  isDefault: boolean("is_default").default(false),
  refreshInterval: integer("refresh_interval"), // seconds
  permissions: text("permissions"), // role-based access
  filters: jsonb("filters"), // Default filter settings - OK as config
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard widgets for modular BI components
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboardDefinitions.id).notNull(),
  widgetType: text("widget_type").notNull(), // chart, kpi, table, heatmap, gauge, map
  title: text("title").notNull(),
  dataSource: text("data_source").notNull(), // table or query name
  visualization: text("visualization").notNull(), // bar, line, pie, scatter, etc.
  position: integer("position").notNull(), // Grid position
  width: integer("width").default(4), // Grid width (1-12)
  height: integer("height").default(4), // Grid height
  refreshRate: integer("refresh_rate"), // Override dashboard refresh
  config: jsonb("config"), // Widget-specific configuration - OK as config
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KPI definitions for tracking key metrics
export const kpiDefinitions = pgTable("kpi_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // revenue, cost, efficiency, quality, safety
  formula: text("formula").notNull(), // SQL or calculation formula
  unit: text("unit"), // $, %, hours, units, etc.
  target: decimal("target", { precision: 12, scale: 2 }),
  warningThreshold: decimal("warning_threshold", { precision: 12, scale: 2 }),
  criticalThreshold: decimal("critical_threshold", { precision: 12, scale: 2 }),
  frequency: text("frequency").notNull(), // realtime, hourly, daily, weekly, monthly
  aggregation: text("aggregation"), // sum, avg, min, max, count
  isActive: boolean("is_active").default(true),
  tags: text("tags").array(), // For grouping and filtering
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KPI history for time-series tracking
export const kpiHistory = pgTable("kpi_history", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").references(() => kpiDefinitions.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  target: decimal("target", { precision: 12, scale: 2 }),
  variance: decimal("variance", { precision: 12, scale: 2 }), // Value - Target
  variancePercentage: decimal("variance_percentage", { precision: 5, scale: 2 }),
  status: text("status"), // on_target, warning, critical
  context: jsonb("context"), // Additional context data - OK as metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Report templates for scheduled reporting
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // pdf, excel, csv, email
  category: text("category").notNull(), // executive, financial, operational, compliance
  query: text("query").notNull(), // SQL query or report definition
  schedule: text("schedule"), // cron expression
  recipients: text("recipients").array(), // Email addresses
  format: jsonb("format"), // Report formatting options - OK as config
  filters: jsonb("filters"), // Dynamic filters - OK as config
  isActive: boolean("is_active").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data marts for pre-aggregated analytics
export const dataMarts = pgTable("data_marts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  sourceQuery: text("source_query").notNull(), // SQL to generate mart
  refreshStrategy: text("refresh_strategy").notNull(), // incremental, full, append
  refreshSchedule: text("refresh_schedule"), // cron expression
  lastRefresh: timestamp("last_refresh"),
  nextRefresh: timestamp("next_refresh"),
  rowCount: integer("row_count"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  isActive: boolean("is_active").default(true),
  retentionDays: integer("retention_days").default(90),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics events for user behavior tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(), // page_view, click, form_submit, etc.
  eventCategory: text("event_category"), // navigation, interaction, transaction
  eventAction: text("event_action"), // specific action taken
  eventLabel: text("event_label"), // additional context
  eventValue: decimal("event_value", { precision: 12, scale: 2 }),
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  deviceType: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Benchmark metrics for industry comparisons
export const benchmarkMetrics = pgTable("benchmark_metrics", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  industry: text("industry").notNull(),
  percentile25: decimal("percentile_25", { precision: 12, scale: 2 }),
  percentile50: decimal("percentile_50", { precision: 12, scale: 2 }),
  percentile75: decimal("percentile_75", { precision: 12, scale: 2 }),
  percentile90: decimal("percentile_90", { precision: 12, scale: 2 }),
  source: text("source"), // Data source
  year: integer("year"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enterprise Settings Tables
export const settingsCategories = pgTable("settings_categories", {
  id: varchar("id").primaryKey(), // e.g., "organization", "financial", "operations"
  name: varchar("name").notNull(),
  description: text("description"),
  requiredRole: varchar("required_role"), // minimum role to access
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  categoryId: varchar("category_id").references(() => settingsCategories.id),
  key: varchar("key").notNull().unique(),
  value: jsonb("value"),
  dataType: varchar("data_type").notNull(), // string, number, boolean, json
  defaultValue: jsonb("default_value"),
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  requiredRole: varchar("required_role"),
  validationRules: jsonb("validation_rules"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const settingsAudit = pgTable("settings_audit", {
  id: serial("id").primaryKey(),
  settingId: integer("setting_id").references(() => settings.id),
  userId: integer("user_id").references(() => users.id),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  changeReason: text("change_reason"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});

// Comprehensive System Audit Log - Fortune 500 compliance standard
export const systemAuditLog = pgTable("system_audit_log", {
  id: serial("id").primaryKey(),
  
  // Event Classification
  eventCategory: text("event_category").notNull(), // procurement, financial, user, system, security
  eventType: text("event_type").notNull(), // create, update, delete, view, export, login, permission_change
  eventSubtype: text("event_subtype"), // po_created, requisition_approved, user_locked, etc.
  severity: text("severity").default("info"), // info, warning, error, critical
  
  // Entity References
  entityType: text("entity_type"), // purchase_order, requisition, user, supplier, etc.
  entityId: text("entity_id"), // Flexible ID that can reference any entity
  entityDescription: text("entity_description"), // Human-readable description
  
  // User & Session Info
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name"),
  userRole: text("user_role"),
  sessionId: text("session_id"),
  impersonatedBy: integer("impersonated_by").references(() => users.id), // For admin actions on behalf of users
  
  // Action Details
  action: text("action").notNull(), // Detailed description of what happened
  previousState: jsonb("previous_state"), // State before change
  newState: jsonb("new_state"), // State after change
  changeSummary: jsonb("change_summary"), // Key changes only
  
  // Financial Impact
  financialImpact: decimal("financial_impact", { precision: 12, scale: 2 }), // Dollar amount affected
  budgetImpact: text("budget_impact"), // over_budget, within_budget, etc.
  
  // Context & Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source").default("web"), // web, api, email, system, mobile
  requestMethod: text("request_method"), // GET, POST, PATCH, DELETE
  requestPath: text("request_path"), // API endpoint or page URL
  responseStatus: integer("response_status"), // HTTP status code
  errorMessage: text("error_message"), // If action failed
  
  // Compliance & Security
  dataClassification: text("data_classification").default("internal"), // public, internal, confidential, restricted
  complianceFlags: text("compliance_flags").array(), // GDPR, SOX, ISO27001, etc.
  requiresReview: boolean("requires_review").default(false), // Flag for manual review
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // Performance Metrics
  executionTimeMs: integer("execution_time_ms"), // How long the operation took
  databaseQueries: integer("database_queries"), // Number of DB queries executed
  
  // Audit Trail Integrity
  checksum: text("checksum"), // Hash of critical fields to detect tampering
  previousLogId: integer("previous_log_id"), // Chain logs for integrity
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Indexes for efficient querying
}, (table) => [
  index("idx_audit_user_date").on(table.userId, table.createdAt),
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_category_date").on(table.eventCategory, table.createdAt),
  index("idx_audit_severity").on(table.severity),
  index("idx_audit_review").on(table.requiresReview),
]);

export const settingsApprovals = pgTable("settings_approvals", {
  id: serial("id").primaryKey(),
  settingId: integer("setting_id").references(() => settings.id),
  requestedBy: integer("requested_by").references(() => users.id),
  requestedValue: jsonb("requested_value"),
  currentValue: jsonb("current_value"),
  changeReason: text("change_reason"),
  status: varchar("status").default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvalNotes: text("approval_notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  decidedAt: timestamp("decided_at")
});

// User Preferences (simplified)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).unique(),
  theme: varchar("theme").default("system"), // light, dark, system
  language: varchar("language").default("en"),
  dateFormat: varchar("date_format").default("DD/MM/YYYY"),
  timeFormat: varchar("time_format").default("12h"), // 12h, 24h
  timezone: varchar("timezone").default("Pacific/Auckland"),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  dashboardLayout: jsonb("dashboard_layout"), // custom dashboard widget arrangement
  templatePreferences: jsonb("template_preferences"), // saved template granular control preferences
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Enhanced Labor Rates with Payroll Integration
export const laborRateCards = pgTable("labor_rate_cards", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code").unique(),
  description: text("description"),
  skillLevel: varchar("skill_level").notNull(),
  employeeType: varchar("employee_type").notNull(), // employee, contractor, subcontractor
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  costRate: decimal("cost_rate", { precision: 10, scale: 2 }).notNull(),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  weekendMultiplier: decimal("weekend_multiplier", { precision: 3, scale: 2 }).default("1.5"),
  holidayMultiplier: decimal("holiday_multiplier", { precision: 3, scale: 2 }).default("2.0"),
  nightShiftMultiplier: decimal("night_shift_multiplier", { precision: 3, scale: 2 }).default("1.2"),
  certificationRequirements: jsonb("certification_requirements").default([]),
  unionAgreementId: varchar("union_agreement_id"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const laborRateRegions = pgTable("labor_rate_regions", {
  id: serial("id").primaryKey(),
  rateCardId: integer("rate_card_id").references(() => laborRateCards.id),
  region: varchar("region").notNull(),
  regionalMultiplier: decimal("regional_multiplier", { precision: 3, scale: 2 }).default("1.0"),
  siteAllowance: decimal("site_allowance", { precision: 10, scale: 2 }).default("0"),
  travelAllowance: decimal("travel_allowance", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow()
});



export const payrollIntegration = pgTable("payroll_integration", {
  id: serial("id").primaryKey(),
  provider: varchar("provider").notNull(), // xero, adp, workday, myob
  apiEndpoint: varchar("api_endpoint"),
  apiKey: varchar("api_key"), // encrypted
  mappingRules: jsonb("mapping_rules"),
  syncFrequency: varchar("sync_frequency").default("daily"),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: varchar("sync_status"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  budgetAnnual: decimal("budget_annual", { precision: 15, scale: 2 }),
  budgetMonthly: decimal("budget_monthly", { precision: 15, scale: 2 }),
  managerId: integer("manager_id").references(() => teamMembers.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Multi-entity support
export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  parentId: integer("parent_id"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  timezone: varchar("timezone"),
  settingsOverrides: jsonb("settings_overrides"), // unit-specific settings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Export types for new tables
export type SettingsCategory = typeof settingsCategories.$inferSelect;
export type InsertSettingsCategory = typeof settingsCategories.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
export type SettingsAudit = typeof settingsAudit.$inferSelect;
export type InsertSettingsAudit = typeof settingsAudit.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
export type LaborRateCard = typeof laborRateCards.$inferSelect;
export type InsertLaborRateCard = typeof laborRateCards.$inferInsert;
// TimeClock types already defined at line 2686-2687
export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type InsertBusinessUnit = typeof businessUnits.$inferInsert;

// AI System tables for Fortune 50-level ML infrastructure
export const aiWorkerJobs = pgTable("ai_worker_jobs", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id", { length: 255 }).unique().notNull(),
  type: text("type").notNull(), // 'AI_EXTRACTION' | 'DXF_PROCESSING' | 'EXPORT' | 'BATCH_ANALYSIS'
  payload: jsonb("payload").notNull(),
  priority: integer("priority").default(0),
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  organizationKey: text("organization_key").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  result: jsonb("result"),
  metadata: jsonb("metadata")
});

export const aiMonitoringLogs = pgTable("ai_monitoring_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: text("level").notNull(), // 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
  service: text("service").notNull(),
  operation: text("operation").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  correlationId: varchar("correlation_id", { length: 255 }),
  userId: integer("user_id").references(() => users.id),
  organizationKey: text("organization_key"),
  duration: integer("duration"), // in ms
  error: jsonb("error")
});

export const aiProcessingQueue = pgTable("ai_processing_queue", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => drawingProjects.id),
  jobId: varchar("job_id", { length: 255 }).unique().notNull(),
  priority: integer("priority").default(0),
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  metadata: jsonb("metadata")
});

export const aiBatchJobs = pgTable("ai_batch_jobs", {
  id: serial("id").primaryKey(),
  batchId: varchar("batch_id", { length: 255 }).unique().notNull(),
  projectId: integer("project_id").references(() => drawingProjects.id),
  totalItems: integer("total_items").notNull(),
  processedItems: integer("processed_items").default(0),
  failedItems: integer("failed_items").default(0),
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata")
});

export const aiBatchJobItems = pgTable("ai_batch_job_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => aiBatchJobs.id),
  itemId: varchar("item_id", { length: 255 }).notNull(),
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  result: jsonb("result"),
  error: text("error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const aiMtoEvidence = pgTable("ai_mto_evidence", {
  id: serial("id").primaryKey(),
  runTelemetryId: integer("run_telemetry_id").references(() => aiRunTelemetry.id),
  elementId: varchar("element_id", { length: 255 }).notNull(),
  fileId: varchar("file_id", { length: 255 }).notNull(),
  page: integer("page").notNull(),
  bbox: jsonb("bbox"), // [x1, y1, x2, y2]
  extractionMethod: text("extraction_method").notNull(), // 'TEXT' | 'VISION' | 'HYBRID' | 'UNSPECIFIED'
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Hierarchical MTO structure for parent-child relationships
export const aiMtoElements = pgTable("ai_mto_elements", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  elementId: varchar("element_id", { length: 255 }).unique().notNull(), // e.g., B1, C1, PL1
  designation: varchar("designation", { length: 255 }).notNull(),
  type: text("type").notNull(), // 'beam' | 'column' | 'plate' | 'angle' | 'channel' | 'tube' | 'other'
  description: text("description"),
  material: text("material"), // e.g., AS350, AS250
  dimensions: jsonb("dimensions"), // { length, width, height, thickness, weight }
  quantity: integer("quantity").default(1),
  location: text("location"), // Grid reference or area
  drawingReference: text("drawing_reference"), // PDF page or drawing number
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  evidence: jsonb("evidence"), // { fileId, page, bbox, extractionMethod }
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const aiMtoOperations = pgTable("ai_mto_operations", {
  id: serial("id").primaryKey(),
  parentElementId: integer("parent_element_id").references(() => aiMtoElements.id),
  operationId: varchar("operation_id", { length: 255 }).notNull(), // e.g., 4.1, 4.2
  type: text("type").notNull(), // 'cutting' | 'drilling' | 'welding' | 'painting' | 'endplate' | 'stiffener' | 'cleat' | 'baseplate'
  description: text("description"),
  specifications: jsonb("specifications"), // holes, weldType, weldSize, plateThickness, etc.
  quantity: integer("quantity").default(1),
  laborHours: decimal("labor_hours", { precision: 10, scale: 2 }),
  sequence: integer("sequence").default(0), // Order of operations
  createdAt: timestamp("created_at").defaultNow()
});

// Pattern learning for self-improvement
export const aiPatternLibrary = pgTable("ai_pattern_library", {
  id: serial("id").primaryKey(),
  patternType: text("pattern_type").notNull(), // 'element_detection' | 'dimension_extraction' | 'designation_mapping'
  patternKey: varchar("pattern_key", { length: 255 }).unique().notNull(),
  patternValue: jsonb("pattern_value").notNull(), // The learned pattern
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastUsed: timestamp("last_used"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Feedback collection for learning
export const aiFeedback = pgTable("ai_feedback", {
  id: serial("id").primaryKey(),
  elementId: integer("element_id").references(() => aiMtoElements.id),
  operationId: integer("operation_id").references(() => aiMtoOperations.id),
  feedbackType: text("feedback_type").notNull(), // 'correction' | 'confirmation' | 'rejection'
  originalValue: jsonb("original_value"),
  correctedValue: jsonb("corrected_value"),
  userId: integer("user_id").references(() => users.id),
  applied: boolean("applied").default(false),
  patternUpdated: boolean("pattern_updated").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Learning metrics for ROI tracking
export const aiLearningMetrics = pgTable("ai_learning_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  projectsProcessed: integer("projects_processed").default(0),
  elementsExtracted: integer("elements_extracted").default(0),
  correctionsReceived: integer("corrections_received").default(0),
  patternsLearned: integer("patterns_learned").default(0),
  accuracyRate: decimal("accuracy_rate", { precision: 5, scale: 2 }),
  timeToProcess: decimal("time_to_process", { precision: 10, scale: 2 }), // average in seconds
  costSaved: decimal("cost_saved", { precision: 10, scale: 2 }),
  apiCostIncurred: decimal("api_cost_incurred", { precision: 10, scale: 2 }),
  modelVersion: text("model_version"),
  createdAt: timestamp("created_at").defaultNow()
});

export const secureFiles = pgTable("secure_files", {
  id: serial("id").primaryKey(),
  fileId: varchar("file_id", { length: 255 }).unique().notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  organizationKey: text("organization_key"),
  checksum: text("checksum").notNull(),
  encryptionKey: text("encryption_key"),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const secureFileTokens = pgTable("secure_file_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  fileId: integer("file_id").references(() => secureFiles.id),
  expiresAt: timestamp("expires_at").notNull(),
  usageCount: integer("usage_count").default(0),
  maxUsage: integer("max_usage"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});

// Archive tables for Fortune 500 compliance and data retention
export const jobsArchive = pgTable("jobs_archive", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  jobNumber: text("job_number").notNull(),
  clientName: text("client_name").notNull(),
  clientContact: text("client_contact"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  projectDescription: text("project_description"),
  status: text("status").notNull(),
  priority: text("priority"),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }),
  completedDate: timestamp("completed_date"),
  assignedTo: integer("assigned_to"),
  estimationId: integer("estimation_id"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  originalCreatedAt: timestamp("original_created_at"),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  archivedBy: integer("archived_by").notNull(),
  archiveReason: text("archive_reason").notNull(),
  restoredAt: timestamp("restored_at"),
  restoredBy: integer("restored_by"),
  fullData: jsonb("full_data") // Complete job data as JSON
});

export const estimationsArchive = pgTable("estimations_archive", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id"),
  clientName: text("client_name"),
  status: text("status").notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 5, scale: 2 }).notNull(),
  deliveryDate: timestamp("delivery_date"),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  projectData: jsonb("project_data"),
  originalCreatedAt: timestamp("original_created_at"),
  archivedBy: integer("archived_by").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  archiveReason: text("archive_reason").notNull(),
  restoredAt: timestamp("restored_at"),
  restoredBy: integer("restored_by"),
  fullData: jsonb("full_data") // Complete estimation data as JSON
});

// Quotes table
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  estimationId: integer("estimation_id").notNull().references(() => estimationProjects.id),
  clientId: integer("client_id").references(() => clients.id),
  quoteNumber: text("quote_number").unique().notNull(),
  version: integer("version").default(1),
  
  // Quote Configuration
  template: text("template").notNull(),
  settings: jsonb("settings").notNull(),
  displayFormat: text("display_format"),
  pricingDisplay: text("pricing_display"),
  
  // Quote Content
  content: jsonb("content").notNull(),
  previewHtml: text("preview_html"),
  
  // Visibility Settings
  showCostBreakdown: boolean("show_cost_breakdown").default(true),
  showMarkups: boolean("show_markups").default(false),
  showSubtotals: boolean("show_subtotals").default(true),
  showTaxes: boolean("show_taxes").default(true),
  showPaymentTerms: boolean("show_payment_terms").default(true),
  showValidityPeriod: boolean("show_validity_period").default(true),
  
  // Financial Summary
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  
  // Status and Tracking
  status: text("status").default('draft'),
  sentAt: timestamp("sent_at"),
  sentTo: text("sent_to"),
  sentBy: integer("sent_by").references(() => users.id),
  viewedAt: timestamp("viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  
  // Metadata
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Email Settings
  emailSubject: text("email_subject"),
  emailMessage: text("email_message"),
  ccEmails: text("cc_emails").array()
});

// Create insert schema for quotes
export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Quote history table
export const quoteHistory = pgTable("quote_history", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id),
  action: text("action").notNull(),
  changes: jsonb("changes"),
  performedBy: integer("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  notes: text("notes")
});

// Quote views table
export const quoteViews = pgTable("quote_views", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id),
  viewedAt: timestamp("viewed_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  durationSeconds: integer("duration_seconds")
});

// Type exports
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type QuoteHistory = typeof quoteHistory.$inferSelect;
export type InsertQuoteHistory = typeof quoteHistory.$inferInsert;
export type QuoteView = typeof quoteViews.$inferSelect;
export type InsertQuoteView = typeof quoteViews.$inferInsert;

// Quote Customization Tables

// Organization Settings
export const organizationSettings = pgTable("organization_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: jsonb("value"),
  category: varchar("category", { length: 100 }), // branding, email, document, financial
  description: text("description"),
  lastUpdatedBy: integer("last_updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company Locations
export const companyLocations = pgTable("company_locations", {
  id: serial("id").primaryKey(),
  locationName: varchar("location_name", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  stateProvince: varchar("state_province", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }).default("New Zealand"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 50 }),
  businessNumber: varchar("business_number", { length: 50 }),
  logoPath: text("logo_path"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quote Templates
export const quoteTemplates = pgTable("quote_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateCode: varchar("template_code", { length: 50 }).unique().notNull(),
  templateType: varchar("template_type", { length: 50 }).default("professional"),
  description: text("description"),
  
  // Layout Configuration
  layoutConfig: jsonb("layout_config"),
  headerConfig: jsonb("header_config"),
  footerConfig: jsonb("footer_config"),
  
  // Design Settings
  primaryColor: varchar("primary_color", { length: 7 }).default("#1e3a8a"),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#0369a1"),
  accentColor: varchar("accent_color", { length: 7 }).default("#059669"),
  fontFamily: varchar("font_family", { length: 100 }).default("Arial"),
  fontSizeBody: integer("font_size_body").default(11),
  fontSizeHeading: integer("font_size_heading").default(16),
  
  // Section Visibility
  showExecutiveSummary: boolean("show_executive_summary").default(true),
  showScopeOfWork: boolean("show_scope_of_work").default(true),
  showPricingBreakdown: boolean("show_pricing_breakdown").default(true),
  showMaterialDetails: boolean("show_material_details").default(true),
  showLaborBreakdown: boolean("show_labor_breakdown").default(true),
  showPaymentTerms: boolean("show_payment_terms").default(true),
  showTermsConditions: boolean("show_terms_conditions").default(true),
  showProjectTimeline: boolean("show_project_timeline").default(false),
  showHandlingCosts: boolean("show_handling_costs").default(false),
  
  // Watermark Settings
  enableWatermark: boolean("enable_watermark").default(false),
  watermarkType: varchar("watermark_type", { length: 50 }),
  watermarkOpacity: decimal("watermark_opacity", { precision: 3, scale: 2 }).default("0.15"),
  watermarkPosition: varchar("watermark_position", { length: 50 }).default("center"),
  
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Configuration
export const emailConfigurations = pgTable("email_configurations", {
  id: serial("id").primaryKey(),
  configName: varchar("config_name", { length: 255 }).notNull(),
  providerType: varchar("provider_type", { length: 50 }).default("smtp"),
  
  // SMTP Settings
  smtpHost: varchar("smtp_host", { length: 255 }),
  smtpPort: integer("smtp_port").default(587),
  smtpUsername: varchar("smtp_username", { length: 255 }),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  smtpEncryption: varchar("smtp_encryption", { length: 20 }).default("tls"),
  
  // OAuth Settings
  oauthClientId: varchar("oauth_client_id", { length: 255 }),
  oauthClientSecretEncrypted: text("oauth_client_secret_encrypted"),
  oauthRefreshTokenEncrypted: text("oauth_refresh_token_encrypted"),
  
  // General Settings
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }),
  replyToEmail: varchar("reply_to_email", { length: 255 }),
  
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  testStatus: varchar("test_status", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateCode: varchar("template_code", { length: 100 }).unique().notNull(),
  templateType: varchar("template_type", { length: 50 }),
  subjectLine: text("subject_line").notNull(),
  emailBodyHtml: text("email_body_html"),
  emailBodyPlain: text("email_body_plain"),
  availableVariables: jsonb("available_variables"),
  isFollowUp: boolean("is_follow_up").default(false),
  followUpDays: integer("follow_up_days").array(),
  stopOnReply: boolean("stop_on_reply").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comprehensive Communication Templates
export const communicationTemplates = pgTable("communication_templates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'PO', 'RFQ', 'QUOTE', 'INVOICE', 'RECEIPT', 'DELIVERY_NOTE'
  category: varchar("category", { length: 50 }), // 'Documents', 'Email', 'Notifications'
  subCategory: varchar("sub_category", { length: 50 }), // 'acceptance_email', 'rejection_email', etc.
  description: text("description"),
  locale: varchar("locale", { length: 10 }).default("en-NZ"),
  scope: varchar("scope", { length: 20 }).default("org"), // 'org', 'division', 'supplier', 'client'
  scopeId: integer("scope_id"), // references division, supplier, or client if scope-specific
  status: varchar("status", { length: 20 }).default("draft"), // 'draft', 'published', 'archived'
  currentVersionId: integer("current_version_id"),
  basedOnTemplateId: integer("based_on_template_id").references(() => communicationTemplates.id),
  isDefault: boolean("is_default").default(false), // marks category default
  defaultForScope: boolean("default_for_scope").default(false),
  theme: jsonb("theme"), // colors, fonts, logo settings
  sections: jsonb("sections"), // which sections to show/hide by default
  variables: jsonb("variables"), // available template variables for this type
  defaultOptions: jsonb("default_options"), // default granular control settings
  defaultEditorMode: varchar("default_editor_mode", { length: 20 }).default("code"), // 'visual' or 'code'
  createdBy: integer("created_by").references(() => users.id),
  lastEditedBy: integer("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template Versions for history and rollback
export const templateVersions = pgTable("template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => communicationTemplates.id).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  versionNumber: integer("version_number").notNull(),
  subjectTemplate: text("subject_template").notNull(),
  htmlTemplate: text("html_template").notNull(),
  textTemplate: text("text_template"),
  pdfLayoutTemplate: text("pdf_layout_template"),
  visualProjectJson: jsonb("visual_project_json"), // GrapesJS project data
  editorMode: varchar("editor_mode", { length: 20 }).default("code"), // 'visual' or 'code'
  changelog: text("changelog"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  publishedBy: integer("published_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
});

// Template Content Sections for granular control
export const templateSections = pgTable("template_sections", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => communicationTemplates.id).notNull(),
  sectionKey: varchar("section_key", { length: 50 }).notNull(), // 'header', 'greeting', 'lineItems', 'totals', etc.
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  sectionType: varchar("section_type", { length: 50 }), // 'text', 'table', 'image', 'signature'
  defaultVisible: boolean("default_visible").default(true),
  requiredForType: boolean("required_for_type").default(false),
  orderIndex: integer("order_index").notNull(),
  content: text("content"), // HTML/template content
  conditions: jsonb("conditions"), // visibility conditions
  variables: jsonb("variables"), // section-specific variables
});

// Template Audit Trail
export const templateAudit = pgTable("template_audit", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => communicationTemplates.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'updated', 'published', 'archived', 'used'
  actorId: integer("actor_id").references(() => users.id),
  previousVersionId: integer("previous_version_id"),
  newVersionId: integer("new_version_id"),
  changes: jsonb("changes"),
  metadata: jsonb("metadata"), // usage stats, send count, etc.
  timestamp: timestamp("timestamp").defaultNow(),
});

// Template Assignments for defaults
export const templateAssignments = pgTable("template_assignments", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => communicationTemplates.id).notNull(),
  assignmentType: varchar("assignment_type", { length: 20 }).notNull(), // 'division', 'supplier', 'user'
  assignmentId: integer("assignment_id").notNull(),
  documentType: varchar("document_type", { length: 20 }).notNull(), // 'PO', 'RFQ', etc.
  priority: integer("priority").default(0), // for precedence when multiple assignments
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Send History - Track all documents sent/printed/downloaded
export const documentHistory = pgTable("document_history", {
  id: serial("id").primaryKey(),
  documentType: varchar("document_type", { length: 50 }).notNull(), // 'PO', 'RFQ', 'Quote', 'Invoice', 'Report'
  documentId: integer("document_id").notNull(), // ID of the PO, RFQ, Quote, etc.
  documentNumber: varchar("document_number", { length: 100 }), // PO-0001, RFQ-0001, etc.
  version: integer("version").default(1), // Version number if document is resent
  action: varchar("action", { length: 50 }).notNull(), // 'sent', 'downloaded', 'printed', 'viewed', 'acknowledged'
  templateId: integer("template_id").references(() => communicationTemplates.id), // Template used
  templateCode: varchar("template_code", { length: 50 }), // Template code for quick reference
  templateOptions: jsonb("template_options"), // Granular options used (showLineItems, showTerms, etc.)
  recipient: jsonb("recipient"), // {email, name, company, etc.}
  sendMethod: varchar("send_method", { length: 50 }), // 'email', 'portal', 'download', 'print'
  htmlContent: text("html_content"), // Actual HTML content sent
  pdfUrl: text("pdf_url"), // URL to stored PDF if applicable
  emailStatus: varchar("email_status", { length: 50 }), // 'pending', 'sent', 'delivered', 'bounced', 'opened'
  emailTrackingId: varchar("email_tracking_id", { length: 255 }), // SendGrid or email provider tracking ID
  openedAt: timestamp("opened_at"),
  clickedLinks: jsonb("clicked_links"), // Array of clicked link timestamps
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // Additional tracking info
  sentBy: integer("sent_by").references(() => users.id),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Attachments - Track files attached to sent documents
export const documentAttachments = pgTable("document_attachments", {
  id: serial("id").primaryKey(),
  documentHistoryId: integer("document_history_id").references(() => documentHistory.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }), // 'pdf', 'excel', 'image', etc.
  fileSize: integer("file_size"), // in bytes
  filePath: text("file_path"),
  mimeType: varchar("mime_type", { length: 100 }),
  isMainDocument: boolean("is_main_document").default(false), // True for the main PO/RFQ PDF
  checksum: varchar("checksum", { length: 64 }), // SHA256 hash for integrity
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Access Logs - Track who views documents via portal
export const documentAccessLogs = pgTable("document_access_logs", {
  id: serial("id").primaryKey(),
  documentHistoryId: integer("document_history_id").references(() => documentHistory.id).notNull(),
  accessToken: varchar("access_token", { length: 255 }),
  accessedBy: varchar("accessed_by", { length: 255 }), // Email or name
  accessType: varchar("access_type", { length: 50 }), // 'view', 'download', 'print'
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  location: jsonb("location"), // Geo location if available
  sessionDuration: integer("session_duration"), // in seconds
  pagesViewed: jsonb("pages_viewed"), // Array of page numbers viewed
  accessedAt: timestamp("accessed_at").defaultNow(),
});

// Organization-wide branding and template settings
export const organizationBranding = pgTable("organization_branding", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").default(1), // Support for multi-org in future
  brandName: varchar("brand_name", { length: 255 }).default("Lateral Engineering Limited"),
  colorScheme: varchar("color_scheme", { length: 50 }).default("professional"), // professional, modern, vibrant, minimal, corporate
  primaryColor: varchar("primary_color", { length: 7 }).default("#3b82f6"), // Blue
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#10b981"), // Green
  accentColor: varchar("accent_color", { length: 7 }).default("#f59e0b"), // Amber
  textColor: varchar("text_color", { length: 7 }).default("#1f2937"), // Dark Gray
  backgroundColor: varchar("background_color", { length: 7 }).default("#ffffff"), // White
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  fontFamily: varchar("font_family", { length: 255 }).default("Helvetica Neue, Arial, sans-serif"),
  headingFontFamily: varchar("heading_font_family", { length: 255 }).default("Helvetica Neue, Arial, sans-serif"),
  defaultPaperSize: varchar("default_paper_size", { length: 10 }).default("A4"),
  headerLayout: jsonb("header_layout").default({ style: "professional", showLogo: true, showDate: true }),
  footerLayout: jsonb("footer_layout").default({ style: "simple", showPageNumbers: true, showCompanyInfo: true }),
  customCss: text("custom_css"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier-specific template overrides
export const supplierTemplateOverrides = pgTable("supplier_template_overrides", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  templateType: varchar("template_type", { length: 20 }).notNull(), // 'PO', 'RFQ', etc.
  templateId: integer("template_id").references(() => communicationTemplates.id).notNull(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100), // Higher priority overrides lower
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Terms and Conditions Library
export const termsConditionsLibrary = pgTable("terms_conditions_library", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  content: text("content").notNull(),
  version: varchar("version", { length: 20 }),
  isDefault: boolean("is_default").default(false),
  applicableTo: varchar("applicable_to", { length: 50 }).array(),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quote Documents
export const quoteDocuments = pgTable("quote_documents", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id"),
  documentType: varchar("document_type", { length: 50 }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  isEncrypted: boolean("is_encrypted").default(false),
  passwordProtected: boolean("password_protected").default(false),
  viewCount: integer("view_count").default(0),
  lastViewedAt: timestamp("last_viewed_at"),
  requiresSignature: boolean("requires_signature").default(false),
  signatureStatus: varchar("signature_status", { length: 50 }),
  signedAt: timestamp("signed_at"),
  signedBy: varchar("signed_by", { length: 255 }),
  signatureIp: varchar("signature_ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client Portal Access
export const clientPortalAccess = pgTable("client_portal_access", {
  id: serial("id").primaryKey(),
  accessToken: varchar("access_token", { length: 255 }).unique().notNull(),
  quoteId: integer("quote_id"),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }),
  accessType: varchar("access_type", { length: 50 }).default("view_only"),
  expiresAt: timestamp("expires_at"),
  maxViews: integer("max_views"),
  currentViews: integer("current_views").default(0),
  firstViewedAt: timestamp("first_viewed_at"),
  lastViewedAt: timestamp("last_viewed_at"),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  emailNotificationsSent: jsonb("email_notifications_sent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// E-Signature Configuration
export const esignatureConfigurations = pgTable("esignature_configurations", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  isDefault: boolean("is_default").default(false),
  signatureFieldConfig: jsonb("signature_field_config"),
  docusignAccountId: varchar("docusign_account_id", { length: 255 }),
  docusignClientId: varchar("docusign_client_id", { length: 255 }),
  docusignClientSecretEncrypted: text("docusign_client_secret_encrypted"),
  docusignAccessTokenEncrypted: text("docusign_access_token_encrypted"),
  docusignRefreshTokenEncrypted: text("docusign_refresh_token_encrypted"),
  adobeAccountId: varchar("adobe_account_id", { length: 255 }),
  adobeClientId: varchar("adobe_client_id", { length: 255 }),
  adobeClientSecretEncrypted: text("adobe_client_secret_encrypted"),
  adobeAccessTokenEncrypted: text("adobe_access_token_encrypted"),
  adobeRefreshTokenEncrypted: text("adobe_refresh_token_encrypted"),
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quote Activity Log
export const quoteActivityLogs = pgTable("quote_activity_logs", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id"),
  activityType: varchar("activity_type", { length: 100 }).notNull(),
  activityDetails: jsonb("activity_details"),
  performedBy: varchar("performed_by", { length: 255 }),
  performedByType: varchar("performed_by_type", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Handling Costs Configuration
export const handlingCostsConfig = pgTable("handling_costs_config", {
  id: serial("id").primaryKey(),
  configName: varchar("config_name", { length: 255 }).notNull(),
  calculationMethod: varchar("calculation_method", { length: 50 }).default("percentage"),
  percentageValue: decimal("percentage_value", { precision: 5, scale: 2 }),
  fixedAmount: decimal("fixed_amount", { precision: 12, scale: 2 }),
  perUnitRate: decimal("per_unit_rate", { precision: 10, scale: 2 }),
  unitType: varchar("unit_type", { length: 50 }),
  showAsSeparateLine: boolean("show_as_separate_line").default(true),
  lineItemLabel: varchar("line_item_label", { length: 255 }).default("Handling & Processing"),
  includeInSubtotal: boolean("include_in_subtotal").default(true),
  applyToMaterials: boolean("apply_to_materials").default(true),
  applyToConsumables: boolean("apply_to_consumables").default(false),
  minimumThreshold: decimal("minimum_threshold", { precision: 12, scale: 2 }),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Currency Configuration
export const currencyConfigurations = pgTable("currency_configurations", {
  id: serial("id").primaryKey(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  currencyName: varchar("currency_name", { length: 100 }),
  currencySymbol: varchar("currency_symbol", { length: 10 }),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.000000"),
  isBaseCurrency: boolean("is_base_currency").default(false),
  decimalPlaces: integer("decimal_places").default(2),
  thousandSeparator: varchar("thousand_separator", { length: 1 }).default(","),
  decimalSeparator: varchar("decimal_separator", { length: 1 }).default("."),
  symbolPosition: varchar("symbol_position", { length: 10 }).default("before"),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// PROCUREMENT CENTER TABLES
// ============================================

// Purchase Requisitions - Material/Service requests that need approval
export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: serial("id").primaryKey(),
  requisitionNumber: text("requisition_number").notNull().unique(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id), // Keep optional for now to avoid breaking existing data
  jobNumber: text("job_number"), // Store job number for display
  department: text("department"), // fabrication, office, maintenance, etc.
  category: text("category").notNull(), // materials, services, equipment, supplies
  priority: text("priority").default("standard"), // standard, urgent, critical
  status: text("status").notNull().default("draft"), // draft, pending_approval, approved, rejected, converted_to_po, cancelled
  justification: text("justification"), // Why is this needed?
  estimatedTotal: decimal("estimated_total", { precision: 12, scale: 2 }),
  currency: text("currency").default("NZD"),
  requiredByDate: timestamp("required_by_date"),
  deliveryLocation: text("delivery_location"),
  preferredSupplierId: integer("preferred_supplier_id").references(() => suppliers.id),
  // Approval tracking
  currentApprovalLevel: integer("current_approval_level").default(0),
  maxApprovalLevel: integer("max_approval_level"),
  approvalNotes: text("approval_notes"),
  // Conversion tracking
  convertedToPoId: integer("converted_to_po_id").references(() => purchaseOrders.id),
  convertedAt: timestamp("converted_at"),
  convertedBy: integer("converted_by").references(() => users.id),
  // Emergency bypass tracking
  isEmergency: boolean("is_emergency").default(false),
  emergencyJustification: text("emergency_justification"),
  emergencyApprovedBy: integer("emergency_approved_by").references(() => users.id),
  emergencyApprovedAt: timestamp("emergency_approved_at"),
  // Archive tracking
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by").references(() => users.id),
  // Metadata
  notes: text("notes"),
  attachments: jsonb("attachments"), // File references
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Requisition Items - Line items for requisitions
export const requisitionItems = pgTable("requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id).notNull(),
  materialId: integer("material_id").references(() => materials.id),
  description: text("description").notNull(),
  specification: text("specification"), // Detailed specs if not a catalog item
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").default("each"), // m, kg, each, box, etc.
  estimatedUnitPrice: decimal("estimated_unit_price", { precision: 10, scale: 2 }),
  estimatedTotal: decimal("estimated_total", { precision: 12, scale: 2 }),
  requiredByDate: timestamp("required_by_date"),
  suggestedSupplierId: integer("suggested_supplier_id").references(() => suppliers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Approval Rules - Define who can approve what amounts
export const approvalRules = pgTable("approval_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  category: text("category"), // materials, services, equipment, supplies, or null for all
  department: text("department"), // specific department or null for all
  minAmount: decimal("min_amount", { precision: 12, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 12, scale: 2 }), // null for unlimited
  approvalLevel: integer("approval_level").notNull(), // 1, 2, 3, etc.
  approverRole: text("approver_role"), // supervisor, manager, director, ceo
  specificApproverId: integer("specific_approver_id").references(() => users.id),
  requiresMultipleApprovers: boolean("requires_multiple_approvers").default(false),
  minimumApprovers: integer("minimum_approvers").default(1),
  autoApprove: boolean("auto_approve").default(false), // For small amounts
  escalationTimeHours: integer("escalation_time_hours").default(48), // Auto-escalate if not approved
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Approval History - Track all approval actions
export const approvalHistory = pgTable("approval_history", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id).notNull(),
  approvalLevel: integer("approval_level").notNull(),
  approverId: integer("approver_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // approved, rejected, returned_for_revision, escalated
  comments: text("comments"),
  amount: decimal("amount", { precision: 12, scale: 2 }), // Amount at time of approval
  delegatedFrom: integer("delegated_from").references(() => users.id), // If approved on behalf of someone
  actionAt: timestamp("action_at").defaultNow().notNull(),
});

// RFQ Requests - Request for Quotes sent to suppliers
export const rfqRequests = pgTable("rfq_requests", {
  id: serial("id").primaryKey(),
  rfqNumber: text("rfq_number").notNull().unique(),
  requisitionId: integer("requisition_id").references(() => purchaseRequisitions.id), // Link to requisition
  jobId: integer("job_id").references(() => jobs.id), // Direct job link for tracking
  jobNumber: text("job_number"), // Store job number for display
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // materials, services, equipment
  status: text("status").notNull().default("draft"), // draft, sent, closed, cancelled
  responseDeadline: timestamp("response_deadline").notNull(),
  deliveryRequiredBy: timestamp("delivery_required_by"),
  deliveryTerms: text("delivery_terms"), // FOB, CIF, etc.
  paymentTerms: text("payment_terms"),
  evaluationCriteria: jsonb("evaluation_criteria"), // price_weight, quality_weight, delivery_weight
  specialRequirements: text("special_requirements"),
  attachments: jsonb("attachments"), // Drawings, specs, etc.
  // Supplier management
  invitedSuppliers: jsonb("invited_suppliers"), // Array of supplier IDs
  publicRfq: boolean("public_rfq").default(false), // Open to all suppliers
  // Tracking
  sentAt: timestamp("sent_at"),
  closedAt: timestamp("closed_at"),
  winningResponseId: integer("winning_response_id"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RFQ Responses - Supplier responses to RFQs
export const rfqResponses = pgTable("rfq_responses", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").references(() => rfqRequests.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  responseNumber: text("response_number").notNull().unique(),
  status: text("status").notNull().default("draft"), // draft, submitted, under_review, accepted, rejected, selected
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("NZD"),
  validityDays: integer("validity_days").default(30),
  deliveryDays: integer("delivery_days"),
  paymentTermsOffered: text("payment_terms_offered"),
  warrantyOffered: text("warranty_offered"),
  // Scoring
  priceScore: decimal("price_score", { precision: 5, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  deliveryScore: decimal("delivery_score", { precision: 5, scale: 2 }),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  ranking: integer("ranking"),
  // Details
  notes: text("notes"),
  attachments: jsonb("attachments"), // Quote documents
  lineItems: jsonb("line_items"), // Detailed pricing breakdown
  // Decision tracking
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RFQ Evaluation Templates - Scoring templates for different RFQ types
export const rfqEvaluationTemplates = pgTable("rfq_evaluation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // materials, services, high_value
  isDefault: boolean("is_default").default(false),
  criteria: jsonb("criteria").notNull(), // Array of {name, weight, description}
  totalWeight: decimal("total_weight", { precision: 5, scale: 2 }).default("100"),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RFQ Response Evaluations - Detailed scoring for each quote
export const rfqResponseEvaluations = pgTable("rfq_response_evaluations", {
  id: serial("id").primaryKey(),
  rfqResponseId: integer("rfq_response_id").references(() => rfqResponses.id).notNull(),
  templateId: integer("template_id").references(() => rfqEvaluationTemplates.id),
  evaluatorId: integer("evaluator_id").references(() => users.id).notNull(),
  // Scoring details
  criteriaScores: jsonb("criteria_scores"), // {criteriaName: score, ...}
  weightedTotal: decimal("weighted_total", { precision: 5, scale: 2 }),
  manualOverride: boolean("manual_override").default(false),
  overrideScore: decimal("override_score", { precision: 5, scale: 2 }),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }).notNull(),
  // Evaluation notes
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendations: text("recommendations"),
  evaluationNotes: text("evaluation_notes"),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
});

// RFQ Response Documents - Cloud-stored attachments for quotes
export const rfqResponseDocuments = pgTable("rfq_response_documents", {
  id: serial("id").primaryKey(),
  rfqResponseId: integer("rfq_response_id").references(() => rfqResponses.id).notNull(),
  documentType: text("document_type").notNull(), // quote_pdf, technical_spec, compliance_cert, terms
  fileName: text("file_name").notNull(),
  cloudPath: text("cloud_path").notNull(), // Cloud storage path
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  isLatest: boolean("is_latest").default(true),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// RFQ Approval Overrides - Track manual winner selection overrides
export const rfqApprovalOverrides = pgTable("rfq_approval_overrides", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").references(() => rfqRequests.id).notNull(),
  selectedResponseId: integer("selected_response_id").references(() => rfqResponses.id).notNull(),
  systemRecommendedId: integer("system_recommended_id").references(() => rfqResponses.id),
  // Override details
  overrideReason: text("override_reason").notNull(),
  justification: text("justification").notNull(),
  riskAssessment: text("risk_assessment"),
  // Approval chain
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  approvalNotes: text("approval_notes"),
  approvedAt: timestamp("approved_at"),
  // Notifications
  notificationsSent: jsonb("notifications_sent"), // Track who was notified
});

// Goods Receipts - Track deliveries and receiving
export const goodsReceipts = pgTable("goods_receipts", {
  id: serial("id").primaryKey(),
  grnNumber: text("grn_number").notNull().unique(), // Goods Receipt Note number
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id), // Direct job link for cost allocation
  deliveryNoteNumber: text("delivery_note_number"),
  receivedBy: integer("received_by").references(() => users.id).notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  status: text("status").notNull().default("partial"), // partial, complete, returned
  inspectionStatus: text("inspection_status"), // pending, passed, failed, partial_pass
  inspectionNotes: text("inspection_notes"),
  storageLocation: text("storage_location"),
  attachments: jsonb("attachments"), // Photos, delivery notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goods Receipt Items - Line items for GRNs
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").references(() => goodsReceipts.id).notNull(),
  poItemId: integer("po_item_id").references(() => purchaseOrderItems.id).notNull(),
  quantityOrdered: decimal("quantity_ordered", { precision: 10, scale: 2 }).notNull(),
  quantityReceived: decimal("quantity_received", { precision: 10, scale: 2 }).notNull(),
  quantityAccepted: decimal("quantity_accepted", { precision: 10, scale: 2 }),
  quantityRejected: decimal("quantity_rejected", { precision: 10, scale: 2 }),
  rejectionReason: text("rejection_reason"),
  serialNumbers: jsonb("serial_numbers"), // For tracked items
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  qualityCertificate: text("quality_certificate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for new tables
export const insertOrganizationSettingSchema = createInsertSchema(organizationSettings);
export const insertCompanyLocationSchema = createInsertSchema(companyLocations);
export const insertQuoteTemplateSchema = createInsertSchema(quoteTemplates);
export const insertEmailConfigurationSchema = createInsertSchema(emailConfigurations);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates);
export const insertTemplateVersionSchema = createInsertSchema(templateVersions);
export const insertTemplateSectionSchema = createInsertSchema(templateSections);
export const insertTemplateAuditSchema = createInsertSchema(templateAudit);
export const insertTemplateAssignmentSchema = createInsertSchema(templateAssignments);
export const insertTermsConditionsSchema = createInsertSchema(termsConditionsLibrary);
export const insertHandlingCostsConfigSchema = createInsertSchema(handlingCostsConfig);

// Procurement schemas
export const insertPurchaseRequisitionSchema = createInsertSchema(purchaseRequisitions);
export const insertRequisitionItemSchema = createInsertSchema(requisitionItems);
export const insertApprovalRuleSchema = createInsertSchema(approvalRules);
export const insertApprovalHistorySchema = createInsertSchema(approvalHistory);
export const insertRfqRequestSchema = createInsertSchema(rfqRequests);
export const insertRfqResponseSchema = createInsertSchema(rfqResponses);
export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts);
export const insertGoodsReceiptItemSchema = createInsertSchema(goodsReceiptItems);
export const insertRfqEvaluationTemplateSchema = createInsertSchema(rfqEvaluationTemplates);
export const insertRfqResponseEvaluationSchema = createInsertSchema(rfqResponseEvaluations);
export const insertRfqResponseDocumentSchema = createInsertSchema(rfqResponseDocuments);
export const insertRfqApprovalOverrideSchema = createInsertSchema(rfqApprovalOverrides);

// Type exports for new tables
export type OrganizationSetting = typeof organizationSettings.$inferSelect;
export type InsertOrganizationSetting = z.infer<typeof insertOrganizationSettingSchema>;

export type CompanyLocation = typeof companyLocations.$inferSelect;
export type InsertCompanyLocation = z.infer<typeof insertCompanyLocationSchema>;

export type QuoteTemplate = typeof quoteTemplates.$inferSelect;
export type InsertQuoteTemplate = z.infer<typeof insertQuoteTemplateSchema>;

export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;

export type TemplateVersion = typeof templateVersions.$inferSelect;
export type InsertTemplateVersion = z.infer<typeof insertTemplateVersionSchema>;

export type TemplateSection = typeof templateSections.$inferSelect;
export type InsertTemplateSection = z.infer<typeof insertTemplateSectionSchema>;

export type TemplateAudit = typeof templateAudit.$inferSelect;
export type InsertTemplateAudit = z.infer<typeof insertTemplateAuditSchema>;

export type TemplateAssignment = typeof templateAssignments.$inferSelect;
export type InsertTemplateAssignment = z.infer<typeof insertTemplateAssignmentSchema>;

export type TermsConditions = typeof termsConditionsLibrary.$inferSelect;
export type InsertTermsConditions = z.infer<typeof insertTermsConditionsSchema>;

export type HandlingCostsConfiguration = typeof handlingCostsConfig.$inferSelect;

export type RfqEvaluationTemplate = typeof rfqEvaluationTemplates.$inferSelect;
export type InsertRfqEvaluationTemplate = z.infer<typeof insertRfqEvaluationTemplateSchema>;

export type RfqResponseEvaluation = typeof rfqResponseEvaluations.$inferSelect;
export type InsertRfqResponseEvaluation = z.infer<typeof insertRfqResponseEvaluationSchema>;

export type RfqResponseDocument = typeof rfqResponseDocuments.$inferSelect;
export type InsertRfqResponseDocument = z.infer<typeof insertRfqResponseDocumentSchema>;

export type RfqApprovalOverride = typeof rfqApprovalOverrides.$inferSelect;
export type InsertRfqApprovalOverride = z.infer<typeof insertRfqApprovalOverrideSchema>;
export type InsertHandlingCostsConfiguration = z.infer<typeof insertHandlingCostsConfigSchema>;

export type ClientPortalAccess = typeof clientPortalAccess.$inferSelect;
export type QuoteActivityLog = typeof quoteActivityLogs.$inferSelect;
export type ESignatureConfiguration = typeof esignatureConfigurations.$inferSelect;
export type CurrencyConfiguration = typeof currencyConfigurations.$inferSelect;

// Procurement type exports
export type PurchaseRequisition = typeof purchaseRequisitions.$inferSelect;
export type InsertPurchaseRequisition = z.infer<typeof insertPurchaseRequisitionSchema>;

export type RequisitionItem = typeof requisitionItems.$inferSelect;
export type InsertRequisitionItem = z.infer<typeof insertRequisitionItemSchema>;

export type ApprovalRule = typeof approvalRules.$inferSelect;
export type InsertApprovalRule = z.infer<typeof insertApprovalRuleSchema>;

export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;

export type RfqRequest = typeof rfqRequests.$inferSelect;
export type InsertRfqRequest = z.infer<typeof insertRfqRequestSchema>;

export type RfqResponse = typeof rfqResponses.$inferSelect;
export type InsertRfqResponse = z.infer<typeof insertRfqResponseSchema>;

export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type InsertGoodsReceipt = z.infer<typeof insertGoodsReceiptSchema>;

export type GoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
export type InsertGoodsReceiptItem = z.infer<typeof insertGoodsReceiptItemSchema>;

// Data Management - Backup System
export const backupMetadata = pgTable("backup_metadata", {
  id: serial("id").primaryKey(),
  backupId: text("backup_id").notNull().unique(), // Unique identifier for this backup
  backupName: text("backup_name").notNull(),
  description: text("description"),
  backupType: text("backup_type").notNull(), // 'manual', 'pre_clear', 'scheduled'
  categories: jsonb("categories").notNull(), // Array of categories backed up ['procurement', 'jobs', 'finance']
  tableCount: integer("table_count").notNull(),
  recordCount: integer("record_count").notNull(),
  backupSize: integer("backup_size"), // Size in bytes
  status: text("status").notNull().default("active"), // 'active', 'restoring', 'deleted'
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  restoredAt: timestamp("restored_at"),
  deletedAt: timestamp("deleted_at"),
});

// Data Management - Backup Data Storage
export const backupData = pgTable("backup_data", {
  id: serial("id").primaryKey(),
  backupId: text("backup_id").references(() => backupMetadata.backupId).notNull(),
  tableName: text("table_name").notNull(),
  recordData: jsonb("record_data").notNull(), // Complete record as JSON
  recordId: integer("original_record_id"), // Original record ID for reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Numbering Sequences - Store current sequence numbers
export const numberingSequences = pgTable("numbering_sequences", {
  id: serial("id").primaryKey(),
  sequenceType: text("sequence_type").notNull().unique(), // 'PO', 'REQ', 'RFQ', 'INV', 'QUOTE', etc.
  currentNumber: integer("current_number").notNull().default(0),
  prefix: text("prefix").notNull(), // 'PO-', 'REQ-', 'RFQ-'
  includeYear: boolean("include_year").default(false), // Whether to include year in number
  padLength: integer("pad_length").default(5), // How many digits to pad (00001)
  startingNumber: integer("starting_number").default(1), // User-defined starting number
  lastResetAt: timestamp("last_reset_at"),
  lastResetBy: integer("last_reset_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consumption Rate Settings - Track consumable usage rates for operations
export const consumptionRateSettings = pgTable("consumption_rate_settings", {
  id: serial("id").primaryKey(),
  operationType: text("operation_type").notNull(),
  method: text("method"),
  materialType: text("material_type"),
  thicknessMin: decimal("thickness_min", { precision: 6, scale: 2 }),
  thicknessMax: decimal("thickness_max", { precision: 6, scale: 2 }),
  diameterMin: decimal("diameter_min", { precision: 6, scale: 2 }),
  diameterMax: decimal("diameter_max", { precision: 6, scale: 2 }),
  laborHoursPerUnit: decimal("labor_hours_per_unit", { precision: 8, scale: 4 }),
  laborUnit: text("labor_unit"),
  skillLevel: text("skill_level"),
  crewSize: integer("crew_size").default(1),
  primaryConsumable: text("primary_consumable"),
  primaryConsumableRate: decimal("primary_consumable_rate", { precision: 10, scale: 4 }),
  primaryConsumableUnit: text("primary_consumable_unit"),
  secondaryConsumable: text("secondary_consumable"),
  secondaryConsumableRate: decimal("secondary_consumable_rate", { precision: 10, scale: 4 }),
  secondaryConsumableUnit: text("secondary_consumable_unit"),
  equipmentCostPerHour: decimal("equipment_cost_per_hour", { precision: 10, scale: 2 }),
  equipmentUtilization: decimal("equipment_utilization", { precision: 5, scale: 2 }).default("100"),
  notes: text("notes"),
  isCompanyDefault: boolean("is_company_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Operation Templates - Reusable operation definitions
export const operationTemplates = pgTable("operation_templates", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  operationType: text("operation_type").notNull(),
  category: text("category").notNull(),
  operationData: jsonb("operation_data"),
  method: text("method"),
  position: text("position"),
  defaultLaborHours: decimal("default_labor_hours", { precision: 8, scale: 2 }),
  defaultHourlyRate: decimal("default_hourly_rate", { precision: 10, scale: 2 }),
  includeInLabor: boolean("include_in_labor").default(true),
  includeInConsumables: boolean("include_in_consumables").default(false),
  includeInCoatings: boolean("include_in_coatings").default(false),
  includeInEquipment: boolean("include_in_equipment").default(false),
  isCompanyStandard: boolean("is_company_standard").default(false),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for backup system
export const insertBackupMetadataSchema = createInsertSchema(backupMetadata);
export const insertBackupDataSchema = createInsertSchema(backupData);
export const insertNumberingSequenceSchema = createInsertSchema(numberingSequences);
export const insertConsumptionRateSettingsSchema = createInsertSchema(consumptionRateSettings);
export const insertOperationTemplatesSchema = createInsertSchema(operationTemplates);

// Type exports for backup system
export type BackupMetadata = typeof backupMetadata.$inferSelect;
export type InsertBackupMetadata = z.infer<typeof insertBackupMetadataSchema>;

export type BackupData = typeof backupData.$inferSelect;
export type InsertBackupData = z.infer<typeof insertBackupDataSchema>;

export type NumberingSequence = typeof numberingSequences.$inferSelect;
export type InsertNumberingSequence = z.infer<typeof insertNumberingSequenceSchema>;

export type ConsumptionRateSetting = typeof consumptionRateSettings.$inferSelect;
export type InsertConsumptionRateSetting = z.infer<typeof insertConsumptionRateSettingsSchema>;

export type OperationTemplate = typeof operationTemplates.$inferSelect;
export type InsertOperationTemplate = z.infer<typeof insertOperationTemplatesSchema>;

// Quality Inspections table - Comprehensive quality control tracking
export const qualityInspections = pgTable("quality_inspections", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  productionEventId: integer("production_event_id").references(() => productionEvents.id),
  inspectionNumber: text("inspection_number").notNull().unique(),
  inspectionType: text("inspection_type").notNull(), // 'material_receipt', 'in_process', 'final', 'pre_delivery'
  
  // What's being inspected
  materialId: integer("material_id").references(() => materials.id),
  partNumber: text("part_number"),
  quantity: integer("quantity"),
  batchNumber: text("batch_number"),
  
  // Inspection Details
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  inspectionDate: timestamp("inspection_date").notNull(),
  dueDate: timestamp("due_date"),
  location: text("location"),
  department: text("department"),
  
  // Standards and Specifications
  specification: text("specification"),
  toleranceMin: decimal("tolerance_min", { precision: 10, scale: 4 }),
  toleranceMax: decimal("tolerance_max", { precision: 10, scale: 4 }),
  actualMeasurement: decimal("actual_measurement", { precision: 10, scale: 4 }),
  measurementUnit: text("measurement_unit"),
  
  // Results
  status: text("status").notNull().default('pending'), // 'pending', 'passed', 'failed', 'conditional'
  defectsFound: jsonb("defects_found"), // Array of defect details
  correctiveAction: text("corrective_action"),
  
  // Documentation
  certificateNumber: text("certificate_number"),
  reportPath: text("report_path"),
  photos: jsonb("photos"), // Array of photo paths
  attachments: jsonb("attachments"), // Array of document paths
  
  // Metadata
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at")
});

// Inventory Movements table - Track all inventory transactions
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  movementNumber: text("movement_number").notNull().unique(),
  movementType: text("movement_type").notNull(), // 'receipt', 'issue', 'transfer', 'adjustment', 'return'
  movementDate: timestamp("movement_date").notNull(),
  
  // Source and Destination
  sourceLocation: text("source_location"),
  destinationLocation: text("destination_location"),
  sourceJobId: integer("source_job_id").references(() => jobs.id),
  destinationJobId: integer("destination_job_id").references(() => jobs.id),
  
  // Material Details
  materialId: integer("material_id").references(() => materials.id).notNull(),
  inventoryId: integer("inventory_id").references(() => inventory.id),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
  
  // Financial Impact
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  
  // References
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id),
  workOrderId: integer("work_order_id"),
  
  // Tracking
  batchNumber: text("batch_number"),
  serialNumber: text("serial_number"),
  certificateNumber: text("certificate_number"),
  
  // Status and Approval
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'completed', 'cancelled'
  reason: text("reason"),
  notes: text("notes"),
  
  // Metadata
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Safety Inspections table - Safety and compliance tracking
export const safetyInspections = pgTable("safety_inspections", {
  id: serial("id").primaryKey(),
  inspectionNumber: text("inspection_number").notNull().unique(),
  inspectionType: text("inspection_type").notNull(), // 'workplace', 'equipment', 'ppe', 'environmental', 'incident'
  
  // Location and Context
  location: text("location").notNull(),
  department: text("department"),
  jobId: integer("job_id").references(() => jobs.id),
  equipmentId: integer("equipment_id"),
  
  // Inspection Details
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  inspectionDate: timestamp("inspection_date").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  nextInspectionDue: timestamp("next_inspection_due"),
  
  // Checklist and Results
  checklistTemplate: text("checklist_template"),
  checklistResults: jsonb("checklist_results"), // Array of checklist items with pass/fail
  overallResult: text("overall_result").notNull(), // 'pass', 'fail', 'conditional'
  riskLevel: text("risk_level"), // 'low', 'medium', 'high', 'critical'
  
  // Issues Found
  hazardsIdentified: jsonb("hazards_identified"), // Array of hazard details
  nonConformities: jsonb("non_conformities"), // Array of non-conformity details
  correctiveActions: jsonb("corrective_actions"), // Array of required actions
  
  // Follow-up
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpCompleted: boolean("follow_up_completed").default(false),
  
  // Documentation
  reportPath: text("report_path"),
  photos: jsonb("photos"), // Array of photo paths
  attachments: jsonb("attachments"), // Array of document paths
  
  // Compliance
  regulatoryStandard: text("regulatory_standard"), // e.g., 'AS/NZS 4801', 'ISO 45001'
  permitNumber: text("permit_number"),
  
  // Metadata
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at")
});

// Documents table - Unified document management system
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  documentNumber: text("document_number").notNull().unique(),
  documentType: text("document_type").notNull(), // 'certificate', 'report', 'drawing', 'specification', 'manual', 'permit'
  category: text("category").notNull(), // 'quality', 'safety', 'procurement', 'technical', 'compliance'
  
  // Document Details
  title: text("title").notNull(),
  description: text("description"),
  version: text("version").default('1.0'),
  status: text("status").notNull().default('active'), // 'draft', 'active', 'review', 'archived', 'obsolete'
  
  // File Information
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  checksum: text("checksum"), // for integrity verification
  
  // References (polymorphic associations)
  entityType: text("entity_type"), // 'job', 'material', 'supplier', 'client', 'equipment', 'user'
  entityId: integer("entity_id"),
  jobId: integer("job_id").references(() => jobs.id),
  materialId: integer("material_id").references(() => materials.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  clientId: integer("client_id").references(() => clients.id),
  
  // Document Metadata
  issuer: text("issuer"), // Organization that issued the document
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  reviewDate: timestamp("review_date"),
  
  // Access Control
  confidentialityLevel: text("confidentiality_level").default('internal'), // 'public', 'internal', 'confidential', 'restricted'
  accessGroups: jsonb("access_groups"), // Array of role IDs that can access
  
  // Tracking
  keywords: text("keywords").array(),
  tags: jsonb("tags"), // Array of tags for searching
  customFields: jsonb("custom_fields"), // Flexible metadata storage
  
  // Audit
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  lastAccessedBy: integer("last_accessed_by").references(() => users.id),
  lastAccessedAt: timestamp("last_accessed_at"),
  downloadCount: integer("download_count").default(0),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  archivedBy: integer("archived_by").references(() => users.id),
  archivedAt: timestamp("archived_at")
});

// Work Orders table - Track production work orders
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  
  // Order Details
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default('normal'), // 'urgent', 'high', 'normal', 'low'
  type: text("type").notNull(), // 'production', 'rework', 'maintenance', 'prototype'
  
  // Quantities
  targetQuantity: integer("target_quantity").notNull(),
  completedQuantity: integer("completed_quantity").default(0),
  scrapQuantity: integer("scrap_quantity").default(0),
  
  // Scheduling
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  
  // Status
  status: text("status").default('pending'), // 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'
  
  // Reference
  departmentId: integer("department_id"),
  assignedTo: integer("assigned_to").references(() => users.id),
  
  // Metadata
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Machines table - Track all factory machines and equipment
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  machineCode: text("machine_code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'laser_cutter', 'plasma_cutter', 'press_brake', 'welding_station', 'drill', 'saw', 'grinder', 'paint_booth'
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  
  // Location
  department: text("department").notNull(), // 'cutting', 'welding', 'assembly', 'finishing', 'drilling', 'painting', 'qc', 'packing'
  workStation: text("work_station"),
  floor: text("floor"),
  
  // Specifications
  capacity: jsonb("capacity"), // Machine-specific capacity metrics
  powerRating: decimal("power_rating", { precision: 10, scale: 2 }), // kW
  yearManufactured: integer("year_manufactured"),
  
  // Status
  status: text("status").notNull().default('operational'), // 'operational', 'maintenance', 'breakdown', 'idle', 'decommissioned'
  currentState: text("current_state").default('stopped'), // 'running', 'idle', 'stopped', 'error', 'maintenance'
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  
  // Performance Metrics
  targetEfficiency: decimal("target_efficiency", { precision: 5, scale: 2 }).default('85'), // Target efficiency percentage
  targetUptime: decimal("target_uptime", { precision: 5, scale: 2 }).default('90'), // Target uptime percentage
  
  // Tracking
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 12, scale: 2 }),
  warrantyExpiry: timestamp("warranty_expiry"),
  
  // Metadata
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Machine Status Logs - Track machine state changes over time
export const machineStatusLogs = pgTable("machine_status_logs", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => machines.id).notNull(),
  
  // Status Change
  previousState: text("previous_state"),
  newState: text("new_state").notNull(), // 'running', 'idle', 'stopped', 'error', 'maintenance'
  reason: text("reason"), // Reason for state change
  
  // Duration Tracking
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  
  // Production Metrics during this period
  unitsProduced: integer("units_produced").default(0),
  scrapCount: integer("scrap_count").default(0),
  
  // Reference
  jobId: integer("job_id").references(() => jobs.id),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  operatorId: integer("operator_id").references(() => users.id),
  shiftId: integer("shift_id"),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Production Events - Track actual production output
export const productionEvents = pgTable("production_events", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => machines.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  
  // Event Details
  eventType: text("event_type").notNull(), // 'start', 'complete', 'pause', 'resume', 'scrap', 'rework'
  eventTime: timestamp("event_time").notNull(),
  
  // Production Data
  quantity: integer("quantity").default(0),
  unitType: text("unit_type"), // 'pieces', 'meters', 'kg', etc.
  materialUsed: decimal("material_used", { precision: 10, scale: 2 }),
  materialWeight: decimal("material_weight", { precision: 10, scale: 2 }), // Weight in kg
  
  // Quality
  passedQC: boolean("passed_qc"),
  defectCount: integer("defect_count").default(0),
  defectTypes: jsonb("defect_types"), // Array of defect categories
  
  // Performance
  cycleTime: integer("cycle_time"), // seconds
  setupTime: integer("setup_time"), // seconds
  actualVsTarget: decimal("actual_vs_target", { precision: 5, scale: 2 }), // percentage
  
  // Reference
  operatorId: integer("operator_id").references(() => users.id),
  shiftId: integer("shift_id"),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  workOrderNumber: text("work_order_number"),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Production Shifts - Track shift data
export const productionShifts = pgTable("production_shifts", {
  id: serial("id").primaryKey(),
  shiftDate: date("shift_date").notNull(),
  shiftType: text("shift_type").notNull(), // 'morning', 'afternoon', 'night'
  
  // Timing
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakMinutes: integer("break_minutes").default(0),
  
  // Staffing
  supervisorId: integer("supervisor_id").references(() => users.id),
  operatorCount: integer("operator_count").default(0),
  
  // Production Summary
  totalOutput: integer("total_output").default(0),
  totalScrap: integer("total_scrap").default(0),
  totalRework: integer("total_rework").default(0),
  
  // Performance Metrics
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }),
  qualityRate: decimal("quality_rate", { precision: 5, scale: 2 }),
  
  // Status
  status: text("status").default('active'), // 'planned', 'active', 'completed', 'cancelled'
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Production Metrics - Calculated metrics snapshot
export const productionMetrics = pgTable("production_metrics", {
  id: serial("id").primaryKey(),
  metricDate: date("metric_date").notNull(),
  metricHour: integer("metric_hour"), // 0-23 for hourly metrics
  
  // OEE Components
  availability: decimal("availability", { precision: 5, scale: 2 }),
  performance: decimal("performance", { precision: 5, scale: 2 }),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  oeeScore: decimal("oee_score", { precision: 5, scale: 2 }),
  
  // Production Metrics
  totalOutput: integer("total_output").default(0),
  totalScrap: integer("total_scrap").default(0),
  totalRework: integer("total_rework").default(0),
  firstPassYield: decimal("first_pass_yield", { precision: 5, scale: 2 }),
  
  // Machine Metrics
  totalMachines: integer("total_machines").default(0),
  activeMachines: integer("active_machines").default(0),
  idleMachines: integer("idle_machines").default(0),
  maintenanceMachines: integer("maintenance_machines").default(0),
  
  // Department Breakdown
  departmentMetrics: jsonb("department_metrics"), // Metrics by department
  
  // Material Usage
  materialConsumption: jsonb("material_consumption"), // Material usage by type
  
  // Shift Data
  shiftId: integer("shift_id").references(() => productionShifts.id),
  
  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Machine Job Assignments - Junction table for tracking which machines are working on which jobs
export const machineJobAssignments = pgTable("machine_job_assignments", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => machines.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  
  // Assignment Details
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default('assigned'), // 'assigned', 'in_progress', 'completed', 'cancelled'
  
  // Production Tracking
  targetQuantity: integer("target_quantity"),
  completedQuantity: integer("completed_quantity").default(0),
  materialWeight: decimal("material_weight", { precision: 10, scale: 2 }), // Expected weight
  actualMaterialWeight: decimal("actual_material_weight", { precision: 10, scale: 2 }), // Actual weight used
  
  // Performance
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 8, scale: 2 }),
  
  // Reference
  operatorId: integer("operator_id").references(() => users.id),
  priority: integer("priority").default(0),
  
  // Metadata
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Geometry tables for DXF/DWG parsing with 0.01mm precision
export const aiMtoGeometries = pgTable("ai_mto_geometries", {
  id: serial("id").primaryKey(),
  elementId: integer("element_id").references(() => aiMtoElements.id, { onDelete: "cascade" }),
  geometryType: text("geometry_type").notNull(), // 'polyline', 'arc', 'circle', 'spline', '3dface', etc
  sourceFileId: integer("source_file_id").references(() => drawingDocuments.id),
  layer: text("layer"),
  placement: text("placement"), // 'parent', 'nested', 'child'
  bboxMinX: decimal("bbox_min_x", { precision: 18, scale: 4 }), // millimeters with 0.01mm precision
  bboxMinY: decimal("bbox_min_y", { precision: 18, scale: 4 }),
  bboxMinZ: decimal("bbox_min_z", { precision: 18, scale: 4 }),
  bboxMaxX: decimal("bbox_max_x", { precision: 18, scale: 4 }),
  bboxMaxY: decimal("bbox_max_y", { precision: 18, scale: 4 }),
  bboxMaxZ: decimal("bbox_max_z", { precision: 18, scale: 4 }),
  centroidX: decimal("centroid_x", { precision: 18, scale: 4 }),
  centroidY: decimal("centroid_y", { precision: 18, scale: 4 }),
  centroidZ: decimal("centroid_z", { precision: 18, scale: 4 }),
  areaMm2: decimal("area_mm2", { precision: 18, scale: 4 }),
  perimeterMm: decimal("perimeter_mm", { precision: 18, scale: 4 }),
  thicknessMm: decimal("thickness_mm", { precision: 18, scale: 4 }),
  angleDeg: decimal("angle_deg", { precision: 10, scale: 4 }),
  metadata: jsonb("metadata"), // raw DXF/DWG attributes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id)
});

export const aiMtoFeatures = pgTable("ai_mto_features", {
  id: serial("id").primaryKey(),
  geometryId: integer("geometry_id").references(() => aiMtoGeometries.id, { onDelete: "cascade" }).notNull(),
  featureType: text("feature_type").notNull(), // 'hole', 'fold_line', 'notch', 'cutout', 'angle', 'bend'
  profileData: jsonb("profile_data"), // ordered points in mm with 0.01mm precision
  diameterMm: decimal("diameter_mm", { precision: 18, scale: 4 }),
  lengthMm: decimal("length_mm", { precision: 18, scale: 4 }),
  widthMm: decimal("width_mm", { precision: 18, scale: 4 }),
  heightMm: decimal("height_mm", { precision: 18, scale: 4 }),
  orientationDeg: decimal("orientation_deg", { precision: 10, scale: 4 }),
  parentFeatureId: integer("parent_feature_id").references(() => aiMtoFeatures.id),
  toleranceMm: decimal("tolerance_mm", { precision: 8, scale: 4 }).default('0.005'), // ±0.005mm tolerance
  createdAt: timestamp("created_at").defaultNow()
});

// Create insert schemas
export const insertQualityInspectionSchema = createInsertSchema(qualityInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSafetyInspectionSchema = createInsertSchema(safetyInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true
});

// Type exports
export type QualityInspection = typeof qualityInspections.$inferSelect;
export type InsertQualityInspection = z.infer<typeof insertQualityInspectionSchema>;

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

export type SafetyInspection = typeof safetyInspections.$inferSelect;
export type InsertSafetyInspection = z.infer<typeof insertSafetyInspectionSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Machine schemas
export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMachineStatusLogSchema = createInsertSchema(machineStatusLogs).omit({
  id: true,
  createdAt: true
});

export const insertProductionEventSchema = createInsertSchema(productionEvents).omit({
  id: true,
  createdAt: true
});

export const insertProductionShiftSchema = createInsertSchema(productionShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductionMetricSchema = createInsertSchema(productionMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMachineJobAssignmentSchema = createInsertSchema(machineJobAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true
});

// Work Order type exports
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

// Machine type exports
export type Machine = typeof machines.$inferSelect;
export type InsertMachine = z.infer<typeof insertMachineSchema>;

export type MachineStatusLog = typeof machineStatusLogs.$inferSelect;
export type InsertMachineStatusLog = z.infer<typeof insertMachineStatusLogSchema>;

export type ProductionEvent = typeof productionEvents.$inferSelect;
export type InsertProductionEvent = z.infer<typeof insertProductionEventSchema>;

export type ProductionShift = typeof productionShifts.$inferSelect;
export type InsertProductionShift = z.infer<typeof insertProductionShiftSchema>;

export type ProductionMetric = typeof productionMetrics.$inferSelect;
export type InsertProductionMetric = z.infer<typeof insertProductionMetricSchema>;

export type MachineJobAssignment = typeof machineJobAssignments.$inferSelect;
export type InsertMachineJobAssignment = z.infer<typeof insertMachineJobAssignmentSchema>;

// ---------- Back-compat aliases for service imports ----------
/**
 * These aliases keep older service code working after schema renames.
 * The right-hand sides correspond to the real table constants defined above.
 */
export const purchaseRequisitionItems = requisitionItems;
export const rfqItems = rfqRequests;
// ---------- Back-compat aliases (added 2025-10-24) ----------
//
// These aliases resolve missing imports from older service code.
// They point to the most closely related schema tables.

export const supplierMaterialCategories = materialSuppliers;
export const aiCacheEntries = supplierTemplates; // placeholder until ai_cache table is defined
