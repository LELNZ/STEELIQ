import { Router } from "express";
import { db } from "../db";
import { estimationConsumables, insertEstimationConsumableSchema, type InsertEstimationConsumable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateIntegerRange, POSTGRES_MAX_INT } from "../utils/validation";

const router = Router();

// Get all consumable items for a project
router.get("/projects/:projectId/consumables", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    const consumableItems = await db.select()
      .from(estimationConsumables)
      .where(eq(estimationConsumables.projectId, projectId));
    
    res.json(consumableItems);
  } catch (error) {
    console.error("Error fetching consumable items:", error);
    res.status(500).json({ error: "Failed to fetch consumable items" });
  }
});

// Create a new consumable item
router.post("/projects/:projectId/consumables", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    // Remove any mock ID from client
    const { id, ...consumableData } = req.body;
    
    // Validate using the schema
    const validatedData = insertEstimationConsumableSchema.parse({
      ...consumableData,
      projectId
    });
    
    const [newConsumable] = await db.insert(estimationConsumables)
      .values(validatedData)
      .returning();
    
    res.json(newConsumable);
  } catch (error: any) {
    console.error("Error creating consumable item:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create consumable item" });
  }
});

// Update a consumable item
router.patch("/consumables/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    // Remove ID from update data
    const { id: _, ...updateData } = req.body;
    
    const [updatedConsumable] = await db.update(estimationConsumables)
      .set(updateData)
      .where(eq(estimationConsumables.id, id))
      .returning();
    
    if (!updatedConsumable) {
      return res.status(404).json({ error: "Consumable item not found" });
    }
    
    res.json(updatedConsumable);
  } catch (error) {
    console.error("Error updating consumable item:", error);
    res.status(500).json({ error: "Failed to update consumable item" });
  }
});

// Delete a consumable item
router.delete("/consumables/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    const [deletedConsumable] = await db.delete(estimationConsumables)
      .where(eq(estimationConsumables.id, id))
      .returning();
    
    if (!deletedConsumable) {
      return res.status(404).json({ error: "Consumable item not found" });
    }
    
    res.json({ success: true, deleted: deletedConsumable });
  } catch (error) {
    console.error("Error deleting consumable item:", error);
    res.status(500).json({ error: "Failed to delete consumable item" });
  }
});

export { router as estimationConsumablesRouter };