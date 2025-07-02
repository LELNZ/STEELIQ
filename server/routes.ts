import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { businessSettingsStorage } from "./businessSettings";
import { laborRatesStorage } from "./laborRates";
import { teamStorage, DEFAULT_SYSTEM_ROLES } from "./team";
import { timeManagementStorage } from "./timeManagement";
import { quotationManagementStorage } from "./quotationManagement";
import { insertJobSchema, insertMaterialSchema, insertInventorySchema, insertJobMaterialSchema, insertOptimizationSimulationSchema, insertSupplierSchema, insertMaterialSupplierSchema, insertSupplierPriceHistorySchema, insertUserSchema, insertClientSchema, insertSupplierContactSchema, insertClientContactSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from 'bcrypt';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { analyzeConstructionDrawing, validateSteelSpecifications } from "./pdf-analysis";

export async function registerRoutes(app: Express): Promise<Server> {
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
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      const materialData = insertMaterialSchema.parse(req.body);
      console.log('Parsed material data:', JSON.stringify(materialData, null, 2));
      
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

  // User authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

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

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
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
      const coatingSystems = await storage.getCoatingSystems();
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

  const httpServer = createServer(app);
  return httpServer;
}
