import { Router } from "express";
import { db } from "../db";
import { estimationLabor, insertEstimationLaborSchema, type InsertEstimationLabor } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateIntegerRange, POSTGRES_MAX_INT } from "../utils/validation";

const router = Router();

// Get all labor items for a project
router.get("/projects/:projectId/labor", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    const laborItems = await db.select()
      .from(estimationLabor)
      .where(eq(estimationLabor.projectId, projectId));
    
    res.json(laborItems);
  } catch (error) {
    console.error("Error fetching labor items:", error);
    res.status(500).json({ error: "Failed to fetch labor items" });
  }
});

// Create a new labor item
router.post("/projects/:projectId/labor", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    // Remove any mock ID from client
    const { id, ...laborData } = req.body;
    
    // Validate using the schema
    const validatedData = insertEstimationLaborSchema.parse({
      ...laborData,
      projectId
    });
    
    const [newLabor] = await db.insert(estimationLabor)
      .values(validatedData)
      .returning();
    
    res.json(newLabor);
  } catch (error: any) {
    console.error("Error creating labor item:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create labor item" });
  }
});

// Update a labor item
router.patch("/labor/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    // Remove ID from update data
    const { id: _, ...updateData } = req.body;
    
    const [updatedLabor] = await db.update(estimationLabor)
      .set(updateData)
      .where(eq(estimationLabor.id, id))
      .returning();
    
    if (!updatedLabor) {
      return res.status(404).json({ error: "Labor item not found" });
    }
    
    res.json(updatedLabor);
  } catch (error) {
    console.error("Error updating labor item:", error);
    res.status(500).json({ error: "Failed to update labor item" });
  }
});

// Delete a labor item
router.delete("/labor/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    const [deletedLabor] = await db.delete(estimationLabor)
      .where(eq(estimationLabor.id, id))
      .returning();
    
    if (!deletedLabor) {
      return res.status(404).json({ error: "Labor item not found" });
    }
    
    res.json({ success: true, deleted: deletedLabor });
  } catch (error) {
    console.error("Error deleting labor item:", error);
    res.status(500).json({ error: "Failed to delete labor item" });
  }
});

export { router as estimationLaborRouter };