import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
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
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  lengthOptions: text("length_options"), // Length Options (m) - stored as text for multiple values
  grade: text("grade"),
  standard: text("standard"), // Standard (e.g., AS/NZS 1163)
  coating: text("coating"),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 2 }), // m²/m for coating calculations
  coatingConfig: jsonb("coating_config"), // Stores surface area calculation preferences
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

// Clients - customer/client management with professional requirements
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Primary company/client name
  company: text("company").notNull(), // Company name
  type: text("type").notNull().default("client"), // client, customer, contractor
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  country: text("country").default("New Zealand"),
  nzbn: text("nzbn"), // New Zealand Business Number
  gstNumber: text("gst_number"),
  website: text("website"),
  industry: text("industry"),
  customerSince: timestamp("customer_since"),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  paymentTerms: text("payment_terms").default("30 days"),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
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
  company: text("company").notNull(), // Duplicate for compatibility
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
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
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
