import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { preFlightChecklistService, FeatureManifest, PreFlightReport } from './preFlightChecklist';

export interface CompletenessReport {
  timestamp: string;
  agentVersion: string;
  totalFeatures: number;
  completeFeatures: number;
  incompleteFeatures: number;
  overallCompleteness: number;
  features: FeatureCompletenessReport[];
  recommendations: string[];
  criticalGaps: string[];
}

export interface FeatureCompletenessReport {
  feature: string;
  version: string;
  completenessScore: number;
  status: 'complete' | 'incomplete' | 'partial';
  missingComponents: {
    tables: string[];
    services: string[];
    routes: string[];
    auditFields: string[];
  };
  existingComponents: {
    tables: string[];
    services: string[];
  };
}

export interface DependencyMap {
  feature: string;
  dependencies: {
    upstream: string[];
    downstream: string[];
    tables: string[];
    services: string[];
    sharedWith: string[];
  };
}

class CompletenessAgentService {
  private readonly AGENT_VERSION = 'v1.0.0';
  private manifestsDir: string;

  constructor() {
    this.manifestsDir = path.join(process.cwd(), 'server', 'manifests');
  }

  async runCompletenessCheck(): Promise<CompletenessReport> {
    const manifests = await preFlightChecklistService.getAllManifests();
    const featureReports: FeatureCompletenessReport[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];

    for (const manifest of manifests) {
      const featureName = manifest.feature.replace(/\s+/g, '-').toLowerCase();
      const report = await this.checkFeatureCompleteness(manifest);
      featureReports.push(report);

      if (report.status === 'incomplete') {
        if (report.missingComponents.tables.length > 0) {
          criticalGaps.push(`${manifest.feature}: Missing tables - ${report.missingComponents.tables.join(', ')}`);
        }
        if (report.missingComponents.services.length > 0) {
          criticalGaps.push(`${manifest.feature}: Missing services - ${report.missingComponents.services.join(', ')}`);
        }
      }

      if (report.completenessScore < 100) {
        recommendations.push(...this.generateRecommendations(manifest, report));
      }
    }

    const completeFeatures = featureReports.filter(f => f.status === 'complete').length;
    const overallCompleteness = featureReports.length > 0
      ? featureReports.reduce((sum, f) => sum + f.completenessScore, 0) / featureReports.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      agentVersion: this.AGENT_VERSION,
      totalFeatures: manifests.length,
      completeFeatures,
      incompleteFeatures: manifests.length - completeFeatures,
      overallCompleteness: Math.round(overallCompleteness),
      features: featureReports,
      recommendations,
      criticalGaps
    };
  }

  async checkFeatureCompleteness(manifest: FeatureManifest): Promise<FeatureCompletenessReport> {
    const missingTables: string[] = [];
    const existingTables: string[] = [];
    const missingServices: string[] = [];
    const existingServices: string[] = [];
    const missingAuditFields: string[] = [];
    const missingRoutes: string[] = [];

    for (const table of manifest.dependencies.tables) {
      const exists = await this.tableExists(table);
      if (exists) {
        existingTables.push(table);
        
        if (manifest.auditFields) {
          const hasAuditFields = await this.checkTableAuditFields(table);
          if (!hasAuditFields) {
            missingAuditFields.push(`${table} (missing audit_hash columns)`);
          }
        }
      } else {
        missingTables.push(table);
      }
    }

    if (manifest.dependencies.services) {
      for (const service of manifest.dependencies.services) {
        const exists = this.serviceExists(service);
        if (exists) {
          existingServices.push(service);
        } else {
          missingServices.push(service);
        }
      }
    }

    const totalComponents = 
      manifest.dependencies.tables.length + 
      (manifest.dependencies.services?.length || 0);
    
    const existingComponents = existingTables.length + existingServices.length;
    const completenessScore = totalComponents > 0 
      ? Math.round((existingComponents / totalComponents) * 100) 
      : 100;

    let status: 'complete' | 'incomplete' | 'partial';
    if (missingTables.length === 0 && missingServices.length === 0) {
      status = missingAuditFields.length === 0 ? 'complete' : 'partial';
    } else if (existingTables.length === 0 && existingServices.length === 0) {
      status = 'incomplete';
    } else {
      status = 'partial';
    }

    return {
      feature: manifest.feature,
      version: manifest.version,
      completenessScore,
      status,
      missingComponents: {
        tables: missingTables,
        services: missingServices,
        routes: missingRoutes,
        auditFields: missingAuditFields
      },
      existingComponents: {
        tables: existingTables,
        services: existingServices
      }
    };
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `);
      return result.rows[0]?.exists === true;
    } catch {
      return false;
    }
  }

  async checkTableAuditFields(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name IN ('audit_hash', 'previous_audit_hash')
      `);
      return parseInt(result.rows[0]?.count) >= 2;
    } catch {
      return false;
    }
  }

  serviceExists(serviceName: string): boolean {
    const servicePath = path.join(process.cwd(), 'server', 'services', `${serviceName}.ts`);
    return fs.existsSync(servicePath);
  }

  generateRecommendations(manifest: FeatureManifest, report: FeatureCompletenessReport): string[] {
    const recommendations: string[] = [];

    if (report.missingComponents.tables.length > 0) {
      recommendations.push(
        `CREATE TABLES: Run database migrations to create missing tables for ${manifest.feature}: ${report.missingComponents.tables.join(', ')}`
      );
    }

    if (report.missingComponents.services.length > 0) {
      recommendations.push(
        `CREATE SERVICES: Implement missing service files for ${manifest.feature}: ${report.missingComponents.services.map(s => `${s}.ts`).join(', ')}`
      );
    }

    if (report.missingComponents.auditFields.length > 0) {
      recommendations.push(
        `ADD AUDIT FIELDS: Add audit_hash and previous_audit_hash columns to: ${report.missingComponents.auditFields.join(', ')}`
      );
    }

    return recommendations;
  }

  async generateDependencyMap(): Promise<DependencyMap[]> {
    const manifests = await preFlightChecklistService.getAllManifests();
    const dependencyMaps: DependencyMap[] = [];

    const tableToFeature: Map<string, string[]> = new Map();
    const serviceToFeature: Map<string, string[]> = new Map();

    for (const manifest of manifests) {
      for (const table of manifest.dependencies.tables) {
        if (!tableToFeature.has(table)) {
          tableToFeature.set(table, []);
        }
        tableToFeature.get(table)!.push(manifest.feature);
      }

      if (manifest.dependencies.services) {
        for (const service of manifest.dependencies.services) {
          if (!serviceToFeature.has(service)) {
            serviceToFeature.set(service, []);
          }
          serviceToFeature.get(service)!.push(manifest.feature);
        }
      }
    }

    for (const manifest of manifests) {
      const sharedWith: Set<string> = new Set();
      
      for (const table of manifest.dependencies.tables) {
        const features = tableToFeature.get(table) || [];
        features.filter(f => f !== manifest.feature).forEach(f => sharedWith.add(f));
      }

      if (manifest.dependencies.services) {
        for (const service of manifest.dependencies.services) {
          const features = serviceToFeature.get(service) || [];
          features.filter(f => f !== manifest.feature).forEach(f => sharedWith.add(f));
        }
      }

      dependencyMaps.push({
        feature: manifest.feature,
        dependencies: {
          upstream: [],
          downstream: [],
          tables: manifest.dependencies.tables,
          services: manifest.dependencies.services || [],
          sharedWith: Array.from(sharedWith)
        }
      });
    }

    return dependencyMaps;
  }

  async validateBeforeDeployment(featureName: string): Promise<{
    canDeploy: boolean;
    blockers: string[];
    warnings: string[];
    completenessScore: number;
  }> {
    const preFlightReport = await preFlightChecklistService.runPreFlightCheck(featureName);
    const manifests = await preFlightChecklistService.getAllManifests();
    const manifest = manifests.find(m => 
      m.feature.replace(/\s+/g, '-').toLowerCase() === featureName
    );

    if (!manifest) {
      return {
        canDeploy: false,
        blockers: [`No manifest found for feature: ${featureName}`],
        warnings: [],
        completenessScore: 0
      };
    }

    const completenessReport = await this.checkFeatureCompleteness(manifest);

    return {
      canDeploy: preFlightReport.canDeploy && completenessReport.status !== 'incomplete',
      blockers: [
        ...preFlightReport.blockingIssues,
        ...(completenessReport.status === 'incomplete' 
          ? [`Feature ${featureName} is incomplete: missing ${completenessReport.missingComponents.tables.length} tables, ${completenessReport.missingComponents.services.length} services`]
          : [])
      ],
      warnings: [
        ...preFlightReport.warnings,
        ...(completenessReport.missingComponents.auditFields.length > 0 
          ? [`Missing audit trail fields in: ${completenessReport.missingComponents.auditFields.join(', ')}`]
          : [])
      ],
      completenessScore: completenessReport.completenessScore
    };
  }
}

export const completenessAgentService = new CompletenessAgentService();
export default completenessAgentService;
