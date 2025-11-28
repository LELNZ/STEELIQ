import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Lock,
  Unlock,
  Package,
  Settings,
  Shield,
  Database,
  Brain,
  Factory,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Gauge,
  XCircle,
  AlertTriangle,
  Wrench,
  MapPin,
  Link2,
  Zap,
  HardHat,
  FileSearch,
  Calculator,
  Mail,
  Layers,
  Activity
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceFeature {
  id: string;
  name: string;
  serviceName?: string; // Actual service file name
  description: string;
  completion: number;
  status: 'complete' | 'in-progress' | 'planned' | 'not-started' | 'broken' | 'stubbed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies?: string[];
  complianceRequired?: boolean;
  estimatedDays?: number;
  blockers?: string[];
  notes?: string;
  tables?: string[]; // Related database tables
}

interface ServiceLayer {
  id: string;
  name: string;
  icon: any;
  description: string;
  completion: number;
  services: ServiceFeature[];
  tier: 'core' | 'intelligence' | 'integration' | 'infrastructure';
  tableCount?: number;
}

const architectureData: ServiceLayer[] = [
  {
    id: 'core-business-operations',
    name: '⚙️ Core Business Operations',
    icon: Factory,
    description: 'Foundation services managing jobs, estimation, procurement, production, quality, and inventory',
    completion: 65,
    tier: 'core',
    tableCount: 89,
    services: [
      {
        id: 'job-lifecycle',
        name: 'Job Lifecycle Management',
        serviceName: 'jobLifecycleService.ts',
        description: 'End-to-end job management from creation to completion with document tracking',
        completion: 85,
        status: 'in-progress',
        priority: 'critical',
        complianceRequired: true,
        estimatedDays: 5,
        tables: ['jobs', 'jobMaterials', 'jobTasks', 'jobEstimates', 'projectLifecycleEvents'],
        notes: '✅ Core service operational, needs approval workflow completion'
      },
      {
        id: 'estimation-engine',
        name: 'Estimation & MTO Service',
        serviceName: 'aiEstimationService.ts + mtoExportService.ts',
        description: 'Material takeoff with AS/NZS standards, labor estimation, overhead calculation',
        completion: 70,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 10,
        tables: ['estimationProjects', 'estimationLabor', 'estimationMaterials', 'estimationOperations', 'materialTakeoffs'],
        dependencies: ['dxf-parser', 'pdf-analysis'],
        notes: 'Labor rate cards integrated, needs overhead allocation'
      },
      {
        id: 'procurement-rfq',
        name: 'Procurement & RFQ Automation',
        serviceName: 'rfqAutomationService.ts + rfqEmailService.ts',
        description: 'Multi-supplier RFQ broadcast, quote comparison, PO generation with approvals',
        completion: 75,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 8,
        tables: ['purchaseRequisitions', 'purchaseOrders', 'purchaseOrderItems', 'suppliers', 'supplierTemplates'],
        dependencies: ['email-integration'],
        notes: '✅ Core service working, email automation functional'
      },
      {
        id: 'production-monitoring',
        name: 'Production Monitoring Service',
        serviceName: 'productionMonitoringService.ts',
        description: 'Real-time machine monitoring, OEE metrics, shift management',
        completion: 80,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['productionEvents', 'productionMetrics', 'productionShifts', 'machines', 'machineStatusLogs'],
        notes: '✅ Core service operational, needs dashboard UI'
      },
      {
        id: 'quality-control',
        name: 'Quality Control & Compliance',
        serviceName: 'complianceService.ts + complianceLintService.ts',
        description: 'Quality inspections, NCR tracking, compliance validation, corrective actions',
        completion: 60,
        status: 'in-progress',
        priority: 'high',
        complianceRequired: true,
        estimatedDays: 10,
        tables: ['qualityControl', 'qualityInspections', 'complianceDocuments', 'safetyInspections'],
        notes: 'Tables and services exist, needs UI implementation'
      },
      {
        id: 'inventory-management',
        name: 'Inventory & Material Management',
        serviceName: 'storage.ts (inventory methods)',
        description: 'Stock tracking, remnant management, material allocation, movement tracking',
        completion: 55,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 12,
        tables: ['inventory', 'inventoryMovements', 'remnants', 'materials', 'materialCategories'],
        notes: 'Core logic in storage.ts, needs service extraction'
      },
      {
        id: 'consumption-rates',
        name: 'Consumption Rates Engine',
        serviceName: 'consumption-rates-service.ts',
        description: 'Material consumption tracking, wastage analysis, efficiency metrics',
        completion: 70,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 5,
        tables: ['materialConsumption', 'consumptionRates'],
        dependencies: ['inventory-management'],
        notes: '✅ Service operational'
      },
      {
        id: 'operation-service',
        name: 'Manufacturing Operations',
        serviceName: 'operation-service.ts',
        description: 'Welding, cutting, drilling standards management and optimization',
        completion: 75,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 8,
        tables: ['weldingStandards', 'drillingStandards', 'cuttingStandards', 'edgePreparations'],
        notes: '✅ Standards loaded, optimization algorithms working'
      }
    ]
  },
  {
    id: 'ai-intelligence-layer',
    name: '🧠 AI & Intelligence Services',
    icon: Brain,
    description: 'AI-powered automation, machine learning, pattern recognition, and predictive analytics',
    completion: 35,
    tier: 'intelligence',
    tableCount: 42,
    services: [
      {
        id: 'ai-estimation',
        name: 'AI Estimation Engine',
        serviceName: 'aiEstimationService.ts',
        description: 'Claude Vision powered PDF/DXF analysis for 50% time savings',
        completion: 45,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 20,
        tables: ['aiDrawingAnalysis', 'steelElements', 'aiMtoEvidence'],
        dependencies: ['dxf-parser', 'pdf-analysis', 'ocr-service'],
        notes: 'Core service exists, needs Vision API integration'
      },
      {
        id: 'ai-workflow',
        name: 'AI Workflow Optimization',
        serviceName: 'aiWorkflowService.ts',
        description: 'Intelligent job scheduling, resource allocation, bottleneck detection',
        completion: 40,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 25,
        tables: ['aiWorkerJobs', 'aiProcessingQueue', 'aiBatchJobs', 'aiBatchJobItems'],
        dependencies: ['production-monitoring', 'job-lifecycle'],
        notes: 'Service framework exists, needs ML model training'
      },
      {
        id: 'ai-monitoring',
        name: 'AI Monitoring & Telemetry',
        serviceName: 'aiMonitoringService.ts',
        description: 'AI performance tracking, model accuracy metrics, drift detection',
        completion: 55,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 10,
        tables: ['aiMonitoringLogs', 'aiRunTelemetry'],
        notes: '✅ Logging infrastructure working'
      },
      {
        id: 'ai-feedback',
        name: 'AI Feedback & Learning',
        serviceName: 'aiFeedbackService.ts',
        description: 'Self-improving ML models through user corrections and feedback loops',
        completion: 25,
        status: 'planned',
        priority: 'medium',
        estimatedDays: 20,
        tables: ['aiFeedback', 'aiLearningHistory'],
        dependencies: ['ai-estimation'],
        notes: 'Service stub exists, needs implementation'
      },
      {
        id: 'pattern-recognition',
        name: 'Steel Pattern Library',
        serviceName: 'patternPackService.ts + seedPatternLibrary.ts',
        description: '18 AS/NZS steel patterns with recognition algorithms',
        completion: 60,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 15,
        tables: ['steelPatterns', 'patternTemplates', 'assemblyTemplates'],
        notes: 'Pattern library seeded, recognition algorithms partial'
      },
      {
        id: 'ai-cache',
        name: 'AI Response Cache',
        serviceName: 'aiCacheService.ts',
        description: 'Intelligent caching for AI responses to reduce API costs',
        completion: 70,
        status: 'in-progress',
        priority: 'low',
        estimatedDays: 3,
        tables: ['aiResponseCache'],
        notes: '✅ Cache layer working'
      },
      {
        id: 'worker-queue',
        name: 'AI Worker Queue System',
        serviceName: 'workerQueueService.ts',
        description: 'Distributed processing for AI tasks with priority management',
        completion: 65,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 8,
        tables: ['aiProcessingQueue', 'aiBatchJobs'],
        notes: 'Queue infrastructure operational'
      }
    ]
  },
  {
    id: 'document-processing',
    name: '📄 Document Processing Services',
    icon: FileSearch,
    description: 'PDF analysis, DXF parsing, drawing storage, template management, and document generation',
    completion: 60,
    tier: 'core',
    tableCount: 28,
    services: [
      {
        id: 'pdf-analysis',
        name: 'PDF Analysis Service',
        serviceName: 'pdfAnalysisService.ts',
        description: 'Extract text, tables, and drawings from engineering PDFs',
        completion: 75,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 10,
        tables: ['documents', 'pdfMetadata'],
        notes: '✅ Core extraction working, needs table recognition'
      },
      {
        id: 'pdf-generation',
        name: 'PDF Generation Service',
        serviceName: 'pdfGenerationService.ts',
        description: 'Generate quotes, reports, and technical documents',
        completion: 80,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['generatedDocuments', 'documentTemplates'],
        notes: '✅ Quote generation working'
      },
      {
        id: 'dxf-parser',
        name: 'DXF Parser & Geometry',
        serviceName: 'dxfParserService.ts + dxfGeometryService.ts',
        description: 'Parse CAD files, extract geometry, calculate dimensions',
        completion: 70,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 12,
        tables: ['drawings', 'drawingProjects', 'drawingLayers'],
        dependencies: ['ai-estimation'],
        notes: '✅ Core service operational, geometry calculations working'
      },
      {
        id: 'drawing-storage',
        name: 'Drawing Storage System',
        serviceName: 'drawingStorageService.ts',
        description: 'Version control for drawings, secure storage, access management',
        completion: 65,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 8,
        tables: ['drawings', 'drawingVersions', 'drawingAccess'],
        notes: 'Storage working, needs versioning UI'
      },
      {
        id: 'ocr-service',
        name: 'OCR Text Extraction',
        serviceName: 'ocrService.ts',
        description: 'Extract text from scanned documents and images',
        completion: 50,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 10,
        tables: ['ocrResults', 'ocrQueue'],
        notes: 'Tesseract integration partial'
      },
      {
        id: 'template-management',
        name: 'Template Hierarchy System',
        serviceName: 'templateHierarchyService.ts + templateMigrationService.ts',
        description: 'Manage document templates, email templates, and template versioning',
        completion: 70,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 6,
        tables: ['templates', 'templateVersions', 'emailTemplates'],
        notes: '✅ Template system working'
      },
      {
        id: 'email-templates',
        name: 'Email Template Engine',
        serviceName: 'emailTemplatesService.ts + defaultTemplatesService.ts',
        description: 'Dynamic email generation with Handlebars templates',
        completion: 85,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 3,
        tables: ['emailTemplates', 'emailQueue'],
        notes: '✅ Handlebars integration complete'
      },
      {
        id: 'pdf-metadata',
        name: 'PDF Metadata Service',
        serviceName: 'pdfMetadataService.ts',
        description: 'Extract and manage PDF metadata, properties, and annotations',
        completion: 60,
        status: 'in-progress',
        priority: 'low',
        estimatedDays: 5,
        tables: ['pdfMetadata', 'documentProperties'],
        notes: 'Basic extraction working'
      }
    ]
  },
  {
    id: 'financial-cost-management',
    name: '💰 Financial & Cost Management',
    icon: DollarSign,
    description: 'Cost aggregation, financial intelligence, payroll processing, and analytics',
    completion: 55,
    tier: 'core',
    tableCount: 34,
    services: [
      {
        id: 'cost-aggregation',
        name: 'Cost Aggregation Engine',
        serviceName: 'costAggregationService.ts',
        description: 'Real-time cost tracking, variance analysis, overhead allocation',
        completion: 70,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 15,
        tables: ['costTracking', 'costVariances', 'overheadAllocations', 'importedCosts'],
        dependencies: ['job-lifecycle', 'procurement-rfq'],
        notes: '✅ Core service operational, needs dashboard'
      },
      {
        id: 'payroll-export',
        name: 'Payroll Export Pipeline',
        serviceName: 'payrollExportService.ts + orchestrator.ts',
        description: 'AES-256-GCM encrypted payroll data export with provider adapters (QuickBooks, Xero, ADP)',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['payrollPeriods', 'payrollExports', 'payrollProviderConfig', 'payrollSyncLog'],
        notes: '✅ COMPLETE: Wave 3 finished - HMAC webhooks, 5-min replay protection, dedicated encryption keys per ADR-0001/0004'
      },
      {
        id: 'payroll-period',
        name: 'Payroll Period Management',
        serviceName: 'payrollPeriodService.ts + payrollPeriodServiceRefactored.ts',
        description: 'Pay period lifecycle, validation, locking, and processing',
        completion: 85,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 3,
        tables: ['payrollPeriods', 'payrollProviderConfig', 'payrollSyncLog'],
        notes: '✅ Core service working, refactored version available'
      },
      {
        id: 'overtime-calculation',
        name: 'Overtime Calculation Engine',
        serviceName: 'overtimeCalculationService.ts',
        description: 'Jurisdiction-aware overtime rules, shift differentials, penalty rates',
        completion: 90,
        status: 'in-progress',
        priority: 'high',
        complianceRequired: true,
        estimatedDays: 2,
        tables: ['overtimeRules', 'shiftDifferentials'],
        notes: '✅ AS/NZS rules implemented'
      },
      {
        id: 'financial-intelligence',
        name: 'Financial Intelligence System',
        description: 'Predictive costing, profitability analysis, financial KPIs',
        completion: 35,
        status: 'planned',
        priority: 'medium',
        estimatedDays: 20,
        tables: ['financialMetrics', 'profitabilityAnalysis'],
        dependencies: ['cost-aggregation'],
        notes: 'Architecture defined, needs implementation'
      },
      {
        id: 'invoice-payment',
        name: 'Invoice & Payment Processing',
        description: 'Supplier invoices, payment tracking, reconciliation',
        completion: 50,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 12,
        tables: ['invoices', 'payments', 'invoiceItems'],
        notes: 'Basic CRUD working, needs automation'
      }
    ]
  },
  {
    id: 'time-payroll-systems',
    name: '⏰ Time & Payroll Systems',
    icon: Clock,
    description: 'Time tracking, GPS monitoring, timesheet management, and payroll processing - Fortune 50 5-Wave Implementation (Waves 1-4 Complete)',
    completion: 80,
    tier: 'core',
    tableCount: 42,
    services: [
      {
        id: 'gps-time-tracking',
        name: 'GPS Time Clock System',
        serviceName: 'locationPayrollService.ts + gpsArchivalService.ts',
        description: 'Mobile time tracking with GPS validation, photo capture, geofencing',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['timeClocks', 'locationTracking', 'geofenceZones', 'photoEvidence'],
        notes: '✅ Wave 1 COMPLETE: All tests pass (Unit: 8, Integration: 6, Static: 6, E2E: 21)'
      },
      {
        id: 'timesheet-aggregation',
        name: 'Timesheet Aggregation Service',
        serviceName: 'timesheetAggregationService.ts',
        description: 'Consolidate time entries, calculate totals, apply rules',
        completion: 75,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['timesheets', 'timesheetAggregations'],
        notes: '✅ Aggregation logic working'
      },
      {
        id: 'timesheet-reporting',
        name: 'Timesheet Report Generator',
        serviceName: 'timesheetReportService.ts',
        description: 'Generate timesheet reports, summaries, and exports',
        completion: 70,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 5,
        tables: ['timesheetReports', 'reportTemplates'],
        notes: 'Report generation functional'
      },
      {
        id: 'time-analytics',
        name: 'Time Analytics Engine',
        serviceName: 'timeAnalyticsService.ts + timeAnalyticsServiceSimple.ts',
        description: 'Labor efficiency metrics, project time analysis, trend detection',
        completion: 60,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 10,
        tables: ['timeAnalytics', 'laborMetrics'],
        notes: 'Simple version working, advanced analytics pending'
      },
      {
        id: 'dual-authorization',
        name: 'Dual Authorization Framework',
        serviceName: 'approvalRequestService.ts + jwtOverrideService.ts',
        description: 'Cryptographic dual approval for GPS overrides and payroll',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['dualAuthRequests', 'dualAuthEvents'],
        notes: '✅ COMPLETE: Fortune 50 compliant'
      },
      {
        id: 'clock-session-builder',
        name: 'Clock Session Builder',
        serviceName: 'clockSessionBuilder.ts',
        description: 'Build work sessions from clock events, handle exceptions',
        completion: 80,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 3,
        tables: ['clockSessions', 'sessionExceptions'],
        notes: '✅ Session logic working'
      },
      {
        id: 'payroll-sync',
        name: 'Payroll Provider Sync',
        serviceName: 'payrollSyncService.ts + orchestrator.ts',
        description: 'Sync with ADP, QuickBooks, Xero payroll systems with HMAC webhook verification',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['payrollProviderConfig', 'payrollSyncLog'],
        notes: '✅ COMPLETE: Wave 3 finished - OAuth2 adapters, HMAC-SHA256 webhooks, 5-min replay protection per ADR-0004'
      },
      {
        id: 'predictive-labor-costs',
        name: 'Predictive Labor Costs',
        serviceName: 'predictiveLaborService.ts',
        description: 'ML forecasting with 12-week regression, budget variance alerts, overtime predictions',
        completion: 100,
        status: 'complete',
        priority: 'high',
        complianceRequired: true,
        tables: ['laborForecasts', 'budgetAlerts'],
        notes: '✅ Wave 4 COMPLETE: Fortune 50 predictive analytics operational'
      },
      {
        id: 'advanced-trend-analysis',
        name: 'Advanced Trend Analysis',
        serviceName: 'trendAnalysisService.ts',
        description: 'Moving averages (7/30/90-day), anomaly detection, YoY comparison, seasonal patterns',
        completion: 100,
        status: 'complete',
        priority: 'high',
        tables: ['trendAnalytics', 'anomalyFlags'],
        notes: '✅ Wave 4 COMPLETE: Statistical analysis with 2σ anomaly detection'
      },
      {
        id: 'escalation-workflows',
        name: 'Escalation Workflows',
        serviceName: 'approvalEscalationService.ts',
        description: 'SLA-driven approval chains (Manager 24hr → Director 48hr → VP 72hr)',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['approvalSLAs', 'escalationRules'],
        notes: '✅ Wave 4 COMPLETE: Full SLA-driven escalation with auto-routing'
      },
      {
        id: 'executive-kpi-dashboard',
        name: 'Real-time KPI Dashboard',
        serviceName: 'TimeAnalyticsDashboard.tsx',
        description: 'Executive scorecard, department benchmarks, configurable alert thresholds',
        completion: 100,
        status: 'complete',
        priority: 'high',
        tables: ['kpiMetrics', 'alertThresholds'],
        notes: '✅ Wave 4 COMPLETE: Executive tab with CFO-level metrics'
      },
      {
        id: 'manager-hierarchy',
        name: 'Manager Hierarchy Routing',
        serviceName: 'managerHierarchyService.ts',
        description: 'Org chart-based approval routing, delegation support, vacation coverage',
        completion: 100,
        status: 'complete',
        priority: 'high',
        tables: ['teamMembers.reportsTo', 'delegations'],
        notes: '✅ Wave 4 COMPLETE: Org chart routing with delegation support'
      },
      {
        id: 'ml-anomaly-detection',
        name: 'ML Anomaly Detection',
        serviceName: 'anomalyDetectionService.ts',
        description: 'SOX-compliant ML anomaly detection with SHAP explainability for audit trails',
        completion: 0,
        status: 'planned',
        priority: 'critical',
        complianceRequired: true,
        estimatedDays: 15,
        tables: ['anomalyDetectionModels', 'anomalyFlags'],
        notes: '🔮 Wave 5.1: Model versioning, drift detection, quarterly bias audits'
      },
      {
        id: 'fraud-prevention-ai',
        name: 'Fraud Prevention AI',
        serviceName: 'fraudScoringService.ts',
        description: 'Real-time risk scoring with dual-authorization overrides and pattern learning',
        completion: 0,
        status: 'planned',
        priority: 'critical',
        complianceRequired: true,
        estimatedDays: 12,
        tables: ['fraudRiskProfiles', 'clockEventRisk'],
        notes: '🔮 Wave 5.2: Sub-100ms scoring, behavioral baselines'
      },
      {
        id: 'ai-schedule-optimization',
        name: 'AI Schedule Optimization',
        serviceName: 'scheduleOptimizationService.ts',
        description: 'Mixed-integer optimization with fairness constraints and labor law compliance',
        completion: 0,
        status: 'planned',
        priority: 'high',
        estimatedDays: 20,
        tables: ['aiScheduleRecommendations', 'laborDemandForecasts'],
        notes: '🔮 Wave 5.3: What-if scenarios, union rule support'
      },
      {
        id: 'predictive-workforce-planning',
        name: 'Predictive Workforce Planning',
        serviceName: 'workforcePlanningService.ts',
        description: 'Multi-horizon forecasts (weekly/monthly/quarterly/annual) with board-ready reports',
        completion: 0,
        status: 'planned',
        priority: 'high',
        estimatedDays: 15,
        tables: ['forecastAssumptions', 'workforceScenarios'],
        notes: '🔮 Wave 5.4: SOC 1 Type II evidence trail, scenario comparison'
      },
      {
        id: 'nl-time-entry',
        name: 'Natural Language Time Entry',
        serviceName: 'nlpTimeEntryService.ts',
        description: 'Voice/text time entry with ASR/NLP processing and automatic PII redaction',
        completion: 0,
        status: 'planned',
        priority: 'medium',
        estimatedDays: 18,
        tables: ['nlTimeEntries', 'voiceConsentLogs'],
        notes: '🔮 Wave 5.5: Mobile-first, on-device processing option'
      }
    ]
  },
  {
    id: 'integration-communication',
    name: '🔌 Integration & Communication',
    icon: Link2,
    description: 'External integrations, email/WhatsApp services, API management, and error recovery',
    completion: 45,
    tier: 'integration',
    tableCount: 22,
    services: [
      {
        id: 'email-integration',
        name: 'Integrated Email Service',
        serviceName: 'integratedEmailService.ts',
        description: 'Gmail API integration for automated email processing and cost imports',
        completion: 70,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['emailAccounts', 'emailImportedCosts', 'emailSyncLogs'],
        notes: '✅ Gmail API working, cost import functional'
      },
      {
        id: 'rfq-email',
        name: 'RFQ Email Automation',
        serviceName: 'rfqEmailService.ts',
        description: 'Automated RFQ distribution and response collection via email',
        completion: 75,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['rfqEmails', 'rfqResponses'],
        dependencies: ['email-integration'],
        notes: '✅ Email automation working'
      },
      {
        id: 'notification-policy-rbac',
        name: 'Notification Policy RBAC System',
        serviceName: 'notificationService.ts + notification-role-policies.tsx',
        description: 'Fortune 50 RBAC notification policies with mandatory/default channels, role-based enforcement',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['notification_policies', 'notification_preferences', 'notification_audit_log'],
        notes: '✅ COMPLETE: 5 roles × 4 categories policy matrix, dual-tier visualization (mandatory/default), SHA-256 audit trail'
      },
      {
        id: 'whatsapp-notifications',
        name: 'WhatsApp Business API',
        serviceName: 'whatsappService.ts + notificationService.ts',
        description: 'WhatsApp Business API integration replacing SMS for NZ compliance',
        completion: 100,
        status: 'complete',
        priority: 'high',
        tables: ['notifications', 'notification_delivery_attempts'],
        notes: '✅ COMPLETE: Production templates (steeliq_time_clock, steeliq_payroll, steeliq_approval, steeliq_compliance), permanent access token, template-based messaging for Fortune 50 compliance'
      },
      {
        id: 'sendgrid-integration',
        name: 'SendGrid Email Service',
        description: 'Transactional email delivery with SendGrid',
        completion: 70,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 3,
        tables: ['emailQueue', 'emailLogs'],
        notes: 'Integration configured, needs full implementation'
      },
      {
        id: 'anthropic-integration',
        name: 'Anthropic Claude API',
        description: 'Claude Sonnet 4.0 integration for AI features',
        completion: 80,
        status: 'in-progress',
        priority: 'critical',
        estimatedDays: 5,
        tables: ['aiApiCalls', 'aiUsageTracking'],
        notes: '✅ API integrated, needs Vision implementation'
      },
      {
        id: 'websocket-service',
        name: 'WebSocket Real-time Updates',
        description: 'Real-time notifications and live updates',
        completion: 50,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 8,
        tables: ['websocketConnections', 'realtimeEvents'],
        notes: 'WebSocket infrastructure exists'
      },
      {
        id: 'error-recovery',
        name: 'Error Recovery Service',
        serviceName: 'errorRecoveryService.ts',
        description: 'Automatic error recovery, retry logic, circuit breakers',
        completion: 65,
        status: 'in-progress',
        priority: 'medium',
        estimatedDays: 6,
        tables: ['errorLogs', 'recoveryAttempts'],
        notes: 'Retry logic implemented'
      },
      {
        id: 'api-transformers',
        name: 'API Response Transformers',
        serviceName: 'v42ResponseTransformer.ts',
        description: 'Transform external API responses to internal format',
        completion: 80,
        status: 'in-progress',
        priority: 'low',
        estimatedDays: 3,
        notes: '✅ V42 transformer working'
      }
    ]
  },
  {
    id: 'security-infrastructure',
    name: '🔒 Security & Infrastructure',
    icon: Shield,
    description: 'Security services, RBAC, encryption, audit trails, and system infrastructure',
    completion: 88,
    tier: 'infrastructure',
    tableCount: 24,
    services: [
      {
        id: 'rbac-system',
        name: 'Role-Based Access Control',
        serviceName: 'rbac.ts + permissions/',
        description: 'Fortune 50 compliant RBAC with 8 system roles',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['roles', 'permissions', 'userRoles'],
        notes: '✅ COMPLETE: Full RBAC implementation'
      },
      {
        id: 'security-integration',
        name: 'Security Integration Service',
        serviceName: 'securityIntegration.ts',
        description: 'Centralized security controls and validation',
        completion: 95,
        status: 'in-progress',
        priority: 'critical',
        complianceRequired: true,
        estimatedDays: 2,
        tables: ['securityPolicies', 'securityEvents'],
        notes: '✅ Near complete'
      },
      {
        id: 'encryption-service',
        name: 'AES-256-GCM Encryption',
        serviceName: 'encryptionService.ts',
        description: 'Military-grade encryption for sensitive data',
        completion: 100,
        status: 'complete',
        priority: 'critical',
        complianceRequired: true,
        tables: ['encryptionKeys', 'encryptedData'],
        notes: '✅ COMPLETE: Persistent key management'
      },
      {
        id: 'secure-storage',
        name: 'Secure Storage Service',
        serviceName: 'secureStorageService.ts',
        description: 'Encrypted file storage with access controls',
        completion: 85,
        status: 'in-progress',
        priority: 'high',
        estimatedDays: 5,
        tables: ['secureFiles', 'secureFileTokens'],
        notes: 'Storage working, needs UI'
      },
      {
        id: 'audit-trail',
        name: 'Immutable Audit Trail',
        serviceName: 'auditService.ts',
        description: 'SHA-256 hash chain for SOX compliance',
        completion: 95,
        status: 'in-progress',
        priority: 'critical',
        complianceRequired: true,
        estimatedDays: 2,
        tables: ['auditLog', 'hashChainBlocks', 'systemAuditLog'],
        notes: 'Hash chain working, needs viewer UI'
      },
      {
        id: 'jwt-override',
        name: 'JWT Override Service',
        serviceName: 'jwtOverrideService.ts',
        description: 'Secure token generation for overrides',
        completion: 100,
        status: 'complete',
        priority: 'high',
        tables: ['jwtOverrides', 'overrideTokens'],
        notes: '✅ COMPLETE'
      },
      {
        id: 'backup-recovery',
        name: 'Backup & Recovery System',
        description: 'Automated backups with point-in-time recovery',
        completion: 60,
        status: 'in-progress',
        priority: 'high',
        complianceRequired: true,
        estimatedDays: 10,
        tables: ['backupHistory', 'recoveryPoints'],
        notes: 'Needs implementation'
      }
    ]
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'complete':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'in-progress':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'planned':
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    case 'broken':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'stubbed':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-green-500';
    case 'in-progress':
      return 'bg-blue-500';
    case 'planned':
      return 'bg-gray-300';
    case 'broken':
      return 'bg-red-500';
    case 'stubbed':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-300';
  }
};

