import { Router } from "express";
import { operationService } from "../services/operation-service";

const router = Router();

// Create a new operation
router.post("/", async (req, res) => {
  try {
    const {
      projectId,
      materialDesignation,
      materialId,
      operationType,
      description,
      operationData,
      method,
      position,
      includeInLabor,
      includeInConsumables,
      includeInCoatings
    } = req.body;

    if (!projectId || !materialDesignation || !operationType || !description) {
      return res.status(400).json({
        error: "Missing required fields: projectId, materialDesignation, operationType, description"
      });
    }

    const operation = await operationService.createOperation({
      projectId,
      materialDesignation,
      materialId,
      operationType,
      description,
      operationData,
      method,
      position,
      includeInLabor,
      includeInConsumables,
      includeInCoatings,
      userId: req.session?.userId
    });

    res.json(operation);
  } catch (error) {
    console.error("Error creating operation:", error);
    res.status(500).json({ error: "Failed to create operation" });
  }
});

// Apply operation template to multiple materials
router.post("/apply-to-materials", async (req, res) => {
  try {
    const { templateOperationId, materialDesignations, projectId } = req.body;

    if (!templateOperationId || !materialDesignations || !projectId) {
      return res.status(400).json({
        error: "Missing required fields: templateOperationId, materialDesignations, projectId"
      });
    }

    const operations = await operationService.applyToMultipleMaterials(
      templateOperationId,
      materialDesignations,
      projectId,
      req.session?.userId
    );

    res.json(operations);
  } catch (error) {
    console.error("Error applying operation to materials:", error);
    res.status(500).json({ error: "Failed to apply operation to materials" });
  }
});

// Get operations for a project
router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (!projectId) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    const operations = await operationService.getProjectOperations(projectId);
    res.json(operations);
  } catch (error) {
    console.error("Error fetching project operations:", error);
    res.status(500).json({ error: "Failed to fetch project operations" });
  }
});

// Update operation costs
router.patch("/:id/costs", async (req, res) => {
  try {
    const operationId = parseInt(req.params.id);
    const { laborCost, consumablesCost, coatingsCost } = req.body;

    if (!operationId) {
      return res.status(400).json({ error: "Invalid operation ID" });
    }

    await operationService.updateOperationCosts(
      operationId,
      laborCost,
      consumablesCost,
      coatingsCost
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating operation costs:", error);
    res.status(500).json({ error: "Failed to update operation costs" });
  }
});

// Delete operation
router.delete("/:id", async (req, res) => {
  try {
    const operationId = parseInt(req.params.id);

    if (!operationId) {
      return res.status(400).json({ error: "Invalid operation ID" });
    }

    await operationService.deleteOperation(operationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting operation:", error);
    res.status(500).json({ error: "Failed to delete operation" });
  }
});

// Delete all operations for a material
router.delete("/material/:projectId/:materialDesignation", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { materialDesignation } = req.params;

    if (!projectId || !materialDesignation) {
      return res.status(400).json({ error: "Invalid project ID or material designation" });
    }

    await operationService.deleteOperationsForMaterial(projectId, materialDesignation);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting material operations:", error);
    res.status(500).json({ error: "Failed to delete material operations" });
  }
});

// Get consumption rates for an operation type
router.get("/consumption-rates/:operationType", async (req, res) => {
  try {
    const { operationType } = req.params;
    const { method } = req.query;

    if (!operationType) {
      return res.status(400).json({ error: "Operation type is required" });
    }

    const rates = await operationService.getConsumptionRates(
      operationType,
      method as string
    );

    res.json(rates);
  } catch (error) {
    console.error("Error fetching consumption rates:", error);
    res.status(500).json({ error: "Failed to fetch consumption rates" });
  }
});

export default router;