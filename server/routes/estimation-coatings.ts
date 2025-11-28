import { Router } from "express";
import { db } from "../db";
import { estimationCoatings, insertEstimationCoatingsSchema, type InsertEstimationCoatings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { validateIntegerRange, POSTGRES_MAX_INT } from "../utils/validation";

const router = Router();

// Get all coating items for a project
router.get("/projects/:projectId/coatings", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    const coatingItems = await db.select()
      .from(estimationCoatings)
      .where(eq(estimationCoatings.projectId, projectId));
    
    res.json(coatingItems);
  } catch (error) {
    console.error("Error fetching coating items:", error);
    res.status(500).json({ error: "Failed to fetch coating items" });
  }
});

// Create a new coating item
router.post("/projects/:projectId/coatings", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const projectIdError = validateIntegerRange(projectId, "projectId");
    if (projectIdError) {
      return res.status(400).json({ error: projectIdError });
    }
    
    // Remove any mock ID from client
    const { id, ...coatingData } = req.body;
    
    // Validate using the schema
    const validatedData = insertEstimationCoatingsSchema.parse({
      ...coatingData,
      projectId
    });
    
    const [newCoating] = await db.insert(estimationCoatings)
      .values(validatedData)
      .returning();
    
    res.json(newCoating);
  } catch (error: any) {
    console.error("Error creating coating item:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Failed to create coating item" });
  }
});

// Update a coating item
router.patch("/coatings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    // Remove ID from update data
    const { id: _, ...updateData } = req.body;
    
    const [updatedCoating] = await db.update(estimationCoatings)
      .set(updateData)
      .where(eq(estimationCoatings.id, id))
      .returning();
    
    if (!updatedCoating) {
      return res.status(404).json({ error: "Coating item not found" });
    }
    
    res.json(updatedCoating);
  } catch (error) {
    console.error("Error updating coating item:", error);
    res.status(500).json({ error: "Failed to update coating item" });
  }
});

// Delete a coating item
router.delete("/coatings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const idError = validateIntegerRange(id, "id");
    if (idError) {
      return res.status(400).json({ error: idError });
    }
    
    const [deletedCoating] = await db.delete(estimationCoatings)
      .where(eq(estimationCoatings.id, id))
      .returning();
    
    if (!deletedCoating) {
      return res.status(404).json({ error: "Coating item not found" });
    }
    
    res.json({ success: true, deleted: deletedCoating });
  } catch (error) {
    console.error("Error deleting coating item:", error);
    res.status(500).json({ error: "Failed to delete coating item" });
  }
});

export { router as estimationCoatingsRouter };