const getPriorityBadge = (priority: string) => {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-gray-100 text-gray-800 border-gray-300'
  };
  
  return (
    <Badge className={`${colors[priority as keyof typeof colors]} border text-xs`}>
      {priority.toUpperCase()}
    </Badge>
  );
};

const getTierBadge = (tier: string) => {
  const colors = {
    core: 'bg-blue-100 text-blue-800',
    intelligence: 'bg-purple-100 text-purple-800',
    integration: 'bg-green-100 text-green-800',
    infrastructure: 'bg-gray-100 text-gray-800'
  };
  
  const labels = {
    core: 'Core Service',
    intelligence: 'AI/ML',
    integration: 'Integration',
    infrastructure: 'Infrastructure'
  };
  
  return (
    <Badge variant="outline" className={`${colors[tier as keyof typeof colors]} text-xs`}>
      {labels[tier as keyof typeof labels]}
    </Badge>
  );
};

function FeatureDashboard() {
  const [openSections, setOpenSections] = useState<string[]>(['time-payroll-systems']);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusArea, setFocusArea] = useState<string>('time-payroll-systems'); // Current development focus

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Calculate statistics
  const totalServices = architectureData.reduce((sum, layer) => sum + layer.services.length, 0);
  const totalTables = architectureData.reduce((sum, layer) => sum + (layer.tableCount || 0), 0);
  const overallCompletion = Math.round(
    architectureData.reduce((sum, cat) => sum + cat.completion, 0) / architectureData.length
  );

  const criticalIssues = architectureData.flatMap(cat =>
    cat.services.filter(f => f.status === 'broken' || (f.blockers && f.blockers.length > 0))
  );

  const stubbedFeatures = architectureData.flatMap(cat =>
    cat.services.filter(f => f.status === 'stubbed')
  );

  const completeServices = architectureData.flatMap(cat =>
    cat.services.filter(f => f.status === 'complete')
  );

  // Filter services based on search
  const filteredData = searchTerm 
    ? architectureData.map(layer => ({
        ...layer,
        services: layer.services.filter(service =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(layer => layer.services.length > 0)
    : architectureData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                STEELIQ Architecture Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Fortune 50 Enterprise Steel Fabrication Platform - Complete Service Architecture
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-3xl font-bold">{overallCompletion}%</div>
              <div className="text-sm text-muted-foreground">Overall Completion</div>
              <div className="text-xs text-muted-foreground">{totalServices} Services • {totalTables} Tables</div>
            </div>
          </div>

          {/* Critical Alerts */}
          {criticalIssues.length > 0 && (
            <Alert className="border-red-500 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <strong className="text-red-800">Critical Issues Detected:</strong>
                <ul className="mt-2 space-y-1">
                  {criticalIssues.map(issue => (
                    <li key={issue.id} className="text-sm text-red-700">
                      • <strong>{issue.name}:</strong> {issue.blockers?.[0] || issue.description}
                      {issue.serviceName && (
                        <span className="text-xs ml-2 opacity-75">({issue.serviceName})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Stubbed Features Warning */}
          {stubbedFeatures.length > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong className="text-yellow-800">Stubbed Services ({stubbedFeatures.length}):</strong>
                <span className="text-sm text-yellow-700 ml-2">
                  {stubbedFeatures.map(f => `${f.name} (${f.serviceName || 'no file'})`).join(', ')}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Features */}
          {completeServices.length > 0 && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong className="text-green-800">Completed Services ({completeServices.length}):</strong>
                <span className="text-sm text-green-700 ml-2">
                  {completeServices.map(f => f.name).join(', ')}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Current Focus Area - Time & Payroll Wave Structure */}
          <Card className="border-blue-500 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-xl">🎯 Current Development Focus: Time & Payroll System</CardTitle>
                  </div>
                  <CardDescription>Fortune 50 RBAC Compliance - 5 Wave Implementation</CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white px-3 py-1">ACTIVE DEVELOPMENT</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Wave 1 - Core Time Tracking (100% COMPLETE) */}
                <div className="p-3 bg-white rounded-lg border-2 border-green-400">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Wave 1</Badge>
                      <span className="font-semibold">Core Time Tracking & GPS</span>
                      <Badge className="bg-green-600 text-white text-xs">COMPLETE</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">100%</span>
                      <Progress value={100} className="w-24 h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">GPS validation, photo capture (cloud storage), dual authorization, AES-256-GCM encryption, 500m geofence enforcement</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-green-50">✅ GPS Tracking</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Dual Auth</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Encryption</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Clock Sessions</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Photo Storage (Cloud)</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Geofence Enforcement</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ GPS Anti-Spoofing</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ All Tests Pass</Badge>
                  </div>
                </div>

                {/* Wave 2 - Notification System (COMPLETE) */}
                <div className="p-3 bg-white rounded-lg border-2 border-green-400">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Wave 2</Badge>
                      <span className="font-semibold">Multi-Channel Notification System</span>
                      <Badge className="bg-green-600 text-white text-xs">COMPLETE</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">100%</span>
                      <Progress value={100} className="w-24 h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Fortune 50 RBAC notification policies, Gmail OAuth2, In-App WebSocket, WhatsApp Business API</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-green-50">✅ RBAC Policy Matrix</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Email (Gmail OAuth2)</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ In-App Notifications</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ SHA-256 Audit Trail</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ WhatsApp Templates</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Backend RBAC Enforcement</Badge>
                  </div>
                </div>

                {/* Wave 3 - External Integration (COMPLETE) */}
                <div className="p-3 bg-white rounded-lg border-2 border-green-400">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Wave 3</Badge>
                      <span className="font-semibold">External Payroll Integration</span>
                      <Badge className="bg-green-600 text-white text-xs">COMPLETE</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">100%</span>
                      <Progress value={100} className="w-24 h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">ADP, QuickBooks, Xero integration with AES-256-GCM encryption, HMAC webhooks, 5-min replay protection</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-green-50">✅ PayrollExportService</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Provider Adapters (3)</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ HMAC Webhooks</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Replay Protection</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Sync Dashboard</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Field Mapping UI</Badge>
                  </div>
                </div>

                {/* Wave 4 - Advanced Analytics (COMPLETE) */}
                <div className="p-3 bg-white rounded-lg border-2 border-green-400">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Wave 4</Badge>
                      <span className="font-semibold">Advanced Analytics & Escalation</span>
                      <Badge className="bg-green-600 text-white text-xs">COMPLETE</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">100%</span>
                      <Progress value={100} className="w-24 h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Predictive labor costs, trend analysis, escalation workflows, real-time dashboards, manager hierarchy</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Predictive Labor Costs</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Trend Analysis (7/30/90-day)</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Escalation Workflows</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Executive KPI Dashboard</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">✅ Manager Hierarchy Routing</Badge>
                  </div>
                </div>
                
                {/* Wave 5 - AI/ML Enhancement (NEXT) */}
                <div className="p-3 bg-white rounded-lg border-2 border-purple-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">Wave 5</Badge>
                      <span className="font-semibold">AI/ML Enhancement</span>
                      <Badge className="bg-purple-600 text-white text-xs">NEXT</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">0%</span>
                      <Progress value={0} className="w-24 h-2" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Fortune 50 AI/ML Parity with Workday Assistant, ADP DataCloud, SAP Intelligent Services</p>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-gray-50">5.1</Badge>
                      <span className="font-medium">ML Anomaly Detection</span>
                      <span className="text-muted-foreground">- SHAP explainability, SOX compliance</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-gray-50">5.2</Badge>
                      <span className="font-medium">Fraud Prevention AI</span>
                      <span className="text-muted-foreground">- Real-time risk scoring, dual-auth overrides</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-gray-50">5.3</Badge>
                      <span className="font-medium">AI Schedule Optimization</span>
                      <span className="text-muted-foreground">- Fairness constraints, labor law compliance</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-gray-50">5.4</Badge>
                      <span className="font-medium">Predictive Workforce Planning</span>
                      <span className="text-muted-foreground">- Multi-horizon forecasts, board reports</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-gray-50">5.5</Badge>
                      <span className="font-medium">Natural Language Time Entry</span>
                      <span className="text-muted-foreground">- Voice/text input, PII redaction</span>
                    </div>
                  </div>
                </div>

                {/* Compliance Note */}
                <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-800">Fortune 50 RBAC: Global middleware active (shadow mode for dev, enforce for prod)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Architecture Overview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Platform Architecture Overview</CardTitle>
                  <CardDescription>7 Service Layers • 40+ Services • 257 Database Tables</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalServices}</div>
                    <div className="text-xs text-muted-foreground">Total Services</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completeServices.length}</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {architectureData.flatMap(c => c.services).filter(f => f.status === 'in-progress').length}
                    </div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{criticalIssues.length}</div>
                    <div className="text-xs text-muted-foreground">Critical Issues</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={overallCompletion} className="h-3" />
              <div className="grid grid-cols-4 gap-4 mt-4">
                {architectureData.slice(0, 4).map(layer => (
                  <div key={layer.id} className="text-center">
                    <div className="text-sm font-medium truncate">{layer.name.split(' ').slice(1).join(' ')}</div>
                    <div className="text-2xl font-bold text-blue-600">{layer.completion}%</div>
                    <Progress value={layer.completion} className="h-1 mt-1" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {layer.services.length} services • {layer.tableCount} tables
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search services, files, or features..."
              className="flex-1 px-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Service Layers */}
        <div className="space-y-4">
          {filteredData.map(layer => (
            <Card key={layer.id} className="overflow-hidden">
              <Collapsible
                open={openSections.includes(layer.id)}
                onOpenChange={() => toggleSection(layer.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {openSections.includes(layer.id) ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="text-2xl">{layer.name.split(' ')[0]}</div>
                        <CardTitle className="text-xl">
                          {layer.name.split(' ').slice(1).join(' ')}
                        </CardTitle>
                        {getTierBadge(layer.tier)}
                        <Badge variant="outline" className="text-xs">
                          {layer.services.length} Services
                        </Badge>
                        {layer.tableCount && (
                          <Badge variant="outline" className="text-xs">
                            <Database className="w-3 h-3 mr-1" />
                            {layer.tableCount} Tables
                          </Badge>
                        )}
                        {layer.services.some(s => s.complianceRequired) && (
                          <Badge variant="outline" className="bg-blue-50 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Compliance
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Completion</div>
                          <div className="text-2xl font-bold">{layer.completion}%</div>
                        </div>
                        <Progress value={layer.completion} className="w-32 h-2" />
                      </div>
                    </div>
                    <CardDescription className="mt-2 text-left">
                      {layer.description}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {layer.services.map((service) => (
                        <div
                          key={service.id}
                          className={`p-4 rounded-lg border ${
                            service.status === 'broken' ? 'border-red-300 bg-red-50' :
                            service.status === 'stubbed' ? 'border-yellow-300 bg-yellow-50' :
                            service.status === 'complete' ? 'border-green-200 bg-green-50/50' :
                            'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getStatusIcon(service.status)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-semibold">{service.name}</h4>
                                  {service.serviceName && (
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {service.serviceName}
                                    </code>
                                  )}
                                  {getPriorityBadge(service.priority)}
                                  {service.complianceRequired && (
                                    <Badge variant="outline" className="bg-blue-50 text-xs">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Compliance
                                    </Badge>
                                  )}
                                  {service.estimatedDays && service.status !== 'complete' && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {service.estimatedDays}d
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {service.description}
                                </p>
                                {service.notes && (
                                  <p className={`text-sm mt-2 font-medium ${
                                    service.notes.startsWith('🔴') ? 'text-red-600' :
                                    service.notes.startsWith('✅') ? 'text-green-600' :
                                    service.notes.startsWith('⚠️') ? 'text-yellow-600' :
                                    'text-blue-600'
                                  }`}>
                                    {service.notes}
                                  </p>
                                )}
                                {service.tables && service.tables.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {service.tables.slice(0, 5).map(table => (
                                      <Badge key={table} variant="outline" className="text-xs">
                                        <Database className="w-2 h-2 mr-1" />
                                        {table}
                                      </Badge>
                                    ))}
                                    {service.tables.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{service.tables.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {service.blockers && service.blockers.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-100 rounded-md">
                                    <p className="text-xs font-semibold text-red-800">Blockers:</p>
                                    <ul className="text-xs text-red-700 mt-1">
                                      {service.blockers.map((blocker, i) => (
                                        <li key={i}>• {blocker}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {service.dependencies && service.dependencies.length > 0 && (
                                  <div className="mt-2 flex items-center gap-1">
                                    <Link2 className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Depends on: {service.dependencies.join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <div className="text-right">
                                <div className="text-lg font-bold">{service.completion}%</div>
                                <Progress 
                                  value={service.completion} 
                                  className={`w-20 h-2 ${
                                    service.status === 'broken' ? '[&>div]:bg-red-500' :
                                    service.status === 'stubbed' ? '[&>div]:bg-yellow-500' :
                                    ''
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Architecture Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Layers className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">{architectureData.length}</div>
                <div className="text-sm text-blue-600">Service Layers</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Activity className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">{totalServices}</div>
                <div className="text-sm text-purple-600">Total Services</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">{completeServices.length}</div>
                <div className="text-sm text-green-600">Complete</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-700">{stubbedFeatures.length}</div>
                <div className="text-sm text-yellow-600">Stubbed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-700">{criticalIssues.length}</div>
                <div className="text-sm text-red-600">Critical Issues</div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Database Statistics</h4>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Tables</span>
                  <span className="font-semibold">257</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Core Business Tables</span>
                  <span className="font-semibold">89</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">AI & Intelligence Tables</span>
                  <span className="font-semibold">42</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Time & Payroll Tables</span>
                  <span className="font-semibold">38</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Development Metrics</h4>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fortune 50 Compliance Features</span>
                  <span className="font-semibold">
                    {architectureData.flatMap(c => c.services).filter(f => f.complianceRequired).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Critical Priority Services</span>
                  <span className="font-semibold">
                    {architectureData.flatMap(c => c.services).filter(f => f.priority === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Days to Complete</span>
                  <span className="font-semibold">
                    {architectureData.flatMap(c => c.services)
                      .filter(f => f.estimatedDays && f.status !== 'complete')
                      .reduce((sum, f) => sum + (f.estimatedDays || 0), 0)} days
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FeatureDashboard;