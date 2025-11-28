import { Router } from "express";
import { db } from "../db";
import { estimationSubcontractor, insertEstimationSubcontractorSchema, type InsertEstimationSubcontractor } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateIntegerRange, POSTGRES_MAX_INT } from "../utils/validation";

const router = Router();

// Get all subcontractor items for a project
router.get("/projects/:projectId/subcontractors", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    const subcontractorItems = await db.select()
      .from(estimationSubcontractor)
      .where(eq(estimationSubcontractor.projectId, projectId));
    
    res.json(subcontractorItems);
  } catch (error) {
    console.error("Error fetching subcontractor items:", error);
    res.status(500).json({ error: "Failed to fetch subcontractor items" });
  }
});

// Create a new subcontractor item
router.post("/projects/:projectId/subcontractors", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    // Remove any mock ID from client
    const { id, ...subcontractorData } = req.body;
    
    // Validate using the schema
    const validatedData = insertEstimationSubcontractorSchema.parse({
      ...subcontractorData,
      projectId
    });
    
    const [newSubcontractor] = await db.insert(estimationSubcontractor)
      .values(validatedData)
      .returning();
    
    res.json(newSubcontractor);
  } catch (error: any) {
    console.error("Error creating subcontractor item:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create subcontractor item" });
  }
});

// Update a subcontractor item
router.patch("/subcontractors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    // Remove ID from update data
    const { id: _, ...updateData } = req.body;
    
    const [updatedSubcontractor] = await db.update(estimationSubcontractor)
      .set(updateData)
      .where(eq(estimationSubcontractor.id, id))
      .returning();
    
    if (!updatedSubcontractor) {
      return res.status(404).json({ error: "Subcontractor item not found" });
    }
    
    res.json(updatedSubcontractor);
  } catch (error) {
    console.error("Error updating subcontractor item:", error);
    res.status(500).json({ error: "Failed to update subcontractor item" });
  }
});

// Delete a subcontractor item
router.delete("/subcontractors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    const [deletedSubcontractor] = await db.delete(estimationSubcontractor)
      .where(eq(estimationSubcontractor.id, id))
      .returning();
    
    if (!deletedSubcontractor) {
      return res.status(404).json({ error: "Subcontractor item not found" });
    }
    
    res.json({ success: true, deleted: deletedSubcontractor });
  } catch (error) {
    console.error("Error deleting subcontractor item:", error);
    res.status(500).json({ error: "Failed to delete subcontractor item" });
  }
});

export { router as estimationSubcontractorsRouter };