import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

export interface PreFlightCheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

export interface PreFlightReport {
  feature: string;
  version: string;
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warn';
  checks: PreFlightCheckResult[];
  blockingIssues: string[];
  warnings: string[];
  canDeploy: boolean;
}

export interface TableSchema {
  requiredColumns: string[];
  auditColumns?: string[];
}

export interface RBACRequirements {
  minRole: string;
  adminRoutes?: string[];
}

export interface GovernanceMetadata {
  togaf?: {
    admPhase: string;
    architectureContract?: {
      contractType: string;
      stakeholders: string[];
      deliverables: string[];
      slaMetrics: Record<string, number>;
      complianceCriteria: string[];
    };
    arbApproval?: {
      required: boolean;
      approvalLevel: string;
    };
  };
  cobit2024?: {
    objectives: Array<{
      id: string;
      name: string;
      targetLevel: number;
      currentLevel: number;
    }>;
    kpis?: Array<{
      id: string;
      name: string;
      target: number;
      unit: string;
    }>;
  };
  raci?: Array<{
    activity: string;
    responsible: string[];
    accountable: string;
    consulted: string[];
    informed: string[];
  }>;
  soxControls?: {
    itgc: Record<string, boolean>;
    sodRequirements?: string[];
    auditTrailRequirements?: string[];
  };
  deploymentGates?: {
    preDeployment?: {
      gates: Array<{ name: string; type: string; blocking: boolean }>;
      timeout: number;
      samplingInterval: number;
    };
    postDeployment?: {
      gates: Array<{ name: string; type: string; blocking: boolean }>;
      timeout: number;
      samplingInterval: number;
    };
    rollbackValidation?: {
      procedureDocumented: boolean;
      previousVersionRetained: boolean;
      maxRollbackTime: number;
      rollbackTested: boolean;
    };
  };
}

export interface FeatureManifest {
  feature: string;
  version: string;
  description?: string;
  dependencies: {
    tables: string[];
    tableSchemas?: Record<string, TableSchema>;
    services?: string[];
    routes?: string[];
    secrets?: string[];
    envVars?: string[];
    rbacRequirements?: RBACRequirements;
  };
  auditFields?: string[];
  preFlightChecks: ('database' | 'schema' | 'columns' | 'services' | 'routes' | 'secrets' | 'audit' | 'governance')[];
  governance?: GovernanceMetadata;
}

class PreFlightChecklistService {
  private manifestsDir: string;

  constructor() {
    this.manifestsDir = path.join(process.cwd(), 'server', 'manifests');
  }

  async loadManifest(featureName: string): Promise<FeatureManifest | null> {
    const manifestPath = path.join(this.manifestsDir, `${featureName}.manifest.json`);
    
    try {
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error(`Error loading manifest for ${featureName}:`, error);
      return null;
    }
  }

