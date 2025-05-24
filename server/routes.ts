import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobSchema, insertMaterialSchema, insertInventorySchema, insertJobMaterialSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
            // Clean and prepare data before validation
            const cleanedData = {
              ...materialData,
              // Convert numeric strings to proper numbers or null
              width: materialData.width === '' || materialData.width === undefined ? null : String(materialData.width),
              thickness: materialData.thickness === '' || materialData.thickness === undefined ? null : String(materialData.thickness),
              diameter: materialData.diameter === '' || materialData.diameter === undefined ? null : String(materialData.diameter),
              depth: materialData.depth === '' || materialData.depth === undefined ? null : String(materialData.depth),
              flangeTf: materialData.flangeTf === '' || materialData.flangeTf === undefined ? null : String(materialData.flangeTf),
              webTw: materialData.webTw === '' || materialData.webTw === undefined ? null : String(materialData.webTw),
              weightPerMeter: materialData.weightPerMeter === '' || materialData.weightPerMeter === undefined ? null : String(materialData.weightPerMeter),
              pricePerKg: materialData.pricePerKg === '' || materialData.pricePerKg === undefined ? null : String(materialData.pricePerKg),
              pricePerMeter: materialData.pricePerMeter === '' || materialData.pricePerMeter === undefined ? null : String(materialData.pricePerMeter),
              // Ensure required fields are present
              code: materialData.code || '',
              name: materialData.name || '',
            };

            const validatedData = insertMaterialSchema.parse(cleanedData);
            const existingMaterial = await storage.getMaterialByCode(validatedData.code);
            
            if (existingMaterial) {
              await storage.updateMaterial(existingMaterial.id, validatedData);
              results.updated++;
            } else {
              await storage.createMaterial(validatedData);
              results.created++;
            }
          } catch (error: any) {
            const errorMsg = error.message || 'Unknown error';
            console.log(`Validation error for ${materialData.code}:`, error);
            results.errors.push(`${materialData.code || 'Unknown'}: ${errorMsg}`);
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

  const httpServer = createServer(app);
  return httpServer;
}
