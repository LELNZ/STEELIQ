import { Router } from "express";
import { db } from "../db";
import { estimationEquipment, insertEstimationEquipmentSchema, type InsertEstimationEquipment } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateIntegerRange, POSTGRES_MAX_INT } from "../utils/validation";

const router = Router();

// Get all equipment items for a project
router.get("/projects/:projectId/equipment", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    const equipmentItems = await db.select()
      .from(estimationEquipment)
      .where(eq(estimationEquipment.projectId, projectId));
    
    res.json(equipmentItems);
  } catch (error) {
    console.error("Error fetching equipment items:", error);
    res.status(500).json({ error: "Failed to fetch equipment items" });
  }
});

// Create a new equipment item
router.post("/projects/:projectId/equipment", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    // Remove any mock ID from client
    const { id, ...equipmentData } = req.body;
    
    // Validate using the schema
    const validatedData = insertEstimationEquipmentSchema.parse({
      ...equipmentData,
      projectId
    });
    
    const [newEquipment] = await db.insert(estimationEquipment)
      .values(validatedData)
      .returning();
    
    res.json(newEquipment);
  } catch (error: any) {
    console.error("Error creating equipment item:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create equipment item" });
  }
});

// Update an equipment item
router.patch("/equipment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    // Remove ID from update data
    const { id: _, ...updateData } = req.body;
    
    const [updatedEquipment] = await db.update(estimationEquipment)
      .set(updateData)
      .where(eq(estimationEquipment.id, id))
      .returning();
    
    if (!updatedEquipment) {
      return res.status(404).json({ error: "Equipment item not found" });
    }
    
    res.json(updatedEquipment);
  } catch (error) {
    console.error("Error updating equipment item:", error);
    res.status(500).json({ error: "Failed to update equipment item" });
  }
});

// Delete an equipment item
router.delete("/equipment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    const [deletedEquipment] = await db.delete(estimationEquipment)
      .where(eq(estimationEquipment.id, id))
      .returning();
    
    if (!deletedEquipment) {
      return res.status(404).json({ error: "Equipment item not found" });
    }
    
    res.json({ success: true, deleted: deletedEquipment });
  } catch (error) {
    console.error("Error deleting equipment item:", error);
    res.status(500).json({ error: "Failed to delete equipment item" });
  }
});

export { router as estimationEquipmentRouter };