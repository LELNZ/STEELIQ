import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, varchar, numeric, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
  role: text("role").notNull().default("basic"), // basic, planning, accounting, supervisor, admin, full
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
export const drawingRevisions = pgTable("drawing_revisions", {
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
  jobId: integer("job_id").references(() => jobs.id),
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
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 10, scale: 2 }).default("0"),
  unit: text("unit").default("m"), // m, kg, each, etc.
  deliveryDate: timestamp("delivery_date"),
  notes: text("notes"),
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
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(),
  type: text("type").notNull(), // supplier_quote, customer_quote
  supplierId: integer("supplier_id").references(() => suppliers.id),
  jobId: integer("job_id").references(() => jobs.id),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired
  quoteDate: timestamp("quote_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  acceptedDate: timestamp("accepted_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("NZD"),
  notes: text("notes"),
  termsConditions: text("terms_conditions"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

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

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export const aiCuttingOptimization = pgTable("ai_cutting_optimization", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  materialType: text("material_type").notNull(), // linear, sheet, angle
  stockLength: integer("stock_length").notNull(), // standard lengths 6000, 9000, 12000
  cutList: jsonb("cut_list").notNull(), // array of required cuts with angles
  optimization: jsonb("optimization"), // optimized nesting solution
  wastePercentage: decimal("waste_percentage"),
  totalStock: integer("total_stock"), // pieces of stock required
  algorithm: text("algorithm").default("genetic"), // genetic, simulated_annealing, ml
  efficiency: decimal("efficiency"), // 0-1 score
  createdAt: timestamp("created_at").defaultNow(),
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

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type ContactDocument = typeof contactDocuments.$inferSelect;
export type InsertContactDocument = z.infer<typeof insertContactDocumentSchema>;

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

export const estimationMaterials = pgTable("estimation_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => estimationProjects.id),
  materialId: integer("material_id").references(() => materials.id),
  materialCode: text("material_code").notNull(),
  materialName: text("material_name").notNull(),
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
  category: text("category").notNull(), // workshop, onsite, subcontractor
  type: text("type").notNull(), // fabrication, welding, assembly, finishing, etc.
  description: text("description").notNull(),
  hours: decimal("hours", { precision: 8, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  skillLevel: text("skill_level"), // apprentice, tradesman, supervisor, specialist
  crew: integer("crew").default(1), // number of people
  notes: text("notes"),
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

export const insertEstimationTemplateSchema = createInsertSchema(estimationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiEstimationHistorySchema = createInsertSchema(aiEstimationHistory).omit({
  id: true,
  createdAt: true,
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

export type EstimationTemplate = typeof estimationTemplates.$inferSelect;
export type InsertEstimationTemplate = z.infer<typeof insertEstimationTemplateSchema>;

export type AiEstimationHistory = typeof aiEstimationHistory.$inferSelect;
export type InsertAiEstimationHistory = z.infer<typeof insertAiEstimationHistorySchema>;

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
  
  // First Aid Certifications
  firstAidCertifications: jsonb("first_aid_certifications"), // Array of first aid certs
  
  // Welding Qualifications  
  weldingQualifications: jsonb("welding_qualifications"), // Array of welding quals
  
  // Working at Heights
  workingAtHeightsCerts: jsonb("working_at_heights_certs"), // Array of height certs
  
  // Driver's License
  driversLicenseClass: varchar("drivers_license_class", { length: 100 }), // NZ license classes
  driversLicenseExpiry: date("drivers_license_expiry"),
  driversLicenseDocument: text("drivers_license_document"), // File path
  
  // Trade Qualifications
  tradeQualifications: jsonb("trade_qualifications"), // Array of trade quals
  
  // Visa & Immigration (moved from Additional to H&S)
  visaType: varchar("visa_type", { length: 100 }),
  visaNumber: varchar("visa_number", { length: 50 }),
  visaExpiry: date("visa_expiry"),
  visaDocument: text("visa_document"), // File path
  workEligibility: boolean("work_eligibility").default(true),
  
  // Banking & Financial Information  
  bankAccountName: varchar("bank_account_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankSortCode: varchar("bank_sort_code", { length: 20 }),
  taxNumber: varchar("tax_number", { length: 50 }), // IRD number
  kiwisaverProvider: varchar("kiwisaver_provider", { length: 100 }),
  kiwisaverRate: decimal("kiwisaver_rate", { precision: 5, scale: 2 }).default("3"),
  
  // Performance & Review
  performanceRating: decimal("performance_rating", { precision: 3, scale: 1 }), // 1.0 to 5.0
  lastReviewDate: date("last_review_date"),
  nextReviewDate: date("next_review_date"),
  
  // Benefits & Leave
  annualLeaveEntitlement: decimal("annual_leave_entitlement", { precision: 5, scale: 2 }).default("20"), // days
  sickLeaveEntitlement: decimal("sick_leave_entitlement", { precision: 5, scale: 2 }).default("5"), // days
  currentLeaveBalance: decimal("current_leave_balance", { precision: 5, scale: 2 }).default("0"),
  
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

// Employee Archive & Audit Types
export type ArchivedEmployee = typeof archivedEmployees.$inferSelect;
export type InsertArchivedEmployee = typeof archivedEmployees.$inferInsert;
export type EmployeeAuditLog = typeof employeeAuditLog.$inferSelect;
export type InsertEmployeeAuditLog = typeof employeeAuditLog.$inferInsert;
export type ArchivedTimesheet = typeof archivedTimesheets.$inferSelect;
export type InsertArchivedTimesheet = typeof archivedTimesheets.$inferInsert;