  async runPreFlightCheck(featureName: string): Promise<PreFlightReport> {
    const manifest = await this.loadManifest(featureName);
    
    if (!manifest) {
      return {
        feature: featureName,
        version: 'unknown',
        timestamp: new Date().toISOString(),
        overallStatus: 'fail',
        checks: [{
          check: 'manifest_exists',
          status: 'fail',
          message: `No manifest found for feature: ${featureName}`,
          details: { expectedPath: path.join(this.manifestsDir, `${featureName}.manifest.json`) }
        }],
        blockingIssues: [`Missing manifest file for ${featureName}`],
        warnings: [],
        canDeploy: false
      };
    }

    const checks: PreFlightCheckResult[] = [];
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    for (const checkType of manifest.preFlightChecks) {
      switch (checkType) {
        case 'database':
          const dbResults = await this.checkDatabaseDependencies(manifest.dependencies.tables);
          checks.push(...dbResults);
          dbResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
          dbResults.filter(r => r.status === 'warn').forEach(r => warnings.push(r.message));
          break;

        case 'schema':
          if (manifest.auditFields) {
            const schemaResults = await this.checkAuditFields(manifest.dependencies.tables, manifest.auditFields);
            checks.push(...schemaResults);
            schemaResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
          }
          break;

        case 'columns':
          if (manifest.dependencies.tableSchemas) {
            const columnResults = await this.checkColumnSchemas(manifest.dependencies.tableSchemas);
            checks.push(...columnResults);
            columnResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
          }
          break;

        case 'services':
          if (manifest.dependencies.services) {
            const serviceResults = await this.checkServiceDependencies(manifest.dependencies.services);
            checks.push(...serviceResults);
            serviceResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
          }
          break;

        case 'routes':
          if (manifest.dependencies.routes) {
            const routeResults = this.checkRouteDependencies(manifest.dependencies.routes, true);
            checks.push(...routeResults);
            routeResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
            routeResults.filter(r => r.status === 'warn').forEach(r => warnings.push(r.message));
          }
          if (manifest.dependencies.rbacRequirements) {
            const rbacResults = this.checkRBACRequirements(manifest.dependencies.rbacRequirements);
            checks.push(...rbacResults);
            rbacResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
            rbacResults.filter(r => r.status === 'warn').forEach(r => warnings.push(r.message));
          }
          break;

        case 'secrets':
          if (manifest.dependencies.secrets) {
            const secretResults = this.checkSecretDependencies(manifest.dependencies.secrets, true);
            checks.push(...secretResults);
            secretResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
            secretResults.filter(r => r.status === 'warn').forEach(r => warnings.push(r.message));
          }
          break;

        case 'audit':
          const auditResults = await this.checkAuditTrailSetup(manifest.dependencies.tables);
          checks.push(...auditResults);
          auditResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
          break;

        case 'governance':
          if (manifest.governance) {
            const govResults = this.checkGovernanceRequirements(manifest.governance);
            checks.push(...govResults);
            govResults.filter(r => r.status === 'fail').forEach(r => blockingIssues.push(r.message));
            govResults.filter(r => r.status === 'warn').forEach(r => warnings.push(r.message));
          }
          break;
      }
    }

    const overallStatus: 'pass' | 'fail' | 'warn' = 
      blockingIssues.length > 0 ? 'fail' : 
      warnings.length > 0 ? 'warn' : 'pass';

    return {
      feature: manifest.feature,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      overallStatus,
      checks,
      blockingIssues,
      warnings,
      canDeploy: blockingIssues.length === 0
    };
  }

