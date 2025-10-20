/**
 * Drawing Routes - API endpoints for drawing parsing and analysis
 * Fortune 50 Level Drawing Processing Pipeline
 */

import { Router } from 'express';
import { db } from '../db';
import { 
  aiDrawingAnalysis,
  aiRunTelemetry,
  drawingProjects,
  drawings,
  steelElements
} from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { drawingParserService } from '../services/drawingParserService';
import aiEstimationService from '../services/aiEstimationService';
import { feedbackLearningService } from '../services/feedbackLearningService';
import { AuthService } from '../auth';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.dxf', '.dwg', '.ifc', '.step', '.png', '.jpg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  }
});

/**
 * Upload and parse a drawing file
 */
router.post('/parse', upload.single('drawing'), async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId, organizationKey = 'default' } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    // Parse the drawing
    const result = await drawingParserService.parseDrawing(
      req.file.path,
      parseInt(projectId),
      user.id,
      organizationKey
    );

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(console.error);

    if (result.success) {
      res.json({
        success: true,
        telemetryId: result.telemetryId,
        metadata: result.metadata,
        elements: result.elements,
        totalWeight: result.totalWeight,
        totalCost: result.totalCost,
        processingTimeMs: result.processingTimeMs,
        confidence: result.confidence
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.errors,
        warnings: result.warnings
      });
    }
  } catch (error) {
    console.error('[DrawingRoutes] Parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse drawing',
      message: error.message 
    });
  }
});

/**
 * Get parsing history for a project
 */
router.get('/project/:projectId/history', async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId } = req.params;

    // Get parsing history from telemetry
    const history = await db
      .select({
        id: aiRunTelemetry.id,
        runId: aiRunTelemetry.runId,
        startedAt: aiRunTelemetry.startedAt,
        completedAt: aiRunTelemetry.completedAt,
        elementsFound: aiRunTelemetry.elementsFound,
        processingTimeMs: aiRunTelemetry.processingTimeMs,
        confidence: aiRunTelemetry.confidenceScore,
        status: aiRunTelemetry.status
      })
      .from(aiRunTelemetry)
      .where(eq(aiRunTelemetry.aiAnalysisId, parseInt(projectId)))
      .orderBy(desc(aiRunTelemetry.createdAt))
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('[DrawingRoutes] History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Get elements for a specific parsing run
 */
router.get('/run/:telemetryId/elements', async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { telemetryId } = req.params;

    // Get elements from database
    const elements = await db
      .select()
      .from(steelElements)
      .where(eq(steelElements.drawingProjectId, parseInt(telemetryId)))
      .orderBy(steelElements.designation);

    res.json(elements);
  } catch (error) {
    console.error('[DrawingRoutes] Elements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch elements' });
  }
});

/**
 * Submit feedback for a parsing result
 */
router.post('/run/:telemetryId/feedback', async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { telemetryId } = req.params;
    const { corrections, rating, comments } = req.body;

    // Process feedback through learning service
    const metrics = await feedbackLearningService.processUserFeedback(
      telemetryId,
      user.id,
      corrections || [],
      rating,
      comments
    );

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('[DrawingRoutes] Feedback error:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

/**
 * Re-parse a drawing with updated patterns
 */
router.post('/run/:telemetryId/reparse', async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { telemetryId } = req.params;
    const { useLatestPatterns = true } = req.body;

    // Get original run details
    const originalRun = await db
      .select()
      .from(aiRunTelemetry)
      .where(eq(aiRunTelemetry.id, parseInt(telemetryId)))
      .limit(1);

    if (!originalRun.length) {
      return res.status(404).json({ error: 'Original run not found' });
    }

    // TODO: Implement re-parsing with updated patterns
    res.json({
      success: true,
      message: 'Re-parsing initiated',
      originalRunId: telemetryId
    });
  } catch (error) {
    console.error('[DrawingRoutes] Reparse error:', error);
    res.status(500).json({ error: 'Failed to reparse drawing' });
  }
});

/**
 * Get learning progress for an organization
 */
router.get('/learning-progress', async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { organizationKey = 'default', projectType = 'general' } = req.query;

    const progress = await feedbackLearningService.getLearningProgress(
      organizationKey as string,
      projectType as string
    );

    res.json(progress);
  } catch (error) {
    console.error('[DrawingRoutes] Learning progress error:', error);
    res.status(500).json({ error: 'Failed to fetch learning progress' });
  }
});

/**
 * Validate drawing before full parsing
 */
router.post('/validate', upload.single('drawing'), async (req, res) => {
  try {
    const user = await AuthService.getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Quick validation checks
    const validationResult = {
      valid: true,
      format: path.extname(req.file.originalname).substring(1),
      fileSize: req.file.size,
      warnings: [],
      errors: []
    };

    // Check file size
    if (req.file.size > 100 * 1024 * 1024) {
      validationResult.errors.push('File too large (max 100MB)');
      validationResult.valid = false;
    }

    // Check format
    const supportedFormats = ['pdf', 'dxf', 'dwg', 'ifc'];
    if (!supportedFormats.includes(validationResult.format.toLowerCase())) {
      validationResult.errors.push(`Unsupported format: ${validationResult.format}`);
      validationResult.valid = false;
    }

    // Clean up
    await fs.unlink(req.file.path).catch(console.error);

    res.json(validationResult);
  } catch (error) {
    console.error('[DrawingRoutes] Validation error:', error);
    res.status(500).json({ error: 'Failed to validate drawing' });
  }
});

/**
 * Get supported file formats and their capabilities
 */
router.get('/supported-formats', async (req, res) => {
  res.json({
    formats: [
      {
        extension: 'pdf',
        name: 'Portable Document Format',
        supported: true,
        features: ['OCR', 'AI Vision', 'Multi-page'],
        maxSize: '100MB'
      },
      {
        extension: 'dxf',
        name: 'AutoCAD DXF',
        supported: true,
        features: ['Layer parsing', 'Entity extraction', 'Scale detection'],
        maxSize: '100MB'
      },
      {
        extension: 'dwg',
        name: 'AutoCAD DWG',
        supported: false,
        features: ['Requires conversion'],
        maxSize: '100MB',
        note: 'Convert to DXF first'
      },
      {
        extension: 'ifc',
        name: 'Industry Foundation Classes',
        supported: false,
        features: ['BIM integration', '3D model parsing'],
        maxSize: '100MB',
        note: 'Coming soon'
      }
    ]
  });
});

export default router;