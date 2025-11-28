import { Router } from "express";
import { db } from "../db";
import { eq, and, asc } from "drizzle-orm";
import { estimationMaterials, insertEstimationMaterialSchema } from "@shared/schema";

const router = Router();

// Get all materials for a project
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (!projectId) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const materials = await db.select()
      .from(estimationMaterials)
      .where(eq(estimationMaterials.projectId, projectId))
      .orderBy(asc(estimationMaterials.designation));

    res.json(materials);
  } catch (error) {
    console.error("Error fetching estimation materials:", error);
    res.status(500).json({ error: "Failed to fetch estimation materials" });
  }
});

// Create a new material
router.post("/", async (req, res) => {
  try {
    // Validate IDs don't exceed PostgreSQL integer limits
    const projectId = parseInt(req.body.projectId);
    if (projectId > 2147483647 || projectId < -2147483647) {
      return res.status(400).json({ 
        error: "Invalid projectId: exceeds PostgreSQL integer limit",
        maximum: 2147483647 
      });
    }

    let materialId = null;
    if (req.body.materialId) {
      materialId = parseInt(req.body.materialId);
      if (isNaN(materialId) || materialId > 2147483647 || materialId < -2147483647) {
        return res.status(400).json({ 
          error: `Invalid materialId: ${req.body.materialId} exceeds PostgreSQL integer limit or is not a valid number`,
          received: req.body.materialId,
          maximum: 2147483647,
          hint: "This often happens when using Date.now() or timestamp values instead of database IDs"
        });
      }
    }

    const materialData = {
      projectId: projectId,
      materialId: materialId,
      materialCode: req.body.materialCode || "",
      materialName: req.body.materialName || "",
      designation: req.body.designation || "",
      quantity: req.body.quantity?.toString() || "1",
      lengthUnit: req.body.unit || "m",
      unitCost: req.body.unitCost?.toString() || "0",
      totalCost: req.body.totalCost?.toString() || "0",
      wasteFactor: req.body.wasteFactor?.toString() || "0",
      handlingTime: req.body.handlingTime?.toString() || "0",
      handlingCost: req.body.handlingCost?.toString() || "0",
      supplier: req.body.supplier || null,
      leadTime: req.body.leadTime || null,
      notes: req.body.notes || null,
      weight: req.body.weight?.toString() || null,
      weightPerMeter: req.body.weightPerMeter?.toString() || null,
      length: req.body.length?.toString() || "6.0",
      totalLength: req.body.totalLength?.toString() || null,
      width: req.body.width?.toString() || null,
      height: req.body.height?.toString() || null,
      thickness: req.body.thickness?.toString() || null,
      surfaceArea: req.body.surfaceArea?.toString() || null,
      surfaceAreaExposed: req.body.surfaceAreaExposed?.toString() || null,
      surfaceAreaConfig: req.body.surfaceAreaConfig || null
    };

    // Remove undefined/null string values
    Object.keys(materialData).forEach(key => {
      if (materialData[key] === undefined || materialData[key] === "undefined" || materialData[key] === "") {
        materialData[key] = null;
      }
    });

    const [newMaterial] = await db.insert(estimationMaterials)
      .values(materialData)
      .returning();

    res.json(newMaterial);
  } catch (error) {
    console.error("Error creating estimation material:", error);
    res.status(500).json({ error: "Failed to create estimation material", details: error });
  }
});

// Update a material
router.patch("/:id", async (req, res) => {
  try {
    const materialId = parseInt(req.params.id);
    
    if (!materialId) {
      return res.status(400).json({ error: "Invalid material ID" });
    }

    // Prepare update data, converting numbers to strings where needed and using camelCase
    const updateData: any = {};
    
    if (req.body.materialCode !== undefined) updateData.materialCode = req.body.materialCode;
    if (req.body.materialName !== undefined) updateData.materialName = req.body.materialName;
    if (req.body.designation !== undefined) updateData.designation = req.body.designation;
    if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity.toString();
    if (req.body.unit !== undefined) updateData.lengthUnit = req.body.unit;
    if (req.body.unitCost !== undefined) updateData.unitCost = req.body.unitCost.toString();
    if (req.body.totalCost !== undefined) updateData.totalCost = req.body.totalCost.toString();
    if (req.body.wasteFactor !== undefined) updateData.wasteFactor = req.body.wasteFactor.toString();
    if (req.body.handlingTime !== undefined) updateData.handlingTime = req.body.handlingTime?.toString();
    if (req.body.handlingCost !== undefined) updateData.handlingCost = req.body.handlingCost.toString();
    if (req.body.supplier !== undefined) updateData.supplier = req.body.supplier;
    if (req.body.leadTime !== undefined) updateData.leadTime = req.body.leadTime;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.weight !== undefined) updateData.weight = req.body.weight?.toString();
    if (req.body.weightPerMeter !== undefined) updateData.weightPerMeter = req.body.weightPerMeter?.toString();
    if (req.body.length !== undefined) updateData.length = req.body.length?.toString();
    if (req.body.totalLength !== undefined) updateData.totalLength = req.body.totalLength?.toString();
    if (req.body.width !== undefined) updateData.width = req.body.width?.toString();
    if (req.body.height !== undefined) updateData.height = req.body.height?.toString();
    if (req.body.thickness !== undefined) updateData.thickness = req.body.thickness?.toString();
    if (req.body.surfaceArea !== undefined) updateData.surfaceArea = req.body.surfaceArea?.toString();
    if (req.body.surfaceAreaExposed !== undefined) updateData.surfaceAreaExposed = req.body.surfaceAreaExposed?.toString();
    if (req.body.surfaceAreaConfig !== undefined) updateData.surfaceAreaConfig = req.body.surfaceAreaConfig;

    const [updatedMaterial] = await db.update(estimationMaterials)
      .set(updateData)
      .where(eq(estimationMaterials.id, materialId))
      .returning();

    if (!updatedMaterial) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(updatedMaterial);
  } catch (error) {
    console.error("Error updating estimation material:", error);
    res.status(500).json({ error: "Failed to update estimation material" });
  }
});

// Delete a material
router.delete("/:id", async (req, res) => {
  try {
    const materialId = parseInt(req.params.id);
    
    if (!materialId) {
      return res.status(400).json({ error: "Invalid material ID" });
    }

    await db.delete(estimationMaterials)
      .where(eq(estimationMaterials.id, materialId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting estimation material:", error);
    res.status(500).json({ error: "Failed to delete estimation material" });
  }
});

// Get material by designation
router.get("/by-designation/:projectId/:designation", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { designation } = req.params;
    
    if (!projectId || !designation) {
      return res.status(400).json({ error: "Invalid project ID or designation" });
    }

    const [material] = await db.select()
      .from(estimationMaterials)
      .where(and(
        eq(estimationMaterials.projectId, projectId),
        eq(estimationMaterials.designation, designation)
      ));

    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    res.json(material);
  } catch (error) {
    console.error("Error fetching material by designation:", error);
    res.status(500).json({ error: "Failed to fetch material" });
  }
});

export default router;