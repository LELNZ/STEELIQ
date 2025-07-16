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
import { insertJobSchema, insertMaterialSchema, insertInventorySchema, insertJobMaterialSchema, insertOptimizationSimulationSchema, insertSupplierSchema, insertMaterialSupplierSchema, insertSupplierPriceHistorySchema, insertUserSchema, insertClientSchema, insertSupplierContactSchema, insertClientContactSchema, users, roles, departments, teamMembers, performanceReviews, qualificationReminders, settings, settingsAudit, laborRateCards, payrollIntegration, timeClocks } from "@shared/schema";
import { z } from "zod";
import bcrypt from 'bcrypt';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { analyzeConstructionDrawing, validateSteelSpecifications } from "./pdf-analysis";

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

  // Project Lifecycle Tracking API
  const { lifecycleTrackingService } = await import('./lifecycleTracking');
  
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
      const taskId = parseInt(req.params.taskId);
      const { status, notes } = req.body;
      const userId = req.user?.id || 1; // TODO: Get from auth
      
      const result = await lifecycleTrackingService.updateTaskStatus(taskId, status, userId, notes);
      res.json(result);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  });
  
  // Update phase status
  app.patch("/api/lifecycle/phases/:phaseId", async (req, res) => {
    try {
      const phaseId = parseInt(req.params.phaseId);
      const { status, blockingReason } = req.body;
      const userId = req.user?.id || 1; // TODO: Get from auth
      
      const result = await lifecycleTrackingService.updatePhaseStatus(phaseId, status, userId, blockingReason);
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
      // Query coating systems from materials table
      const coatingSystems = await storage.getMaterialsByCategories([
        'Alkyd Systems',
        'Epoxy Systems',
        'Polyurethane Systems',
        'Zinc Silicate Systems',
        'Galvanizing',
        'Intumescent',
        'Coating Systems'
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

  // AI Estimation Labor Integration
  app.post("/api/estimation/labor-integration", async (req, res) => {
    try {
      const { projectData, materials } = req.body;
      
      // Get current labor rates from database
      const teamRates = await db.select({
        role: roles.name,
        hourlyRate: teamMembers.hourlyRate,
        department: departments.name
      })
      .from(teamMembers)
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .innerJoin(departments, eq(teamMembers.departmentId, departments.id))
      .where(eq(teamMembers.isActive, true));

      // AI suggestion logic for labor categories based on materials
      const laborSuggestions = materials.map((material: any) => {
        let suggestedRole = 'Welder/Fabricator';
        let estimatedHours = 1.0;
        
        // Suggest appropriate roles based on material complexity
        if (material.category?.includes('Universal Beam') || material.category?.includes('Column')) {
          suggestedRole = 'Senior Estimator'; // Complex structural work
          estimatedHours = 3.0;
        } else if (material.category?.includes('Coating') || material.category?.includes('Paint')) {
          suggestedRole = 'Welder/Fabricator'; // Surface preparation
          estimatedHours = 0.5;
        } else if (material.category?.includes('Plate') || material.category?.includes('Sheet')) {
          suggestedRole = 'Welder/Fabricator'; // Cutting and welding
          estimatedHours = 2.0;
        }

        const roleRate = teamRates.find(r => r.role === suggestedRole);
        
        return {
          materialId: material.id,
          materialName: material.name,
          suggestedRole,
          estimatedHours,
          hourlyRate: Number(roleRate?.hourlyRate) || 75,
          totalLaborCost: estimatedHours * (Number(roleRate?.hourlyRate) || 75),
          complexity: material.category?.includes('Universal') ? 'high' : 
                     material.category?.includes('Plate') ? 'medium' : 'low'
        };
      });

      res.json({
        laborSuggestions,
        totalLaborHours: laborSuggestions.reduce((sum: number, item: any) => sum + item.estimatedHours, 0),
        totalLaborCost: laborSuggestions.reduce((sum: number, item: any) => sum + item.totalLaborCost, 0),
        teamRates: teamRates.map(rate => ({
          role: rate.role,
          department: rate.department,
          hourlyRate: Number(rate.hourlyRate)
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

  const httpServer = createServer(app);
  return httpServer;
}