  async checkDatabaseDependencies(tables: string[]): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];

    for (const tableName of tables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists
        `);
        
        const exists = result.rows[0]?.exists === true;
        
        results.push({
          check: `table_exists_${tableName}`,
          status: exists ? 'pass' : 'fail',
          message: exists 
            ? `Table '${tableName}' exists` 
            : `CRITICAL: Table '${tableName}' does not exist`,
          details: { tableName, exists }
        });
      } catch (error) {
        results.push({
          check: `table_exists_${tableName}`,
          status: 'fail',
          message: `Error checking table '${tableName}': ${error}`,
          details: { tableName, error: String(error) }
        });
      }
    }

    return results;
  }

  async checkAuditFields(tables: string[], requiredFields: string[]): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];

    for (const tableName of tables) {
      try {
        const columnResult = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        `);
        
        const existingColumns = columnResult.rows.map((r: any) => r.column_name);
        const missingFields = requiredFields.filter(f => {
          const snakeCase = f.replace(/([A-Z])/g, '_$1').toLowerCase();
          return !existingColumns.includes(snakeCase) && !existingColumns.includes(f);
        });

        if (missingFields.length > 0) {
          results.push({
            check: `audit_fields_${tableName}`,
            status: 'fail',
            message: `Table '${tableName}' missing audit fields: ${missingFields.join(', ')}`,
            details: { tableName, missingFields, existingColumns }
          });
        } else {
          results.push({
            check: `audit_fields_${tableName}`,
            status: 'pass',
            message: `Table '${tableName}' has all required audit fields`,
            details: { tableName, requiredFields }
          });
        }
      } catch (error) {
        results.push({
          check: `audit_fields_${tableName}`,
          status: 'warn',
          message: `Could not verify audit fields for '${tableName}': ${error}`,
          details: { tableName, error: String(error) }
        });
      }
    }

    return results;
  }

  async checkColumnSchemas(tableSchemas: Record<string, TableSchema>): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];

    for (const [tableName, schema] of Object.entries(tableSchemas)) {
      try {
        const columnResult = await db.execute(sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        `);
        
        const existingColumns = columnResult.rows.map((r: any) => r.column_name);
        const allRequiredColumns = [...schema.requiredColumns, ...(schema.auditColumns || [])];
        const missingColumns: string[] = [];

        for (const requiredCol of allRequiredColumns) {
          const snakeCase = requiredCol.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (!existingColumns.includes(requiredCol) && !existingColumns.includes(snakeCase)) {
            missingColumns.push(requiredCol);
          }
        }

        if (missingColumns.length > 0) {
          results.push({
            check: `column_schema_${tableName}`,
            status: 'fail',
            message: `CRITICAL: Table '${tableName}' missing required columns: ${missingColumns.join(', ')}`,
            details: { 
              tableName, 
              missingColumns, 
              existingColumns,
              requiredColumns: allRequiredColumns
            }
          });
        } else {
          results.push({
            check: `column_schema_${tableName}`,
            status: 'pass',
            message: `Table '${tableName}' has all required columns (${allRequiredColumns.length} columns verified)`,
            details: { tableName, verifiedColumns: allRequiredColumns.length }
          });
        }
      } catch (error) {
        results.push({
          check: `column_schema_${tableName}`,
          status: 'fail',
          message: `Error checking columns for '${tableName}': ${error}`,
          details: { tableName, error: String(error) }
        });
      }
    }

    return results;
  }

  async checkServiceDependencies(services: string[]): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];
    const servicesDir = path.join(process.cwd(), 'server', 'services');

    for (const serviceName of services) {
      const servicePath = path.join(servicesDir, `${serviceName}.ts`);
      const exists = fs.existsSync(servicePath);

      results.push({
        check: `service_exists_${serviceName}`,
        status: exists ? 'pass' : 'fail',
        message: exists 
          ? `Service '${serviceName}' exists` 
          : `CRITICAL: Service '${serviceName}.ts' not found`,
        details: { serviceName, path: servicePath, exists }
      });
    }

    return results;
  }

  checkRouteDependencies(routes: string[], strictMode: boolean = true): PreFlightCheckResult[] {
    const results: PreFlightCheckResult[] = [];
    const routesFilePath = path.join(process.cwd(), 'server', 'routes.ts');
    let routesFileContent = '';
    
    try {
      routesFileContent = fs.readFileSync(routesFilePath, 'utf-8');
    } catch (error) {
      results.push({
        check: 'routes_file_readable',
        status: 'fail',
        message: 'CRITICAL: Could not read routes.ts file',
        details: { error: String(error) }
      });
      return results;
    }

    let missingRoutes = 0;
    for (const route of routes) {
      const routePattern = route.replace(/\*/g, '').replace(/\//g, '\\/');
      const routeRegex = new RegExp(`(app\\.(get|post|put|patch|delete|use).*["'\`]${routePattern}|["'\`]${routePattern}["'\`])`, 'i');
      const isRegistered = routeRegex.test(routesFileContent);

      if (!isRegistered) {
        missingRoutes++;
      }

      results.push({
        check: `route_registered_${route}`,
        status: isRegistered ? 'pass' : (strictMode ? 'fail' : 'warn'),
        message: isRegistered 
          ? `Route '${route}' is registered in routes.ts`
          : strictMode
            ? `CRITICAL: Route '${route}' is NOT registered - deployment blocked`
            : `WARNING: Route '${route}' may not be registered - verify manually`,
        details: { route, registered: isRegistered, strictMode }
      });
    }

    if (missingRoutes > 0 && strictMode) {
      results.push({
        check: 'routes_summary',
        status: 'fail',
        message: `DEPLOYMENT BLOCKED: ${missingRoutes} of ${routes.length} required routes are missing`,
        details: { missingRoutes, totalRoutes: routes.length }
      });
    }

    return results;
  }

  checkRBACRequirements(rbac: RBACRequirements | undefined): PreFlightCheckResult[] {
    const results: PreFlightCheckResult[] = [];

    if (!rbac) {
      results.push({
        check: 'rbac_defined',
        status: 'warn',
        message: 'No RBAC requirements defined in manifest - manual verification needed',
        details: { rbacDefined: false }
      });
      return results;
    }

    const validRoles = ['user', 'team_member', 'supervisor', 'manager', 'admin', 'super_admin', 'owner'];
    const roleValid = validRoles.includes(rbac.minRole);

    results.push({
      check: 'rbac_min_role',
      status: roleValid ? 'pass' : 'fail',
      message: roleValid 
        ? `RBAC minimum role '${rbac.minRole}' is valid`
        : `CRITICAL: Invalid RBAC minimum role '${rbac.minRole}'`,
      details: { minRole: rbac.minRole, validRoles }
    });

    if (rbac.adminRoutes && rbac.adminRoutes.length > 0) {
      results.push({
        check: 'rbac_admin_routes',
        status: 'pass',
        message: `${rbac.adminRoutes.length} admin-only routes defined for elevated access control`,
        details: { adminRoutes: rbac.adminRoutes }
      });
    }

    return results;
  }

  checkSecretDependencies(secrets: string[], critical: boolean = true): PreFlightCheckResult[] {
    const results: PreFlightCheckResult[] = [];

    for (const secret of secrets) {
      const exists = !!process.env[secret];
      const status = exists ? 'pass' : (critical ? 'fail' : 'warn');
      
      results.push({
        check: `secret_exists_${secret}`,
        status,
        message: exists 
          ? `Secret '${secret}' is configured` 
          : critical 
            ? `CRITICAL: Required secret '${secret}' not found in environment`
            : `WARNING: Optional secret '${secret}' not found in environment`,
        details: { secret, configured: exists, critical }
      });
    }

    return results;
  }

  async checkAuditTrailSetup(tables: string[]): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];
    const auditColumns = ['audit_hash', 'previous_audit_hash'];

    for (const tableName of tables) {
      try {
        const columnResult = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          AND column_name IN ('audit_hash', 'previous_audit_hash')
        `);
        
        const foundColumns = columnResult.rows.map((r: any) => r.column_name);
        const hasAuditTrail = auditColumns.every(col => foundColumns.includes(col));

        results.push({
          check: `audit_trail_${tableName}`,
          status: hasAuditTrail ? 'pass' : 'fail',
          message: hasAuditTrail 
            ? `Table '${tableName}' has SOX-compliant audit trail columns` 
            : `Table '${tableName}' missing audit trail columns (audit_hash, previous_audit_hash)`,
          details: { tableName, foundColumns, required: auditColumns }
        });
      } catch (error) {
        results.push({
          check: `audit_trail_${tableName}`,
          status: 'fail',
          message: `Error checking audit trail for '${tableName}': ${error}`,
          details: { tableName, error: String(error) }
        });
      }
    }

    return results;
  }

  checkGovernanceRequirements(governance: GovernanceMetadata): PreFlightCheckResult[] {
    const results: PreFlightCheckResult[] = [];

    if (governance.togaf) {
      const validPhases = ['preliminary', 'vision', 'business', 'information', 'technology', 'opportunities', 'migration', 'governance', 'change'];
      const phaseValid = validPhases.includes(governance.togaf.admPhase);
      
      results.push({
        check: 'togaf_adm_phase',
        status: phaseValid ? 'pass' : 'fail',
        message: phaseValid 
          ? `TOGAF ADM Phase '${governance.togaf.admPhase}' is valid`
          : `CRITICAL: Invalid TOGAF ADM Phase '${governance.togaf.admPhase}'`,
        details: { phase: governance.togaf.admPhase, validPhases }
      });

      if (governance.togaf.architectureContract) {
        const contract = governance.togaf.architectureContract;
        const hasRequiredFields = contract.stakeholders.length > 0 && 
                                  contract.deliverables.length > 0 && 
                                  contract.complianceCriteria.length > 0;
        
        results.push({
          check: 'togaf_architecture_contract',
          status: hasRequiredFields ? 'pass' : 'warn',
          message: hasRequiredFields 
            ? `Architecture Contract defined with ${contract.stakeholders.length} stakeholders, ${contract.deliverables.length} deliverables`
            : 'Architecture Contract incomplete - missing stakeholders, deliverables, or compliance criteria',
          details: { 
            stakeholders: contract.stakeholders.length,
            deliverables: contract.deliverables.length,
            complianceCriteria: contract.complianceCriteria.length,
            slaMetrics: Object.keys(contract.slaMetrics).length
          }
        });
      }

      if (governance.togaf.arbApproval?.required) {
        results.push({
          check: 'togaf_arb_approval',
          status: 'warn',
          message: `Architecture Review Board approval required at '${governance.togaf.arbApproval.approvalLevel}' level`,
          details: { required: true, level: governance.togaf.arbApproval.approvalLevel }
        });
      }
    }

    if (governance.cobit2024) {
      const objectives = governance.cobit2024.objectives;
      const belowTarget = objectives.filter(o => o.currentLevel < o.targetLevel);
      const avgGap = belowTarget.length > 0 
        ? belowTarget.reduce((sum, o) => sum + (o.targetLevel - o.currentLevel), 0) / belowTarget.length
        : 0;

      const maturityStatus = avgGap === 0 ? 'pass' : avgGap <= 1 ? 'warn' : 'fail';
      
      results.push({
        check: 'cobit_maturity',
        status: maturityStatus,
        message: avgGap === 0 
          ? `All ${objectives.length} COBIT objectives meet target maturity levels`
          : `${belowTarget.length} of ${objectives.length} COBIT objectives below target (avg gap: ${avgGap.toFixed(1)})`,
        details: { 
          totalObjectives: objectives.length,
          belowTarget: belowTarget.length,
          avgGap,
          objectives: objectives.map(o => ({
            id: o.id,
            current: o.currentLevel,
            target: o.targetLevel,
            gap: o.targetLevel - o.currentLevel
          }))
        }
      });

      if (governance.cobit2024.kpis && governance.cobit2024.kpis.length > 0) {
        results.push({
          check: 'cobit_kpi_tracking',
          status: 'pass',
          message: `${governance.cobit2024.kpis.length} KPIs defined for performance tracking`,
          details: { kpis: governance.cobit2024.kpis.map(k => k.name) }
        });
      }
    }

    if (governance.raci && governance.raci.length > 0) {
      const hasAccountable = governance.raci.every(r => r.accountable && r.accountable.length > 0);
      const hasResponsible = governance.raci.every(r => r.responsible && r.responsible.length > 0);

      results.push({
        check: 'raci_matrix',
        status: hasAccountable && hasResponsible ? 'pass' : 'warn',
        message: hasAccountable && hasResponsible 
          ? `RACI matrix defined for ${governance.raci.length} activities with clear accountability`
          : `RACI matrix has ${governance.raci.length} activities but some lack clear Accountable/Responsible roles`,
        details: { 
          activities: governance.raci.length,
          hasAccountable,
          hasResponsible
        }
      });
    }

    if (governance.soxControls) {
      const itgc = governance.soxControls.itgc;
      const allControlsEnabled = Object.values(itgc).every(v => v === true);
      const enabledCount = Object.values(itgc).filter(v => v === true).length;
      const totalControls = Object.keys(itgc).length;

      results.push({
        check: 'sox_itgc',
        status: allControlsEnabled ? 'pass' : 'fail',
        message: allControlsEnabled 
          ? `All ${totalControls} IT General Controls are enabled`
          : `CRITICAL: Only ${enabledCount} of ${totalControls} IT General Controls are enabled`,
        details: { 
          controls: itgc,
          enabledCount,
          totalControls
        }
      });

      if (governance.soxControls.sodRequirements && governance.soxControls.sodRequirements.length > 0) {
        results.push({
          check: 'sox_sod',
          status: 'pass',
          message: `${governance.soxControls.sodRequirements.length} Segregation of Duties requirements defined`,
          details: { requirements: governance.soxControls.sodRequirements }
        });
      }
    }

    if (governance.deploymentGates) {
      const gates = governance.deploymentGates;
      
      if (gates.preDeployment) {
        const blockingGates = gates.preDeployment.gates.filter(g => g.blocking);
        results.push({
          check: 'deployment_gates_pre',
          status: blockingGates.length > 0 ? 'pass' : 'warn',
          message: `Pre-deployment: ${gates.preDeployment.gates.length} gates configured (${blockingGates.length} blocking)`,
          details: { 
            gates: gates.preDeployment.gates,
            timeout: gates.preDeployment.timeout,
            samplingInterval: gates.preDeployment.samplingInterval
          }
        });
      }

      if (gates.postDeployment) {
        const postBlockingGates = gates.postDeployment.gates.filter(g => g.blocking);
        results.push({
          check: 'deployment_gates_post',
          status: postBlockingGates.length > 0 ? 'pass' : 'warn',
          message: `Post-deployment: ${gates.postDeployment.gates.length} gates configured (${postBlockingGates.length} blocking)`,
          details: { 
            gates: gates.postDeployment.gates,
            timeout: gates.postDeployment.timeout,
            samplingInterval: gates.postDeployment.samplingInterval
          }
        });
      }

      if (gates.rollbackValidation) {
        const rb = gates.rollbackValidation;
        const rollbackReady = rb.procedureDocumented && rb.previousVersionRetained && rb.rollbackTested;
        
        results.push({
          check: 'rollback_validation',
          status: rollbackReady ? 'pass' : 'fail',
          message: rollbackReady 
            ? `Rollback validation complete (max ${rb.maxRollbackTime}s)`
            : 'CRITICAL: Rollback not fully validated - procedure, retention, or testing incomplete',
          details: rb
        });
      }
    }

    return results;
  }

  async getAllManifests(): Promise<FeatureManifest[]> {
    const manifests: FeatureManifest[] = [];
    
    try {
      if (fs.existsSync(this.manifestsDir)) {
        const files = fs.readdirSync(this.manifestsDir);
        for (const file of files) {
          if (file.endsWith('.manifest.json')) {
            const content = fs.readFileSync(path.join(this.manifestsDir, file), 'utf-8');
            manifests.push(JSON.parse(content));
          }
        }
      }
    } catch (error) {
      console.error('Error reading manifests:', error);
    }

    return manifests;
  }

  async runAllPreFlightChecks(): Promise<PreFlightReport[]> {
    const manifests = await this.getAllManifests();
    const reports: PreFlightReport[] = [];

    for (const manifest of manifests) {
      const featureName = manifest.feature.replace(/\s+/g, '-').toLowerCase();
      const report = await this.runPreFlightCheck(featureName);
      reports.push(report);
    }

    return reports;
  }
}

export const preFlightChecklistService = new PreFlightChecklistService();
export default preFlightChecklistService;
