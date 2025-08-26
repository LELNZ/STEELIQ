import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { businessSettingsStorage } from "./businessSettings";
import { laborRatesStorage } from "./laborRates";
import { teamStorage, DEFAULT_SYSTEM_ROLES } from "./team";
import { timeManagementStorage } from "./timeManagement";
import { AuthService } from "./auth";
import { quotationManagementStorage } from "./quotationManagement";
import { insertJobSchema, insertMaterialSchema, insertInventorySchema, insertJobMaterialSchema, insertOptimizationSimulationSchema, insertSupplierSchema, insertMaterialSupplierSchema, insertSupplierPriceHistorySchema, insertUserSchema, insertClientSchema, insertSupplierContactSchema, insertClientContactSchema, users, roles, departments, teamMembers, performanceReviews, qualificationReminders, settings, settingsAudit, laborRateCards, payrollIntegration, timeClocks, organizationSettings, companyLocations, emailAccounts, supplierTemplates, importedCosts, costVariances, emailSyncLogs, suppliers, jobs, drawings, drawingProjects, materialTakeoffs, remnants, jobMaterials, weldingStandards, drillingStandards, cuttingStandards, positionFactors, assemblyTemplates, laborDefaults, materialSubItems, laborRates, laborRateHistory, skillLevels, laborAllowances, estimationLabor } from "@shared/schema";
import { z } from "zod";
import bcrypt from 'bcrypt';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { analyzeConstructionDrawing, validateSteelSpecifications } from "./pdf-analysis";
import { googleAuth } from "./googleAuth";
import { emailService } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment monitoring
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Import/Export validation schemas
  const supplierImportSchema = z.object({
    name: z.string().min(1, "Company name is required"),
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().default("New Zealand"),
    nzbn: z.string().optional(),
    gstNumber: z.string().optional(),
    companyNumber: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    paymentTerms: z.string().default("30 days"),
    assignedProjectManager: z.string().optional(),
    creditLimit: z.string().transform(val => val ? parseFloat(val) : 0),
    discountRate: z.string().default("0"),
    industry: z.string().optional(),
    type: z.string().default("vendor"),
    preferredCurrency: z.string().default("NZD"),
    isActive: z.string().transform(val => val.toLowerCase() === 'true').default(true)
  });

  const contactImportSchema = z.object({
    supplierName: z.string().optional(),
    clientName: z.string().optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    position: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phonePrimary: z.string().optional(),
    phoneMobile: z.string().optional(),
    phoneDirect: z.string().optional(),
    isPrimaryContact: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
    isAccountsContact: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
    isTechnicalContact: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
    isSalesContact: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
    preferredContactMethod: z.string().default("email"),
    notes: z.string().optional(),
    isActive: z.string().transform(val => val?.toLowerCase() === 'true').optional()
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobsWithMaterials();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid job data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const jobData = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(id, jobData);
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid job data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason = "Deleted by user" } = req.body;
      
      // Get current user from session
      const user = await AuthService.getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Archive the job before deletion
      const { ArchivingService } = await import('./archiving');
      await ArchivingService.archiveJob(id, user.id, reason);
      
      res.json({ success: true, message: "Job archived and deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  app.post("/api/jobs/:id/copy", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      // Create a copy of the job with a new job number
      const newJobNumber = `JOB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const jobCopy = {
        ...job,
        id: undefined,
        jobNumber: newJobNumber,
        projectName: `${job.projectName} (Copy)`,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      delete jobCopy.id;
      
      const newJob = await storage.createJob(jobCopy);
      res.json(newJob);
    } catch (error) {
      console.error("Error copying job:", error);
      res.status(500).json({ error: "Failed to copy job" });
    }
  });

  // Materials routes
  app.get("/api/materials", async (req, res) => {
    try {
      const { search } = req.query;
      let materials;
      if (search && typeof search === "string") {
        materials = await storage.searchMaterials(search);
      } else {
        materials = await storage.getMaterials();
      }
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.get("/api/materials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ error: "Failed to fetch material" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      
      // Check if material with this code already exists
      const existingMaterial = await storage.getMaterialByCode(materialData.code);
      
      console.log(`Checking material ${materialData.code}: ${existingMaterial ? 'EXISTS' : 'NEW'}`);
      
      if (existingMaterial) {
        // Update existing material with new specifications
        console.log(`Updating material ${materialData.code} with ID ${existingMaterial.id}`);
        const updatedMaterial = await storage.updateMaterial(existingMaterial.id, materialData);
        res.status(200).json(updatedMaterial);
      } else {
        // Create new material
        console.log(`Creating new material ${materialData.code}`);
        const material = await storage.createMaterial(materialData);
        res.status(201).json(material);
      }
    } catch (error) {
      console.error("Error creating/updating material:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create/update material" });
    }
  });

  // Temporary workaround: Use POST for updates due to Vite routing conflicts
  app.post("/api/materials/:id/update", async (req, res) => {
    try {
      console.log(`POST update request for material ${req.params.id} with data:`, req.body);
      const id = parseInt(req.params.id);
      const materialData = insertMaterialSchema.partial().parse(req.body);
      
      const material = await storage.getMaterial(id);
      if (!material) {
        console.log(`Material ${id} not found`);
        return res.status(404).json({ error: "Material not found" });
      }
      
      const updatedMaterial = await storage.updateMaterial(id, materialData);
      console.log(`Successfully updated material ${id}: ${updatedMaterial.name}`);
      
      // Ensure we're sending JSON response
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(updatedMaterial);
    } catch (error) {
      console.error("Error updating material:", error);
      res.setHeader('Content-Type', 'application/json');
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update material" });
    }
  });

  app.patch("/api/materials/:id", async (req, res) => {
    try {
      console.log(`PATCH request for material ${req.params.id} with data:`, req.body);
      const id = parseInt(req.params.id);
      const materialData = insertMaterialSchema.partial().parse(req.body);
      
      const material = await storage.getMaterial(id);
      if (!material) {
        console.log(`Material ${id} not found`);
        return res.status(404).json({ error: "Material not found" });
      }
      
      const updatedMaterial = await storage.updateMaterial(id, materialData);
      console.log(`Successfully updated material ${id}: ${updatedMaterial.name}`);
      
      // Ensure we're sending JSON response
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(updatedMaterial);
    } catch (error) {
      console.error("Error updating material:", error);
      res.setHeader('Content-Type', 'application/json');
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update material" });
    }
  });

  // PUT handler for materials (needed for form compatibility)
  app.put("/api/materials/:id", async (req, res) => {
    try {
      console.log(`PUT request for material ${req.params.id} with data:`, JSON.stringify(req.body, null, 2));
      const id = parseInt(req.params.id);
      
      // Check if unitCost is present and log it specifically
      if (req.body.unitCost !== undefined) {
        console.log(`💰 Unit cost update: ${req.body.unitCost} (type: ${typeof req.body.unitCost})`);
      }
      
      const materialData = insertMaterialSchema.partial().parse(req.body);
      console.log(`📝 Parsed material data:`, JSON.stringify(materialData, null, 2));
      
      const material = await storage.getMaterial(id);
      if (!material) {
        console.log(`Material ${id} not found`);
        return res.status(404).json({ error: "Material not found" });
      }
      
      const updatedMaterial = await storage.updateMaterial(id, materialData);
      console.log(`✅ Successfully updated material ${id}: ${updatedMaterial.name}, new unitCost: ${updatedMaterial.unitCost}`);
      
      // Ensure we're sending JSON response
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(updatedMaterial);
    } catch (error) {
      console.error("Error updating material:", error);
      res.setHeader('Content-Type', 'application/json');
      if (error instanceof z.ZodError) {
        console.log("Zod validation errors:", error.errors);
        return res.status(400).json({ error: "Invalid material data", details: error.errors });
      }
      return res.status(500).json({ error: "Failed to update material" });
    }
  });

  // Move material to different category
  app.post("/api/materials/:id/move", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { category } = req.body;
      
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }
      
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      
      const updatedMaterial = await storage.updateMaterial(id, { category });
      console.log(`Successfully moved material ${id} to category: ${category}`);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(updatedMaterial);
    } catch (error) {
      console.error("Error moving material:", error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: "Failed to move material" });
    }
  });

  app.delete("/api/materials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const material = await storage.getMaterial(id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      
      await storage.deleteMaterial(id);
      console.log(`Successfully deleted material ${id}: ${material.name}`);
      res.status(200).json({ message: "Material deleted successfully" });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 5;
      const lowStockItems = await storage.getLowStockItems(threshold);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ error: "Failed to fetch low stock items" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const inventoryData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid inventory data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  // Job materials routes
  app.get("/api/jobs/:jobId/materials", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const materials = await storage.getJobMaterials(jobId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching job materials:", error);
      res.status(500).json({ error: "Failed to fetch job materials" });
    }
  });

  app.post("/api/jobs/:jobId/materials", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const materialData = insertJobMaterialSchema.parse({ ...req.body, jobId });
      const jobMaterial = await storage.createJobMaterial(materialData);
      res.status(201).json(jobMaterial);
    } catch (error) {
      console.error("Error adding material to job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid job material data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add material to job" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Cutting optimization routes
  app.post("/api/optimize/linear", async (req, res) => {
    try {
      const { requirements, stockLengths, algorithm = "minimize_waste" } = req.body;
      
      // Basic linear cutting optimization algorithm
      const cuts: Array<{ length: number; quantity: number }> = requirements;
      const stocks: Array<{ length: number; available: number }> = stockLengths;
      
      const optimizedPlans = [];
      let totalWaste = 0;
      let totalEfficiency = 0;
      
      for (const stock of stocks) {
        if (stock.available <= 0) continue;
        
        const plan = {
          stockLength: stock.length,
          cuts: [],
          wasteLength: stock.length,
          efficiency: 0,
        };
        
        let remainingLength = stock.length;
        const kerf = 2.4; // mm kerf width
        const userError = 0.5; // mm user error
        const totalKerf = kerf + userError;
        
        // Sort cuts by length (descending for better optimization)
        const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);
        
        for (const cut of sortedCuts) {
          let cutQuantity = 0;
          while (cutQuantity < cut.quantity && remainingLength >= cut.length + totalKerf) {
            plan.cuts.push({
              length: cut.length,
              position: stock.length - remainingLength,
            });
            remainingLength -= (cut.length + totalKerf);
            cutQuantity++;
          }
        }
        
        plan.wasteLength = remainingLength;
        plan.efficiency = ((stock.length - remainingLength) / stock.length) * 100;
        
        totalWaste += remainingLength;
        totalEfficiency += plan.efficiency;
        
        optimizedPlans.push(plan);
      }
      
      const avgEfficiency = totalEfficiency / optimizedPlans.length;
      
      res.json({
        plans: optimizedPlans,
        summary: {
          totalWaste,
          avgEfficiency,
          algorithm,
        },
      });
    } catch (error) {
      console.error("Error optimizing cuts:", error);
      res.status(500).json({ error: "Failed to optimize cuts" });
    }
  });

  // Bulk import/update materials endpoint
  app.post("/api/materials/bulk-import", async (req, res) => {
    try {
      const materialsData = req.body.materials;
      
      if (!Array.isArray(materialsData)) {
        return res.status(400).json({ error: "Materials data must be an array" });
      }

      console.log(`Starting bulk import of ${materialsData.length} materials`);

      const results = {
        updated: 0,
        created: 0,
        errors: [] as string[]
      };

      // Process in batches of 50 for better performance
      const batchSize = 50;
      for (let i = 0; i < materialsData.length; i += batchSize) {
        const batch = materialsData.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(materialsData.length/batchSize)}`);
        
        for (const materialData of batch) {
          try {
            // Clean and properly format all steel specifications
            const cleanData = {
              code: materialData.code,
              name: materialData.name,
              category: materialData.category || null,
              width: materialData.width && materialData.width !== '' ? String(materialData.width) : null,
              thickness: materialData.thickness && materialData.thickness !== '' ? String(materialData.thickness) : null,
              diameter: materialData.diameter && materialData.diameter !== '' ? String(materialData.diameter) : null,
              depth: materialData.depth && materialData.depth !== '' ? String(materialData.depth) : null,
              flangeTf: materialData.flangeTf && materialData.flangeTf !== '' ? String(materialData.flangeTf) : null,
              webTw: materialData.webTw && materialData.webTw !== '' ? String(materialData.webTw) : null,
              weightPerMeter: materialData.weightPerMeter && materialData.weightPerMeter !== '' ? String(materialData.weightPerMeter) : null,
              lengthOptions: materialData.lengthOptions || null, // Keep as string to preserve semicolon-separated values
              grade: materialData.grade || null,
              standard: materialData.standard || null,
              isActive: true
            };

            const existingMaterial = await storage.getMaterialByCode(cleanData.code);
            
            if (existingMaterial) {
              await storage.updateMaterial(existingMaterial.id, cleanData);
              results.updated++;
            } else {
              await storage.createMaterial(cleanData);
              results.created++;
            }
          } catch (error: any) {
            results.errors.push(`${materialData.code || 'Unknown'}: ${error.message}`);
          }
        }
      }

      console.log(`Bulk import complete: ${results.updated} updated, ${results.created} created, ${results.errors.length} errors`);
      res.json(results);
    } catch (error) {
      console.error("Error in bulk import:", error);
      res.status(500).json({ error: "Failed to import materials" });
    }
  });

  app.get("/api/materials/export", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      
      // Convert to CSV format
      const csvHeader = "code,name,width,thickness,length,weightPerMeter,grade,pricePerKg,pricePerMeter,supplier\n";
      const csvData = materials.map(m => 
        `${m.code},${m.name},${m.width},${m.thickness},${m.length},${m.weightPerMeter},${m.grade},${m.pricePerKg},${m.pricePerMeter},${m.supplier}`
      ).join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=materials.csv");
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error("Error exporting materials:", error);
      res.status(500).json({ error: "Failed to export materials" });
    }
  });

  // Download steel catalog route
  app.get("/download/steel-catalog", (req, res) => {
    const path = require('path');
    const filePath = path.join(process.cwd(), 'steel_catalog_materials.csv');
    res.download(filePath, 'steel_catalog_materials.csv', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(404).send('File not found');
      }
    });
  });

  // Optimization simulation routes
  app.get("/api/optimization-simulations", async (req, res) => {
    try {
      const simulations = await storage.getOptimizationSimulations();
      res.json(simulations);
    } catch (error) {
      console.error("Error fetching optimization simulations:", error);
      res.status(500).json({ error: "Failed to fetch optimization simulations" });
    }
  });

  app.post("/api/optimization-simulations", async (req, res) => {
    try {
      const simulationData = insertOptimizationSimulationSchema.parse(req.body);
      const simulation = await storage.createOptimizationSimulation(simulationData);
      res.status(201).json(simulation);
    } catch (error) {
      console.error("Error creating optimization simulation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid simulation data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create optimization simulation" });
    }
  });

  app.get("/api/optimization-simulations/:id", async (req, res) => {
    try {
      const simulationId = req.params.id;
      const simulation = await storage.getOptimizationSimulation(simulationId);
      if (!simulation) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      res.json(simulation);
    } catch (error) {
      console.error("Error fetching optimization simulation:", error);
      res.status(500).json({ error: "Failed to fetch optimization simulation" });
    }
  });

  // Supplier management routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      // Fetch supplier contacts
      const contacts = await storage.getSupplierContacts(supplierId);
      
      // Find primary contact
      const primaryContact = contacts.find(c => c.isPrimaryContact) || contacts[0];
      
      // Add contacts and primary contact info to supplier response
      const supplierWithContacts = {
        ...supplier,
        contacts,
        primaryContact: primaryContact ? {
          name: `${primaryContact.firstName} ${primaryContact.lastName}`.trim(),
          email: primaryContact.email,
          phone: primaryContact.phonePrimary || primaryContact.phoneMobile || primaryContact.phoneDirect,
          position: primaryContact.position
        } : null
      };
      
      res.json(supplierWithContacts);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid supplier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  // NOTE: User authentication routes moved to secure AuthService implementation below (line ~2449)

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        permissions: userData.permissions || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Legacy users endpoint - replaced by team management endpoint below
  // app.get("/api/users", async (req, res) => {
  //   try {
  //     const users = await storage.getUsers();
  //     // Remove passwords from response
  //     const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  //     res.json(usersWithoutPasswords);
  //   } catch (error) {
  //     console.error("Error fetching users:", error);
  //     res.status(500).json({ error: "Failed to fetch users" });
  //   }
  // });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        permissions: userData.permissions || {},
        isActive: true,
      });
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get user password (for authorized team management roles only)
  app.get("/api/users/:id/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // For now, allowing all authenticated users to view passwords
      // In production, this should check for specific permissions
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return only the password (plain text for authorized viewing)
      // Note: This is for team management purposes only
      res.json({ password: user.password });
    } catch (error) {
      console.error("Error fetching user password:", error);
      res.status(500).json({ error: "Failed to fetch user password" });
    }
  });

  // Archive user with comprehensive data retention
  app.post("/api/users/:id/archive", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { archiveReason } = req.body;
      
      // Get current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get associated team member data if exists
      const teamMember = await storage.getTeamMemberByUserId(userId);
      
      // Archive the user data
      await storage.archiveUser({
        originalUserId: userId,
        originalTeamMemberId: teamMember?.id || null,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleId: teamMember?.roleId || null,
        roleName: null, // TODO: Get role name via separate query
        departmentId: teamMember?.departmentId || null,
        departmentName: null, // TODO: Get department name via separate query
        employeeNumber: null,
        employmentType: teamMember?.employmentType || null,
        isActive: teamMember?.isActive || false,
        startDate: teamMember?.startDate || null,
        endDate: teamMember?.endDate || new Date(),
        firstName: teamMember?.firstName || null,
        lastName: teamMember?.lastName || null,
        preferredName: teamMember?.preferredName || null,
        dateOfBirth: teamMember?.dateOfBirth || null,
        personalEmail: teamMember?.personalEmail || null,
        personalPhone: teamMember?.personalPhone || null,
        streetAddress: teamMember?.streetAddress || null,
        suburb: teamMember?.suburb || null,
        city: teamMember?.city || null,
        state: teamMember?.state || null,
        postcode: teamMember?.postcode || null,
        country: teamMember?.country || null,
        emergencyContactName: teamMember?.emergencyContactName || null,
        emergencyContactPhone: teamMember?.emergencyContactPhone || null,
        emergencyContactRelation: teamMember?.emergencyContactRelation || null,
        position: teamMember?.position || null,
        jobTitle: teamMember?.jobTitle || null,
        skillLevel: teamMember?.skillLevel || null,
        primarySkills: teamMember?.primarySkills || null,
        secondarySkills: teamMember?.secondarySkills || null,
        experienceYears: teamMember?.experienceYears || null,
        hourlyRate: teamMember?.hourlyRate || null,
        overtimeRate: teamMember?.overtimeRate || null,
        siteAllowance: teamMember?.siteAllowance || null,
        travelAllowance: teamMember?.travelAllowance || null,
        annualSalary: teamMember?.annualSalary || null,
        payFrequency: teamMember?.payFrequency || null,
        certifications: teamMember?.certifications || null,
        qualifications: teamMember?.qualifications || null,
        licenses: teamMember?.licenses || null,
        trainingRecords: teamMember?.trainingRecords || null,
        inductionCompleted: teamMember?.inductionCompleted || false,
        inductionDate: teamMember?.inductionDate || null,
        safetyTrainingExpiry: teamMember?.safetyTrainingExpiry || null,
        medicalClearance: teamMember?.medicalClearance || false,
        medicalExpiryDate: teamMember?.medicalExpiryDate || null,
        performanceRating: teamMember?.performanceRating || null,
        lastReviewDate: teamMember?.lastReviewDate || null,
        nextReviewDate: teamMember?.nextReviewDate || null,
        annualLeaveEntitlement: teamMember?.annualLeaveEntitlement || null,
        sickLeaveEntitlement: teamMember?.sickLeaveEntitlement || null,
        currentLeaveBalance: teamMember?.currentLeaveBalance || null,
        archiveReason: archiveReason,
        archivedBy: 1, // TODO: Get from authenticated user
        legalRetentionUntil: new Date(Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)).toISOString(), // 7 years
        canBeDeleted: false,
        notes: teamMember?.notes || null,
        internalNotes: teamMember?.internalNotes || null,
        exitInterviewNotes: null,
      });
      
      // Log the archive action
      await storage.logEmployeeAudit({
        userId: userId,
        teamMemberId: teamMember?.id || null,
        action: "ARCHIVE",
        actionBy: 1, // TODO: Get from authenticated user
        entityType: "USER",
        entityId: userId.toString(),
        oldValues: { user, teamMember },
        newValues: { archived: true, reason: archiveReason },
        legalBasis: "EMPLOYMENT",
        retentionPeriod: "7_YEARS",
      });
      
      // Delete from active tables
      if (teamMember) {
        await storage.deleteTeamMember(teamMember.id);
      }
      await storage.deleteUser(userId);
      
      res.json({ 
        success: true, 
        message: "User archived successfully",
        retentionUntil: new Date(Date.now() + (7 * 365 * 24 * 60 * 60 * 1000))
      });
    } catch (error) {
      console.error("Error archiving user:", error);
      res.status(500).json({ error: "Failed to archive user" });
    }
  });

  // Supplier Contacts routes
  app.get("/api/supplier-contacts", async (req, res) => {
    try {
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : null;
      const contacts = await storage.getSupplierContacts(supplierId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching supplier contacts:", error);
      res.status(500).json({ error: "Failed to fetch supplier contacts" });
    }
  });

  app.post("/api/supplier-contacts", async (req, res) => {
    try {
      const contactData = req.body;
      const contact = await storage.createSupplierContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating supplier contact:", error);
      res.status(500).json({ error: "Failed to create supplier contact" });
    }
  });

  app.patch("/api/supplier-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contactData = req.body;
      const contact = await storage.updateSupplierContact(id, contactData);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating supplier contact:", error);
      res.status(500).json({ error: "Failed to update supplier contact" });
    }
  });

  app.delete("/api/supplier-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSupplierContact(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier contact:", error);
      res.status(500).json({ error: "Failed to delete supplier contact" });
    }
  });

  app.patch("/api/supplier-contacts/:id/set-primary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.setPrimarySupplierContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error setting primary supplier contact:", error);
      res.status(500).json({ error: "Failed to set primary supplier contact" });
    }
  });

  // Client Contacts routes
  app.get("/api/client-contacts", async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;
      const contacts = await storage.getClientContacts(clientId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ error: "Failed to fetch client contacts" });
    }
  });

  app.post("/api/client-contacts", async (req, res) => {
    try {
      const contactData = req.body;
      const contact = await storage.createClientContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating client contact:", error);
      res.status(500).json({ error: "Failed to create client contact" });
    }
  });

  app.patch("/api/client-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contactData = req.body;
      const contact = await storage.updateClientContact(id, contactData);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating client contact:", error);
      res.status(500).json({ error: "Failed to update client contact" });
    }
  });

  app.delete("/api/client-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClientContact(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client contact:", error);
      res.status(500).json({ error: "Failed to delete client contact" });
    }
  });

  app.patch("/api/client-contacts/:id/set-primary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.setPrimaryClientContact(id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error setting primary client contact:", error);
      res.status(500).json({ error: "Failed to set primary client contact" });
    }
  });

  // Client Management routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid client data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Updating supplier ID: ${id}`);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      console.log("Parsed supplier data:", JSON.stringify(supplierData, null, 2));
      
      const supplier = await storage.updateSupplier(id, supplierData);
      console.log("Updated supplier result:", JSON.stringify(supplier, null, 2));
      
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        return res.status(400).json({ error: "Invalid supplier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSupplier(id);
      if (!deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Material-supplier relationships
  app.get("/api/materials/:materialId/suppliers", async (req, res) => {
    try {
      const materialId = parseInt(req.params.materialId);
      const materialSuppliers = await storage.getMaterialSuppliers(materialId);
      res.json(materialSuppliers);
    } catch (error) {
      console.error("Error fetching material suppliers:", error);
      res.status(500).json({ error: "Failed to fetch material suppliers" });
    }
  });

  app.post("/api/materials/:materialId/suppliers", async (req, res) => {
    try {
      const materialId = parseInt(req.params.materialId);
      const materialSupplierData = insertMaterialSupplierSchema.parse({
        ...req.body,
        materialId
      });
      
      // Calculate complementary price if only one is provided
      const material = await storage.getMaterial(materialId);
      if (material?.weightPerMeter) {
        const weightPerMeter = parseFloat(material.weightPerMeter.toString());
        if (materialSupplierData.pricePerMeter && !materialSupplierData.pricePerKg) {
          materialSupplierData.pricePerKg = (parseFloat(materialSupplierData.pricePerMeter.toString()) / weightPerMeter).toFixed(2);
        } else if (materialSupplierData.pricePerKg && !materialSupplierData.pricePerMeter) {
          materialSupplierData.pricePerMeter = (parseFloat(materialSupplierData.pricePerKg.toString()) * weightPerMeter).toFixed(2);
        }
      }
      
      const materialSupplier = await storage.createMaterialSupplier(materialSupplierData);
      
      // Create price history entry
      await storage.createSupplierPriceHistory({
        materialSupplierId: materialSupplier.id,
        pricePerMeter: materialSupplierData.pricePerMeter,
        pricePerKg: materialSupplierData.pricePerKg,
        currency: materialSupplierData.currency || "AUD",
        effectiveDate: new Date(),
        priceChangeReason: "initial_entry",
        enteredBy: 1, // TODO: Get from session
      });
      
      res.status(201).json(materialSupplier);
    } catch (error) {
      console.error("Error creating material supplier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material supplier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create material supplier" });
    }
  });

  app.patch("/api/material-suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const materialSupplierData = insertMaterialSupplierSchema.partial().parse(req.body);
      
      // Get existing material supplier to calculate price changes
      const existing = await storage.getMaterialSupplierById(id);
      if (!existing) {
        return res.status(404).json({ error: "Material supplier not found" });
      }
      
      // Calculate complementary price if updated
      if (existing.material?.weightPerMeter) {
        const weightPerMeter = parseFloat(existing.material.weightPerMeter.toString());
        if (materialSupplierData.pricePerMeter && !materialSupplierData.pricePerKg) {
          materialSupplierData.pricePerKg = (parseFloat(materialSupplierData.pricePerMeter.toString()) / weightPerMeter).toFixed(2);
        } else if (materialSupplierData.pricePerKg && !materialSupplierData.pricePerMeter) {
          materialSupplierData.pricePerMeter = (parseFloat(materialSupplierData.pricePerKg.toString()) * weightPerMeter).toFixed(2);
        }
      }
      
      const materialSupplier = await storage.updateMaterialSupplier(id, materialSupplierData);
      
      // Create price history entry if prices changed
      if (materialSupplierData.pricePerMeter || materialSupplierData.pricePerKg) {
        await storage.createSupplierPriceHistory({
          materialSupplierId: id,
          pricePerMeter: materialSupplierData.pricePerMeter || existing.pricePerMeter,
          pricePerKg: materialSupplierData.pricePerKg || existing.pricePerKg,
          currency: materialSupplierData.currency || existing.currency || "AUD",
          effectiveDate: new Date(),
          priceChangeReason: "price_update",
          enteredBy: 1, // TODO: Get from session
        });
      }
      
      res.json(materialSupplier);
    } catch (error) {
      console.error("Error updating material supplier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid material supplier data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update material supplier" });
    }
  });

  app.delete("/api/material-suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMaterialSupplier(id);
      if (!deleted) {
        return res.status(404).json({ error: "Material supplier not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting material supplier:", error);
      res.status(500).json({ error: "Failed to delete material supplier" });
    }
  });

  // Price history routes
  app.get("/api/material-suppliers/:id/price-history", async (req, res) => {
    try {
      const materialSupplierId = parseInt(req.params.id);
      const priceHistory = await storage.getSupplierPriceHistory(materialSupplierId);
      res.json(priceHistory);
    } catch (error) {
      console.error("Error fetching supplier price history:", error);
      res.status(500).json({ error: "Failed to fetch supplier price history" });
    }
  });

  app.post("/api/material-suppliers/:id/set-primary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const materialSupplier = await storage.setPrimarySupplier(id);
      if (!materialSupplier) {
        return res.status(404).json({ error: "Material supplier not found" });
      }
      res.json(materialSupplier);
    } catch (error) {
      console.error("Error setting primary supplier:", error);
      res.status(500).json({ error: "Failed to set primary supplier" });
    }
  });

  // Operations Standards Routes
  
  // Welding Standards
  app.get("/api/operations/welding-standards", async (req, res) => {
    try {
      const standards = await db.select().from(weldingStandards).orderBy(weldingStandards.name);
      res.json(standards);
    } catch (error) {
      console.error("Error fetching welding standards:", error);
      res.status(500).json({ error: "Failed to fetch welding standards" });
    }
  });

  app.post("/api/operations/welding-standards", async (req, res) => {
    try {
      const data = req.body;
      const [standard] = await db.insert(weldingStandards).values(data).returning();
      res.status(201).json(standard);
    } catch (error) {
      console.error("Error creating welding standard:", error);
      res.status(500).json({ error: "Failed to create welding standard" });
    }
  });

  app.put("/api/operations/welding-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const [standard] = await db.update(weldingStandards)
        .set({ ...data, updated_at: new Date() })
        .where(eq(weldingStandards.id, id))
        .returning();
      res.json(standard);
    } catch (error) {
      console.error("Error updating welding standard:", error);
      res.status(500).json({ error: "Failed to update welding standard" });
    }
  });

  app.delete("/api/operations/welding-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(weldingStandards).where(eq(weldingStandards.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting welding standard:", error);
      res.status(500).json({ error: "Failed to delete welding standard" });
    }
  });

  // Drilling Standards
  app.get("/api/operations/drilling-standards", async (req, res) => {
    try {
      const standards = await db.select().from(drillingStandards).orderBy(drillingStandards.name);
      res.json(standards);
    } catch (error) {
      console.error("Error fetching drilling standards:", error);
      res.status(500).json({ error: "Failed to fetch drilling standards" });
    }
  });

  app.post("/api/operations/drilling-standards", async (req, res) => {
    try {
      const data = req.body;
      const [standard] = await db.insert(drillingStandards).values(data).returning();
      res.status(201).json(standard);
    } catch (error) {
      console.error("Error creating drilling standard:", error);
      res.status(500).json({ error: "Failed to create drilling standard" });
    }
  });

  app.put("/api/operations/drilling-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const [standard] = await db.update(drillingStandards)
        .set({ ...data, updated_at: new Date() })
        .where(eq(drillingStandards.id, id))
        .returning();
      res.json(standard);
    } catch (error) {
      console.error("Error updating drilling standard:", error);
      res.status(500).json({ error: "Failed to update drilling standard" });
    }
  });

  app.delete("/api/operations/drilling-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(drillingStandards).where(eq(drillingStandards.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting drilling standard:", error);
      res.status(500).json({ error: "Failed to delete drilling standard" });
    }
  });

  // Cutting Standards
  app.get("/api/operations/cutting-standards", async (req, res) => {
    try {
      const standards = await db.select().from(cuttingStandards).orderBy(cuttingStandards.name);
      res.json(standards);
    } catch (error) {
      console.error("Error fetching cutting standards:", error);
      res.status(500).json({ error: "Failed to fetch cutting standards" });
    }
  });

  app.post("/api/operations/cutting-standards", async (req, res) => {
    try {
      const data = req.body;
      const [standard] = await db.insert(cuttingStandards).values(data).returning();
      res.status(201).json(standard);
    } catch (error) {
      console.error("Error creating cutting standard:", error);
      res.status(500).json({ error: "Failed to create cutting standard" });
    }
  });

  app.put("/api/operations/cutting-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const [standard] = await db.update(cuttingStandards)
        .set({ ...data, updated_at: new Date() })
        .where(eq(cuttingStandards.id, id))
        .returning();
      res.json(standard);
    } catch (error) {
      console.error("Error updating cutting standard:", error);
      res.status(500).json({ error: "Failed to update cutting standard" });
    }
  });

  app.delete("/api/operations/cutting-standards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(cuttingStandards).where(eq(cuttingStandards.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cutting standard:", error);
      res.status(500).json({ error: "Failed to delete cutting standard" });
    }
  });

  // Position Factors
  app.get("/api/operations/position-factors", async (req, res) => {
    try {
      const factors = await db.select().from(positionFactors).orderBy(positionFactors.position);
      res.json(factors);
    } catch (error) {
      console.error("Error fetching position factors:", error);
      res.status(500).json({ error: "Failed to fetch position factors" });
    }
  });

  app.post("/api/operations/position-factors", async (req, res) => {
    try {
      const data = req.body;
      const [factor] = await db.insert(positionFactors).values(data).returning();
      res.status(201).json(factor);
    } catch (error) {
      console.error("Error creating position factor:", error);
      res.status(500).json({ error: "Failed to create position factor" });
    }
  });

  app.put("/api/operations/position-factors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const [factor] = await db.update(positionFactors)
        .set({ ...data, updated_at: new Date() })
        .where(eq(positionFactors.id, id))
        .returning();
      res.json(factor);
    } catch (error) {
      console.error("Error updating position factor:", error);
      res.status(500).json({ error: "Failed to update position factor" });
    }
  });

  app.delete("/api/operations/position-factors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(positionFactors).where(eq(positionFactors.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting position factor:", error);
      res.status(500).json({ error: "Failed to delete position factor" });
    }
  });

  // Assembly Templates
  app.get("/api/operations/assembly-templates", async (req, res) => {
    try {
      const templates = await db.select().from(assemblyTemplates).orderBy(assemblyTemplates.code);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching assembly templates:", error);
      res.status(500).json({ error: "Failed to fetch assembly templates" });
    }
  });

  app.post("/api/operations/assembly-templates", async (req, res) => {
    try {
      const data = req.body;
      if (data.components && typeof data.components === 'string') {
        data.components = JSON.parse(data.components);
      }
      const [template] = await db.insert(assemblyTemplates).values(data).returning();
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating assembly template:", error);
      res.status(500).json({ error: "Failed to create assembly template" });
    }
  });

  app.put("/api/operations/assembly-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      if (data.components && typeof data.components === 'string') {
        data.components = JSON.parse(data.components);
      }
      const [template] = await db.update(assemblyTemplates)
        .set({ ...data, updated_at: new Date() })
        .where(eq(assemblyTemplates.id, id))
        .returning();
      res.json(template);
    } catch (error) {
      console.error("Error updating assembly template:", error);
      res.status(500).json({ error: "Failed to update assembly template" });
    }
  });

  app.delete("/api/operations/assembly-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(assemblyTemplates).where(eq(assemblyTemplates.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assembly template:", error);
      res.status(500).json({ error: "Failed to delete assembly template" });
    }
  });

  // Labor Defaults
  app.get("/api/operations/labor-defaults", async (req, res) => {
    try {
      const defaults = await db.select().from(laborDefaults).orderBy(laborDefaults.operation_type);
      res.json(defaults);
    } catch (error) {
      console.error("Error fetching labor defaults:", error);
      res.status(500).json({ error: "Failed to fetch labor defaults" });
    }
  });

  app.post("/api/operations/labor-defaults", async (req, res) => {
    try {
      const data = req.body;
      const [defaultValue] = await db.insert(laborDefaults).values(data).returning();
      res.status(201).json(defaultValue);
    } catch (error) {
      console.error("Error creating labor default:", error);
      res.status(500).json({ error: "Failed to create labor default" });
    }
  });

  app.put("/api/operations/labor-defaults/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      const [defaultValue] = await db.update(laborDefaults)
        .set({ ...data, updated_at: new Date() })
        .where(eq(laborDefaults.id, id))
        .returning();
      res.json(defaultValue);
    } catch (error) {
      console.error("Error updating labor default:", error);
      res.status(500).json({ error: "Failed to update labor default" });
    }
  });

  app.delete("/api/operations/labor-defaults/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(laborDefaults).where(eq(laborDefaults.id, id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting labor default:", error);
      res.status(500).json({ error: "Failed to delete labor default" });
    }
  });

  // Fabrication Standards Routes (no auth required)
  app.get("/api/operations/fabrication-standards", async (req, res) => {
    try {
      // Return default fabrication settings
      const fabricationSettings = {
        defaultKerf: 2.4,
        defaultTolerance: 0.5,
        minimumOffcutLength: 500,
        materialWasteAllowance: 5,
        standardLengths: [6000, 9000, 12000]
      };
      res.json(fabricationSettings);
    } catch (error) {
      console.error("Error fetching fabrication standards:", error);
      res.status(500).json({ error: "Failed to fetch fabrication standards" });
    }
  });

  app.put("/api/operations/fabrication-standards", async (req, res) => {
    try {
      // For now, just return success
      // In future, save to database
      res.json({ message: "Fabrication standards updated successfully" });
    } catch (error) {
      console.error("Error updating fabrication standards:", error);
      res.status(500).json({ error: "Failed to update fabrication standards" });
    }
  });

  // Google Places API (New) proxy endpoint for secure address search
  app.post("/api/places/autocomplete", async (req, res) => {
    try {
      const { input } = req.body;
      
      if (!input || input.length < 3) {
        return res.status(400).json({ error: "Input query must be at least 3 characters" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      // Use new Places API (New) format
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
          },
          body: JSON.stringify({
            input: input,
            languageCode: "en"
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert new API format to legacy format for frontend compatibility
      const convertedData = {
        predictions: data.suggestions?.map((suggestion: any) => ({
          place_id: suggestion.placePrediction?.placeId,
          description: suggestion.placePrediction?.text?.text,
          structured_formatting: {
            main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
            secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || ''
          }
        })) || [],
        status: "OK"
      };
      
      res.json(convertedData);
    } catch (error) {
      console.error("Google Places API error:", error);
      res.status(500).json({ error: "Failed to search addresses" });
    }
  });

  // Google Places API place details endpoint for getting full address information
  app.post("/api/places/details", async (req, res) => {
    try {
      const { place_id } = req.body;
      
      if (!place_id) {
        return res.status(400).json({ error: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      // Use new Places API (New) format for place details
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`,
        {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'addressComponents,formattedAddress'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Convert new API format to legacy format for frontend compatibility
      const convertedData = {
        result: {
          address_components: data.addressComponents?.map((component: any) => ({
            long_name: component.longText,
            short_name: component.shortText,
            types: component.types
          })) || [],
          formatted_address: data.formattedAddress
        },
        status: "OK"
      };
      
      res.json(convertedData);
    } catch (error) {
      console.error("Google Places API details error:", error);
      res.status(500).json({ error: "Failed to get place details" });
    }
  });

  // Import/Export Routes
  
  // Generate CSV template for suppliers
  app.get("/api/import-export/template/suppliers", async (req, res) => {
    try {
      const headers = [
        'name', 'company', 'address', 'city', 'postcode', 'country',
        'nzbn', 'gstNumber', 'companyNumber', 'website', 'phone', 'email',
        'paymentTerms', 'assignedProjectManager', 'creditLimit', 'discountRate',
        'industry', 'type', 'preferredCurrency', 'isActive'
      ];

      const sampleData = [
        'ACME Steel Ltd', 'ACME Steel Limited', '123 Industrial Way', 'Auckland', '1010', 'New Zealand',
        '9429041234567', '123-456-789', 'NZCP123456', 'https://acmesteel.co.nz', '+64 9 123 4567', 'sales@acmesteel.co.nz',
        '30 days', 'John Smith', '50000', '2.5', 'Steel Manufacturing', 'vendor', 'NZD', 'true'
      ];

      const csvContent = [
        headers.join(','),
        sampleData.map(field => `"${field}"`).join(',')
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier_import_template.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating supplier template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });

  // Generate CSV template for contacts
  app.get("/api/import-export/template/contacts", async (req, res) => {
    try {
      const headers = [
        'supplierName', 'clientName', 'firstName', 'lastName', 'position', 'department',
        'email', 'phonePrimary', 'phoneMobile', 'phoneDirect',
        'isPrimaryContact', 'isAccountsContact', 'isTechnicalContact', 'isSalesContact',
        'preferredContactMethod', 'notes', 'isActive'
      ];

      const sampleData = [
        'ACME Steel Ltd', '', 'Sarah', 'Johnson', 'Sales Manager', 'Sales',
        'sarah.johnson@acmesteel.co.nz', '+64 9 123 4567', '+64 21 987 6543', '+64 9 123 4568',
        'true', 'false', 'false', 'true', 'email', 'Primary sales contact for steel products', 'true'
      ];

      const csvContent = [
        headers.join(','),
        sampleData.map(field => `"${field}"`).join(',')
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contact_import_template.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating contact template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  });

  // Export suppliers to CSV
  app.get("/api/import-export/export/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      
      const headers = [
        'id', 'name', 'company', 'address', 'city', 'postcode', 'country',
        'nzbn', 'gstNumber', 'companyNumber', 'website', 'phone', 'email',
        'paymentTerms', 'assignedProjectManager', 'creditLimit', 'discountRate',
        'industry', 'type', 'preferredCurrency', 'isActive', 'createdAt', 'updatedAt'
      ];

      const csvRows = [headers.join(',')];
      
      for (const supplier of suppliers) {
        const row = [
          supplier.id,
          supplier.name || '',
          supplier.company || '',
          supplier.address || '',
          supplier.city || '',
          supplier.postcode || '',
          supplier.country || '',
          supplier.nzbn || '',
          supplier.gstNumber || '',
          supplier.companyNumber || '',
          supplier.website || '',
          supplier.phone || '',
          supplier.email || '',
          supplier.paymentTerms || '',
          supplier.assignedProjectManager || '',
          supplier.creditLimit || 0,
          supplier.discountRate || '',
          supplier.industry || '',
          supplier.type || '',
          supplier.preferredCurrency || '',
          supplier.isActive !== false,
          supplier.createdAt?.toISOString() || '',
          supplier.updatedAt?.toISOString() || ''
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `suppliers_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      console.error('Error exporting suppliers:', error);
      res.status(500).json({ error: 'Failed to export suppliers' });
    }
  });

  // Export contacts to CSV
  app.get("/api/import-export/export/contacts", async (req, res) => {
    try {
      const { entityType } = req.query;
      
      let contacts: any[] = [];
      let suppliers: any[] = [];
      let clients: any[] = [];

      if (!entityType || entityType === 'supplier') {
        const supplierContacts = await storage.getAllSupplierContacts();
        suppliers = await storage.getAllSuppliers();
        contacts = contacts.concat(supplierContacts.map((contact: any) => ({
          ...contact,
          entityType: 'supplier',
          entityName: suppliers.find(s => s.id === contact.supplierId)?.name || ''
        })));
      }

      if (!entityType || entityType === 'client') {
        const clientContacts = await storage.getAllClientContacts();
        clients = await storage.getAllClients();
        contacts = contacts.concat(clientContacts.map((contact: any) => ({
          ...contact,
          entityType: 'client',
          entityName: clients.find(c => c.id === contact.clientId)?.name || ''
        })));
      }

      const headers = [
        'id', 'entityType', 'entityName', 'firstName', 'lastName', 'position', 'department',
        'email', 'phonePrimary', 'phoneMobile', 'phoneDirect',
        'isPrimaryContact', 'isAccountsContact', 'isTechnicalContact', 'isSalesContact',
        'preferredContactMethod', 'notes', 'isActive', 'createdAt', 'updatedAt'
      ];

      const csvRows = [headers.join(',')];
      
      for (const contact of contacts) {
        const row = [
          contact.id,
          contact.entityType,
          contact.entityName,
          contact.firstName || '',
          contact.lastName || '',
          contact.position || contact.title || '',
          contact.department || '',
          contact.email || '',
          contact.phonePrimary || contact.workPhone || '',
          contact.phoneMobile || contact.mobile || '',
          contact.phoneDirect || '',
          contact.isPrimaryContact || contact.isPrimary || false,
          contact.isAccountsContact || false,
          contact.isTechnicalContact || false,
          contact.isSalesContact || false,
          contact.preferredContactMethod || 'email',
          contact.notes || '',
          contact.isActive !== false,
          contact.createdAt?.toISOString() || '',
          contact.updatedAt?.toISOString() || ''
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `contacts_export_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      console.error('Error exporting contacts:', error);
      res.status(500).json({ error: 'Failed to export contacts' });
    }
  });

  // Import suppliers from CSV
  app.post("/api/import-export/import/suppliers", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let created = 0;
      let updated = 0;

      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      for (const [index, row] of results.entries()) {
        try {
          processed++;
          const validatedData = supplierImportSchema.parse(row);
          
          // Check if supplier exists by name
          const existingSupplier = await storage.getSupplierByName(validatedData.name);
          
          if (existingSupplier) {
            // Update existing supplier
            await storage.updateSupplier(existingSupplier.id, validatedData);
            updated++;
          } else {
            // Create new supplier
            await storage.createSupplier(validatedData);
            created++;
          }
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      res.json({
        success: true,
        processed,
        created,
        updated,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error importing suppliers:', error);
      res.status(500).json({ error: 'Failed to import suppliers' });
    }
  });

  // Import contacts from CSV
  app.post("/api/import-export/import/contacts", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let created = 0;
      let skipped = 0;

      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      for (const [index, row] of results.entries()) {
        try {
          processed++;
          const validatedData = contactImportSchema.parse(row);
          
          let entityId: number | null = null;
          let entityType: 'supplier' | 'client' = 'supplier';

          // Find the supplier or client
          if (validatedData.supplierName) {
            const supplier = await storage.getSupplierByName(validatedData.supplierName);
            if (supplier) {
              entityId = supplier.id;
              entityType = 'supplier';
            }
          } else if (validatedData.clientName) {
            const client = await storage.getClientByName(validatedData.clientName);
            if (client) {
              entityId = client.id;
              entityType = 'client';
            }
          }

          if (!entityId) {
            errors.push(`Row ${index + 2}: Could not find ${validatedData.supplierName || validatedData.clientName}`);
            skipped++;
            continue;
          }

          // Create contact data based on entity type
          const contactData = {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            position: validatedData.position,
            department: validatedData.department,
            email: validatedData.email,
            phonePrimary: validatedData.phonePrimary,
            phoneMobile: validatedData.phoneMobile,
            phoneDirect: validatedData.phoneDirect,
            isPrimaryContact: validatedData.isPrimaryContact,
            isAccountsContact: validatedData.isAccountsContact,
            isTechnicalContact: validatedData.isTechnicalContact,
            isSalesContact: validatedData.isSalesContact,
            preferredContactMethod: validatedData.preferredContactMethod,
            notes: validatedData.notes,
            isActive: validatedData.isActive
          };

          if (entityType === 'supplier') {
            await storage.createSupplierContact({ ...contactData, supplierId: entityId });
          } else {
            await storage.createClientContact({ 
              ...contactData, 
              clientId: entityId,
              title: contactData.position,
              workPhone: contactData.phonePrimary,
              mobile: contactData.phoneMobile,
              isPrimary: contactData.isPrimaryContact
            });
          }
          
          created++;
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
          skipped++;
        }
      }

      res.json({
        success: true,
        processed,
        created,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error importing contacts:', error);
      res.status(500).json({ error: 'Failed to import contacts' });
    }
  });

  // Supplier Locations
  app.get('/api/supplier-locations', async (req, res) => {
    console.log('=== SUPPLIER LOCATIONS ENDPOINT HIT ===');
    console.log('Query params:', req.query);
    console.log('Entity ID:', req.query.entityId);
    
    try {
      const entityId = parseInt(req.query.entityId as string);
      console.log('Parsed entityId:', entityId);
      
      if (!entityId) {
        console.log('Missing entityId, returning 400');
        return res.status(400).json({ error: 'entityId query parameter is required' });
      }
      
      console.log('Calling storage.getLocations with:', 'supplier', entityId);
      const locations = await storage.getLocations('supplier', entityId);
      console.log('Retrieved locations:', locations.length, 'items');
      console.log('Location data:', locations);
      
      res.json(locations);
    } catch (error) {
      console.error('Error fetching supplier locations:', error);
      res.status(500).json({ error: 'Failed to fetch supplier locations' });
    }
  });

  app.get('/api/supplier-locations/:supplierId', async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const locations = await storage.getLocations('supplier', supplierId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching supplier locations:', error);
      res.status(500).json({ error: 'Failed to fetch supplier locations' });
    }
  });

  app.post('/api/supplier-locations', async (req, res) => {
    try {
      const location = await storage.createLocation({
        ...req.body,
        entityType: 'supplier'
      });
      res.json(location);
    } catch (error) {
      console.error('Error creating supplier location:', error);
      res.status(500).json({ error: 'Failed to create supplier location' });
    }
  });

  app.put('/api/supplier-locations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.updateLocation(id, req.body);
      res.json(location);
    } catch (error) {
      console.error('Error updating supplier location:', error);
      res.status(500).json({ error: 'Failed to update supplier location' });
    }
  });

  app.delete('/api/supplier-locations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLocation(id);
      res.json({ success });
    } catch (error) {
      console.error('Error deleting supplier location:', error);
      res.status(500).json({ error: 'Failed to delete supplier location' });
    }
  });

  // Client Locations
  app.get('/api/client-locations', async (req, res) => {
    try {
      const entityId = parseInt(req.query.entityId as string);
      if (!entityId) {
        return res.status(400).json({ error: 'entityId query parameter is required' });
      }
      const locations = await storage.getLocations('client', entityId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching client locations:', error);
      res.status(500).json({ error: 'Failed to fetch client locations' });
    }
  });

  app.get('/api/client-locations/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const locations = await storage.getLocations('client', clientId);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching client locations:', error);
      res.status(500).json({ error: 'Failed to fetch client locations' });
    }
  });

  // Estimation Projects API
  app.get("/api/estimations", async (req, res) => {
    try {
      const projects = await storage.getEstimationProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching estimation projects:", error);
      res.json([]);
    }
  });

  app.post("/api/estimations", async (req, res) => {
    try {
      const projectData = req.body;
      const project = await storage.createEstimationProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating estimation project:", error);
      res.status(500).json({ error: "Failed to create estimation project" });
    }
  });

  app.get("/api/estimations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid estimation ID" });
      }
      
      // Get the actual estimation data from database
      const estimation = await storage.getEstimationProject(id);
      if (!estimation) {
        return res.status(404).json({ error: "Estimation not found" });
      }
      
      res.json(estimation);
    } catch (error) {
      console.error("Error fetching estimation:", error);
      res.status(500).json({ error: "Failed to fetch estimation" });
    }
  });

  // Update estimation status
  app.patch("/api/estimations/:id/status", async (req, res) => {
    try {
      // Validate authentication
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "No authentication token" });
      }
      
      const user = await AuthService.validateSession(token);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const validStatuses = ['draft', 'in_progress', 'completed', 'sent', 'accepted', 'declined'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      await storage.updateEstimationStatus(id, status);
      res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating estimation status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Convert estimation to job
  app.post("/api/estimations/convert-to-job", async (req, res) => {
    try {
      // Validate authentication
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "No authentication token" });
      }
      
      const user = await AuthService.validateSession(token);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { estimationId } = req.body;
      const userId = user.id;
      
      // Get estimation details
      const estimation = await storage.getEstimationProject(estimationId);
      if (!estimation) {
        return res.status(404).json({ error: "Estimation not found" });
      }
      
      // Check if a job already exists for this estimation
      const existingJob = await storage.getJobByEstimationId(estimationId);
      if (existingJob) {
        return res.status(400).json({ 
          error: "A job already exists for this estimation",
          jobId: existingJob.id,
          jobNumber: existingJob.jobNumber
        });
      }
      
      // Create job from estimation
      const jobData = {
        number: `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        estimationId: estimationId,
        clientId: estimation.clientId,
        description: estimation.description || estimation.name,
        status: 'active' as const,
        startDate: new Date(),
        endDate: estimation.deliveryDate || undefined,
        totalCost: parseFloat(estimation.totalCost),
        margin: parseFloat(estimation.margin),
        projectData: estimation.projectData,
        createdBy: userId,
      };
      
      const job = await storage.createJobFromEstimation(jobData);
      
      // Update estimation status to accepted
      await storage.updateEstimationStatus(estimationId, 'accepted');
      
      // Create initial resource allocations
      if (estimation.projectData?.labor) {
        await storage.createResourceAllocations(job.id, estimation.projectData.labor);
      }
      
      res.json({ 
        success: true, 
        message: "Estimation converted to job successfully",
        jobId: job.id,
        jobNumber: job.number
      });
    } catch (error) {
      console.error("Error converting estimation to job:", error);
      res.status(500).json({ error: "Failed to convert estimation to job" });
    }
  });

  // Project Lifecycle Tracking API
  const { lifecycleTrackingService } = await import('./lifecycleTracking');
  const { lifecycleTemplateService } = await import('./lifecycleTemplates');
  
  // Initialize lifecycle for a project
  app.post("/api/projects/:projectId/lifecycle/initialize", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { templateId } = req.body;
      
      const result = await lifecycleTrackingService.initializeProjectLifecycle(projectId, templateId);
      res.json(result);
    } catch (error) {
      console.error("Error initializing project lifecycle:", error);
      res.status(500).json({ error: "Failed to initialize project lifecycle" });
    }
  });
  
  // Get project lifecycle overview
  app.get("/api/projects/:projectId/lifecycle", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const lifecycle = await lifecycleTrackingService.getProjectLifecycle(projectId);
      res.json(lifecycle);
    } catch (error) {
      console.error("Error fetching project lifecycle:", error);
      res.status(500).json({ error: "Failed to fetch project lifecycle" });
    }
  });
  
  // Update task status
  app.patch("/api/lifecycle/tasks/:taskId", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const taskId = parseInt(req.params.taskId);
      const { status, notes } = req.body;
      
      const result = await lifecycleTrackingService.updateTaskStatus(taskId, status, user.id, notes);
      res.json(result);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  });
  
  // Update phase status
  app.patch("/api/lifecycle/phases/:phaseId", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const phaseId = parseInt(req.params.phaseId);
      const { status, blockingReason } = req.body;
      
      const result = await lifecycleTrackingService.updatePhaseStatus(phaseId, status, user.id, blockingReason);
      res.json(result);
    } catch (error) {
      console.error("Error updating phase status:", error);
      res.status(500).json({ error: "Failed to update phase status" });
    }
  });
  
  // Add stakeholder
  app.post("/api/projects/:projectId/stakeholders", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const stakeholder = await lifecycleTrackingService.addProjectStakeholder(projectId, req.body);
      res.json(stakeholder);
    } catch (error) {
      console.error("Error adding stakeholder:", error);
      res.status(500).json({ error: "Failed to add stakeholder" });
    }
  });
  
  // Get project events
  app.get("/api/projects/:projectId/events", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await lifecycleTrackingService.getProjectEvents(projectId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching project events:", error);
      res.status(500).json({ error: "Failed to fetch project events" });
    }
  });
  
  // Get stakeholder view
  app.get("/api/projects/:projectId/stakeholder-view/:type", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const stakeholderType = req.params.type;
      const view = await lifecycleTrackingService.getStakeholderView(projectId, stakeholderType);
      res.json(view);
    } catch (error) {
      console.error("Error fetching stakeholder view:", error);
      res.status(500).json({ error: "Failed to fetch stakeholder view" });
    }
  });

  // Lifecycle Template Management Routes
  app.get("/api/lifecycle-templates", async (req, res) => {
    try {
      const templates = await lifecycleTemplateService.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching lifecycle templates:", error);
      res.status(500).json({ error: "Failed to fetch lifecycle templates" });
    }
  });

  app.get("/api/lifecycle-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await lifecycleTemplateService.getTemplateById(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching lifecycle template:", error);
      res.status(500).json({ error: "Failed to fetch lifecycle template" });
    }
  });

  app.post("/api/lifecycle-templates", async (req, res) => {
    try {
      const template = await lifecycleTemplateService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating lifecycle template:", error);
      res.status(500).json({ error: "Failed to create lifecycle template" });
    }
  });

  app.put("/api/lifecycle-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await lifecycleTemplateService.updateTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating lifecycle template:", error);
      res.status(500).json({ error: "Failed to update lifecycle template" });
    }
  });

  app.delete("/api/lifecycle-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await lifecycleTemplateService.deleteTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lifecycle template:", error);
      res.status(500).json({ error: "Failed to delete lifecycle template" });
    }
  });

  app.post("/api/lifecycle-templates/:id/duplicate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      const duplicate = await lifecycleTemplateService.duplicateTemplate(id, name);
      res.status(201).json(duplicate);
    } catch (error) {
      console.error("Error duplicating lifecycle template:", error);
      res.status(500).json({ error: "Failed to duplicate lifecycle template" });
    }
  });

  app.get("/api/lifecycle-templates/industry/:industry", async (req, res) => {
    try {
      const industry = req.params.industry;
      const templates = await lifecycleTemplateService.getTemplatesForIndustry(industry);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching industry templates:", error);
      res.status(500).json({ error: "Failed to fetch industry templates" });
    }
  });

  app.get("/api/lifecycle-templates/default/steel-fabrication", async (req, res) => {
    try {
      const template = await lifecycleTemplateService.getDefaultSteelFabricationTemplate();
      res.json(template);
    } catch (error) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  app.get("/api/estimations", async (req, res) => {
    try {
      const projects = await storage.getEstimationProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching estimation projects:", error);
      res.json([]);
    }
  });

  app.post("/api/estimations", async (req, res) => {
    try {
      const projectData = req.body;
      const project = await storage.createEstimationProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating estimation project:", error);
      res.status(500).json({ error: "Failed to create estimation project" });
    }
  });

  // Coating systems API routes  
  app.post("/api/coating-systems", async (req, res) => {
    try {
      const coatingSystem = await storage.createCoatingSystem(req.body);
      res.status(201).json(coatingSystem);
    } catch (error: any) {
      console.error("Error creating coating system:", error);
      res.status(500).json({ error: "Failed to create coating system", details: error.message });
    }
  });

  app.get("/api/coating-systems", async (req, res) => {
    try {
      // Query coating systems from materials table - include all coating-related categories
      const coatingSystems = await storage.getMaterialsByCategories([
        'Alkyd Systems',
        'Epoxy Systems', 
        'Polyurethane Systems',
        'Zinc Silicate Systems',
        'Galvanizing Systems',
        'Intumescent Systems',
        'Powder Coating Systems',
        'Etch Primer Systems',
        'Zinc Metal Spray Systems',
        'Weather Resistant Systems'
      ]);
      res.json(coatingSystems);
    } catch (error: any) {
      console.error("Error fetching coating systems:", error);
      res.status(500).json({ error: "Failed to fetch coating systems", details: error.message });
    }
  });

  app.put("/api/estimations/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const estimationData = req.body;
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      console.log(`Saving estimation data for project ${projectId}:`, {
        materialsCount: estimationData.materials?.length || 0,
        laborCount: estimationData.labor?.length || 0,
        equipmentCount: estimationData.equipment?.length || 0,
        consumablesCount: estimationData.consumables?.length || 0,
        totalCost: estimationData.totals?.total || 0
      });
      
      // Save estimation data to database
      const savedEstimation = await storage.saveEstimationData(projectId, estimationData);
      
      const response = {
        success: true,
        message: "Estimation saved successfully",
        data: savedEstimation
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(response);
    } catch (error) {
      console.error("Error saving estimation:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: "Failed to save estimation", details: error.message });
    }
  });

  // Delete estimation
  app.delete('/api/estimations/:id', async (req, res) => {
    try {
      const user = await AuthService.getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { reason = "Deleted by user" } = req.body;
      
      // Archive the estimation before deletion
      const { ArchivingService } = await import('./archiving');
      await ArchivingService.archiveEstimation(id, user.id, reason);
      
      res.json({ success: true, message: "Estimation archived and deleted successfully" });
    } catch (error) {
      console.error("Error deleting estimation:", error);
      res.status(500).json({ error: "Failed to delete estimation" });
    }
  });

  // Duplicate estimation
  app.post('/api/estimations/:id/duplicate', async (req, res) => {
    try {
      const user = await AuthService.getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sourceId = parseInt(req.params.id);
      
      // Get the original estimation
      const original = await storage.getEstimation(sourceId);
      if (!original) {
        return res.status(404).json({ error: "Estimation not found" });
      }
      
      // Create a new estimation with copied data
      const newName = `${original.project.name} (Copy)`;
      const newProject = await storage.createEstimationProject({
        name: newName,
        description: original.project.description,
        clientId: original.project.clientId,
        status: 'draft', // Always start copies as draft
        targetValue: original.project.targetValue,
        targetMargin: original.project.targetMargin,
        deliveryDate: original.project.deliveryDate,
        estimatedHours: original.project.estimatedHours,
        priority: original.project.priority,
        riskLevel: original.project.riskLevel,
        complexity: original.project.complexity,
        requiredDocumentation: original.project.requiredDocumentation,
        lifecycleTemplateId: original.project.lifecycleTemplateId,
        createdBy: user.id
      });
      
      // Copy the estimation data
      const newEstimation = {
        projectId: newProject.id,
        materials: original.materials || [],
        labor: original.labor || [],
        equipment: original.equipment || [],
        consumables: original.consumables || [],
        coatings: original.coatings || [],
        subcontractors: original.subcontractors || [],
        overheads: original.overheads || { percentage: 15, amount: 0 },
        margin: original.margin || { percentage: 20, amount: 0 },
        adjustments: original.adjustments || { discount: 0, freight: 0, other: 0 },
        notes: `Duplicated from ${original.project.name}`,
        subtotal: original.subtotal || 0,
        totalCost: original.totalCost || 0
      };
      
      await storage.saveEstimation(newEstimation);
      
      // Get the full new estimation
      const duplicated = await storage.getEstimation(newProject.id);
      
      res.json({
        id: newProject.id,
        name: newProject.name,
        ...duplicated
      });
    } catch (error) {
      console.error("Error duplicating estimation:", error);
      res.status(500).json({ error: "Failed to duplicate estimation" });
    }
  });

  // Generate quote from estimation
  app.post('/api/estimations/:id/generate-quote', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { settings, template, content, previewHtml, displayOptions } = req.body;
      
      // Get the estimation
      const estimation = await storage.getEstimationProject(id);
      if (!estimation) {
        return res.status(404).json({ error: "Estimation not found" });
      }
      
      // Get latest quote version for this estimation
      const latestQuote = await storage.getLatestQuoteVersion(id);
      const version = latestQuote ? (latestQuote.version || 0) + 1 : 1;
      
      // Generate quote number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const quoteNumber = `Q-${year}-${month}${day}-${random}-V${version}`;
      
      // Get estimation data for accurate calculations
      const estimationData = await storage.getEstimationData(id);
      
      // Calculate financial summary from estimation data
      const totals = estimationData?.totals || {};
      const directCosts = parseFloat(totals.directCosts || '0');
      const overheads = parseFloat(totals.overheads || '0');
      const margin = parseFloat(totals.margin || '0');
      const subtotal = parseFloat(totals.totalBeforeGst || directCosts + overheads + margin);
      const taxRate = 0.15; // 15% GST
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;
      
      console.log('Quote calculation:', {
        estimationId: id,
        directCosts,
        overheads,
        margin,
        subtotal,
        taxAmount,
        totalAmount
      });
      
      // Create quote
      const quote = await storage.createQuote({
        estimationId: id,
        clientId: estimation.clientId,
        quoteNumber,
        version,
        template,
        settings,
        displayFormat: displayOptions?.displayFormat || 'standard',
        pricingDisplay: displayOptions?.pricingDisplay || 'detailed',
        content,
        previewHtml,
        showCostBreakdown: displayOptions?.showCostBreakdown ?? true,
        showMarkups: displayOptions?.showMarkups ?? false,
        showSubtotals: displayOptions?.showSubtotals ?? true,
        showTaxes: displayOptions?.showTaxes ?? true,
        showPaymentTerms: displayOptions?.showPaymentTerms ?? true,
        showValidityPeriod: displayOptions?.showValidityPeriod ?? true,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        status: 'draft',
        createdBy: user.id
      });
      
      // Add history entry
      await storage.addQuoteHistory({
        quoteId: quote.id,
        action: 'created',
        performedBy: user.id,
        notes: `Quote version ${version} generated from estimation`
      });
      
      res.json(quote);
    } catch (error) {
      console.error("Error generating quote:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  });

  // Generate PDF for quote
  app.get('/api/estimations/:estimationId/quotes/:quoteId/pdf', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const quoteId = parseInt(req.params.quoteId);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Use PDFKit to generate a real PDF
      const PDFKit = await import('pdfkit');
      const PDFDocument = PDFKit.default || PDFKit;
      const doc = new PDFDocument({ margin: 50 });
      
      // Create buffer to store PDF
      const chunks: Buffer[] = [];
      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        
        // Set proper headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quote-${quote.quoteNumber}.pdf"`);
        res.send(pdfBuffer);
      });
      
      // Get estimation details
      const estimation = await storage.getEstimationProject(parseInt(req.params.estimationId));
      if (!estimation) {
        throw new Error("Estimation not found");
      }
      
      // PDF Header
      doc.fontSize(24).text('QUOTATION', 50, 50);
      doc.fontSize(18).text(`${quote.quoteNumber}`, 50, 80);
      
      // Company Info
      doc.fontSize(12)
        .text('Lateral Engineering Limited', 50, 120)
        .text('123 Engineering Street', 50, 135)
        .text('Auckland, New Zealand', 50, 150)
        .text('Phone: +64 9 123 4567', 50, 165)
        .text('Email: info@lateralengineering.co.nz', 50, 180);
      
      // Quote Date
      doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 400, 120);
      doc.text(`Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 400, 135);
      
      // Get client details
      let clientName = 'Client Name';
      let clientCompany = '';
      let clientEmail = '';
      
      if (estimation.project?.clientId) {
        const client = await storage.getClient(estimation.project.clientId);
        if (client) {
          clientName = client.name || client.primaryContactName || 'Client Name';
          clientCompany = client.company || '';
          clientEmail = client.primaryContactEmail || '';
        }
      }
      
      // Client Info
      doc.fontSize(14).text('QUOTATION FOR:', 50, 220);
      doc.fontSize(12)
        .text(clientName, 50, 240)
        .text(clientCompany, 50, 255)
        .text(clientEmail, 50, 270);
      
      // Project Details
      doc.fontSize(14).text('PROJECT DETAILS:', 50, 310);
      doc.fontSize(12)
        .text(`Project: ${estimation.project?.name}`, 50, 330)
        .text(`Description: ${estimation.project?.description || 'N/A'}`, 50, 345, { width: 500 });
      
      // Move to new position for items
      let yPos = 400;
      
      // Cost Breakdown Header
      doc.fontSize(14).text('COST BREAKDOWN:', 50, yPos);
      yPos += 30;
      
      // Table Headers
      doc.fontSize(10)
        .text('Description', 50, yPos)
        .text('Amount', 450, yPos, { align: 'right' });
      
      // Draw line
      doc.moveTo(50, yPos + 15).lineTo(550, yPos + 15).stroke();
      yPos += 25;
      
      // Get estimation data for accurate totals
      const estimationData = await storage.getEstimationData(parseInt(req.params.estimationId));
      const totals = estimationData?.totals || {};
      
      // Define what to show based on quote settings
      const showBreakdown = quote.showCostBreakdown !== false;
      const showMarkups = quote.showMarkups === true;
      
      if (showBreakdown) {
        // Materials
        if (totals.materials > 0) {
          doc.fontSize(11).text('Materials', 50, yPos);
          doc.fontSize(10).text(`$${(totals.materials || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Labor
        if (totals.labor > 0) {
          doc.fontSize(11).text('Labor', 50, yPos);
          doc.fontSize(10).text(`$${(totals.labor || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Equipment
        if (totals.equipment > 0) {
          doc.fontSize(11).text('Equipment', 50, yPos);
          doc.fontSize(10).text(`$${(totals.equipment || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Consumables
        if (totals.consumables > 0) {
          doc.fontSize(11).text('Consumables', 50, yPos);
          doc.fontSize(10).text(`$${(totals.consumables || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Coatings
        if (totals.coatings > 0) {
          doc.fontSize(11).text('Coatings', 50, yPos);
          doc.fontSize(10).text(`$${(totals.coatings || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Subcontractors
        if (totals.subcontractors > 0) {
          doc.fontSize(11).text('Subcontractors', 50, yPos);
          doc.fontSize(10).text(`$${(totals.subcontractors || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Add separator for direct costs if showing markups
        if (showMarkups) {
          yPos += 5;
          doc.moveTo(350, yPos).lineTo(550, yPos).stroke();
          yPos += 10;
          
          doc.fontSize(10).text('Direct Costs Subtotal', 50, yPos);
          doc.fontSize(10).text(`$${(totals.directCosts || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 25;
        }
      }
      
      // Show overheads and margin if enabled
      if (showMarkups) {
        // Overheads
        if (totals.overheads > 0) {
          doc.fontSize(11).text(`Overheads (${estimationData.overhead_percentage || 20}%)`, 50, yPos);
          doc.fontSize(10).text(`$${(totals.overheads || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
        
        // Margin
        if (totals.margin > 0) {
          doc.fontSize(11).text(`Margin (${estimationData.margin_percentage || 20}%)`, 50, yPos);
          doc.fontSize(10).text(`$${(totals.margin || 0).toFixed(2)}`, 450, yPos, { align: 'right' });
          yPos += 20;
        }
      }
      
      // Subtotal line
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;
      
      // Subtotal
      doc.fontSize(11).text('Subtotal', 50, yPos);
      doc.fontSize(11).text(`$${parseFloat(quote.subtotal).toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 20;
      
      // GST
      doc.fontSize(11).text('GST (15%)', 50, yPos);
      doc.fontSize(11).text(`$${parseFloat(quote.taxAmount).toFixed(2)}`, 450, yPos, { align: 'right' });
      yPos += 20;
      
      // Total line
      doc.moveTo(400, yPos).lineTo(550, yPos).stroke();
      yPos += 10;
      
      // Total
      doc.fontSize(14).text('TOTAL', 50, yPos);
      doc.fontSize(14).text(`$${parseFloat(quote.totalAmount).toFixed(2)}`, 450, yPos, { align: 'right' });
      
      // Terms and Conditions
      if (yPos < 600) {
        yPos = 600;
      } else {
        doc.addPage();
        yPos = 50;
      }
      
      doc.fontSize(12).text('TERMS AND CONDITIONS:', 50, yPos);
      doc.fontSize(10)
        .text('1. This quote is valid for 30 days from the date of issue.', 50, yPos + 20)
        .text('2. Payment terms: 50% deposit on acceptance, balance on completion.', 50, yPos + 35)
        .text('3. Prices exclude any additional work not specified in this quote.', 50, yPos + 50)
        .text('4. All prices are in NZD and include GST.', 50, yPos + 65);
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Send quote to client
  app.post('/api/estimations/:id/send-quote', async (req, res) => {
    try {
      const user = await AuthService.getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { settings, template, to, cc, subject, message } = req.body;
      
      // Get the estimation
      const estimation = await storage.getEstimation(id);
      if (!estimation) {
        return res.status(404).json({ error: "Estimation not found" });
      }
      
      // Update estimation status to 'sent'
      await storage.updateEstimationStatus(id, 'sent');
      
      // Record the send event
      const sendEvent = {
        estimationId: id,
        sentTo: to,
        cc: cc || [],
        subject,
        message,
        template,
        settings,
        sentAt: new Date(),
        sentBy: user.id
      };
      
      // In a real implementation, this would send an email with the quote
      console.log("Quote sent:", sendEvent);
      
      res.json({
        success: true,
        message: "Quote sent successfully",
        sentAt: sendEvent.sentAt
      });
    } catch (error) {
      console.error("Error sending quote:", error);
      res.status(500).json({ error: "Failed to send quote" });
    }
  });

  // Get quotes for an estimation
  app.get('/api/estimations/:id/quotes', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const quotes = await storage.getQuoteVersions(id);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });
  
  // Get single quote
  app.get('/api/quotes/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });
  
  // Update quote
  app.patch('/api/quotes/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const quote = await storage.updateQuote(id, updates);
      
      // Add history entry
      await storage.addQuoteHistory({
        quoteId: id,
        action: 'updated',
        performedBy: user.id,
        changes: updates,
        notes: 'Quote updated'
      });
      
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });
  
  // Send quote to client
  app.post('/api/quotes/:id/send', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const { recipientEmail, message, ccEmails, emailSubject } = req.body;
      
      // Get the quote
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Update quote with sent details
      await storage.updateQuote(id, {
        status: 'sent',
        sentAt: new Date(),
        sentTo: recipientEmail,
        sentBy: user.id,
        emailSubject,
        emailMessage: message,
        ccEmails: ccEmails || []
      });
      
      // Add history entry
      await storage.addQuoteHistory({
        quoteId: id,
        action: 'sent',
        performedBy: user.id,
        changes: { recipientEmail, ccEmails },
        notes: `Quote sent to ${recipientEmail}`
      });
      
      // In a real implementation, this would send an email with the quote
      res.json({
        success: true,
        sentTo: recipientEmail,
        ccTo: ccEmails,
        sentAt: new Date(),
        message: "Quote sent successfully"
      });
    } catch (error) {
      console.error("Error sending quote:", error);
      res.status(500).json({ error: "Failed to send quote" });
    }
  });
  
  // Get quote history
  app.get('/api/quotes/:id/history', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const history = await storage.getQuoteHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching quote history:", error);
      res.status(500).json({ error: "Failed to fetch quote history" });
    }
  });
  
  // Record quote view (public endpoint for tracking when clients view quotes)
  app.post('/api/quotes/:id/view', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { durationSeconds } = req.body;
      
      const view = await storage.recordQuoteView({
        quoteId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
        durationSeconds: durationSeconds || 0
      });
      
      // Update quote viewed status
      const quote = await storage.getQuote(id);
      if (quote && !quote.viewedAt) {
        await storage.updateQuote(id, { viewedAt: new Date() });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording quote view:", error);
      res.status(500).json({ error: "Failed to record quote view" });
    }
  });

  app.post('/api/client-locations', async (req, res) => {
    try {
      const location = await storage.createLocation({
        ...req.body,
        entityType: 'client'
      });
      res.json(location);
    } catch (error) {
      console.error('Error creating client location:', error);
      res.status(500).json({ error: 'Failed to create client location' });
    }
  });

  app.put('/api/client-locations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.updateLocation(id, req.body);
      res.json(location);
    } catch (error) {
      console.error('Error updating client location:', error);
      res.status(500).json({ error: 'Failed to update client location' });
    }
  });

  app.delete('/api/client-locations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLocation(id);
      res.json({ success });
    } catch (error) {
      console.error('Error deleting client location:', error);
      res.status(500).json({ error: 'Failed to delete client location' });
    }
  });

  // Team Management Routes
  
  // Roles
  app.get("/api/team/roles", async (req, res) => {
    try {
      const roles = await teamStorage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.post("/api/team/roles", async (req, res) => {
    try {
      const role = await teamStorage.createRole(req.body);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  app.put("/api/team/roles/:id", async (req, res) => {
    try {
      const role = await teamStorage.updateRole(parseInt(req.params.id), req.body);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/team/roles/:id", async (req, res) => {
    try {
      await teamStorage.deleteRole(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // Departments
  app.get("/api/team/departments", async (req, res) => {
    try {
      const departments = await teamStorage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/team/departments", async (req, res) => {
    try {
      const department = await teamStorage.createDepartment(req.body);
      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  });

  app.put("/api/team/departments/:id", async (req, res) => {
    try {
      const department = await teamStorage.updateDepartment(parseInt(req.params.id), req.body);
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  });

  app.delete("/api/team/departments/:id", async (req, res) => {
    try {
      await teamStorage.deleteDepartment(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  // Team Members
  app.get("/api/team/members", async (req, res) => {
    try {
      const members = await teamStorage.getTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team/members/:id", async (req, res) => {
    try {
      const member = await teamStorage.getTeamMemberById(parseInt(req.params.id));
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ error: "Failed to fetch team member" });
    }
  });

  app.post("/api/team/members", async (req, res) => {
    try {
      const member = await teamStorage.createTeamMember(req.body);
      res.json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.put("/api/team/members/:id", async (req, res) => {
    try {
      const member = await teamStorage.updateTeamMember(parseInt(req.params.id), req.body);
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/team/members/:id", async (req, res) => {
    try {
      await teamStorage.deleteTeamMember(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Get expiring certificates across all team members
  app.get("/api/team/expiring-certificates", async (req, res) => {
    try {
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const members = await teamStorage.getTeamMembers();
      const expiringCerts: any[] = [];

      members.forEach(member => {
        // Check safety certificates
        if (member.safetyCertificates && Array.isArray(member.safetyCertificates)) {
          member.safetyCertificates.forEach((cert: any) => {
            if (cert.expiryDate) {
              const expiryDate = new Date(cert.expiryDate);
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilExpiry <= 90) {
                expiringCerts.push({
                  employeeName: `${member.firstName} ${member.lastName}`,
                  employeeNumber: member.employeeNumber,
                  certificateType: 'Safety',
                  certificateName: cert.name,
                  expiryDate: cert.expiryDate,
                  daysUntilExpiry,
                  isExpired: daysUntilExpiry < 0
                });
              }
            }
          });
        }

        // Check welding certificates
        if (member.weldingCertificates && Array.isArray(member.weldingCertificates)) {
          member.weldingCertificates.forEach((cert: any) => {
            if (cert.expiryDate) {
              const expiryDate = new Date(cert.expiryDate);
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilExpiry <= 90) {
                expiringCerts.push({
                  employeeName: `${member.firstName} ${member.lastName}`,
                  employeeNumber: member.employeeNumber,
                  certificateType: 'Welding',
                  certificateName: `${cert.process} - ${cert.name}`,
                  expiryDate: cert.expiryDate,
                  daysUntilExpiry,
                  isExpired: daysUntilExpiry < 0
                });
              }
            }
          });
        }

        // Check individual date fields
        const dateFields = [
          { field: 'firstAidExpiry', name: 'First Aid Certificate' },
          { field: 'workingAtHeightsExpiry', name: 'Working at Heights' },
          { field: 'safetyTrainingExpiry', name: 'Safety Training' },
          { field: 'medicalExpiryDate', name: 'Medical Clearance' }
        ];

        dateFields.forEach(({ field, name }) => {
          const value = member[field as keyof typeof member];
          if (value) {
            const expiryDate = new Date(value as string);
            const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry <= 90) {
              expiringCerts.push({
                employeeName: `${member.firstName} ${member.lastName}`,
                employeeNumber: member.employeeNumber,
                certificateType: 'Safety',
                certificateName: name,
                expiryDate: value,
                daysUntilExpiry,
                isExpired: daysUntilExpiry < 0
              });
            }
          }
        });
      });

      // Sort by days until expiry (most urgent first)
      expiringCerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      res.json(expiringCerts);
    } catch (error) {
      console.error("Failed to get expiring certificates:", error);
      res.status(500).json({ message: "Failed to get expiring certificates" });
    }
  });

  // Users for assignment
  app.get("/api/users", async (req, res) => {
    try {
      const users = await teamStorage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Initialize default system roles
  app.post("/api/team/init-default-roles", async (req, res) => {
    try {
      const existingRoles = await teamStorage.getRoles();
      if (existingRoles.length === 0) {
        for (const roleData of DEFAULT_SYSTEM_ROLES) {
          await teamStorage.createRole(roleData);
        }
      }
      res.json({ success: true, message: "Default roles initialized" });
    } catch (error) {
      console.error("Error initializing default roles:", error);
      res.status(500).json({ error: "Failed to initialize default roles" });
    }
  });

  // Time Management Routes
  
  // Time Clocks
  app.post("/api/time/clock", async (req, res) => {
    try {
      const clock = await timeManagementStorage.createTimeClock(req.body);
      res.json(clock);
    } catch (error) {
      console.error("Error creating time clock:", error);
      res.status(500).json({ error: "Failed to create time clock" });
    }
  });

  app.get("/api/time/clocks/today", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1; // TODO: Get from auth
      const clocks = await timeManagementStorage.getTodayTimeClocks(userId);
      res.json(clocks);
    } catch (error) {
      console.error("Error fetching today's clocks:", error);
      res.status(500).json({ error: "Failed to fetch today's clocks" });
    }
  });

  // Timesheets
  app.get("/api/time/timesheets/week", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1; // TODO: Get from auth
      const weekStart = req.query.weekStart as string;
      
      if (!weekStart) {
        return res.status(400).json({ error: "Week start date is required" });
      }
      
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const timesheets = await timeManagementStorage.getTimesheets(userId, startDate, endDate);
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching week timesheets:", error);
      res.status(500).json({ error: "Failed to fetch week timesheets" });
    }
  });

  app.post("/api/time/timesheets", async (req, res) => {
    try {
      const timesheet = await timeManagementStorage.createTimesheet(req.body);
      res.json(timesheet);
    } catch (error) {
      console.error("Error creating timesheet:", error);
      res.status(500).json({ error: "Failed to create timesheet" });
    }
  });

  app.put("/api/time/timesheets/:id", async (req, res) => {
    try {
      const timesheet = await timeManagementStorage.updateTimesheet(parseInt(req.params.id), req.body);
      res.json(timesheet);
    } catch (error) {
      console.error("Error updating timesheet:", error);
      res.status(500).json({ error: "Failed to update timesheet" });
    }
  });

  app.post("/api/time/timesheets/:id/submit", async (req, res) => {
    try {
      const userId = req.body.userId || 1; // TODO: Get from auth
      const timesheet = await timeManagementStorage.submitTimesheet(parseInt(req.params.id), userId);
      res.json(timesheet);
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      res.status(500).json({ error: "Failed to submit timesheet" });
    }
  });

  app.post("/api/time/timesheets/:id/approve", async (req, res) => {
    try {
      const approvedBy = req.body.approvedBy || 1; // TODO: Get from auth
      const timesheet = await timeManagementStorage.approveTimesheet(parseInt(req.params.id), approvedBy);
      res.json(timesheet);
    } catch (error) {
      console.error("Error approving timesheet:", error);
      res.status(500).json({ error: "Failed to approve timesheet" });
    }
  });

  // Job Tasks
  app.get("/api/time/tasks/assigned", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1; // TODO: Get from auth
      const tasks = await timeManagementStorage.getJobTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      res.status(500).json({ error: "Failed to fetch assigned tasks" });
    }
  });

  app.get("/api/time/tasks", async (req, res) => {
    try {
      const tasks = await timeManagementStorage.getJobTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/time/tasks", async (req, res) => {
    try {
      const task = await timeManagementStorage.createJobTask(req.body);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/time/tasks/:id", async (req, res) => {
    try {
      const task = await timeManagementStorage.updateJobTask(parseInt(req.params.id), req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.post("/api/time/tasks/:id/assign", async (req, res) => {
    try {
      const { userId } = req.body;
      const task = await timeManagementStorage.assignTask(parseInt(req.params.id), userId);
      res.json(task);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Leave Requests
  app.get("/api/time/leave-requests", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const requests = await timeManagementStorage.getLeaveRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  });

  app.post("/api/time/leave-requests", async (req, res) => {
    try {
      const request = await timeManagementStorage.createLeaveRequest(req.body);
      res.json(request);
    } catch (error) {
      console.error("Error creating leave request:", error);
      res.status(500).json({ error: "Failed to create leave request" });
    }
  });

  app.post("/api/time/leave-requests/:id/approve", async (req, res) => {
    try {
      const { approvedBy, approved } = req.body;
      const request = await timeManagementStorage.approveLeaveRequest(
        parseInt(req.params.id), 
        approvedBy, 
        approved
      );
      res.json(request);
    } catch (error) {
      console.error("Error processing leave request:", error);
      res.status(500).json({ error: "Failed to process leave request" });
    }
  });

  // Analytics
  app.get("/api/time/analytics/user-summary", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string) || 1;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const summary = await timeManagementStorage.getUserHoursSummary(userId, startDate, endDate);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching user summary:", error);
      res.status(500).json({ error: "Failed to fetch user summary" });
    }
  });

  // Labor Rates Management API
  app.get("/api/labor-rates", async (req, res) => {
    try {
      // Get team members with their roles and rates
      const teamRates = await db.select({
        id: users.id,
        name: users.name,
        role: roles.name,
        department: departments.name,
        hourlyRate: teamMembers.hourlyRate,
        skillLevel: roles.description,
        isActive: teamMembers.isActive
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .innerJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(teamMembers.isActive, true));

      // Transform to Labor Category format for AI Engine
      const laborCategories = teamRates.map(member => ({
        id: `team-${member.id}`,
        name: member.role,
        description: `${member.name} - ${member.department}`,
        chargeOutRate: Number(member.hourlyRate) || 85,
        inHouseCostRate: Number(member.hourlyRate) * 0.6 || 45, // 60% cost ratio
        overtimeMultiplier: 1.5,
        skillLevel: member.role.includes('Senior') ? 'Senior' : 
                   member.role.includes('Manager') || member.role.includes('Owner') ? 'Supervisor' : 'Tradesman',
        certifications: [],
        workshopChargeRate: Number(member.hourlyRate) || 85,
        siteChargeRate: (Number(member.hourlyRate) || 85) * 1.2, // 20% site premium
        workshopCostRate: (Number(member.hourlyRate) * 0.6) || 45,
        siteCostRate: (Number(member.hourlyRate) * 0.6 * 1.1) || 50, // 10% site cost increase
        effectiveDate: new Date().toISOString().split('T')[0],
        isActive: member.isActive,
        dayShiftMultiplier: 1.0,
        nightShiftMultiplier: 1.3,
        weekendMultiplier: 1.5,
        publicHolidayMultiplier: 2.0
      }));

      const laborRatesConfig = {
        categories: laborCategories,
        defaultOvertime: 1.5,
        defaultInHouseCostRate: 45.00,
        travelTime: {
          billable: true,
          chargeRate: 85.00,
          costRate: 45.00,
          minimumHours: 0.5
        },
        aiIntegration: {
          enabled: true,
          autoAssignCategories: true,
          suggestHours: true,
          complexityFactors: true,
          pdfAnalysisIntegration: true
        },
        historicalTracking: {
          enabled: true,
          retentionMonths: 24
        }
      };

      res.json(laborRatesConfig);
    } catch (error) {
      console.error("Error fetching labor rates:", error);
      res.status(500).json({ error: "Failed to fetch labor rates" });
    }
  });

  // AI Estimation Labor Integration with Rate Profiles
  app.post("/api/estimation/labor-integration", async (req, res) => {
    try {
      const { projectData, materials, profileId } = req.body;
      
      // Get active labor rate profile - use default if not specified
      let activeProfile;
      if (profileId) {
        const profileResult = await db.execute(sql`
          SELECT * FROM labor_rate_profiles 
          WHERE id = ${profileId} AND is_active = true
        `);
        activeProfile = profileResult.rows[0];
      } else {
        const defaultResult = await db.execute(sql`
          SELECT * FROM labor_rate_profiles 
          WHERE is_default = true AND is_active = true
          LIMIT 1
        `);
        activeProfile = defaultResult.rows[0];
      }
      
      if (!activeProfile) {
        // Fallback to Standard Rates profile
        const standardResult = await db.execute(sql`
          SELECT * FROM labor_rate_profiles 
          WHERE name = 'Standard Rates' AND is_active = true
          LIMIT 1
        `);
        activeProfile = standardResult.rows[0];
      }
      
      // Get role rates from the active profile
      const roleRatesResult = await db.execute(sql`
        SELECT 
          rr.*,
          r.name as role_name,
          r.description as role_description,
          sl.multiplier as skill_multiplier
        FROM role_rates rr
        JOIN roles r ON r.id = rr.role_id
        LEFT JOIN skill_levels sl ON sl.id = rr.skill_level_id
        WHERE rr.profile_id = ${activeProfile?.id || 1}
          AND rr.is_active = true
      `);
      
      const roleRates = roleRatesResult.rows;

      // AI suggestion logic for labor categories based on materials
      const laborSuggestions = materials.map((material: any) => {
        let suggestedRole = 'Welder/Fabricator';
        let estimatedHours = 1.0;
        let skillLevel = 'standard';
        
        // Suggest appropriate roles based on material complexity
        if (material.category?.includes('Universal Beam') || material.category?.includes('Column')) {
          suggestedRole = 'Senior Estimator';
          estimatedHours = 3.0;
          skillLevel = 'senior';
        } else if (material.category?.includes('Coating') || material.category?.includes('Paint')) {
          suggestedRole = 'Welder/Fabricator';
          estimatedHours = 0.5;
          skillLevel = 'standard';
        } else if (material.category?.includes('Plate') || material.category?.includes('Sheet')) {
          suggestedRole = 'Welder/Fabricator';
          estimatedHours = 2.0;
          skillLevel = 'standard';
        }

        // Find matching role rate from profile
        const roleRate = roleRates.find((r: any) => r.role_name === suggestedRole) || roleRates[0];
        const baseRate = roleRate?.base_rate || activeProfile?.base_rate || 75;
        const skillMultiplier = roleRate?.skill_multiplier || 1.0;
        const effectiveRate = baseRate * skillMultiplier;
        
        return {
          materialId: material.id,
          materialName: material.name,
          suggestedRole,
          estimatedHours,
          skillLevel,
          baseRate,
          skillMultiplier,
          hourlyRate: effectiveRate,
          totalLaborCost: estimatedHours * effectiveRate,
          profileId: activeProfile?.id,
          profileName: activeProfile?.name,
          complexity: material.category?.includes('Universal') ? 'high' : 
                     material.category?.includes('Plate') ? 'medium' : 'low'
        };
      });

      res.json({
        laborSuggestions,
        totalLaborHours: laborSuggestions.reduce((sum: number, item: any) => sum + item.estimatedHours, 0),
        totalLaborCost: laborSuggestions.reduce((sum: number, item: any) => sum + item.totalLaborCost, 0),
        activeProfile: {
          id: activeProfile?.id,
          name: activeProfile?.name,
          baseRate: activeProfile?.base_rate,
          overtimeMultiplier: activeProfile?.overtime_multiplier,
          effectiveDate: activeProfile?.effective_date
        },
        roleRates: roleRates.map((rate: any) => ({
          roleId: rate.role_id,
          roleName: rate.role_name,
          baseRate: rate.base_rate,
          skillMultiplier: rate.skill_multiplier || 1.0,
          effectiveRate: rate.base_rate * (rate.skill_multiplier || 1.0)
        }))
      });
    } catch (error) {
      console.error("Error in labor integration:", error);
      res.status(500).json({ error: "Failed to process labor integration" });
    }
  });

  app.get("/api/time/analytics/team-productivity", async (req, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const productivity = await timeManagementStorage.getTeamProductivity(startDate, endDate);
      res.json(productivity);
    } catch (error) {
      console.error("Error fetching team productivity:", error);
      res.status(500).json({ error: "Failed to fetch team productivity" });
    }
  });

  // Authentication Routes
  
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, twoFactorCode } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const result = await AuthService.authenticateUser(username, password, twoFactorCode);
      
      if (result.requires2FA) {
        return res.json({ requires2FA: true });
      }

      // Set session token in HTTP-only cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(401).json({ error: error.message });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await AuthService.logout(token);
      }

      res.clearCookie('auth_token');
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "No authentication token" });
      }

      const user = await AuthService.validateSession(token);
      
      if (!user) {
        res.clearCookie('auth_token');
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      res.json(user);
    } catch (error) {
      console.error("Auth validation error:", error);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Setup 2FA endpoint
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const twoFASetup = await AuthService.setup2FA(user.id);
      res.json(twoFASetup);
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  // Enable 2FA endpoint
  app.post("/api/auth/2fa/enable", async (req, res) => {
    try {
      const { verificationCode } = req.body;
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await AuthService.enable2FA(user.id, verificationCode);
      res.json({ success: true });
    } catch (error) {
      console.error("2FA enable error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Disable 2FA endpoint
  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      const { password } = req.body;
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await AuthService.disable2FA(user.id, password);
      res.json({ success: true });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords required" });
      }

      await AuthService.changePassword(user.id, currentPassword, newPassword);
      res.json({ success: true });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Create user endpoint (admin only)
  app.post("/api/auth/users", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const currentUser = await AuthService.validateSession(token);
      
      if (!currentUser || !['Business Owner', 'Administrator'].includes(currentUser.role)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const newUser = await AuthService.createUser(req.body);
      res.json(newUser);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Clean expired sessions (can be called periodically)
  app.post("/api/auth/cleanup", async (req, res) => {
    try {
      await AuthService.cleanExpiredSessions();
      res.json({ success: true });
    } catch (error) {
      console.error("Session cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup sessions" });
    }
  });

  // Document Upload for Health & Safety Certificates
  const documentUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const employeeNumber = req.params.employeeNumber || 'general';
        const uploadPath = `./documents/team/${employeeNumber}`;
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, PNG files are allowed.'));
      }
    }
  });

  app.post("/api/team/:employeeNumber/documents", documentUpload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const documentInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        employeeNumber: req.params.employeeNumber,
        documentType: req.body.documentType || 'general',
        uploadedAt: new Date().toISOString()
      };

      res.json({
        message: "Document uploaded successfully",
        document: documentInfo
      });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Performance Review Routes
  app.get("/api/performance-reviews/:teamMemberId", async (req, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      
      const result = await db.execute(`
        SELECT * FROM performance_reviews 
        WHERE team_member_id = $1 
        ORDER BY review_period_start DESC
      `, [teamMemberId]);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching performance reviews:", error);
      res.status(500).json({ error: "Failed to fetch performance reviews" });
    }
  });

  app.post("/api/performance-reviews", async (req, res) => {
    try {
      const reviewData = req.body;
      
      // Convert string dates to Date objects
      if (reviewData.reviewPeriodStart) {
        reviewData.reviewPeriodStart = new Date(reviewData.reviewPeriodStart);
      }
      if (reviewData.reviewPeriodEnd) {
        reviewData.reviewPeriodEnd = new Date(reviewData.reviewPeriodEnd);
      }

      // Convert numeric strings to proper numbers
      const numericFields = [
        'overallRating', 'productionQuality', 'safetyCompliance', 'teamwork',
        'technicalSkills', 'problemSolving', 'reliability', 'communication',
        'initiative', 'defectRate', 'productivityScore', 'attendanceScore'
      ];

      numericFields.forEach(field => {
        if (reviewData[field] && reviewData[field] !== '') {
          reviewData[field] = parseFloat(reviewData[field]);
        } else {
          delete reviewData[field];
        }
      });

      if (reviewData.safetyIncidents) {
        reviewData.safetyIncidents = parseInt(reviewData.safetyIncidents);
      }

      const [newReview] = await db
        .insert(performanceReviews)
        .values({
          ...reviewData,
          reviewStatus: 'pending'
        })
        .returning();

      // Calculate next review date
      const nextReviewDate = new Date();
      if (reviewData.reviewType === 'annual') {
        nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
      } else if (reviewData.reviewType === 'probation' || reviewData.reviewType === 'improvement') {
        nextReviewDate.setDate(nextReviewDate.getDate() + 90);
      }

      // Update team member's review dates
      await db
        .update(teamMembers)
        .set({ 
          lastReviewDate: new Date(),
          nextReviewDate: nextReviewDate
        })
        .where(eq(teamMembers.id, reviewData.teamMemberId));

      res.json(newReview);
    } catch (error) {
      console.error("Error creating performance review:", error);
      res.status(500).json({ error: "Failed to create performance review" });
    }
  });

  // Auto-sync team member and user account data
  app.post("/api/team/sync-user-data/:teamMemberId", async (req, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      const { syncDirection } = req.body; // 'team-to-user' or 'user-to-team'
      
      // Get team member data
      const [teamMember] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId));

      if (!teamMember) {
        return res.status(404).json({ error: "Team member not found" });
      }

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, teamMember.userId));

      if (!user) {
        return res.status(404).json({ error: "User account not found" });
      }

      if (syncDirection === 'team-to-user') {
        // Update user account with team member data
        const updateData: any = {};
        
        if (teamMember.firstName && teamMember.lastName) {
          updateData.name = `${teamMember.firstName} ${teamMember.lastName}`;
        }
        if (teamMember.personalEmail) {
          updateData.email = teamMember.personalEmail;
        }
        if (teamMember.personalPhone) {
          updateData.phone = teamMember.personalPhone;
        }

        if (Object.keys(updateData).length > 0) {
          await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, user.id));
        }
      } else if (syncDirection === 'user-to-team') {
        // Update team member with user account data
        const updateData: any = {};
        
        if (user.name) {
          const nameParts = user.name.split(' ');
          updateData.firstName = nameParts[0] || '';
          updateData.lastName = nameParts.slice(1).join(' ') || '';
        }
        if (user.email) {
          updateData.personalEmail = user.email;
        }
        if (user.phone) {
          updateData.personalPhone = user.phone;
        }

        if (Object.keys(updateData).length > 0) {
          await db
            .update(teamMembers)
            .set({
              ...updateData,
              updatedAt: new Date()
            })
            .where(eq(teamMembers.id, teamMemberId));
        }
      }

      res.json({ message: "Data synchronized successfully", syncDirection });
    } catch (error) {
      console.error("Error syncing user data:", error);
      res.status(500).json({ error: "Failed to sync user data" });
    }
  });

  // Qualification expiry reminders - dynamically generated from certificates
  app.get("/api/qualification-reminders/expiring", async (req, res) => {
    try {
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      // Get all active team members with their user info
      const members = await db
        .select()
        .from(teamMembers)
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.isActive, true));

      const expiringQualifications: any[] = [];
      let reminderId = 1;

      for (const { team_members: member, users: user } of members) {
        if (!member || !user) continue;

        // Check safety certificates
        if (member.safetyCertificates && Array.isArray(member.safetyCertificates)) {
          for (const cert of member.safetyCertificates as any[]) {
            if (cert.expiryDate) {
              const expiryDate = new Date(cert.expiryDate);
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              // Include expired and expiring within 90 days
              if (daysUntilExpiry <= 90) {
                expiringQualifications.push({
                  reminder: {
                    id: reminderId++,
                    qualificationType: cert.type || 'first_aid',
                    qualificationName: cert.name,
                    expiryDate: cert.expiryDate,
                    remindersSent: 0,
                    isActive: true
                  },
                  teamMember: {
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    employeeNumber: member.employeeNumber
                  },
                  user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                  }
                });
              }
            }
          }
        }

        // Check welding certificates
        if (member.weldingCertificates && Array.isArray(member.weldingCertificates)) {
          for (const cert of member.weldingCertificates as any[]) {
            if (cert.expiryDate) {
              const expiryDate = new Date(cert.expiryDate);
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              // Include expired and expiring within 90 days
              if (daysUntilExpiry <= 90) {
                expiringQualifications.push({
                  reminder: {
                    id: reminderId++,
                    qualificationType: 'welding',
                    qualificationName: `${cert.process} - ${cert.name}`,
                    expiryDate: cert.expiryDate,
                    remindersSent: 0,
                    isActive: true
                  },
                  teamMember: {
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    employeeNumber: member.employeeNumber
                  },
                  user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                  }
                });
              }
            }
          }
        }

        // Check individual date fields
        const dateFields = [
          { field: 'firstAidExpiry', name: 'First Aid Certificate', type: 'first_aid' },
          { field: 'workingAtHeightsExpiry', name: 'Working at Heights', type: 'heights' },
          { field: 'driverLicenseExpiry', name: 'Driver License', type: 'drivers' },
          { field: 'safetyCardExpiry', name: 'Safety Card', type: 'safety_card' }
        ];

        for (const { field, name, type } of dateFields) {
          const value = member[field as keyof typeof member];
          if (value) {
            const expiryDate = new Date(value as string);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Include expired and expiring within 90 days
            if (daysUntilExpiry <= 90) {
              expiringQualifications.push({
                reminder: {
                  id: reminderId++,
                  qualificationType: type,
                  qualificationName: name,
                  expiryDate: value,
                  remindersSent: 0,
                  isActive: true
                },
                teamMember: {
                  id: member.id,
                  firstName: member.firstName,
                  lastName: member.lastName,
                  employeeNumber: member.employeeNumber
                },
                user: {
                  id: user.id,
                  name: user.name,
                  email: user.email
                }
              });
            }
          }
        }
      }

      // Sort by expiry date (most urgent first)
      expiringQualifications.sort((a, b) => 
        new Date(a.reminder.expiryDate).getTime() - new Date(b.reminder.expiryDate).getTime()
      );

      res.json(expiringQualifications);
    } catch (error) {
      console.error("Error fetching expiring qualifications:", error);
      res.status(500).json({ error: "Failed to fetch expiring qualifications" });
    }
  });

  // Enhanced Settings API Routes
  
  // Organization Settings Routes
  app.get("/api/settings/organization", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const orgSettings = await db.select()
        .from(settings)
        .where(eq(settings.categoryId, "organization"));
      const settingsMap = orgSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching organization settings:", error);
      res.status(500).json({ message: "Failed to fetch organization settings" });
    }
  });

  app.put("/api/settings/organization", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { companySettings, systemSettings, customBranding } = req.body;
      const userId = user.id;

      // Update settings in database
      const updates = [
        { key: "company", value: companySettings, categoryId: "organization" },
        { key: "system", value: systemSettings, categoryId: "organization" },
        { key: "branding", value: customBranding, categoryId: "organization" }
      ];

      for (const update of updates) {
        // Get existing setting
        const [existing] = await db.select().from(settings).where(eq(settings.key, update.key));
        
        if (existing) {
          // Update existing setting
          await db.update(settings)
            .set({
              value: update.value,
              updatedAt: new Date()
            })
            .where(eq(settings.key, update.key));
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: existing.id,
            userId,
            previousValue: existing.value,
            newValue: update.value,
            changeReason: "Settings update"
          });
        } else {
          // Insert new setting
          const [newSetting] = await db.insert(settings)
            .values({
              ...update,
              dataType: "json",
              description: `${update.key} settings`,
              requiredRole: "admin"
            })
            .returning();
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: newSetting.id,
            userId,
            previousValue: null,
            newValue: update.value,
            changeReason: "Settings creation"
          });
        }
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating organization settings:", error);
      res.status(500).json({ message: "Failed to update organization settings" });
    }
  });

  // Financial Settings Routes
  app.get("/api/settings/financial", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const finSettings = await db.select()
        .from(settings)
        .where(eq(settings.categoryId, "financial"));
      const settingsMap = finSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching financial settings:", error);
      res.status(500).json({ message: "Failed to fetch financial settings" });
    }
  });

  app.put("/api/settings/financial", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { overheadSettings, marginTargets } = req.body;
      const userId = user.id;

      // Update settings in database
      const updates = [
        { key: "overheads", value: overheadSettings, categoryId: "financial" },
        { key: "margins", value: marginTargets, categoryId: "financial" }
      ];

      for (const update of updates) {
        // Get existing setting
        const [existing] = await db.select().from(settings).where(eq(settings.key, update.key));
        
        if (existing) {
          // Update existing setting
          await db.update(settings)
            .set({
              value: update.value,
              updatedAt: new Date()
            })
            .where(eq(settings.key, update.key));
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: existing.id,
            userId,
            previousValue: existing.value,
            newValue: update.value,
            changeReason: "Settings update"
          });
        } else {
          // Insert new setting
          const [newSetting] = await db.insert(settings)
            .values({
              ...update,
              dataType: "json",
              description: `${update.key} settings`,
              requiredRole: "finance_manager"
            })
            .returning();
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: newSetting.id,
            userId,
            previousValue: null,
            newValue: update.value,
            changeReason: "Settings creation"
          });
        }
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating financial settings:", error);
      res.status(500).json({ message: "Failed to update financial settings" });
    }
  });

  // Operations Settings Routes
  app.get("/api/settings/operations", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const opsSettings = await db.select()
        .from(settings)
        .where(eq(settings.categoryId, "operations"));
      const settingsMap = opsSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching operations settings:", error);
      res.status(500).json({ message: "Failed to fetch operations settings" });
    }
  });

  app.put("/api/settings/operations", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { fabricationSettings, workflowSettings, qualitySettings } = req.body;
      const userId = user.id;

      // Update settings in database
      const updates = [
        { key: "fabrication", value: fabricationSettings, categoryId: "operations" },
        { key: "workflow", value: workflowSettings, categoryId: "operations" },
        { key: "quality", value: qualitySettings, categoryId: "operations" }
      ];

      for (const update of updates) {
        // Get existing setting
        const [existing] = await db.select().from(settings).where(eq(settings.key, update.key));
        
        if (existing) {
          // Update existing setting
          await db.update(settings)
            .set({
              value: update.value,
              updatedAt: new Date()
            })
            .where(eq(settings.key, update.key));
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: existing.id,
            userId,
            previousValue: existing.value,
            newValue: update.value,
            changeReason: "Settings update"
          });
        } else {
          // Insert new setting
          const [newSetting] = await db.insert(settings)
            .values({
              ...update,
              dataType: "json",
              description: `${update.key} settings`,
              requiredRole: "operations_manager"
            })
            .returning();
            
          // Add to audit log
          await db.insert(settingsAudit).values({
            settingId: newSetting.id,
            userId,
            previousValue: null,
            newValue: update.value,
            changeReason: "Settings creation"
          });
        }
      }

      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating operations settings:", error);
      res.status(500).json({ message: "Failed to update operations settings" });
    }
  });

  // Enhanced Time & Payroll Routes
  app.get("/api/payroll/integration", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [integration] = await db.select().from(payrollIntegration).limit(1);
      res.json(integration || null);
    } catch (error) {
      console.error("Error fetching payroll integration:", error);
      res.status(500).json({ message: "Failed to fetch payroll integration" });
    }
  });

  app.post("/api/payroll/sync", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Placeholder for payroll sync logic
      await db.update(payrollIntegration)
        .set({ lastSyncAt: new Date() })
        .where(eq(payrollIntegration.isActive, true));
      res.json({ message: "Payroll sync completed" });
    } catch (error) {
      console.error("Error syncing payroll:", error);
      res.status(500).json({ message: "Failed to sync payroll" });
    }
  });

  // Time Clock Summary Route
  app.get("/api/time/summary/:date", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const date = new Date(req.params.date);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Get active workers (clocked in)
      const activeWorkers = await db.select()
        .from(timeClocks)
        .where(
          and(
            eq(timeClocks.clockType, "clock_in"),
            gte(timeClocks.timestamp, new Date(new Date().setHours(0, 0, 0, 0)))
          )
        );

      // Calculate week hours and costs
      const weekData = await db.select({
        totalHours: sql<number>`SUM(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp))) / 3600)`,
        totalCost: sql<number>`SUM(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp))) / 3600 * 85)` // Average rate
      })
        .from(timeClocks)
        .where(
          and(
            gte(timeClocks.timestamp, startOfWeek),
            lte(timeClocks.timestamp, endOfWeek)
          )
        );

      res.json({
        activeWorkers: activeWorkers.length,
        weekHours: weekData[0]?.totalHours || 0,
        weekLaborCost: weekData[0]?.totalCost || 0,
        recentActivity: activeWorkers.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching time summary:", error);
      res.status(500).json({ message: "Failed to fetch time summary" });
    }
  });

  // Enhanced Labor Rate Routes for Time & Payroll
  app.get("/api/labor-rates/cards", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const rateCards = await db.select().from(laborRateCards).where(eq(laborRateCards.isActive, true));
      res.json(rateCards);
    } catch (error) {
      console.error("Error fetching labor rate cards:", error);
      res.status(500).json({ message: "Failed to fetch labor rate cards" });
    }
  });

  // Organization Settings Routes
  app.get("/api/organization/settings/:key", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { key } = req.params;
      const [setting] = await db.select()
        .from(organizationSettings)
        .where(eq(organizationSettings.settingKey, key));
      
      res.json(setting || null);
    } catch (error) {
      console.error("Error fetching organization setting:", error);
      res.status(500).json({ message: "Failed to fetch organization setting" });
    }
  });

  app.put("/api/organization/settings", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { settingKey, settingValue, settingType, description } = req.body;
      
      // Check if setting exists
      const [existing] = await db.select()
        .from(organizationSettings)
        .where(eq(organizationSettings.settingKey, settingKey));
      
      if (existing) {
        // Update existing setting
        await db.update(organizationSettings)
          .set({
            settingValue,
            settingType,
            description,
            updatedAt: new Date()
          })
          .where(eq(organizationSettings.settingKey, settingKey));
      } else {
        // Insert new setting
        await db.insert(organizationSettings)
          .values({
            settingKey,
            settingValue,
            settingType,
            description
          });
      }
      
      res.json({ success: true, message: "Setting updated successfully" });
    } catch (error) {
      console.error("Error updating organization setting:", error);
      res.status(500).json({ message: "Failed to update organization setting" });
    }
  });

  // Company Locations Routes
  app.get("/api/organization/locations", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const locations = await db.select()
        .from(companyLocations)
        .orderBy(companyLocations.isPrimary);
      
      res.json(locations);
    } catch (error) {
      console.error("Error fetching company locations:", error);
      res.status(500).json({ message: "Failed to fetch company locations" });
    }
  });

  app.post("/api/organization/locations", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [location] = await db.insert(companyLocations)
        .values(req.body)
        .returning();
      
      res.json(location);
    } catch (error) {
      console.error("Error creating company location:", error);
      res.status(500).json({ message: "Failed to create company location" });
    }
  });

  app.put("/api/organization/locations/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const [location] = await db.update(companyLocations)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(companyLocations.id, parseInt(id)))
        .returning();
      
      res.json(location);
    } catch (error) {
      console.error("Error updating company location:", error);
      res.status(500).json({ message: "Failed to update company location" });
    }
  });

  app.delete("/api/organization/locations/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      await db.delete(companyLocations)
        .where(eq(companyLocations.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting company location:", error);
      res.status(500).json({ message: "Failed to delete company location" });
    }
  });

  // Logo upload route
  app.post("/api/organization/upload-logo", upload.single("logo"), async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In production, you would upload to cloud storage
      // For now, we'll store the base64 data
      const logoPath = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      res.json({ path: logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.post("/api/labor-rates/cards", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("Creating labor rate card with data:", req.body);
      
      // Validate required fields
      const { name, skillLevel, employeeType, baseRate, costRate, effectiveFrom } = req.body;
      if (!name || !skillLevel || !employeeType || baseRate === undefined || costRate === undefined || !effectiveFrom) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide name, skillLevel, employeeType, baseRate, costRate, and effectiveFrom" 
        });
      }

      const [newRateCard] = await db.insert(laborRateCards).values(req.body).returning();
      res.json(newRateCard);
    } catch (error: any) {
      console.error("Error creating labor rate card:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ 
        message: "Failed to create labor rate card",
        details: error.message
      });
    }
  });

  // New Clock Status Route
  app.get("/api/time/clock-status", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = user.id;
      const todayClocks = await timeManagementStorage.getTodayTimeClocks(userId);
      
      // Determine current status from today's clocks
      let currentStatus = "clocked_out";
      if (todayClocks.length > 0) {
        const lastClock = todayClocks[0]; // Already sorted by timestamp desc
        if (lastClock.clockType === "clock_in") {
          currentStatus = "clocked_in";
        } else if (lastClock.clockType === "break_start") {
          currentStatus = "on_break";
        }
      }
      
      res.json({ todayClocks, currentStatus });
    } catch (error) {
      console.error("Error fetching clock status:", error);
      res.status(500).json({ message: "Failed to fetch clock status" });
    }
  });

  // Project lifecycle routes
  app.get('/api/projects/:id/lifecycle', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const lifecycle = await lifecycleTrackingService.getProjectLifecycle(projectId);
      res.json(lifecycle);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/projects/:id/lifecycle/initialize', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { templateId } = req.body;
      const result = await lifecycleTrackingService.initializeProjectLifecycle(projectId, templateId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update task status
  app.patch('/api/projects/:id/lifecycle/tasks/:taskId', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const taskId = parseInt(req.params.taskId);
      const { status, notes, completedAt } = req.body;
      
      const result = await lifecycleTrackingService.updateTaskStatus(taskId, status, user.id, notes);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get project events
  app.get('/api/projects/:id/lifecycle/events', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get events from database
      const events = await db.select({
        id: projectLifecycleEvents.id,
        eventType: projectLifecycleEvents.eventType,
        description: projectLifecycleEvents.eventDescription,
        createdAt: projectLifecycleEvents.createdAt,
        userId: projectLifecycleEvents.triggeredBy,
        metadata: projectLifecycleEvents.metadata
      })
      .from(projectLifecycleEvents)
      .where(eq(projectLifecycleEvents.projectId, projectId))
      .orderBy(desc(projectLifecycleEvents.createdAt))
      .limit(limit);

      // Add user names (placeholder for now)
      const eventsWithUsers = events.map(e => ({
        ...e,
        description: e.description || '',
        userName: 'System User',
        userId: e.userId || 9 // Default to Adam Green's ID if no user specified
      }));

      res.json(eventsWithUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload document for task
  app.post('/api/projects/:id/lifecycle/documents', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const projectId = parseInt(req.params.id);
      const taskId = parseInt(req.body.taskId);
      
      // TODO: Save document metadata to database
      // For now, just return success
      res.json({ 
        success: true, 
        document: {
          filename: req.file.originalname,
          size: req.file.size,
          uploadedAt: new Date()
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email Cost Import Routes
  app.get('/api/email-accounts', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const accounts = await db.select({
        id: emailAccounts.id,
        name: emailAccounts.name,
        provider: emailAccounts.provider,
        email: emailAccounts.email,
        isActive: emailAccounts.isActive,
        lastSyncAt: emailAccounts.lastSyncAt,
      }).from(emailAccounts);
      
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      res.status(500).json({ message: 'Failed to fetch email accounts' });
    }
  });

  app.post('/api/email-accounts', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { name, provider, email, accessToken, refreshToken, imapConfig } = req.body;
      
      const [account] = await db.insert(emailAccounts).values({
        name,
        provider,
        email,
        accessToken, // Should be encrypted in production
        refreshToken, // Should be encrypted in production
        imapConfig,
        createdBy: user.id,
      }).returning();
      
      res.json(account);
    } catch (error) {
      console.error('Error creating email account:', error);
      res.status(500).json({ message: 'Failed to create email account' });
    }
  });

  app.delete('/api/email-accounts/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await db.delete(emailAccounts).where(eq(emailAccounts.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email account:', error);
      res.status(500).json({ message: 'Failed to delete email account' });
    }
  });

  // Supplier Templates Routes
  app.get('/api/supplier-templates', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const templates = await db.select({
        id: supplierTemplates.id,
        supplierId: supplierTemplates.supplierId,
        supplierEmail: supplierTemplates.supplierEmail,
        templateName: supplierTemplates.templateName,
        accuracy: supplierTemplates.accuracy,
        lastUsedAt: supplierTemplates.lastUsedAt,
        supplier: suppliers.name,
      })
      .from(supplierTemplates)
      .leftJoin(suppliers, eq(supplierTemplates.supplierId, suppliers.id));
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching supplier templates:', error);
      res.status(500).json({ message: 'Failed to fetch supplier templates' });
    }
  });

  app.post('/api/supplier-templates', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [template] = await db.insert(supplierTemplates).values({
        ...req.body,
        createdBy: user.id,
      }).returning();
      
      res.json(template);
    } catch (error) {
      console.error('Error creating supplier template:', error);
      res.status(500).json({ message: 'Failed to create supplier template' });
    }
  });

  // Imported Costs Routes
  app.get('/api/imported-costs', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, jobId, supplierId } = req.query;
      let query = db.select({
        id: importedCosts.id,
        emailSubject: importedCosts.emailSubject,
        emailDate: importedCosts.emailDate,
        supplierName: importedCosts.supplierName,
        invoiceNumber: importedCosts.invoiceNumber,
        purchaseOrderNumber: importedCosts.purchaseOrderNumber,
        jobNumber: importedCosts.jobNumber,
        status: importedCosts.status,
        matchConfidence: importedCosts.matchConfidence,
        totalAmount: importedCosts.totalAmount,
        currency: importedCosts.currency,
        invoiceDate: importedCosts.invoiceDate,
        createdAt: importedCosts.createdAt,
      }).from(importedCosts);
      
      if (status) {
        query = query.where(eq(importedCosts.status, status as string));
      }
      if (jobId) {
        query = query.where(eq(importedCosts.jobId, parseInt(jobId as string)));
      }
      if (supplierId) {
        query = query.where(eq(importedCosts.supplierId, parseInt(supplierId as string)));
      }
      
      const costs = await query.orderBy(desc(importedCosts.createdAt));
      res.json(costs);
    } catch (error) {
      console.error('Error fetching imported costs:', error);
      res.status(500).json({ message: 'Failed to fetch imported costs' });
    }
  });

  app.get('/api/imported-costs/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const [cost] = await db.select()
        .from(importedCosts)
        .where(eq(importedCosts.id, parseInt(req.params.id)));
      
      if (!cost) {
        return res.status(404).json({ message: 'Imported cost not found' });
      }
      
      res.json(cost);
    } catch (error) {
      console.error('Error fetching imported cost:', error);
      res.status(500).json({ message: 'Failed to fetch imported cost' });
    }
  });

  app.patch('/api/imported-costs/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, jobId, reviewNotes } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (jobId !== undefined) updateData.jobId = jobId;
      if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
      
      if (status === 'reviewed') {
        updateData.reviewedBy = user.id;
        updateData.reviewedAt = new Date();
      } else if (status === 'approved') {
        updateData.approvedBy = user.id;
        updateData.approvedAt = new Date();
      }
      
      const [updated] = await db.update(importedCosts)
        .set(updateData)
        .where(eq(importedCosts.id, parseInt(req.params.id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating imported cost:', error);
      res.status(500).json({ message: 'Failed to update imported cost' });
    }
  });

  // Email Sync Routes
  app.post('/api/email-sync/:accountId', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const accountId = parseInt(req.params.accountId);
      
      // Create sync log
      const [syncLog] = await db.insert(emailSyncLogs).values({
        emailAccountId: accountId,
        syncType: 'manual',
        startedAt: new Date(),
        status: 'running',
      }).returning();
      
      // In a real implementation, this would trigger an async job
      // For now, we'll just return the sync log
      res.json({
        message: 'Email sync started',
        syncLogId: syncLog.id,
      });
    } catch (error) {
      console.error('Error starting email sync:', error);
      res.status(500).json({ message: 'Failed to start email sync' });
    }
  });

  // Cost Variance Routes
  app.get('/api/cost-variances', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { jobId } = req.query;
      let query = db.select({
        id: costVariances.id,
        jobId: costVariances.jobId,
        costCategory: costVariances.costCategory,
        estimatedCost: costVariances.estimatedCost,
        actualCost: costVariances.actualCost,
        variance: costVariances.variance,
        variancePercentage: costVariances.variancePercentage,
        notes: costVariances.notes,
        reportDate: costVariances.reportDate,
        jobNumber: jobs.jobNumber,
        clientName: jobs.clientName,
      })
      .from(costVariances)
      .leftJoin(jobs, eq(costVariances.jobId, jobs.id));
      
      if (jobId) {
        query = query.where(eq(costVariances.jobId, parseInt(jobId as string)));
      }
      
      const variances = await query.orderBy(desc(costVariances.reportDate));
      res.json(variances);
    } catch (error) {
      console.error('Error fetching cost variances:', error);
      res.status(500).json({ message: 'Failed to fetch cost variances' });
    }
  });

  app.post('/api/cost-variances/calculate/:jobId', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobId = parseInt(req.params.jobId);
      
      // Get job with estimation data
      const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
      if (!job || !job.estimationData) {
        return res.status(404).json({ message: 'Job or estimation data not found' });
      }
      
      const estimation = job.estimationData as any;
      
      // Get actual costs from imported costs
      const actualCosts = await db.select({
        totalAmount: sql<number>`COALESCE(SUM(${importedCosts.totalAmount}), 0)`,
      })
      .from(importedCosts)
      .where(and(
        eq(importedCosts.jobId, jobId),
        eq(importedCosts.status, 'approved')
      ));
      
      const totalActual = actualCosts[0]?.totalAmount || 0;
      const totalEstimated = estimation.summary?.totalCost || 0;
      const variance = totalActual - totalEstimated;
      const variancePercentage = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;
      
      // Store variance record
      const [varianceRecord] = await db.insert(costVariances).values({
        jobId,
        costCategory: 'total',
        estimatedCost: totalEstimated.toString(),
        actualCost: totalActual.toString(),
        variance: variance.toString(),
        variancePercentage: variancePercentage.toString(),
        reportDate: new Date().toISOString().split('T')[0],
      }).returning();
      
      res.json({
        ...varianceRecord,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
      });
    } catch (error) {
      console.error('Error calculating cost variance:', error);
      res.status(500).json({ message: 'Failed to calculate cost variance' });
    }
  });

  // Drawing Intelligence Routes
  // Google OAuth Routes
  app.get('/api/auth/google', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      let userId = null;
      
      // Try to get user if authenticated, but don't require it
      try {
        const user = await AuthService.validateSession(token);
        if (user) {
          userId = user.id;
        }
      } catch (err) {
        // User not authenticated, continue anyway
        console.log('User not authenticated, continuing with OAuth flow');
      }

      // Generate OAuth URL with state parameter for security
      const state = Buffer.from(JSON.stringify({ 
        userId: userId || 'guest',
        timestamp: Date.now() 
      })).toString('base64');
      
      const authUrl = googleAuth.generateAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ message: 'Failed to generate authentication URL' });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }

      // Decode state to get user info
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      
      // Exchange code for tokens
      const tokens = await googleAuth.getTokens(code as string);
      
      // Get user profile
      const profile = await googleAuth.getUserProfile(tokens.access_token!);
      
      // If user was not authenticated, try to get current user from session
      let userId = stateData.userId;
      if (userId === 'guest') {
        // Try to get authenticated user again
        const token = req.cookies.auth_token;
        if (token) {
          try {
            const user = await AuthService.validateSession(token);
            if (user) {
              userId = user.id;
            }
          } catch (err) {
            console.log('Could not get authenticated user');
          }
        }
        
        // If still guest, use a default user ID
        if (userId === 'guest') {
          // Get or create a default user for OAuth connections
          const [defaultUser] = await db.select().from(users).where(eq(users.username, 'adam.green')).limit(1);
          userId = defaultUser ? defaultUser.id : 1;
        }
      }
      
      // Store email account with OAuth tokens
      await db.insert(emailAccounts)
        .values({
          name: `Gmail - ${profile.email}`,
          provider: 'gmail',
          email: profile.email!,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token,
          imapConfig: {
            oauth: true,
            expiryDate: tokens.expiry_date
          },
          createdBy: userId,
        });
      
      // Redirect back to the application
      res.redirect('/email-cost-import?connected=true');
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect('/email-cost-import?error=oauth_failed');
    }
  });

  // Email Account Routes
  app.get('/api/email-accounts', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const accounts = await db.select()
        .from(emailAccounts)
        .orderBy(emailAccounts.name);
      
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      res.status(500).json({ message: 'Failed to fetch email accounts' });
    }
  });

  app.post('/api/email-accounts', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { name, provider, email, password, accessToken, refreshToken, imapConfig } = req.body;

      if (!name || !provider || !email) {
        return res.status(400).json({ error: "Name, provider, and email are required" });
      }

      // Set up IMAP configuration based on provider
      let finalImapConfig = imapConfig || {};
      if (provider === 'gmail') {
        finalImapConfig = {
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          user: email,
          pass: password, // App Password for Gmail
        };
      } else if (provider === 'outlook') {
        finalImapConfig = {
          host: 'outlook.office365.com',
          port: 993,
          secure: true,
          user: email,
          pass: password,
        };
      }

      const [account] = await db.insert(emailAccounts)
        .values({
          name,
          provider,
          email,
          accessToken: accessToken || password, // Store password as accessToken for now
          refreshToken,
          imapConfig: finalImapConfig,
          createdBy: user.id,
        })
        .returning();
      
      res.json(account);
    } catch (error) {
      console.error('Error creating email account:', error);
      res.status(500).json({ message: 'Failed to create email account' });
    }
  });

  app.put('/api/email-accounts/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const updates = req.body;

      const [account] = await db.update(emailAccounts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(emailAccounts.id, parseInt(id)))
        .returning();
      
      if (!account) {
        return res.status(404).json({ error: "Email account not found" });
      }

      res.json(account);
    } catch (error) {
      console.error('Error updating email account:', error);
      res.status(500).json({ message: 'Failed to update email account' });
    }
  });

  app.delete('/api/email-accounts/:id', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      await db.delete(emailAccounts)
        .where(eq(emailAccounts.id, parseInt(id)));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email account:', error);
      res.status(500).json({ message: 'Failed to delete email account' });
    }
  });

  // Email sync endpoint with OAuth support
  app.post('/api/email-sync/:accountId', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { accountId } = req.params;
      
      // Get email account details
      const [account] = await db.select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, parseInt(accountId)));
      
      if (!account) {
        return res.status(404).json({ error: "Email account not found" });
      }

      let emailsProcessed = 0;
      let invoicesFound = 0;

      // Check if this is an OAuth account
      if (account.provider === 'gmail' && account.refreshToken) {
        try {
          // Check if token needs refresh
          let accessToken = account.accessToken;
          if (account.imapConfig && (account.imapConfig as any).expiryDate) {
            const expiryDate = new Date((account.imapConfig as any).expiryDate);
            if (expiryDate < new Date()) {
              // Token expired, refresh it
              if (account.refreshToken) {
                accessToken = await googleAuth.refreshAccessToken(account.refreshToken);
                // Update stored token
                await db.update(emailAccounts)
                  .set({ 
                    accessToken,
                    imapConfig: {
                      ...account.imapConfig,
                      expiryDate: Date.now() + 3600000 // 1 hour from now
                    }
                  })
                  .where(eq(emailAccounts.id, parseInt(accountId)));
              }
            }
          }

          // List emails with attachments
          const tokens = {
            access_token: accessToken,
            refresh_token: account.refreshToken
          };
          
          const messages = await googleAuth.listEmailsWithAttachments(
            tokens, 
            'has:attachment from:(invoice OR receipt OR quote OR bill) newer_than:30d'
          );

          emailsProcessed = messages.length;

          // Process each email
          for (const message of messages) {
            const emailDetails = await googleAuth.getEmailWithAttachments(tokens, message.id);
            
            // Process attachments (PDFs, CSVs, etc.)
            for (const attachment of emailDetails.attachments) {
              if (attachment.mimeType === 'application/pdf' || 
                  attachment.mimeType === 'text/csv' ||
                  attachment.filename?.toLowerCase().includes('invoice') ||
                  attachment.filename?.toLowerCase().includes('quote')) {
                
                invoicesFound++;
                
                // Store imported cost
                await db.insert(importedCosts).values({
                  emailAccountId: parseInt(accountId),
                  supplierName: 'Unknown', // TODO: Extract from email or attachment
                  invoiceNumber: `INV-${Date.now()}`,
                  invoiceDate: new Date(),
                  totalAmount: 0, // TODO: Parse from attachment
                  currency: 'USD',
                  attachmentName: attachment.filename || 'attachment',
                  attachmentData: attachment.data, // Base64 data
                  status: 'pending',
                  createdBy: user.id,
                });
              }
            }
          }

          // Create sync log
          await db.insert(emailSyncLogs).values({
            emailAccountId: parseInt(accountId),
            status: 'success',
            emailsProcessed,
            invoicesFound,
            startedAt: new Date(),
            completedAt: new Date(),
          });

        } catch (error) {
          console.error('OAuth sync error:', error);
          
          // Log failed sync
          await db.insert(emailSyncLogs).values({
            emailAccountId: parseInt(accountId),
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            startedAt: new Date(),
            completedAt: new Date(),
          });
          
          throw error;
        }
      }

      // Update last sync time
      await db.update(emailAccounts)
        .set({ lastSyncAt: new Date() })
        .where(eq(emailAccounts.id, parseInt(accountId)));

      // In a production system with standard IMAP, you would:
      // 1. Connect to IMAP using the stored credentials
      // 2. Fetch emails with attachments (PDFs/invoices)
      // 3. Parse the attachments using OCR or PDF parsing
      // 4. Extract cost information
      
      res.json({ 
        message: 'Email sync completed successfully',
        stats: {
          emailsProcessed,
          invoicesFound
        }
      });
    } catch (error) {
      console.error('Error syncing email:', error);
      res.status(500).json({ message: 'Failed to sync email' });
    }
  });

  app.get('/api/drawing-intelligence/drawings', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const drawingsList = await db.select({
        id: drawings.id,
        fileName: drawings.fileName,
        projectName: drawingProjects.name,
        uploadedBy: users.name,
        uploadedAt: drawings.uploadedAt,
        type: drawingProjects.type,
        status: drawings.status,
        steelMembers: drawings.steelMembers,
        connections: drawings.connections,
        totalWeight: drawings.totalWeight,
        revisionNumber: drawings.revisionNumber,
      })
      .from(drawings)
      .leftJoin(drawingProjects, eq(drawings.projectId, drawingProjects.id))
      .leftJoin(users, eq(drawings.uploadedBy, users.id));
      
      res.json(drawingsList);
    } catch (error) {
      console.error('Error fetching drawings:', error);
      res.status(500).json({ message: 'Failed to fetch drawings' });
    }
  });

  app.post('/api/drawing-intelligence/analyze', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Handle file upload with multer
      const uploadResult = await new Promise<any>((resolve, reject) => {
        upload.single('file')(req, res, (err) => {
          if (err) reject(err);
          else resolve(req.file);
        });
      });

      if (!uploadResult) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const settings = JSON.parse(req.body.settings || '{}');

      // Create or find project
      let projectId: number;
      if (settings.name) {
        const [project] = await db.insert(drawingProjects).values({
          name: settings.name,
          type: settings.type || 'general',
          standards: settings.standards || 'AS/NZS',
          notes: settings.notes,
          userId: user.id,
        }).returning();
        projectId = project.id;
      } else {
        return res.status(400).json({ error: "Project name is required" });
      }

      // Create drawing record
      const [drawing] = await db.insert(drawings).values({
        projectId,
        fileName: uploadResult.originalname,
        fileSize: uploadResult.size,
        fileType: uploadResult.mimetype,
        uploadedBy: user.id,
        status: 'analyzing',
      }).returning();

      // Simulate AI analysis (in production, this would call actual AI service)
      setTimeout(async () => {
        const analysisResult = {
          steelMembers: Math.floor(Math.random() * 50) + 10,
          connections: Math.floor(Math.random() * 100) + 20,
          totalWeight: Math.random() * 10000 + 1000,
          members: [
            { mark: "B1", section: "310UB40.4", length: 9000 },
            { mark: "C1", section: "250UC89.5", length: 6000 },
          ],
        };

        await db.update(drawings)
          .set({
            status: 'analyzed',
            analysisResult,
            steelMembers: analysisResult.steelMembers,
            connections: analysisResult.connections,
            totalWeight: analysisResult.totalWeight.toFixed(2),
          })
          .where(eq(drawings.id, drawing.id));
      }, 5000);

      res.json({ 
        id: drawing.id, 
        message: "Drawing analysis started",
        estimatedTime: "5-10 seconds"
      });
    } catch (error) {
      console.error('Error analyzing drawing:', error);
      res.status(500).json({ message: 'Failed to analyze drawing' });
    }
  });

  app.get('/api/drawing-intelligence/projects', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const projects = await db.select()
        .from(drawingProjects)
        .where(eq(drawingProjects.userId, user.id));
      
      res.json(projects);
    } catch (error) {
      console.error('Error fetching drawing projects:', error);
      res.status(500).json({ message: 'Failed to fetch drawing projects' });
    }
  });

  app.post('/api/drawing-intelligence/takeoff', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { projectId, drawingId, materials } = req.body;

      // Insert material takeoff items
      const takeoffItems = await db.insert(materialTakeoffs).values(
        materials.map((item: any) => ({
          ...item,
          projectId,
          drawingId,
        }))
      ).returning();

      res.json(takeoffItems);
    } catch (error) {
      console.error('Error creating material takeoff:', error);
      res.status(500).json({ message: 'Failed to create material takeoff' });
    }
  });

  // Mobile Operations API endpoints
  app.get('/api/mobile-operations/stats', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return mock stats for now - in production this would query real data
      const stats = {
        activeWorkers: 4,
        checkinsToday: 12,
        photosToday: 45,
        offlineQueue: 3,
        scansToday: 28,
        complianceRate: 94,
        activeDevices: 8
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching mobile operations stats:', error);
      res.status(500).json({ message: 'Failed to fetch mobile operations stats' });
    }
  });

  app.get('/api/mobile-operations/time-entries', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { site, date } = req.query;
      
      // Return mock time entries - in production this would query time_clocks table
      const timeEntries = [
        {
          id: "1",
          employeeName: "Adam Green",
          employeeNumber: "EMP2025061",
          clockIn: "2025-07-21T07:32:00",
          location: {
            lat: -37.8136,
            lng: 144.9631,
            address: "123 Industrial Dr",
            accuracy: 5
          },
          jobSite: "Warehouse Project Site",
          deviceInfo: {
            model: "iPhone 12",
            battery: 85,
            signal: "strong"
          },
          status: "active",
          totalHours: 4.5,
          breaks: []
        }
      ];
      
      res.json(timeEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ message: 'Failed to fetch time entries' });
    }
  });

  app.get('/api/mobile-operations/inspections', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { type } = req.query;
      
      // Return mock inspections - in production this would query inspections table
      const inspections = [
        {
          id: "1",
          projectName: "Warehouse Project",
          siteName: "Site A - North Wing",
          inspector: "Adam Green",
          date: "2025-07-21T09:15:00",
          status: "in-progress",
          type: "safety",
          completionRate: 75,
          issuesFound: 3,
          photosAttached: 12,
          gpsLocation: {
            lat: -37.8136,
            lng: 144.9631,
            accuracy: 5
          },
          items: [
            { category: "PPE Compliance", completed: 15, total: 20 },
            { category: "Equipment Safety", completed: 10, total: 15 },
            { category: "Site Hazards", completed: 20, total: 25 }
          ]
        }
      ];
      
      res.json(inspections);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      res.status(500).json({ message: 'Failed to fetch inspections' });
    }
  });

  app.get('/api/mobile-operations/documents', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { category } = req.query;
      
      // Return mock documents - in production this would query documents table
      const documents = [];
      
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/mobile-operations/sync-queue', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return mock sync queue - in production this would query sync_queue table
      const syncQueue = [];
      
      res.json(syncQueue);
    } catch (error) {
      console.error('Error fetching sync queue:', error);
      res.status(500).json({ message: 'Failed to fetch sync queue' });
    }
  });

  app.get('/api/mobile-operations/devices', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return mock devices - in production this would query devices table
      const devices = [
        {
          id: "1",
          deviceName: "iPhone 12",
          userName: "Adam Green",
          lastSync: "2 mins ago",
          pendingItems: 0,
          storageUsed: 156,
          batteryLevel: 85,
          connectionStatus: "online"
        },
        {
          id: "2",
          deviceName: "Samsung S21",
          userName: "Manny Magallanes",
          lastSync: "5 mins ago",
          pendingItems: 2,
          storageUsed: 234,
          batteryLevel: 67,
          connectionStatus: "online"
        },
        {
          id: "3",
          deviceName: "iPad Pro",
          userName: "Chipo Green",
          lastSync: "15 mins ago",
          pendingItems: 5,
          storageUsed: 512,
          batteryLevel: 42,
          connectionStatus: "offline"
        }
      ];
      
      res.json(devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ message: 'Failed to fetch devices' });
    }
  });

  app.get('/api/inspection-templates', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return inspection templates
      const templates = [
        { id: 1, name: "Standard Safety Checklist", items: 120, standard: "AS/NZS 4801" },
        { id: 2, name: "Welding Quality Control", items: 35, standard: "ISO 9606" },
        { id: 3, name: "Site Progress Report", items: 25, standard: "Custom" },
        { id: 4, name: "AS/NZS Compliance", items: 50, standard: "AS/NZS" }
      ];
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching inspection templates:', error);
      res.status(500).json({ message: 'Failed to fetch inspection templates' });
    }
  });

  app.get('/api/job-sites', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return job sites
      const sites = [
        { id: "1", name: "Warehouse Project Site", address: "123 Industrial Dr, Melbourne" },
        { id: "2", name: "Tower Construction Site", address: "456 High St, Sydney" },
        { id: "3", name: "Bridge Renovation Site", address: "789 River Rd, Brisbane" }
      ];
      
      res.json(sites);
    } catch (error) {
      console.error('Error fetching job sites:', error);
      res.status(500).json({ message: 'Failed to fetch job sites' });
    }
  });

  app.post('/api/mobile-operations/sync', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { items } = req.body;
      
      // Mock sync process - in production this would process the sync queue
      res.json({
        success: true,
        syncedItems: items === "all" ? "all" : (items?.length || 0),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({ message: 'Failed to sync data' });
    }
  });

  // Production Floor Tracking routes
  app.get('/api/production-floor/stats', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return production stats
      const stats = {
        activeWorkOrders: 12,
        machinesOperating: 8,
        dailyOutput: 42,
        qualityScore: 96,
        efficiency: 87,
        defectRate: 2,
        onTimeDelivery: 94,
        utilizationRate: 78
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching production stats:', error);
      res.status(500).json({ message: 'Failed to fetch production stats' });
    }
  });

  app.get('/api/production-floor/work-orders', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return work orders
      const workOrders = [
        {
          id: "1",
          workOrderNumber: "WO-2025-001",
          jobNumber: "JOB-2025-001",
          projectName: "Steel Platform for Manufacturing Plant",
          clientName: "ABC Manufacturing Ltd",
          status: "in-progress",
          priority: "high",
          startDate: "2025-01-20",
          dueDate: "2025-02-15",
          completionProgress: 65,
          assignedTeam: "Team A",
          currentStation: "Welding Bay 2",
          totalWeight: 12.5,
          completedWeight: 8.1,
          operations: {
            cutting: { progress: 100, status: "completed" },
            drilling: { progress: 100, status: "completed" },
            welding: { progress: 60, status: "in-progress" },
            painting: { progress: 0, status: "pending" }
          },
          qualityChecks: 3,
          issues: 1
        },
        {
          id: "2",
          workOrderNumber: "WO-2025-002",
          jobNumber: "JOB-2025-002",
          projectName: "Warehouse Mezzanine Floor",
          clientName: "XYZ Logistics",
          status: "pending",
          priority: "normal",
          startDate: "2025-01-25",
          dueDate: "2025-02-28",
          completionProgress: 0,
          assignedTeam: "Team B",
          currentStation: "Preparation",
          totalWeight: 18.2,
          completedWeight: 0,
          operations: {
            cutting: { progress: 0, status: "pending" },
            drilling: { progress: 0, status: "pending" },
            welding: { progress: 0, status: "pending" },
            painting: { progress: 0, status: "pending" }
          },
          qualityChecks: 0,
          issues: 0
        }
      ];
      
      res.json(workOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      res.status(500).json({ message: 'Failed to fetch work orders' });
    }
  });

  app.patch('/api/production-floor/work-orders/:id/status', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;
      
      // In production, update the work order status in database
      res.json({ success: true, id, status });
    } catch (error) {
      console.error('Error updating work order status:', error);
      res.status(500).json({ message: 'Failed to update work order status' });
    }
  });

  app.get('/api/production-floor/machines', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return machine data
      const machines = [
        {
          id: "1",
          name: "Plasma Cutter #1",
          type: "Cutting",
          model: "HyperTherm PowerMax 125",
          status: "operating",
          currentJob: "WO-2025-001",
          operator: "John Smith",
          efficiency: 92,
          utilizationRate: 85,
          temperature: 72,
          powerConsumption: 28,
          runTime: 6.5,
          idleTime: 1.2,
          maintenanceSchedule: {
            lastMaintenance: "2025-01-15",
            nextMaintenance: "2025-02-15",
            hoursUntilMaintenance: 120
          },
          production: {
            currentOutput: 145,
            targetOutput: 160,
            qualityRate: 98,
            cycleTime: 3.2
          },
          alerts: []
        },
        {
          id: "2",
          name: "Press Brake #2",
          type: "Forming",
          model: "Amada HG-1003",
          status: "idle",
          currentJob: null,
          operator: null,
          efficiency: 78,
          utilizationRate: 65,
          temperature: 68,
          powerConsumption: 0,
          runTime: 4.2,
          idleTime: 2.8,
          maintenanceSchedule: {
            lastMaintenance: "2025-01-10",
            nextMaintenance: "2025-02-10",
            hoursUntilMaintenance: 48
          },
          production: {
            currentOutput: 0,
            targetOutput: 0,
            qualityRate: 95,
            cycleTime: 0
          },
          alerts: [
            {
              type: "warning",
              message: "Maintenance due in 48 hours",
              timestamp: "2025-01-21T10:00:00Z"
            }
          ]
        }
      ];
      
      res.json(machines);
    } catch (error) {
      console.error('Error fetching machines:', error);
      res.status(500).json({ message: 'Failed to fetch machines' });
    }
  });

  app.get('/api/production-floor/quality-inspections', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return quality inspections
      const inspections = [
        {
          id: "1",
          workOrderNumber: "WO-2025-001",
          projectName: "Steel Platform for Manufacturing Plant",
          inspectionType: "weld",
          inspector: "Mike Johnson",
          date: "2025-01-21T09:30:00Z",
          status: "passed",
          overallScore: 96,
          criticalDefects: 0,
          majorDefects: 0,
          minorDefects: 2,
          checkpoints: [
            {
              category: "Weld Quality",
              items: [
                { name: "Penetration", passed: true, notes: "Full penetration achieved" },
                { name: "Surface finish", passed: true, notes: "Smooth, no spatter" },
                { name: "Dimensions", passed: null, notes: "Minor deviation within tolerance", severity: "minor" }
              ]
            }
          ],
          photos: ["weld-inspection-001.jpg"],
          certificate: {
            number: "CERT-2025-001",
            issuedDate: "2025-01-21",
            standard: "AS/NZS 1554"
          }
        }
      ];
      
      res.json(inspections);
    } catch (error) {
      console.error('Error fetching quality inspections:', error);
      res.status(500).json({ message: 'Failed to fetch quality inspections' });
    }
  });

  app.get('/api/production-floor/quality-metrics', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return quality metrics
      const metrics = {
        passRate: 96,
        firstPassYield: 92,
        defectDensity: 3.2,
        customerComplaints: 1,
        reworkRate: 4,
        inspectionBacklog: 5
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      res.status(500).json({ message: 'Failed to fetch quality metrics' });
    }
  });

  app.get('/api/production-floor/metrics', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }



      // Return production metrics
      const metrics = {
        dailyOutput: [
          { date: "2025-01-15", planned: 45, actual: 42, efficiency: 93 },
          { date: "2025-01-16", planned: 45, actual: 48, efficiency: 107 },
          { date: "2025-01-17", planned: 45, actual: 44, efficiency: 98 },
          { date: "2025-01-18", planned: 45, actual: 46, efficiency: 102 },
          { date: "2025-01-19", planned: 45, actual: 41, efficiency: 91 },
          { date: "2025-01-20", planned: 45, actual: 43, efficiency: 96 },
          { date: "2025-01-21", planned: 45, actual: 42, efficiency: 93 }
        ],
        machineUtilization: [
          { machine: "Plasma Cutter #1", utilization: 85, targetUtilization: 80 },
          { machine: "Press Brake #2", utilization: 65, targetUtilization: 75 },
          { machine: "Welding Bay 1", utilization: 92, targetUtilization: 85 },
          { machine: "Welding Bay 2", utilization: 78, targetUtilization: 85 },
          { machine: "Drill Press #1", utilization: 70, targetUtilization: 70 }
        ],
        qualityMetrics: [
          { metric: "First Pass Yield", value: 92, target: 95, trend: "up" },
          { metric: "Defect Rate", value: 2, target: 3, trend: "down" },
          { metric: "Rework Rate", value: 4, target: 5, trend: "stable" }
        ],
        productionByType: [
          { type: "Beams", value: 35, percentage: 35 },
          { type: "Columns", value: 25, percentage: 25 },
          { type: "Plates", value: 20, percentage: 20 },
          { type: "Frames", value: 15, percentage: 15 },
          { type: "Other", value: 5, percentage: 5 }
        ],
        oeeBreakdown: {
          availability: 92,
          performance: 87,
          quality: 96,
          oee: 77
        },
        kpis: [
          { name: "Output", value: 42, unit: "tonnes", target: 45, status: "warning" },
          { name: "Efficiency", value: 87, unit: "%", target: 85, status: "on-track" },
          { name: "Quality", value: 96, unit: "%", target: 95, status: "on-track" },
          { name: "Safety", value: 125, unit: "days", target: 100, status: "on-track" },
          { name: "Delivery", value: 94, unit: "%", target: 95, status: "warning" },
          { name: "Utilization", value: 78, unit: "%", target: 80, status: "warning" }
        ]
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching production metrics:', error);
      res.status(500).json({ message: 'Failed to fetch production metrics' });
    }
  });

  // Financial Intelligence Routes
  app.get('/api/financial-intelligence/stats', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return financial statistics
      const stats = {
        revenue: 2345678,
        expenses: 1876543,
        profit: 469135,
        profitMargin: 20.0,
        cashOnHand: 523890,
        accountsReceivable: 387654,
        accountsPayable: 234567,
        overduedInvoices: 45678
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      res.status(500).json({ message: 'Failed to fetch financial stats' });
    }
  });

  // Financial Analytics endpoints
  app.get('/api/financial-intelligence/analytics/metrics', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const metrics = [
        { period: "Jan 2025", revenue: 1890000, expenses: 1512000, profit: 378000, profitMargin: 20.0, grossMargin: 35.5, ebitda: 425000, cashFlow: 392000, workingCapital: 523000 },
        { period: "Dec 2024", revenue: 2145000, expenses: 1687000, profit: 458000, profitMargin: 21.4, grossMargin: 36.2, ebitda: 503000, cashFlow: 478000, workingCapital: 498000 },
        { period: "Nov 2024", revenue: 1987000, expenses: 1590000, profit: 397000, profitMargin: 20.0, grossMargin: 34.8, ebitda: 442000, cashFlow: 415000, workingCapital: 476000 },
        { period: "Oct 2024", revenue: 2234000, expenses: 1765000, profit: 469000, profitMargin: 21.0, grossMargin: 35.8, ebitda: 514000, cashFlow: 489000, workingCapital: 512000 },
        { period: "Sep 2024", revenue: 2098000, expenses: 1658000, profit: 440000, profitMargin: 21.0, grossMargin: 35.2, ebitda: 485000, cashFlow: 456000, workingCapital: 498000 },
        { period: "Aug 2024", revenue: 1956000, expenses: 1565000, profit: 391000, profitMargin: 20.0, grossMargin: 34.5, ebitda: 436000, cashFlow: 412000, workingCapital: 467000 }
      ];
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics metrics' });
    }
  });

  app.get('/api/financial-intelligence/analytics/kpis', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const kpis = [
        { name: "Revenue Growth", value: 12.5, target: 10, trend: "up", change: 2.5, status: "on-track", unit: "%" },
        { name: "Gross Margin", value: 35.5, target: 35, trend: "up", change: 0.5, status: "on-track", unit: "%" },
        { name: "Net Profit Margin", value: 20.0, target: 22.5, trend: "stable", change: 0, status: "warning", unit: "%" },
        { name: "Cash Conversion", value: 87, target: 85, trend: "up", change: 2, status: "on-track", unit: "%" }
      ];
      
      res.json(kpis);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ message: 'Failed to fetch KPIs' });
    }
  });

  // Cash Flow Management endpoints
  app.get('/api/financial-intelligence/cashflow/data', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const cashFlowData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString(),
          inflow: Math.floor(Math.random() * 50000) + 30000,
          outflow: Math.floor(Math.random() * 40000) + 25000,
          netCashFlow: 0,
          balance: 523890 + (Math.random() - 0.5) * 100000
        };
      });

      res.json(cashFlowData);
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      res.status(500).json({ message: 'Failed to fetch cash flow data' });
    }
  });

  app.get('/api/financial-intelligence/cashflow/invoices', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const invoices = [
        { id: "1", invoiceNumber: "INV-2025-001", clientName: "BuildCorp Ltd", amount: 125000, dueDate: "2025-02-15", status: "pending", paymentTerms: "Net 30" },
        { id: "2", invoiceNumber: "INV-2025-002", clientName: "SteelWorks Inc", amount: 87500, dueDate: "2025-01-31", status: "overdue", daysOverdue: 10, paymentTerms: "Net 30" },
        { id: "3", invoiceNumber: "INV-2024-245", clientName: "Construction Partners", amount: 156000, dueDate: "2025-01-25", status: "paid", paymentTerms: "Net 30" },
        { id: "4", invoiceNumber: "INV-2025-003", clientName: "Industrial Projects", amount: 92000, dueDate: "2025-02-28", status: "pending", paymentTerms: "Net 45" },
        { id: "5", invoiceNumber: "INV-2025-004", clientName: "Metro Development", amount: 178000, dueDate: "2025-02-10", status: "pending", paymentTerms: "Net 30" }
      ];

      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  app.get('/api/financial-intelligence/cashflow/bills', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const bills = [
        { id: "1", billNumber: "BILL-2025-001", vendorName: "Asmuss Steel", amount: 78500, dueDate: "2025-02-05", status: "pending", category: "Materials" },
        { id: "2", billNumber: "BILL-2025-002", vendorName: "Industrial Equipment Co", amount: 23400, dueDate: "2025-01-30", status: "overdue", category: "Equipment" },
        { id: "3", billNumber: "BILL-2025-003", vendorName: "Professional Services Ltd", amount: 12500, dueDate: "2025-02-15", status: "pending", category: "Services" },
        { id: "4", billNumber: "BILL-2025-004", vendorName: "Power & Energy Solutions", amount: 8900, dueDate: "2025-02-10", status: "pending", category: "Utilities" },
        { id: "5", billNumber: "BILL-2025-005", vendorName: "Safety Equipment Direct", amount: 4200, dueDate: "2025-02-20", status: "pending", category: "Safety" }
      ];

      res.json(bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({ message: 'Failed to fetch bills' });
    }
  });

  app.get('/api/financial-intelligence/cashflow/forecast', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const forecast = [
        { period: "Next 30 Days", projectedInflow: 425000, projectedOutflow: 380000, projectedBalance: 568890, confidence: 92 },
        { period: "30-60 Days", projectedInflow: 520000, projectedOutflow: 470000, projectedBalance: 618890, confidence: 85 },
        { period: "60-90 Days", projectedInflow: 480000, projectedOutflow: 495000, projectedBalance: 603890, confidence: 78 }
      ];

      res.json(forecast);
    } catch (error) {
      console.error('Error fetching cash flow forecast:', error);
      res.status(500).json({ message: 'Failed to fetch cash flow forecast' });
    }
  });

  // Cost Analysis endpoints
  app.get('/api/financial-intelligence/costs/jobs', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const jobCosts = [
        { id: "1", jobNumber: "JOB-2025-001", projectName: "Steel Frame Warehouse", clientName: "BuildCorp Ltd", revenue: 325000, directCosts: 195000, overheads: 39000, profit: 91000, profitMargin: 28.0, status: "completed", materialCost: 115000, laborCost: 65000, equipmentCost: 15000, subcontractorCost: 0, otherCost: 0 },
        { id: "2", jobNumber: "JOB-2025-002", projectName: "Bridge Support Structure", clientName: "Metro Development", revenue: 478000, directCosts: 334600, overheads: 66920, profit: 76480, profitMargin: 16.0, status: "in-progress", materialCost: 198000, laborCost: 98600, equipmentCost: 38000, subcontractorCost: 0, otherCost: 0 },
        { id: "3", jobNumber: "JOB-2025-003", projectName: "Industrial Platform", clientName: "SteelWorks Inc", revenue: 156000, directCosts: 101400, overheads: 20280, profit: 34320, profitMargin: 22.0, status: "completed", materialCost: 58000, laborCost: 35400, equipmentCost: 8000, subcontractorCost: 0, otherCost: 0 },
        { id: "4", jobNumber: "JOB-2025-004", projectName: "Manufacturing Plant Extension", clientName: "Industrial Projects", revenue: 892000, directCosts: 642240, overheads: 128448, profit: 121312, profitMargin: 13.6, status: "in-progress", materialCost: 385000, laborCost: 198240, equipmentCost: 45000, subcontractorCost: 14000, otherCost: 0 }
      ];

      res.json(jobCosts);
    } catch (error) {
      console.error('Error fetching job costs:', error);
      res.status(500).json({ message: 'Failed to fetch job costs' });
    }
  });

  app.get('/api/financial-intelligence/costs/categories', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const categories = [
        { category: "Materials", amount: 756000, percentage: 45, budget: 700000, variance: 8.0, trend: "up" },
        { category: "Labor", amount: 396640, percentage: 30, budget: 420000, variance: -5.6, trend: "down" },
        { category: "Equipment", amount: 106000, percentage: 15, budget: 100000, variance: 6.0, trend: "up" },
        { category: "Subcontractors", amount: 14000, percentage: 5, budget: 25000, variance: -44.0, trend: "down" },
        { category: "Overhead", amount: 254648, percentage: 5, budget: 250000, variance: 1.9, trend: "stable" }
      ];

      res.json(categories);
    } catch (error) {
      console.error('Error fetching cost categories:', error);
      res.status(500).json({ message: 'Failed to fetch cost categories' });
    }
  });

  app.get('/api/financial-intelligence/costs/materials', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const materials = [
        { material: "UC 310x97", quantity: 125, unitCost: 145.50, totalCost: 18187.50, supplier: "Asmuss Steel", priceChange: 3.5 },
        { material: "SHS 100x100x6", quantity: 200, unitCost: 78.25, totalCost: 15650.00, supplier: "Fletcher Steel", priceChange: -2.1 },
        { material: "UB 610x229x125", quantity: 85, unitCost: 312.00, totalCost: 26520.00, supplier: "Asmuss Steel", priceChange: 5.2 },
        { material: "12mm Plate", quantity: 45, unitCost: 125.00, totalCost: 5625.00, supplier: "Steel & Tube", priceChange: 0.0 },
        { material: "RHS 250x150x9", quantity: 150, unitCost: 185.75, totalCost: 27862.50, supplier: "Asmuss Steel", priceChange: 4.1 }
      ];

      res.json(materials);
    } catch (error) {
      console.error('Error fetching material analysis:', error);
      res.status(500).json({ message: 'Failed to fetch material analysis' });
    }
  });

  app.get('/api/financial-intelligence/costs/labor', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const labor = [
        { employee: "Adam Green", hours: 160, rate: 120, totalCost: 19200, efficiency: 95, overtimeHours: 8 },
        { employee: "Manny Magallanes", hours: 168, rate: 95, totalCost: 15960, efficiency: 92, overtimeHours: 12 },
        { employee: "Chipo Green", hours: 152, rate: 85, totalCost: 12920, efficiency: 88, overtimeHours: 0 },
        { employee: "Vili Pelenato", hours: 176, rate: 75, totalCost: 13200, efficiency: 90, overtimeHours: 16 }
      ];

      res.json(labor);
    } catch (error) {
      console.error('Error fetching labor analysis:', error);
      res.status(500).json({ message: 'Failed to fetch labor analysis' });
    }
  });

  // Budget Tracking endpoints
  app.get('/api/financial-intelligence/budgets/tracking', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const budgets = [
        { id: "1", category: "Materials", period: "Q1 2025", budgetAmount: 700000, actualAmount: 485000, variance: -215000, variancePercentage: -30.7, remaining: 215000, status: "on-track", lastUpdated: new Date().toISOString(), projectedTotal: 680000, alerts: [] },
        { id: "2", category: "Labor", period: "Q1 2025", budgetAmount: 420000, actualAmount: 285000, variance: -135000, variancePercentage: -32.1, remaining: 135000, status: "on-track", lastUpdated: new Date().toISOString(), projectedTotal: 405000, alerts: [] },
        { id: "3", category: "Equipment", period: "Q1 2025", budgetAmount: 100000, actualAmount: 78000, variance: -22000, variancePercentage: -22.0, remaining: 22000, status: "warning", lastUpdated: new Date().toISOString(), projectedTotal: 108000, alerts: ["Projected to exceed budget by 8%"] },
        { id: "4", category: "Subcontractors", period: "Q1 2025", budgetAmount: 50000, actualAmount: 12000, variance: -38000, variancePercentage: -76.0, remaining: 38000, status: "on-track", lastUpdated: new Date().toISOString(), projectedTotal: 35000, alerts: [] },
        { id: "5", category: "Overhead", period: "Q1 2025", budgetAmount: 250000, actualAmount: 198000, variance: -52000, variancePercentage: -20.8, remaining: 52000, status: "over-budget", lastUpdated: new Date().toISOString(), projectedTotal: 265000, alerts: ["Over budget by $15,000", "Review overhead costs immediately"] }
      ];

      res.json(budgets);
    } catch (error) {
      console.error('Error fetching budget tracking:', error);
      res.status(500).json({ message: 'Failed to fetch budget tracking' });
    }
  });

  app.get('/api/financial-intelligence/budgets/alerts', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const alerts = [
        { id: "1", type: "critical", category: "Materials", message: "Material costs projected to exceed budget by 18% this quarter due to steel price increases", actionRequired: true, timestamp: new Date().toISOString() },
        { id: "2", type: "warning", category: "Equipment", message: "Equipment rental costs trending 8% above budget - consider purchasing vs renting analysis", actionRequired: false, timestamp: new Date().toISOString() },
        { id: "3", type: "info", category: "Labor", message: "Labor costs 12% under budget due to efficiency improvements", actionRequired: false, timestamp: new Date().toISOString() }
      ];

      res.json(alerts);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
      res.status(500).json({ message: 'Failed to fetch budget alerts' });
    }
  });

  app.get('/api/financial-intelligence/budgets/forecast', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const forecast = [
        { period: "Feb 2025", projected: 580000, budget: 550000, confidence: 88 },
        { period: "Mar 2025", projected: 620000, budget: 600000, confidence: 82 },
        { period: "Apr 2025", projected: 590000, budget: 600000, confidence: 75 },
        { period: "May 2025", projected: 610000, budget: 600000, confidence: 70 },
        { period: "Jun 2025", projected: 630000, budget: 650000, confidence: 65 }
      ];

      res.json(forecast);
    } catch (error) {
      console.error('Error fetching budget forecast:', error);
      res.status(500).json({ message: 'Failed to fetch budget forecast' });
    }
  });

  // PDF Markup API endpoints
  app.get("/api/drawings/:id/annotations", async (req, res) => {
    try {
      const { id } = req.params;
      
      // For now, return empty annotations until we have a proper database table
      res.json([]);
    } catch (error) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ message: "Failed to fetch annotations" });
    }
  });

  app.post("/api/drawings/:id/annotations", async (req, res) => {
    try {
      const { id } = req.params;
      const { annotations } = req.body;
      
      // For now, just return success until we have a proper database table
      res.json({ success: true, message: "Annotations saved successfully" });
    } catch (error) {
      console.error("Error saving annotations:", error);
      res.status(500).json({ message: "Failed to save annotations" });
    }
  });

  // Remnant Management API endpoints
  app.get("/api/remnants", async (req, res) => {
    try {
      const { status, location, materialCode, minLength } = req.query;
      
      const results = await db.select()
        .from(remnants)
        .orderBy(desc(remnants.id));

      res.json(results);
    } catch (error) {
      console.error("Error fetching remnants:", error);
      res.status(500).json({ message: "Failed to fetch remnants" });
    }
  });

  app.get("/api/remnants/stats", async (req, res) => {
    try {
      // Get remnant statistics
      const stats = {
        totalRemnants: 0,
        totalValue: 0,
        averageLength: 0,
        utilizationRate: 0,
        topMaterials: [],
        ageDistribution: {
          "0-30 days": 0,
          "31-90 days": 0,
          "91-180 days": 0,
          ">180 days": 0
        }
      };

      const allRemnants = await db.select().from(remnants).where(eq(remnants.status, "available"));
      
      stats.totalRemnants = allRemnants.length;
      stats.totalValue = allRemnants.reduce((sum, r) => sum + Number(r.currentValue || 0), 0);
      stats.averageLength = allRemnants.length > 0 
        ? allRemnants.reduce((sum, r) => sum + Number(r.length || 0), 0) / allRemnants.length 
        : 0;

      // Calculate age distribution
      const now = new Date();
      allRemnants.forEach(remnant => {
        const ageInDays = Math.floor((now.getTime() - new Date(remnant.createdDate).getTime()) / (1000 * 60 * 60 * 24));
        if (ageInDays <= 30) stats.ageDistribution["0-30 days"]++;
        else if (ageInDays <= 90) stats.ageDistribution["31-90 days"]++;
        else if (ageInDays <= 180) stats.ageDistribution["91-180 days"]++;
        else stats.ageDistribution[">180 days"]++;
      });

      res.json(stats);
    } catch (error) {
      console.error("Error fetching remnant stats:", error);
      res.status(500).json({ message: "Failed to fetch remnant statistics" });
    }
  });

  app.get("/api/remnants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [remnant] = await db.select()
        .from(remnants)
        .where(eq(remnants.id, parseInt(id)))
        .limit(1);

      if (!remnant) {
        return res.status(404).json({ message: "Remnant not found" });
      }

      res.json(remnant);
    } catch (error) {
      console.error("Error fetching remnant:", error);
      res.status(500).json({ message: "Failed to fetch remnant" });
    }
  });

  app.post("/api/remnants", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Generate unique QR and barcode
      const timestamp = Date.now();
      const qrCode = `REM-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      const barcode = `${timestamp}${Math.floor(Math.random() * 1000)}`;

      // Create remnant record
      const [remnant] = await db.insert(remnants)
        .values({
          ...req.body,
          qrCode,
          barcode,
          status: "available",
          createdBy: user.userId,
          updatedBy: user.userId
        })
        .returning();

      // Create history entry
      await db.execute(sql`
        INSERT INTO remnant_history (remnant_id, action, user_id, new_length, notes, created_at)
        VALUES (${remnant.id}, 'created', ${user.userId}, ${remnant.length}, 
                ${`Remnant created from ${req.body.parentJobNumber || 'manual entry'}`}, NOW())
      `);

      res.json(remnant);
    } catch (error) {
      console.error("Error creating remnant:", error);
      res.status(500).json({ message: "Failed to create remnant" });
    }
  });

  app.patch("/api/remnants/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const updates = req.body;

      // Get current remnant data
      const [current] = await db.select().from(remnants).where(eq(remnants.id, parseInt(id)));
      if (!current) {
        return res.status(404).json({ message: "Remnant not found" });
      }

      // Update remnant
      const [updated] = await db.update(remnants)
        .set({
          ...updates,
          lastUpdated: new Date(),
          updatedBy: user.userId
        })
        .where(eq(remnants.id, parseInt(id)))
        .returning();

      // Log history if length changed
      if (updates.length && Number(updates.length) !== Number(current.length)) {
        await db.execute(sql`
          INSERT INTO remnant_history (remnant_id, action, previous_length, new_length, length_used, user_id, notes, created_at)
          VALUES (${parseInt(id)}, 'modified', ${current.length}, ${updates.length}, 
                  ${Number(current.length) - Number(updates.length)}, ${user.userId}, ${updates.notes}, NOW())
        `);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating remnant:", error);
      res.status(500).json({ message: "Failed to update remnant" });
    }
  });

  app.delete("/api/remnants/:id", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Update status to consumed instead of deleting
      await db.update(remnants)
        .set({ 
          status: "consumed",
          consumedDate: new Date(),
          notes: reason || "Manually marked as consumed"
        })
        .where(eq(remnants.id, parseInt(id)));

      // Add history entry
      await db.execute(sql`
        INSERT INTO remnant_history (remnant_id, action, user_id, notes, created_at)
        VALUES (${parseInt(id)}, 'consumed', ${user.userId}, ${reason || "Manually marked as consumed"}, NOW())
      `);

      res.json({ message: "Remnant marked as consumed" });
    } catch (error) {
      console.error("Error consuming remnant:", error);
      res.status(500).json({ message: "Failed to consume remnant" });
    }
  });

  // Remnant label generation
  app.post("/api/remnants/:id/label", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      const { labelType, labelSize, includePhoto } = req.body;

      // Get remnant details
      const [remnant] = await db.select().from(remnants).where(eq(remnants.id, parseInt(id)));
      if (!remnant) {
        return res.status(404).json({ message: "Remnant not found" });
      }

      // Create label record
      const [label] = await db.execute(sql`
        INSERT INTO remnant_labels (remnant_id, label_type, label_size, include_photo, printed_by, printed_at)
        VALUES (${parseInt(id)}, ${labelType || "both"}, ${labelSize || "medium"}, 
                ${includePhoto || false}, ${user.userId}, NOW())
        RETURNING *
      `);

      // Update remnant as labeled
      await db.update(remnants)
        .set({ isLabeled: true })
        .where(eq(remnants.id, parseInt(id)));

      res.json({
        label,
        remnant,
        printData: {
          qrCode: remnant.qrCode,
          barcode: remnant.barcode,
          materialCode: remnant.materialCode,
          materialName: remnant.materialName,
          length: remnant.length,
          location: remnant.location,
          rackNumber: remnant.rackNumber,
          binNumber: remnant.binNumber
        }
      });
    } catch (error) {
      console.error("Error generating label:", error);
      res.status(500).json({ message: "Failed to generate label" });
    }
  });

  // Remnant suggestions for jobs
  app.get("/api/remnants/suggestions/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      
      // Get job material requirements
      const jobMaterialsList = await db.execute(sql`
        SELECT * FROM job_materials WHERE job_id = ${parseInt(jobId)}
      `);

      const suggestions = [];

      for (const material of jobMaterialsList) {
        // Find suitable remnants
        const suitableRemnants = await db.select()
          .from(remnants)
          .where(and(
            eq(remnants.materialCode, material.materialCode),
            gte(remnants.length, material.length),
            eq(remnants.status, "available")
          ))
          .orderBy(asc(remnants.length)); // Prefer smaller remnants that still fit

        for (const remnant of suitableRemnants) {
          const wasteIfUsed = Number(remnant.length) - Number(material.length);
          const costSavings = Number(material.length) * Number(remnant.costPerKg || 0) * Number(material.weight || 0) / 1000;
          
          suggestions.push({
            jobId: parseInt(jobId),
            materialCode: material.materialCode,
            requiredLength: material.length,
            remnantId: remnant.id,
            suggestedRemnantLength: remnant.length,
            wasteIfUsed,
            costSavings,
            suggestionScore: calculateSuggestionScore(wasteIfUsed, new Date(remnant.createdDate)),
            remnantDetails: remnant
          });
        }
      }

      // Sort by score
      suggestions.sort((a, b) => b.suggestionScore - a.suggestionScore);

      res.json(suggestions);
    } catch (error) {
      console.error("Error generating remnant suggestions:", error);
      res.status(500).json({ message: "Failed to generate remnant suggestions" });
    }
  });

  // Accept remnant suggestion
  app.post("/api/remnants/suggestions/accept", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { remnantId, jobId, lengthUsed } = req.body;

      // Reserve remnant for job
      await db.update(remnants)
        .set({
          status: "reserved",
          reservedForJobId: jobId,
          reuseCount: sql`${remnants.reuseCount} + 1`
        })
        .where(eq(remnants.id, remnantId));

      // Add to history
      await db.execute(sql`
        INSERT INTO remnant_history (remnant_id, action, job_id, length_used, user_id, notes, created_at)
        VALUES (${remnantId}, 'reserved', ${jobId}, ${lengthUsed}, ${user.userId}, 
                ${`Reserved for job ${jobId}`}, NOW())
      `);

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting remnant suggestion:", error);
      res.status(500).json({ message: "Failed to accept remnant suggestion" });
    }
  });

  // Helper function to calculate suggestion score
  function calculateSuggestionScore(wasteIfUsed: number, createdAt: Date): number {
    // Score based on waste (less waste = higher score)
    const wasteScore = Math.max(0, 100 - (wasteIfUsed / 10));
    
    // Score based on age (older = higher score to use FIFO)
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const ageScore = Math.min(100, ageInDays * 2);
    
    // Combined score (weighted average)
    return Math.round(wasteScore * 0.7 + ageScore * 0.3);
  }

  // Print Service API endpoints
  app.post("/api/print/label", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { printerIp, printerPort, zplData, remnantId } = req.body;

      // In production, this would send to actual printer
      // For now, we'll simulate the print job
      console.log(`Printing label to ${printerIp}:${printerPort}`);
      console.log(`ZPL Data length: ${zplData.length}`);

      // Log print job
      await db.execute(sql`
        INSERT INTO print_jobs (user_id, printer_ip, printer_port, job_type, job_data, status, created_at)
        VALUES (${user.userId}, ${printerIp}, ${printerPort}, 'remnant_label', 
                ${JSON.stringify({ remnantId, zplData })}, 'completed', NOW())
      `);

      // Update remnant as labeled if remnantId provided
      if (remnantId) {
        await db.update(remnants)
          .set({ isLabeled: true })
          .where(eq(remnants.id, parseInt(remnantId)));
      }

      res.json({ 
        success: true, 
        message: "Label sent to printer",
        jobId: Date.now().toString()
      });
    } catch (error) {
      console.error("Error printing label:", error);
      res.status(500).json({ message: "Failed to print label" });
    }
  });

  app.post("/api/print/test", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { printerIp, printerPort, zplData } = req.body;

      // Simulate printer test
      console.log(`Testing printer connection to ${printerIp}:${printerPort}`);

      res.json({ 
        success: true, 
        message: "Test print sent successfully"
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      res.status(500).json({ message: "Failed to test printer" });
    }
  });

  app.get("/api/print/status", async (req, res) => {
    try {
      const { ip, port } = req.query;

      // In production, this would check actual printer status
      // For now, simulate printer status
      const status = {
        online: true,
        status: "Ready",
        queue: 0,
        errors: [],
        supplies: {
          ribbon: 85,
          labels: 92
        }
      };

      res.json(status);
    } catch (error) {
      console.error("Error checking printer status:", error);
      res.status(500).json({ 
        online: false, 
        status: "Connection failed" 
      });
    }
  });

  // Get print history
  app.get("/api/print/history", async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const history = await db.execute(sql`
        SELECT 
          pj.*,
          u.username as printed_by
        FROM print_jobs pj
        JOIN users u ON pj.user_id = u.id
        ORDER BY pj.created_at DESC
        LIMIT 100
      `);

      res.json(history);
    } catch (error) {
      console.error("Error fetching print history:", error);
      res.status(500).json({ message: "Failed to fetch print history" });
    }
  });

  // Resource Planning & Capacity Management API endpoints
  app.get('/api/resource-planning/capacity/overview', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const capacityData = {
        workshopCapacity: 78,
        laborUtilization: 82,
        equipmentUsage: 65,
        scheduleHealth: "good",
        weeklyCapacity: [
          { date: "Mon", planned: 85, actual: 78, optimal: 80 },
          { date: "Tue", planned: 90, actual: 92, optimal: 80 },
          { date: "Wed", planned: 75, actual: 71, optimal: 80 },
          { date: "Thu", planned: 80, actual: 82, optimal: 80 },
          { date: "Fri", planned: 70, actual: 65, optimal: 80 },
          { date: "Sat", planned: 40, actual: 45, optimal: 40 }
        ],
        departmentCapacity: [
          { department: "Cutting", capacity: 85, available: 15, status: "high" },
          { department: "Welding", capacity: 92, available: 8, status: "critical" },
          { department: "Assembly", capacity: 65, available: 35, status: "optimal" },
          { department: "Finishing", capacity: 73, available: 27, status: "optimal" },
          { department: "QC/Inspection", capacity: 58, available: 42, status: "low" }
        ]
      };

      res.json(capacityData);
    } catch (error) {
      console.error('Error fetching capacity overview:', error);
      res.status(500).json({ message: 'Failed to fetch capacity overview' });
    }
  });

  app.get('/api/resource-planning/labor/allocation', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const laborAllocation = {
        teamAllocation: [
          {
            id: 1,
            name: "Adam Green",
            role: "Senior Welder",
            currentJob: "JOB-2025-001",
            allocation: 100,
            hoursToday: 8,
            hoursWeek: 40,
            skills: ["MIG", "TIG", "6G"],
            status: "allocated"
          },
          {
            id: 2,
            name: "Manny Magallanes",
            role: "Fabricator",
            currentJob: "JOB-2025-002",
            allocation: 75,
            hoursToday: 6,
            hoursWeek: 35,
            skills: ["Cutting", "Assembly", "QC"],
            status: "allocated"
          },
          {
            id: 3,
            name: "Chipo Green",
            role: "Finisher",
            currentJob: "JOB-2025-001",
            allocation: 50,
            hoursToday: 4,
            hoursWeek: 28,
            skills: ["Grinding", "Painting", "QC"],
            status: "partial"
          },
          {
            id: 4,
            name: "Vili Pelenato",
            role: "Apprentice Welder",
            currentJob: null,
            allocation: 0,
            hoursToday: 0,
            hoursWeek: 12,
            skills: ["MIG", "Cutting"],
            status: "available"
          }
        ],
        skillGaps: [
          { skill: "Crane Operation", demand: 32, available: 8, gap: 24 },
          { skill: "Aluminum Welding", demand: 20, available: 12, gap: 8 },
          { skill: "CNC Programming", demand: 16, available: 0, gap: 16 }
        ]
      };

      res.json(laborAllocation);
    } catch (error) {
      console.error('Error fetching labor allocation:', error);
      res.status(500).json({ message: 'Failed to fetch labor allocation' });
    }
  });

  app.get('/api/resource-planning/equipment/schedule', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const equipmentSchedule = {
        equipment: [
          {
            id: 1,
            name: "Plasma Cutter #1",
            type: "Cutting",
            status: "operating",
            currentJob: "JOB-2025-001",
            utilization: 85,
            efficiency: 92
          },
          {
            id: 2,
            name: "Press Brake #2",
            type: "Forming",
            status: "idle",
            currentJob: null,
            utilization: 65,
            efficiency: 88
          },
          {
            id: 3,
            name: "Welding Bay 1",
            type: "Welding",
            status: "operating",
            currentJob: "JOB-2025-002",
            utilization: 92,
            efficiency: 95
          }
        ],
        todaySchedule: [
          { time: "08:00", equipment: "Plasma Cutter #1", job: "JOB-2025-001", duration: "4h", operator: "Manny M." },
          { time: "08:30", equipment: "Welding Bay 1", job: "JOB-2025-002", duration: "6h", operator: "Adam G." },
          { time: "10:00", equipment: "Press Brake #2", job: "JOB-2025-003", duration: "2h", operator: "Vili P." }
        ]
      };

      res.json(equipmentSchedule);
    } catch (error) {
      console.error('Error fetching equipment schedule:', error);
      res.status(500).json({ message: 'Failed to fetch equipment schedule' });
    }
  });

  app.get('/api/resource-planning/project/timeline', async (req, res) => {
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const projectTimeline = {
        projects: [
          {
            id: 1,
            jobNumber: "JOB-2025-001",
            name: "Steel Frame Warehouse",
            client: "BuildCorp Ltd",
            startDate: "Jan 15",
            dueDate: "Mar 1",
            progress: 65,
            status: "on-track",
            phase: "Fabrication",
            resourceConflicts: 0
          },
          {
            id: 2,
            jobNumber: "JOB-2025-002",
            name: "Bridge Support Structure",
            client: "Metro Development",
            startDate: "Jan 20",
            dueDate: "Feb 28",
            progress: 35,
            status: "at-risk",
            phase: "Cutting",
            resourceConflicts: 2
          }
        ],
        resourceConflicts: [
          {
            date: "Feb 5",
            type: "Labor",
            resource: "Senior Welders",
            projects: ["JOB-2025-001", "JOB-2025-002"],
            impact: "2-day delay risk"
          }
        ],
        milestones: [
          { project: "JOB-2025-001", milestone: "Material Delivery", date: "Jan 20", status: "completed" },
          { project: "JOB-2025-001", milestone: "Cutting Complete", date: "Feb 5", status: "in-progress" }
        ]
      };

      res.json(projectTimeline);
    } catch (error) {
      console.error('Error fetching project timeline:', error);
      res.status(500).json({ message: 'Failed to fetch project timeline' });
    }
  });

  // Labor Rate Management Routes
  app.get("/api/labor-rates", async (req, res) => {
    try {
      const { roleId, skillLevelId, isActive } = req.query;
      
      let query = db
        .select({
          id: laborRates.id,
          roleId: laborRates.roleId,
          roleName: roles.name,
          skillLevelId: laborRates.skillLevelId,
          skillLevelName: skillLevels.name,
          baseRate: laborRates.baseRate,
          overtimeMultiplier: laborRates.overtimeMultiplier,
          doubleTimeMultiplier: laborRates.doubleTimeMultiplier,
          siteAllowanceRate: laborRates.siteAllowanceRate,
          siteAllowanceType: laborRates.siteAllowanceType,
          effectiveDate: laborRates.effectiveDate,
          expiryDate: laborRates.expiryDate,
          isActive: laborRates.isActive
        })
        .from(laborRates)
        .leftJoin(roles, eq(laborRates.roleId, roles.id))
        .leftJoin(skillLevels, eq(laborRates.skillLevelId, skillLevels.id));
      
      if (roleId) query = query.where(eq(laborRates.roleId, Number(roleId)));
      if (skillLevelId) query = query.where(eq(laborRates.skillLevelId, Number(skillLevelId)));
      if (isActive !== undefined) query = query.where(eq(laborRates.isActive, isActive === 'true'));
      
      const rates = await query;
      res.json(rates);
    } catch (error) {
      console.error("Error fetching labor rates:", error);
      res.status(500).json({ error: "Failed to fetch labor rates" });
    }
  });

  // Create/Update labor rate
  app.post("/api/labor-rates", async (req, res) => {
    try {
      const rateData = req.body;
      
      // Log previous rate if updating
      if (rateData.id) {
        const [previousRate] = await db
          .select({ baseRate: laborRates.baseRate })
          .from(laborRates)
          .where(eq(laborRates.id, rateData.id));
        
        if (previousRate) {
          await db.insert(laborRateHistory).values({
            rateId: rateData.id,
            previousRate: previousRate.baseRate,
            newRate: rateData.baseRate,
            changeReason: rateData.changeReason || 'Rate update',
            changedBy: req.user?.id
          });
        }
      }
      
      const rate = rateData.id
        ? await db.update(laborRates)
            .set({ ...rateData, updatedAt: new Date() })
            .where(eq(laborRates.id, rateData.id))
            .returning()
        : await db.insert(laborRates)
            .values({ ...rateData, createdBy: req.user?.id })
            .returning();
      
      res.json(rate[0]);
    } catch (error) {
      console.error("Error saving labor rate:", error);
      res.status(500).json({ error: "Failed to save labor rate" });
    }
  });

  // Get labor rate history
  app.get("/api/labor-rates/history/:roleId", async (req, res) => {
    try {
      const history = await db
        .select({
          id: laborRateHistory.id,
          previousRate: laborRateHistory.previousRate,
          newRate: laborRateHistory.newRate,
          changeReason: laborRateHistory.changeReason,
          changedAt: laborRateHistory.changedAt,
          changedBy: users.name
        })
        .from(laborRateHistory)
        .leftJoin(laborRates, eq(laborRateHistory.rateId, laborRates.id))
        .leftJoin(users, eq(laborRateHistory.changedBy, users.id))
        .where(eq(laborRates.roleId, Number(req.params.roleId)))
        .orderBy(desc(laborRateHistory.changedAt));
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching rate history:", error);
      res.status(500).json({ error: "Failed to fetch rate history" });
    }
  });

  // Calculate labor rate with allowances
  app.post("/api/labor-rates/calculate", async (req, res) => {
    try {
      const { roleId, skillLevelId, hours, allowances = [] } = req.body;
      
      // Get base rate
      const [rate] = await db
        .select()
        .from(laborRates)
        .where(
          and(
            eq(laborRates.roleId, roleId),
            eq(laborRates.skillLevelId, skillLevelId),
            eq(laborRates.isActive, true),
            lte(laborRates.effectiveDate, new Date())
          )
        )
        .orderBy(desc(laborRates.effectiveDate))
        .limit(1);
      
      if (!rate) {
        return res.status(404).json({ error: "No active rate found" });
      }
      
      let totalRate = Number(rate.baseRate);
      let appliedAllowances = [];
      
      // Apply allowances
      for (const allowanceId of allowances) {
        const [allowance] = await db
          .select()
          .from(laborAllowances)
          .where(eq(laborAllowances.id, allowanceId));
        
        if (allowance) {
          switch (allowance.type) {
            case 'percentage':
              totalRate += (totalRate * Number(allowance.value) / 100);
              break;
            case 'fixed':
              totalRate += Number(allowance.value);
              break;
            case 'multiplier':
              totalRate *= Number(allowance.value);
              break;
          }
          appliedAllowances.push({
            name: allowance.name,
            type: allowance.type,
            value: allowance.value
          });
        }
      }
      
      // Calculate overtime if applicable
      let regularHours = Math.min(hours, 8);
      let overtimeHours = Math.max(0, Math.min(hours - 8, 4));
      let doubleTimeHours = Math.max(0, hours - 12);
      
      const regularCost = regularHours * totalRate;
      const overtimeCost = overtimeHours * totalRate * Number(rate.overtimeMultiplier);
      const doubleTimeCost = doubleTimeHours * totalRate * Number(rate.doubleTimeMultiplier);
      
      res.json({
        baseRate: rate.baseRate,
        totalRate,
        regularHours,
        overtimeHours,
        doubleTimeHours,
        regularCost,
        overtimeCost,
        doubleTimeCost,
        totalCost: regularCost + overtimeCost + doubleTimeCost,
        appliedAllowances
      });
    } catch (error) {
      console.error("Error calculating labor rate:", error);
      res.status(500).json({ error: "Failed to calculate labor rate" });
    }
  });

  // Apply team member rates to estimation
  app.post("/api/estimation/:id/apply-team-rates", async (req, res) => {
    try {
      const estimationId = Number(req.params.id);
      const { laborItems } = req.body;
      
      for (const item of laborItems) {
        if (item.teamMemberId) {
          const [member] = await db
            .select()
            .from(teamMembers)
            .where(eq(teamMembers.id, item.teamMemberId));
          
          if (member) {
            const effectiveRate = member.rateOverride || member.hourlyRate;
            await db
              .update(estimationLabor)
              .set({
                hourlyRate: effectiveRate,
                totalCost: String(Number(effectiveRate) * Number(item.hours)),
                teamMemberId: member.id,
                roleId: member.roleId,
                skillLevelId: member.skillLevelId,
                rateSource: 'team_member'
              })
              .where(eq(estimationLabor.id, item.id));
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error applying team rates:", error);
      res.status(500).json({ error: "Failed to apply team rates" });
    }
  });

  // Get skill levels
  app.get("/api/skill-levels", async (req, res) => {
    try {
      const levels = await db
        .select()
        .from(skillLevels)
        .where(eq(skillLevels.isActive, true))
        .orderBy(skillLevels.multiplier);
      
      // Convert to frontend format
      const formattedLevels = levels.map((level: any) => ({
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        multiplier: level.multiplier,
        requiredExperience: level.requiredExperience || level.required_experience,
        isActive: level.isActive || level.is_active
      }));
      
      res.json(formattedLevels);
    } catch (error) {
      console.error("Error fetching skill levels:", error);
      res.status(500).json({ error: "Failed to fetch skill levels" });
    }
  });
  
  app.put("/api/skill-levels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, multiplier, description, requiredExperience } = req.body;
      
      // Get the current value for history tracking
      const currentResult = await db.execute(sql`
        SELECT * FROM skill_levels WHERE id = ${id}
      `);
      const current = currentResult.rows[0];
      
      if (!current) {
        return res.status(404).json({ error: "Skill level not found" });
      }
      
      // Update the skill level - include name in the update
      await db.execute(sql`
        UPDATE skill_levels 
        SET name = ${name || current.name},
            multiplier = ${multiplier},
            description = ${description || current.description},
            required_experience = ${requiredExperience || current.required_experience},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `);
      
      // Fetch the updated record
      const result = await db.execute(sql`
        SELECT * FROM skill_levels WHERE id = ${id}
      `);
      
      const level = result.rows[0];
      res.json({
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        multiplier: level.multiplier,
        requiredExperience: level.required_experience,
        isActive: level.is_active
      });
    } catch (error) {
      console.error("Error updating skill level:", error);
      res.status(500).json({ error: "Failed to update skill level" });
    }
  });

  // Create skill level
  app.post("/api/skill-levels", async (req, res) => {
    try {
      const { name, code, multiplier, description, requiredExperience } = req.body;
      
      // Generate code if not provided
      const skillCode = code || name.substring(0, 4).toUpperCase();
      
      // Insert new skill level
      const result = await db.execute(sql`
        INSERT INTO skill_levels (
          code, 
          name, 
          description, 
          multiplier, 
          required_experience, 
          is_active,
          created_at
        )
        VALUES (
          ${skillCode},
          ${name},
          ${description || ''},
          ${multiplier || 1.0},
          ${requiredExperience || 0},
          true,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `);
      
      const level = result.rows[0];
      res.json({
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        multiplier: level.multiplier,
        requiredExperience: level.required_experience,
        isActive: level.is_active
      });
    } catch (error) {
      console.error("Error creating skill level:", error);
      res.status(500).json({ error: "Failed to create skill level" });
    }
  });

  // Get labor allowances
  app.get("/api/labor-allowances", async (req, res) => {
    try {
      const allowances = await db
        .select()
        .from(laborAllowances)
        .where(eq(laborAllowances.isActive, true))
        .orderBy(laborAllowances.name);
      
      // Map database columns to frontend expectations
      const mappedAllowances = allowances.map(a => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description || '', // Ensure description is included
        allowanceType: a.allowanceType || a.type || 'fixed',
        amount: a.amount !== null && a.amount !== undefined ? a.amount : (a.value || 0),
        isActive: a.isActive,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        // Include all fields for debugging
        type: a.type,
        value: a.value
      }));
      
      res.json(mappedAllowances);
    } catch (error) {
      console.error("Error fetching allowances:", error);
      res.status(500).json({ error: "Failed to fetch allowances" });
    }
  });

  // Labor Rate Profiles endpoints
  app.get("/api/labor-rate-profiles", async (req, res) => {
    try {
      const profiles = await db.execute(sql`
        SELECT 
          lrp.*,
          COUNT(DISTINCT rr.role_id) as role_count
        FROM labor_rate_profiles lrp
        LEFT JOIN role_rates rr ON rr.profile_id = lrp.id
        WHERE lrp.is_active = true
        GROUP BY lrp.id, lrp.name, lrp.description, lrp.is_default, lrp.is_active, 
                 lrp.created_at, lrp.updated_at, lrp.base_rate, lrp.overtime_multiplier, 
                 lrp.effective_date
        ORDER BY lrp.is_default DESC, lrp.name
      `);
      
      // Convert snake_case to camelCase for frontend
      const formattedProfiles = profiles.rows.map((profile: any) => ({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        baseRate: profile.base_rate || 0,
        overtimeMultiplier: profile.overtime_multiplier || 1.5,
        effectiveDate: profile.effective_date,
        isDefault: profile.is_default,
        isActive: profile.is_active,
        roleCount: profile.role_count
      }));
      
      res.json(formattedProfiles);
    } catch (error) {
      console.error("Error fetching labor rate profiles:", error);
      res.status(500).json({ error: "Failed to fetch labor rate profiles" });
    }
  });

  app.post("/api/labor-rate-profiles", async (req, res) => {
    try {
      const { name, baseRate, overtimeMultiplier, effectiveDate, isActive } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO labor_rate_profiles (name, base_rate, overtime_multiplier, effective_date, is_active)
        VALUES (${name}, ${baseRate}, ${overtimeMultiplier}, ${effectiveDate}, ${isActive})
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating labor rate profile:", error);
      res.status(500).json({ error: "Failed to create labor rate profile" });
    }
  });
  
  app.put("/api/labor-rate-profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, baseRate, overtimeMultiplier, effectiveDate, isActive } = req.body;
      
      // Get current values for history tracking
      const currentResult = await db.execute(sql`
        SELECT * FROM labor_rate_profiles WHERE id = ${id}
      `);
      const current = currentResult.rows[0];
      
      if (!current) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      // Update the profile
      const result = await db.execute(sql`
        UPDATE labor_rate_profiles 
        SET name = ${name || current.name},
            base_rate = ${baseRate !== undefined ? baseRate : current.base_rate},
            overtime_multiplier = ${overtimeMultiplier || current.overtime_multiplier},
            effective_date = ${effectiveDate || current.effective_date},
            is_active = ${isActive !== undefined ? isActive : current.is_active},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `);
      
      // Track rate change if base rate changed
      if (baseRate !== undefined && baseRate !== current.base_rate) {
        await db.execute(sql`
          INSERT INTO labor_rate_history (
            rate_id, 
            previous_rate, 
            new_rate, 
            change_reason, 
            changed_by, 
            changed_at,
            created_at
          ) VALUES (
            ${id},
            ${current.base_rate},
            ${baseRate},
            'Rate updated via Operations Settings',
            NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Convert to frontend format
      const profile = result.rows[0];
      res.json({
        id: profile.id,
        name: profile.name,
        description: profile.description,
        baseRate: profile.base_rate,
        overtimeMultiplier: profile.overtime_multiplier,
        effectiveDate: profile.effective_date,
        isDefault: profile.is_default,
        isActive: profile.is_active
      });
    } catch (error) {
      console.error("Error updating labor rate profile:", error);
      res.status(500).json({ error: "Failed to update labor rate profile" });
    }
  });

  // Role Rates endpoints
  app.get("/api/role-rates", async (req, res) => {
    try {
      const { profileId } = req.query;
      
      let query = sql`
        SELECT 
          rr.*,
          r.name as role_name,
          r.description as role_description
        FROM role_rates rr
        JOIN roles r ON r.id = rr.role_id
        WHERE rr.is_active = true
      `;
      
      if (profileId) {
        query = sql`
          SELECT 
            rr.*,
            r.name as role_name,
            r.description as role_description
          FROM role_rates rr
          JOIN roles r ON r.id = rr.role_id
          WHERE rr.is_active = true AND rr.profile_id = ${profileId}
          ORDER BY r.name
        `;
      }
      
      const rates = await db.execute(query);
      
      // Get skill levels and departments for enrichment
      const skillLevelsData = await db.select().from(skillLevels).where(eq(skillLevels.isActive, true));
      const departmentsData = await db.select().from(departments);
      
      // Convert to frontend format with enriched data
      const formattedRates = rates.rows.map((rate: any) => {
        const skillLevel = skillLevelsData.find(s => s.id === rate.skill_level_id);
        const department = departmentsData.find(d => d.id === rate.department_id);
        
        return {
          id: rate.id,
          profileId: rate.profile_id,
          roleId: rate.role_id,
          roleName: rate.role_name,
          roleDescription: rate.role_description,
          baseRate: rate.base_rate || 0,
          skillLevelId: rate.skill_level_id,
          skillLevelName: skillLevel?.name,
          skillLevelMultiplier: skillLevel?.multiplier || 1,
          overtimeMultiplier: rate.overtime_multiplier || 1.5,
          doubleTimeMultiplier: rate.double_time_multiplier || 2.0,
          isActive: rate.is_active,
          department: rate.department || 'N/A',
          departmentId: rate.department_id,
          departmentName: department?.name,
          effectiveRate: (rate.base_rate || 0) * (skillLevel?.multiplier || 1)
        };
      });
      
      res.json(formattedRates);
    } catch (error) {
      console.error("Error fetching role rates:", error);
      res.status(500).json({ error: "Failed to fetch role rates" });
    }
  });

  // Create new role rate
  app.post("/api/role-rates", async (req, res) => {
    try {
      const { laborRateProfileId, skillLevelId, role, department, departmentId } = req.body;
      
      // Handle empty skillLevelId
      const skillLevel = skillLevelId || null;
      
      // First check if role exists, if not create it
      let roleResult = await db.execute(sql`
        SELECT id FROM roles WHERE name = ${role}
      `);
      
      let roleId;
      if (roleResult.rows.length === 0) {
        // Create new role
        const newRoleResult = await db.execute(sql`
          INSERT INTO roles (name, description, created_at)
          VALUES (${role}, ${role}, CURRENT_TIMESTAMP)
          RETURNING id
        `);
        roleId = newRoleResult.rows[0].id;
      } else {
        roleId = roleResult.rows[0].id;
      }
      
      // Get base rate from profile and multiplier from skill level
      const profileResult = await db.execute(sql`
        SELECT base_rate FROM labor_rate_profiles WHERE id = ${laborRateProfileId}
      `);
      
      const skillResult = skillLevel ? await db.execute(sql`
        SELECT multiplier FROM skill_levels WHERE id = ${skillLevel}
      `) : { rows: [] };
      
      const baseRate = profileResult.rows[0]?.base_rate || 120;
      const multiplier = skillResult.rows[0]?.multiplier || 1;
      
      // Create role rate with proper department_id
      const result = await db.execute(sql`
        INSERT INTO role_rates (
          profile_id, role_id, skill_level_id, base_rate, 
          department, department_id, is_active, created_at, updated_at
        )
        VALUES (
          ${laborRateProfileId}, ${roleId}, ${skillLevel}, 
          ${baseRate}, ${department || 'N/A'}, ${departmentId || null}, true, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `);
      
      res.json({
        id: result.rows[0].id,
        profileId: result.rows[0].profile_id,
        roleId: result.rows[0].role_id,
        roleName: role,
        skillLevelId: result.rows[0].skill_level_id,
        baseRate: result.rows[0].base_rate,
        department: result.rows[0].department
      });
    } catch (error) {
      console.error("Error creating role rate:", error);
      res.status(500).json({ error: "Failed to create role rate" });
    }
  });

  // Update role rate
  app.put("/api/role-rates/:id", async (req, res) => {
    try {
      const rateId = Number(req.params.id);
      const { laborRateProfileId, skillLevelId, role, department, departmentId } = req.body;
      
      // Handle empty skillLevelId
      const skillLevel = skillLevelId || null;
      
      // First check if role exists, if not create it
      let roleResult = await db.execute(sql`
        SELECT id FROM roles WHERE name = ${role}
      `);
      
      let roleId;
      if (roleResult.rows.length === 0) {
        // Create new role
        const newRoleResult = await db.execute(sql`
          INSERT INTO roles (name, description, created_at)
          VALUES (${role}, ${role}, CURRENT_TIMESTAMP)
          RETURNING id
        `);
        roleId = newRoleResult.rows[0].id;
      } else {
        roleId = roleResult.rows[0].id;
      }
      
      // Get base rate from profile
      const profileResult = await db.execute(sql`
        SELECT base_rate FROM labor_rate_profiles WHERE id = ${laborRateProfileId}
      `);
      
      const baseRate = profileResult.rows[0]?.base_rate || 120;
      
      // Update role rate with proper department_id
      const result = await db.execute(sql`
        UPDATE role_rates 
        SET 
          profile_id = ${laborRateProfileId},
          role_id = ${roleId},
          skill_level_id = ${skillLevel},
          base_rate = ${baseRate},
          department = ${department || 'N/A'},
          department_id = ${departmentId || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${rateId}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Role rate not found" });
      }
      
      res.json({
        id: result.rows[0].id,
        profileId: result.rows[0].profile_id,
        roleId: result.rows[0].role_id,
        roleName: role,
        skillLevelId: result.rows[0].skill_level_id,
        baseRate: result.rows[0].base_rate,
        department: result.rows[0].department
      });
    } catch (error) {
      console.error("Error updating role rate:", error);
      res.status(500).json({ error: "Failed to update role rate" });
    }
  });

  // Create labor allowance
  app.post("/api/labor-allowances", async (req, res) => {
    try {
      const { name, code, description, allowanceType, amount } = req.body;
      
      // Use correct column names for database
      const result = await db.execute(sql`
        INSERT INTO labor_allowances (
          name,
          code,
          description,
          allowance_type,
          amount,
          type,
          value,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${name},
          ${code || name.substring(0, 3).toUpperCase()},
          ${description || ''},
          ${allowanceType || 'fixed'},
          ${amount || 0},
          ${allowanceType || 'fixed'},
          ${amount || 0},
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `);
      
      // Return properly formatted response for frontend
      const newAllowance = result.rows[0];
      res.json({
        id: newAllowance.id,
        name: newAllowance.name,
        code: newAllowance.code,
        description: newAllowance.description || '',
        allowanceType: newAllowance.allowance_type || newAllowance.type || 'fixed',
        amount: newAllowance.amount !== null ? newAllowance.amount : newAllowance.value,
        isActive: newAllowance.is_active,
        createdAt: newAllowance.created_at,
        updatedAt: newAllowance.updated_at
      });
    } catch (error) {
      console.error("Error creating labor allowance:", error);
      res.status(500).json({ error: "Failed to create labor allowance" });
    }
  });

  // Update labor allowance
  app.put("/api/labor-allowances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, code, description, allowanceType, amount, isActive } = req.body;
      
      // Update both old and new columns for compatibility
      const result = await db.execute(sql`
        UPDATE labor_allowances
        SET 
          name = ${name},
          code = ${code},
          description = ${description || ''},
          allowance_type = ${allowanceType || 'fixed'},
          amount = ${amount || 0},
          type = ${allowanceType || 'fixed'},
          value = ${amount || 0},
          is_active = ${isActive !== undefined ? isActive : true},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Allowance not found" });
      }
      
      // Return properly formatted response for frontend
      const updatedAllowance = result.rows[0];
      res.json({
        id: updatedAllowance.id,
        name: updatedAllowance.name,
        code: updatedAllowance.code,
        description: updatedAllowance.description || '',
        allowanceType: updatedAllowance.allowance_type || updatedAllowance.type || 'fixed',
        amount: updatedAllowance.amount !== null ? updatedAllowance.amount : updatedAllowance.value,
        isActive: updatedAllowance.is_active,
        createdAt: updatedAllowance.created_at,
        updatedAt: updatedAllowance.updated_at
      });
    } catch (error) {
      console.error("Error updating labor allowance:", error);
      res.status(500).json({ error: "Failed to update labor allowance" });
    }
  });

  // Delete labor allowance
  app.delete("/api/labor-allowances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Soft delete by setting is_active to false
      const result = await db.execute(sql`
        UPDATE labor_allowances
        SET 
          is_active = false, 
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id
      `);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting labor allowance:", error);
      res.status(500).json({ error: "Failed to delete labor allowance" });
    }
  });

  // Labor Rate History endpoint
  app.get("/api/labor-rates/history", async (req, res) => {
    try {
      const { rateId, profileId, days = 30 } = req.query;
      const daysNum = Number(days) || 30;
      
      // Use a simpler query that doesn't have binding issues
      const historyResult = await db.execute(sql`
        SELECT 
          lrh.*,
          lrp.name as profile_name
        FROM labor_rate_history lrh
        LEFT JOIN labor_rate_profiles lrp ON lrp.id = lrh.rate_id
        WHERE lrh.created_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY lrh.changed_at DESC
        LIMIT 50
      `);
      
      const history = historyResult.rows;
      
      // Convert to frontend format
      const formattedHistory = history.map((entry: any) => ({
        id: entry.id,
        rateId: entry.rate_id,
        laborRateProfile: { name: entry.profile_name || 'Standard Rates' },
        oldRate: entry.previous_rate,
        newRate: entry.new_rate,
        changeReason: entry.change_reason,
        changedBy: entry.changed_by,
        changedAt: entry.changed_at || entry.created_at,
        createdAt: entry.created_at
      }));
      
      res.json(formattedHistory);
    } catch (error) {
      console.error("Error fetching rate history:", error);
      res.status(500).json({ error: "Failed to fetch rate history" });
    }
  });
  
  // Estimation Labor Rate Profile Application
  app.post("/api/estimation/:id/apply-labor-profile", async (req, res) => {
    try {
      const estimationId = Number(req.params.id);
      const { profileId } = req.body;
      
      // Get the selected profile
      const profileResult = await db.execute(sql`
        SELECT * FROM labor_rate_profiles 
        WHERE id = ${profileId} AND is_active = true
      `);
      const profile = profileResult.rows[0];
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      // Update estimation with selected profile
      await db.execute(sql`
        UPDATE estimation_data 
        SET labor = jsonb_set(
          COALESCE(labor, '{}'),
          '{profileId}',
          ${profileId}::text::jsonb
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE project_id = ${estimationId}
      `);
      
      // Get role rates from the profile
      const roleRatesResult = await db.execute(sql`
        SELECT 
          rr.*,
          r.name as role_name,
          sl.multiplier as skill_multiplier
        FROM role_rates rr
        JOIN roles r ON r.id = rr.role_id
        LEFT JOIN skill_levels sl ON sl.id = rr.skill_level_id
        WHERE rr.profile_id = ${profileId}
          AND rr.is_active = true
      `);
      
      res.json({
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          baseRate: profile.base_rate,
          overtimeMultiplier: profile.overtime_multiplier
        },
        roleRates: roleRatesResult.rows
      });
    } catch (error) {
      console.error("Error applying labor profile:", error);
      res.status(500).json({ error: "Failed to apply labor profile" });
    }
  });
  
  // Back Costing - Compare Actual vs Estimated Labor
  app.get("/api/jobs/:id/labor-variance", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      
      // Get job details with estimation data
      const jobResult = await db.execute(sql`
        SELECT 
          j.*,
          ed.labor as estimated_labor,
          ed.overhead_percentage,
          ed.margin_percentage
        FROM jobs j
        LEFT JOIN estimation_data ed ON ed.project_id = j.estimation_id
        WHERE j.id = ${jobId}
      `);
      const job = jobResult.rows[0];
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      // Get actual time tracked for this job
      const actualTimeResult = await db.execute(sql`
        SELECT 
          tc.id,
          tc.employee_id,
          tm.name as employee_name,
          tc.hours_worked,
          tc.overtime_hours,
          tc.double_time_hours,
          tc.clock_in_time::date as date,
          COALESCE(tc.hourly_rate, tm.hourly_rate, 75) as hourly_rate,
          r.name as role_name
        FROM time_clocks tc
        JOIN team_members tm ON tm.id = tc.employee_id
        LEFT JOIN roles r ON r.id = tm.role_id
        WHERE tc.job_id = ${jobId}
          AND tc.clock_out_time IS NOT NULL
      `);
      
      // Calculate actual costs
      const actualLaborCosts = actualTimeResult.rows.reduce((acc: any, entry: any) => {
        const regularCost = entry.hours_worked * entry.hourly_rate;
        const overtimeCost = entry.overtime_hours * entry.hourly_rate * 1.5;
        const doubleTimeCost = entry.double_time_hours * entry.hourly_rate * 2.0;
        
        return {
          totalHours: acc.totalHours + entry.hours_worked + entry.overtime_hours + entry.double_time_hours,
          regularHours: acc.regularHours + entry.hours_worked,
          overtimeHours: acc.overtimeHours + entry.overtime_hours,
          doubleTimeHours: acc.doubleTimeHours + entry.double_time_hours,
          totalCost: acc.totalCost + regularCost + overtimeCost + doubleTimeCost
        };
      }, {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
        totalCost: 0
      });
      
      // Parse estimated labor from JSON
      const estimatedLabor = job.estimated_labor || {};
      const estimatedHours = estimatedLabor.totalHours || 0;
      const estimatedCost = estimatedLabor.totalCost || 0;
      
      // Calculate variances
      const hoursVariance = actualLaborCosts.totalHours - estimatedHours;
      const costVariance = actualLaborCosts.totalCost - estimatedCost;
      const hoursVariancePercent = estimatedHours ? (hoursVariance / estimatedHours * 100) : 0;
      const costVariancePercent = estimatedCost ? (costVariance / estimatedCost * 100) : 0;
      
      res.json({
        jobId,
        jobNumber: job.job_number,
        estimated: {
          hours: estimatedHours,
          cost: estimatedCost,
          profileId: estimatedLabor.profileId,
          profileName: estimatedLabor.profileName
        },
        actual: actualLaborCosts,
        variance: {
          hours: hoursVariance,
          hoursPercent: hoursVariancePercent,
          cost: costVariance,
          costPercent: costVariancePercent,
          status: costVariance < 0 ? 'under_budget' : costVariance > 0 ? 'over_budget' : 'on_budget'
        },
        details: actualTimeResult.rows.map((entry: any) => ({
          date: entry.date,
          employee: entry.employee_name,
          role: entry.role_name,
          hours: entry.hours_worked,
          overtime: entry.overtime_hours,
          doubleTime: entry.double_time_hours,
          rate: entry.hourly_rate,
          cost: (entry.hours_worked * entry.hourly_rate) + 
                (entry.overtime_hours * entry.hourly_rate * 1.5) +
                (entry.double_time_hours * entry.hourly_rate * 2.0)
        }))
      });
    } catch (error) {
      console.error("Error calculating labor variance:", error);
      res.status(500).json({ error: "Failed to calculate labor variance" });
    }
  });
  
  // Financial Analytics - Labor Cost Summary
  app.get("/api/analytics/labor-costs", async (req, res) => {
    try {
      const { startDate, endDate, profileId } = req.query;
      
      // Get labor costs by profile
      const profileCostsResult = await db.execute(sql`
        SELECT 
          lrp.id as profile_id,
          lrp.name as profile_name,
          COUNT(DISTINCT j.id) as job_count,
          SUM(CAST(ed.labor->>'totalHours' AS NUMERIC)) as total_hours,
          SUM(CAST(ed.labor->>'totalCost' AS NUMERIC)) as total_cost,
          AVG(CAST(ed.labor->>'totalCost' AS NUMERIC)) as avg_cost_per_job
        FROM jobs j
        JOIN estimation_data ed ON ed.project_id = j.estimation_id
        JOIN labor_rate_profiles lrp ON lrp.id = CAST(ed.labor->>'profileId' AS INTEGER)
        WHERE j.created_at >= COALESCE(${startDate}, CURRENT_DATE - INTERVAL '30 days')
          AND j.created_at <= COALESCE(${endDate}, CURRENT_DATE)
          ${profileId ? sql`AND lrp.id = ${profileId}` : sql``}
        GROUP BY lrp.id, lrp.name
      `);
      
      // Get labor costs by role
      const roleCostsResult = await db.execute(sql`
        SELECT 
          r.name as role_name,
          COUNT(DISTINCT tc.id) as entry_count,
          SUM(tc.hours_worked + tc.overtime_hours + tc.double_time_hours) as total_hours,
          SUM(
            (tc.hours_worked * tm.hourly_rate) +
            (tc.overtime_hours * tm.hourly_rate * 1.5) +
            (tc.double_time_hours * tm.hourly_rate * 2.0)
          ) as total_cost
        FROM time_clocks tc
        JOIN team_members tm ON tm.id = tc.employee_id
        JOIN roles r ON r.id = tm.role_id
        WHERE tc.clock_in_time >= COALESCE(${startDate}, CURRENT_DATE - INTERVAL '30 days')
          AND tc.clock_in_time <= COALESCE(${endDate}, CURRENT_DATE)
          AND tc.clock_out_time IS NOT NULL
        GROUP BY r.name
        ORDER BY total_cost DESC
      `);
      
      res.json({
        summary: {
          profileCosts: profileCostsResult.rows,
          roleCosts: roleCostsResult.rows,
          period: {
            start: startDate || 'Last 30 days',
            end: endDate || 'Today'
          }
        }
      });
    } catch (error) {
      console.error("Error fetching labor cost analytics:", error);
      res.status(500).json({ error: "Failed to fetch labor cost analytics" });
    }
  });
  
  // ============================================
  // PROCUREMENT ROUTES
  // ============================================

  // Get all requisitions with filters
  app.get("/api/procurement/requisitions", async (req, res) => {
    try {
      const { status, department, requestedBy, includeArchived, archivedOnly } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (department) filters.department = department as string;
      if (requestedBy) filters.requestedBy = parseInt(requestedBy as string);
      
      let requisitions = await storage.getRequisitions(filters);
      
      // Handle archive filtering
      if (archivedOnly === 'true') {
        requisitions = await storage.getArchivedRequisitions();
      } else if (includeArchived !== 'true') {
        // Filter out archived requisitions by default
        requisitions = requisitions.filter((r: any) => !r.isArchived);
      }
      
      // Get rejection reasons for rejected requisitions
      const requisitionsWithRejectionReasons = await Promise.all(
        requisitions.map(async (r: any) => {
          let lastRejectionReason = null;
          
          // If rejected, get the last rejection reason from history
          if (r.status === 'rejected') {
            const history = await storage.getApprovalHistory(r.id);
            const rejectionEntry = history
              .filter((h: any) => h.action === 'rejected')
              .sort((a: any, b: any) => new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime())[0];
            
            if (rejectionEntry) {
              lastRejectionReason = rejectionEntry.comments;
            }
          }
          
          return {
            ...r,
            lastRejectionReason
          };
        })
      );
      
      res.json(requisitionsWithRejectionReasons);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      res.status(500).json({ error: "Failed to fetch requisitions" });
    }
  });

  // Get single requisition with items
  app.get("/api/procurement/requisitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requisition = await storage.getRequisition(id);
      
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      const items = await storage.getRequisitionItems(id);
      
      // Convert decimal strings to numbers for proper display
      const convertedItems = items.map(item => ({
        ...item,
        quantity: item.quantity ? parseFloat(item.quantity as any) : 0,
        estimatedUnitPrice: item.estimatedUnitPrice ? parseFloat(item.estimatedUnitPrice as any) : 0,
        estimatedTotal: item.estimatedTotal ? parseFloat(item.estimatedTotal as any) : 0,
      }));
      
      // Convert requisition decimals too
      const convertedRequisition = {
        ...requisition,
        estimatedTotal: requisition.estimatedTotal ? parseFloat(requisition.estimatedTotal as any) : 0,
      };
      
      res.json({ ...convertedRequisition, items: convertedItems });
    } catch (error) {
      console.error("Error fetching requisition:", error);
      res.status(500).json({ error: "Failed to fetch requisition" });
    }
  });

  // Get requisition approval history
  app.get("/api/procurement/requisitions/:id/history", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getApprovalHistory(id);
      
      // Add approver names (in production, this would join with users table)
      const historyWithNames = history.map((h: any) => ({
        ...h,
        approverName: h.approverId === 9 ? "Adam Green (Director)" : `User ${h.approverId}`,
        // Convert field names for frontend compatibility
        action_at: h.actionAt,
        approval_level: h.approvalLevel,
        approver_id: h.approverId
      }));
      
      res.json(historyWithNames);
    } catch (error) {
      console.error("Error fetching approval history:", error);
      res.status(500).json({ error: "Failed to fetch approval history" });
    }
  });

  // Create new requisition
  app.post("/api/procurement/requisitions", async (req, res) => {
    try {
      // Try to get authenticated user, use default if not available
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        console.log("Authentication failed, using default user for requisition");
        // Use a default user ID (9 - Adam Green based on your session)
        user = { id: 9, name: "Adam Green" };
      }
      
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const { items, ...requisitionData } = req.body;
      
      // Generate requisition number
      const requisitionNumber = await storage.generateRequisitionNumber();
      
      // Convert date strings to Date objects if present
      if (requisitionData.requiredByDate) {
        requisitionData.requiredByDate = new Date(requisitionData.requiredByDate);
      }
      
      // Determine approval levels needed based on amount
      const amount = requisitionData.estimatedTotal || 0;
      let maxApprovalLevel = 1;
      
      // Determine the correct approval level based on amount thresholds
      if (amount <= 1000) {
        maxApprovalLevel = 1; // Supervisor
      } else if (amount <= 5000) {
        maxApprovalLevel = 2; // Manager
      } else if (amount <= 20000) {
        maxApprovalLevel = 3; // Director
      } else {
        maxApprovalLevel = 4; // CEO
      }
      
      // Create requisition
      const requisition = await storage.createRequisition({
        ...requisitionData,
        requisitionNumber,
        requestedBy: user.id,
        status: 'pending_approval',
        maxApprovalLevel,
        currentApprovalLevel: 0,
      });
      
      // Create items
      if (items && items.length > 0) {
        for (const item of items) {
          // Convert item date strings to Date objects if present
          if (item.requiredByDate) {
            item.requiredByDate = new Date(item.requiredByDate);
          }
          await storage.createRequisitionItem({
            ...item,
            requisitionId: requisition.id,
          });
        }
      }
      
      res.status(201).json(requisition);
    } catch (error) {
      console.error("Error creating requisition:", error);
      res.status(500).json({ error: "Failed to create requisition" });
    }
  });

  // Update requisition
  app.patch("/api/procurement/requisitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateRequisition(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating requisition:", error);
      res.status(500).json({ error: "Failed to update requisition" });
    }
  });

  // Cancel approval (send back to pending_approval)
  app.post("/api/procurement/requisitions/:id/cancel-approval", async (req, res) => {
    try {
      const requisitionId = parseInt(req.params.id);
      const requisition = await storage.getRequisition(requisitionId);
      
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      if (requisition.status !== 'approved') {
        return res.status(400).json({ error: "Can only cancel approved requisitions" });
      }
      
      // Reset to pending_approval and reset approval level
      const updated = await storage.updateRequisition(requisitionId, {
        status: 'pending_approval',
        currentApprovalLevel: 0,
        approvalNotes: 'Sent back to approvals from Purchase Orders section',
        updatedAt: new Date()
      });
      
      res.json({ success: true, message: "Requisition sent back to approvals", requisition: updated });
    } catch (error) {
      console.error("Error cancelling approval:", error);
      res.status(500).json({ error: "Failed to cancel approval" });
    }
  });

  // Approve requisition
  app.post("/api/procurement/requisitions/:id/approve", async (req, res) => {
    try {
      // For testing, use default user
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const id = parseInt(req.params.id);
      const { comments, supplierId } = req.body;
      
      console.log(`Approving requisition ${id} with supplierId: ${supplierId}, comments: ${comments}`);
      
      // If a supplier is provided, update the requisition with the supplier
      if (supplierId) {
        try {
          console.log(`Updating requisition ${id} with supplier ${supplierId}`);
          await storage.updateRequisition(id, { preferredSupplierId: supplierId });
          console.log(`Successfully updated requisition with supplier`);
        } catch (updateError: any) {
          console.error("Error updating requisition with supplier:", updateError);
          return res.status(500).json({ 
            error: `Failed to update supplier: ${updateError.message}` 
          });
        }
      }
      
      await storage.approveRequisition(id, user.id, comments);
      res.json({ success: true, message: "Requisition approved" });
    } catch (error: any) {
      console.error("Error approving requisition:", error);
      res.status(500).json({ 
        error: error.message || "Failed to approve requisition" 
      });
    }
  });

  // Reject requisition
  app.post("/api/procurement/requisitions/:id/reject", async (req, res) => {
    try {
      // For testing, use default user
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const id = parseInt(req.params.id);
      const { comments } = req.body;
      
      if (!comments) {
        return res.status(400).json({ error: "Comments required for rejection" });
      }
      
      await storage.rejectRequisition(id, user.id, comments);
      res.json({ success: true, message: "Requisition rejected" });
    } catch (error) {
      console.error("Error rejecting requisition:", error);
      res.status(500).json({ error: "Failed to reject requisition" });
    }
  });

  // Archive requisition
  app.post("/api/procurement/requisitions/:id/archive", async (req, res) => {
    try {
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const id = parseInt(req.params.id);
      await storage.archiveRequisition(id, user.id);
      res.json({ success: true, message: "Requisition archived" });
    } catch (error) {
      console.error("Error archiving requisition:", error);
      res.status(500).json({ error: "Failed to archive requisition" });
    }
  });

  // Unarchive requisition
  app.post("/api/procurement/requisitions/:id/unarchive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.unarchiveRequisition(id);
      res.json({ success: true, message: "Requisition unarchived" });
    } catch (error) {
      console.error("Error unarchiving requisition:", error);
      res.status(500).json({ error: "Failed to unarchive requisition" });
    }
  });

  // Resubmit rejected requisition (clone and edit)
  app.post("/api/procurement/requisitions/:id/resubmit", async (req, res) => {
    try {
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const id = parseInt(req.params.id);
      const { updates } = req.body; // Optional updates to apply before resubmitting
      
      // Get original requisition
      const originalReq = await storage.getRequisition(id);
      if (!originalReq) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      // Only allow resubmitting rejected requisitions
      if (originalReq.status !== 'rejected') {
        return res.status(400).json({ error: "Can only resubmit rejected requisitions" });
      }
      
      // Generate new requisition number
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const newReqNumber = `REQ-${timestamp}-${random}`;
      
      // Create new requisition based on original with updates
      const newRequisition = {
        requisitionNumber: newReqNumber,
        department: updates?.department || originalReq.department,
        category: updates?.category || originalReq.category,
        priority: updates?.priority || originalReq.priority,
        justification: updates?.justification || originalReq.justification,
        estimatedTotal: updates?.estimatedTotal || originalReq.estimatedTotal,
        requiredByDate: updates?.requiredByDate || originalReq.requiredByDate,
        preferredSupplier: updates?.preferredSupplier || originalReq.preferredSupplier,
        shipToAddress: updates?.shipToAddress || originalReq.shipToAddress,
        items: updates?.items || originalReq.items || [],
        status: 'pending_approval' as const,
        currentApprovalLevel: 0,
        maxApprovalLevel: originalReq.maxApprovalLevel,
        requestedBy: user.id,
        requestedByName: user.name,
        isArchived: false,
        originalRequisitionId: originalReq.id, // Link to original for reference
      };
      
      // Create the new requisition
      const created = await storage.createRequisition(newRequisition);
      
      // Add initial history entry
      await storage.createApprovalHistory({
        requisitionId: created.id,
        approverId: user.id,
        approvalLevel: 0,
        action: 'resubmitted',
        comments: `Resubmitted from rejected requisition ${originalReq.requisitionNumber}`,
        actionAt: new Date()
      });
      
      res.json({ 
        success: true, 
        requisition: created,
        message: "Requisition resubmitted successfully" 
      });
    } catch (error: any) {
      console.error('Resubmit requisition error:', error);
      res.status(500).json({ error: error.message || "Failed to resubmit requisition" });
    }
  });

  // Get pending approvals for user
  app.get("/api/procurement/approvals/pending", async (req, res) => {
    try {
      // For testing, use default user to get pending approvals
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        // Use default user for testing
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }
      
      if (!user) {
        return res.json([]);
      }

      const pending = await storage.getPendingApprovals(user.id);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  });

  // Get approval rules
  app.get("/api/procurement/approval-rules", async (req, res) => {
    try {
      const rules = await storage.getApprovalRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching approval rules:", error);
      res.status(500).json({ error: "Failed to fetch approval rules" });
    }
  });

  // Update approval rule (CEO/Director only)
  app.patch("/api/procurement/approval-rules/:id", async (req, res) => {
    try {
      const user = await AuthService.getAuthenticatedUser(req);
      if (!user || !['ceo', 'director', 'admin', 'full'].includes(user.role)) {
        return res.status(403).json({ error: "Only CEO/Director can modify approval rules" });
      }

      const id = parseInt(req.params.id);
      const updated = await storage.updateApprovalRule(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating approval rule:", error);
      res.status(500).json({ error: "Failed to update approval rule" });
    }
  });

  // Get procurement metrics
  app.get("/api/procurement/metrics", async (req, res) => {
    try {
      // Get various metrics for the dashboard
      const pendingRequisitions = await storage.getRequisitions({ status: 'pending_approval' });
      const approvedRequisitions = await storage.getRequisitions({ status: 'approved' });
      const purchaseOrders = await storage.getPurchaseOrders();
      
      // Calculate monthly spend (simplified for now)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const activePOs = purchaseOrders.filter(po => 
        ['sent', 'acknowledged', 'partial'].includes(po.status)
      );
      
      const metrics = {
        pendingApprovals: pendingRequisitions.length,
        activePOs: activePOs.length,
        monthlySpend: 0, // Will be calculated from actual POs
        savingsThisMonth: 0, // Will be calculated from RFQ savings
        pendingRequisitions: pendingRequisitions.length,
        awaitingDelivery: 0, // Will be implemented with GRN functionality
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching procurement metrics:", error);
      res.status(500).json({ error: "Failed to fetch procurement metrics" });
    }
  });

  // Get requisition categories
  app.get("/api/procurement/categories", async (req, res) => {
    try {
      // For now, return static categories. Later this can be dynamic
      const categories = [
        { value: 'materials', label: 'Materials' },
        { value: 'services', label: 'Services' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'supplies', label: 'Office Supplies' },
        { value: 'vehicles', label: 'Vehicles' },
      ];
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // ============================================
  // PURCHASE ORDERS ROUTES
  // ============================================
  
  // Get all purchase orders
  app.get("/api/procurement/purchase-orders", async (req, res) => {
    try {
      const { status, supplierId, jobId } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (supplierId) filters.supplierId = parseInt(supplierId as string);
      if (jobId) filters.jobId = parseInt(jobId as string);
      
      const purchaseOrders = await storage.getPurchaseOrders(filters);
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  // Get single purchase order
  app.get("/api/procurement/purchase-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const purchaseOrder = await storage.getPurchaseOrder(id);
      
      if (!purchaseOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      res.json(purchaseOrder);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  // Get purchase order items
  app.get("/api/procurement/purchase-orders/:id/items", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const items = await storage.getPurchaseOrderItems(id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
      res.status(500).json({ error: "Failed to fetch purchase order items" });
    }
  });

  // Convert approved requisition to Purchase Order
  app.post("/api/procurement/requisitions/:id/convert-to-po", async (req, res) => {
    try {
      // Get user
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const requisitionId = parseInt(req.params.id);
      const { supplierId } = req.body;
      
      if (!supplierId) {
        return res.status(400).json({ error: "Supplier ID is required" });
      }
      
      // Get requisition to verify it's approved
      const requisition = await storage.getRequisition(requisitionId);
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      if (requisition.status !== 'approved') {
        return res.status(400).json({ error: "Only approved requisitions can be converted to PO" });
      }
      
      // Convert to PO
      const purchaseOrder = await storage.convertRequisitionToPO(requisitionId, supplierId, user.id);
      
      res.json({
        success: true,
        purchaseOrder,
        message: "Requisition successfully converted to Purchase Order"
      });
    } catch (error: any) {
      console.error("Error converting requisition to PO:", error);
      res.status(500).json({ error: error.message || "Failed to convert requisition to PO" });
    }
  });

  // Create new purchase order
  app.post("/api/procurement/purchase-orders", async (req, res) => {
    try {
      // Get user
      let user;
      try {
        user = await AuthService.getAuthenticatedUser(req);
      } catch (authError) {
        user = { id: 9, name: "Adam Green" };
      }
      if (!user) {
        user = { id: 9, name: "Adam Green" };
      }

      const { items, ...orderData } = req.body;
      
      // Generate PO number
      const poNumber = await storage.generatePONumber();
      
      // Create the purchase order
      const purchaseOrder = await storage.createPurchaseOrder({
        ...orderData,
        poNumber,
        createdBy: user.id,
        status: 'draft',
      });
      
      // Create items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createPurchaseOrderItem({
            ...item,
            purchaseOrderId: purchaseOrder.id,
          });
        }
      }
      
      res.json(purchaseOrder);
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ error: error.message || "Failed to create purchase order" });
    }
  });

  // Update purchase order
  app.patch("/api/procurement/purchase-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updatePurchaseOrder(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ error: "Failed to update purchase order" });
    }
  });

  // Update purchase order status
  app.patch("/api/procurement/purchase-orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const updated = await storage.updatePurchaseOrder(id, { status });
      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase order status:", error);
      res.status(500).json({ error: "Failed to update purchase order status" });
    }
  });

  // Add purchase order item
  app.post("/api/procurement/purchase-orders/:id/items", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const item = await storage.createPurchaseOrderItem({
        ...req.body,
        purchaseOrderId,
      });
      res.json(item);
    } catch (error) {
      console.error("Error adding purchase order item:", error);
      res.status(500).json({ error: "Failed to add purchase order item" });
    }
  });

  // Update purchase order item
  app.patch("/api/procurement/purchase-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updatePurchaseOrderItem(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase order item:", error);
      res.status(500).json({ error: "Failed to update purchase order item" });
    }
  });

  // Delete purchase order item
  app.delete("/api/procurement/purchase-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePurchaseOrderItem(id);
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase order item:", error);
      res.status(500).json({ error: "Failed to delete purchase order item" });
    }
  });

  // PO Distribution Endpoints

  // Send purchase order to supplier
  app.post("/api/procurement/purchase-orders/:id/send", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const {
        supplierId,
        to,
        cc,
        bcc,
        subject,
        body,
        templateId,
        deliveryMethod,
        formats,
        requireSignature,
      } = req.body;

      // Get user
      const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
      const user = await AuthService.validateSession(token);
      const userId = user?.id;

      // Update supplier if provided
      if (supplierId) {
        await storage.updatePurchaseOrder(purchaseOrderId, { supplierId });
      }

      // Get PO details
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId);
      if (!purchaseOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Get supplier details
      const supplier = await storage.getSupplier(purchaseOrder.supplierId);
      if (!supplier) {
        return res.status(400).json({ error: "Supplier not found" });
      }

      // Get PO items
      const items = await storage.getPurchaseOrderItems(purchaseOrderId);
      
      // Prepare PO data with items
      const poData = {
        ...purchaseOrder,
        items: items || []
      };

      // Determine template type
      const templateType = templateId === 'DTL' ? 'detailed' : 
                          templateId === 'SMP' ? 'simple' : 'standard';

      // Send the actual email with PDF attachment
      const emailResult = await emailService.sendPurchaseOrder({
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        subject: subject || `Purchase Order ${purchaseOrder.poNumber}`,
        body: body || `Please find attached Purchase Order ${purchaseOrder.poNumber} for your review and processing.`,
        poData,
        supplierData: supplier,
        templateType
      });

      if (!emailResult.success) {
        console.error('Email send failed:', emailResult.error);
        return res.status(500).json({ 
          error: "Failed to send email", 
          details: emailResult.error 
        });
      }

      // Create distribution record for tracking
      const distribution = {
        id: Date.now(),
        purchaseOrderId,
        templateId,
        sentAt: new Date(),
        sentBy: userId,
        sentTo: to,
        ccEmails: cc,
        bccEmails: bcc,
        deliveryMethod: 'email',
        emailSubject: subject,
        emailBody: body,
        emailStatus: 'sent',
        messageId: emailResult.messageId,
        requiresSignature: requireSignature,
      };

      // Update PO status to sent
      await storage.updatePurchaseOrder(purchaseOrderId, { status: 'sent' });

      res.json({ 
        success: true, 
        distribution,
        message: "Purchase order sent successfully via email" 
      });
    } catch (error) {
      console.error("Error sending purchase order:", error);
      res.status(500).json({ error: "Failed to send purchase order" });
    }
  });

  // Preview purchase order with template
  app.get("/api/procurement/purchase-orders/:id/preview", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const templateId = req.query.template as string;

      // Get PO details
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId);
      if (!purchaseOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // For now, return a mock PDF URL
      const previewUrl = `/api/procurement/purchase-orders/${purchaseOrderId}/pdf?template=${templateId}`;
      res.redirect(previewUrl);
    } catch (error) {
      console.error("Error previewing purchase order:", error);
      res.status(500).json({ error: "Failed to preview purchase order" });
    }
  });

  // Generate PDF for purchase order
  app.get("/api/procurement/purchase-orders/:id/pdf", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const templateId = req.query.template as string || 'default';

      // Get PO details
      const purchaseOrder = await storage.getPurchaseOrder(purchaseOrderId);
      if (!purchaseOrder) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Get PO items
      const items = await storage.getPurchaseOrderItems(purchaseOrderId);

      // Get supplier
      const supplier = await storage.getSupplier(purchaseOrder.supplierId);
      
      // Get template configuration
      const template = await storage.getPOTemplate(templateId);

      // Generate HTML content based on template
      let html = '';
      
      // Different layouts based on template
      if (templateId === 'detailed' || template?.templateCode === 'DTL') {
        // Detailed template with more information
        html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { border-bottom: 2px solid ${template?.primaryColor || '#059669'}; padding-bottom: 20px; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: ${template?.primaryColor || '#059669'}; }
            .po-number { font-size: 18px; color: #666; margin-top: 10px; }
            .supplier-info { background: #f0fdf4; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #86efac; }
            .delivery-info { background: #f0f9ff; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #bae6fd; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: ${template?.primaryColor || '#059669'}; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #ddd; }
            .item-code { color: #666; font-size: 12px; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { font-size: 18px; font-weight: bold; margin-top: 10px; color: ${template?.primaryColor || '#059669'}; }
            .terms { background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 40px; }
          </style>
        </head>
        <body>`;
      } else if (templateId === 'simple' || template?.templateCode === 'SMP') {
        // Simple template - minimal information
        html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { margin-bottom: 20px; }
            .company { font-size: 20px; font-weight: bold; }
            .po-number { font-size: 16px; color: #666; margin-top: 5px; }
            .supplier-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f3f4f6; padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; }
            td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
            .totals { text-align: right; margin-top: 10px; }
            .total-row { font-weight: bold; }
          </style>
        </head>
        <body>`;
      } else {
        // Standard template (default)
        html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { border-bottom: 2px solid ${template?.primaryColor || '#1e3a8a'}; padding-bottom: 20px; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; color: ${template?.primaryColor || '#1e3a8a'}; }
            .po-number { font-size: 18px; color: #666; margin-top: 10px; }
            .supplier-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: ${template?.primaryColor || '#1e3a8a'}; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { font-size: 18px; font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>`;
      }
      
      // Continue with common HTML structure
      html += `
          <div class="header">
            <div class="company">Lateral Engineering Limited</div>
            <div class="po-number">Purchase Order: ${purchaseOrder.poNumber}</div>
            <div>Date: ${new Date(purchaseOrder.orderDate).toLocaleDateString()}</div>
          </div>
          
          <div class="supplier-info">
            <h3>Supplier Details</h3>
            <div><strong>${supplier?.name || 'N/A'}</strong></div>
            <div>${supplier?.address || ''}</div>
            <div>${supplier?.email || ''}</div>
            <div>${supplier?.phone || ''}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                ${(templateId === 'detailed' || template?.showItemCodes) ? '<th>Code</th>' : ''}
                <th>Description</th>
                <th>Quantity</th>
                ${(templateId !== 'simple' && template?.showPrices !== false) ? '<th>Unit Price</th>' : ''}
                ${(templateId !== 'simple' && template?.showPrices !== false) ? '<th>Total</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, index: number) => {
                if (templateId === 'detailed' || template?.showItemCodes) {
                  return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemCode || '-'}</td>
                  <td>${item.description}${item.specifications ? '<br><small>' + item.specifications + '</small>' : ''}</td>
                  <td>${item.quantity} ${item.unitOfMeasure || ''}</td>
                  <td>$${(Number(item.unitPrice) || 0).toFixed(2)}</td>
                  <td>$${(Number(item.totalPrice) || 0).toFixed(2)}</td>
                </tr>`;
                } else if (templateId === 'simple') {
                  return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity} ${item.unitOfMeasure || ''}</td>
                </tr>`;
                } else {
                  return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity} ${item.unitOfMeasure || ''}</td>
                  <td>$${(Number(item.unitPrice) || 0).toFixed(2)}</td>
                  <td>$${(Number(item.totalPrice) || 0).toFixed(2)}</td>
                </tr>`;
                }
              }).join('')}
            </tbody>
          </table>
          
          ${templateId !== 'simple' ? `
          <div class="totals">
            <div>Subtotal: $${(Number(purchaseOrder.subtotal) || 0).toFixed(2)}</div>
            ${template?.showGst !== false ? `<div>GST (15%): $${(Number(purchaseOrder.gstAmount) || 0).toFixed(2)}</div>` : ''}
            <div class="total-row">Total: $${(Number(purchaseOrder.totalAmount) || 0).toFixed(2)} ${purchaseOrder.currency || 'NZD'}</div>
          </div>` : ''}
          
          ${purchaseOrder.specialInstructions ? `
            <div style="margin-top: 40px;">
              <h3>Special Instructions</h3>
              <p>${purchaseOrder.specialInstructions}</p>
            </div>
          ` : ''}
          
          ${templateId === 'detailed' ? `
            <div class="terms">
              <h3>Terms & Conditions</h3>
              <p>${template?.termsAndConditions || 'Standard terms and conditions apply. Payment terms: Net 30 days. Delivery subject to availability.'}</p>
            </div>
            
            ${template?.showDeliveryDate !== false && purchaseOrder.requestedDeliveryDate ? `
              <div class="delivery-info">
                <h3>Delivery Information</h3>
                <p><strong>Requested Delivery:</strong> ${new Date(purchaseOrder.requestedDeliveryDate).toLocaleDateString()}</p>
                <p><strong>Delivery Address:</strong> ${purchaseOrder.deliveryAddress || 'Main Warehouse'}</p>
              </div>
            ` : ''}
          ` : ''}
        </body>
        </html>
      `;

      // Send HTML as response (browser will render as PDF preview)
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // PO Templates Management
  app.get("/api/procurement/po-templates", async (req, res) => {
    try {
      const templates = await storage.getPOTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching PO templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/procurement/po-templates", async (req, res) => {
    try {
      const template = await storage.createPOTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating PO template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/procurement/po-templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.updatePOTemplate(templateId, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating PO template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/procurement/po-templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      await storage.deletePOTemplate(templateId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PO template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Get PO distribution history
  app.get("/api/procurement/purchase-orders/:id/distribution", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      
      // Mock distribution history for now
      const distributions = [
        {
          id: 1,
          purchaseOrderId,
          sentAt: new Date(),
          sentTo: ["supplier@example.com"],
          deliveryMethod: "email",
          emailStatus: "delivered",
          acknowledgedAt: null,
        }
      ];
      
      res.json(distributions);
    } catch (error) {
      console.error("Error fetching distribution history:", error);
      res.status(500).json({ error: "Failed to fetch distribution history" });
    }
  });

  // Mark PO as acknowledged
  app.post("/api/procurement/purchase-orders/:id/acknowledge", async (req, res) => {
    try {
      const purchaseOrderId = parseInt(req.params.id);
      const { acknowledgedBy, acknowledgmentNotes } = req.body;
      
      // Update PO status
      await storage.updatePurchaseOrder(purchaseOrderId, { status: 'acknowledged' });
      
      // Mock acknowledgment record
      const acknowledgment = {
        id: Date.now(),
        purchaseOrderId,
        acknowledgedAt: new Date(),
        acknowledgedBy,
        acknowledgmentMethod: 'portal',
        acknowledgmentNotes,
      };
      
      res.json({ 
        success: true, 
        acknowledgment,
        message: "Purchase order acknowledged" 
      });
    } catch (error) {
      console.error("Error acknowledging purchase order:", error);
      res.status(500).json({ error: "Failed to acknowledge purchase order" });
    }
  });

  // Time Tracking Integration - Apply Profile Rates
  app.post("/api/time-clocks/:id/calculate-cost", async (req, res) => {
    try {
      const entryId = Number(req.params.id);
      const { profileId } = req.body;
      
      // Get time clock details
      const entryResult = await db.execute(sql`
        SELECT 
          tc.*,
          tm.role_id,
          tm.skill_level_id,
          EXTRACT(EPOCH FROM (tc.clock_out_time - tc.clock_in_time))/3600 as hours_worked
        FROM time_clocks tc
        JOIN team_members tm ON tm.id = tc.employee_id
        WHERE tc.id = ${entryId}
      `);
      const entry = entryResult.rows[0];
      
      if (!entry) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      
      // Get rate from profile
      const rateResult = await db.execute(sql`
        SELECT 
          rr.base_rate,
          sl.multiplier as skill_multiplier,
          lrp.overtime_multiplier
        FROM role_rates rr
        JOIN labor_rate_profiles lrp ON lrp.id = rr.profile_id
        LEFT JOIN skill_levels sl ON sl.id = ${entry.skill_level_id}
        WHERE rr.role_id = ${entry.role_id}
          AND rr.profile_id = ${profileId || 1}
          AND rr.is_active = true
        LIMIT 1
      `);
      const rate = rateResult.rows[0];
      
      if (!rate) {
        return res.status(404).json({ error: "No rate found for this role/profile" });
      }
      
      // Calculate costs
      const baseRate = rate.base_rate * (rate.skill_multiplier || 1.0);
      const regularCost = entry.hours_worked * baseRate;
      const overtimeCost = entry.overtime_hours * baseRate * rate.overtime_multiplier;
      const doubleTimeCost = entry.double_time_hours * baseRate * 2.0;
      const totalCost = regularCost + overtimeCost + doubleTimeCost;
      
      // Update time clock with calculated cost
      await db.execute(sql`
        UPDATE time_clocks
        SET 
          hourly_rate = ${baseRate},
          total_cost = ${totalCost},
          labor_profile_id = ${profileId || 1}
        WHERE id = ${entryId}
      `);
      
      res.json({
        entryId,
        baseRate,
        regularHours: entry.hours_worked,
        overtimeHours: entry.overtime_hours,
        doubleTimeHours: entry.double_time_hours,
        regularCost,
        overtimeCost,
        doubleTimeCost,
        totalCost,
        profileId: profileId || 1
      });
    } catch (error) {
      console.error("Error calculating time entry cost:", error);
      res.status(500).json({ error: "Failed to calculate time entry cost" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
