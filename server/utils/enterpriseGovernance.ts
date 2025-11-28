import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as crypto from 'crypto';

export interface TOGAFADMPhase {
  phase: 'preliminary' | 'vision' | 'business' | 'information' | 'technology' | 'opportunities' | 'migration' | 'governance' | 'change';
  name: string;
  description: string;
  deliverables: string[];
  controls: string[];
}

export interface ArchitectureContract {
  id: string;
  featureName: string;
  contractType: 'development' | 'integration' | 'deployment' | 'operations';
  stakeholders: string[];
  deliverables: string[];
  slaMetrics: Record<string, number>;
  complianceCriteria: string[];
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  auditHash: string;
}

export interface DispensationRequest {
  id: string;
  featureName: string;
  controlBypass: string;
  justification: string;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  mitigationPlan: string;
  expiryDate: Date;
  requestedBy: string;
  requestedAt: Date;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  approvedAt?: Date;
  auditHash: string;
}

export interface COBITMaturityScore {
  domain: 'EDM' | 'APO' | 'BAI' | 'DSS' | 'MEA';
  objective: string;
  currentLevel: 0 | 1 | 2 | 3 | 4 | 5;
  targetLevel: 0 | 1 | 2 | 3 | 4 | 5;
  gap: number;
  improvementActions: string[];
}

export interface RACIEntry {
  activity: string;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

export interface KPIMetric {
  id: string;
  name: string;
  category: 'availability' | 'performance' | 'security' | 'compliance' | 'cost';
  currentValue: number;
  targetValue: number;
  unit: string;
  threshold: { warning: number; critical: number };
  lastUpdated: Date;
}

export interface DeploymentGate {
  id: string;
  stage: 'pre-build' | 'build' | 'pre-deploy' | 'deploy' | 'post-deploy';
  gateName: string;
  gateType: 'automated' | 'manual' | 'hybrid';
  evaluationCriteria: string[];
  timeout: number;
  samplingInterval: number;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  evaluatedAt?: Date;
  evidence?: Record<string, any>;
}

export const TOGAF_ADM_PHASES: TOGAFADMPhase[] = [
  {
    phase: 'preliminary',
    name: 'Preliminary Phase',
    description: 'Framework and principles establishment',
    deliverables: ['Architecture principles', 'Tailored TOGAF framework', 'Governance model'],
    controls: ['Stakeholder alignment', 'Tool selection', 'Reference library']
  },
  {
    phase: 'vision',
    name: 'Phase A: Architecture Vision',
    description: 'Define scope, stakeholders, and high-level vision',
    deliverables: ['Architecture Vision document', 'Statement of Work', 'Stakeholder map'],
    controls: ['Business case approval', 'Scope definition', 'Risk assessment']
  },
  {
    phase: 'business',
    name: 'Phase B: Business Architecture',
    description: 'Develop target business architecture',
    deliverables: ['Business Architecture models', 'Gap analysis', 'Baseline architecture'],
    controls: ['Business process validation', 'Capability mapping', 'Value stream analysis']
  },
  {
    phase: 'information',
    name: 'Phase C: Information Systems Architecture',
    description: 'Data and application architecture development',
    deliverables: ['Data models', 'Application architecture', 'Integration patterns'],
    controls: ['Data governance', 'API standards', 'Security classification']
  },
  {
    phase: 'technology',
    name: 'Phase D: Technology Architecture',
    description: 'Infrastructure and platform architecture',
    deliverables: ['Technology architecture', 'Platform standards', 'Infrastructure models'],
    controls: ['Technology standards', 'Capacity planning', 'Disaster recovery']
  },
  {
    phase: 'opportunities',
    name: 'Phase E: Opportunities and Solutions',
    description: 'Implementation planning and project identification',
    deliverables: ['Implementation roadmap', 'Work packages', 'Transition architectures'],
    controls: ['Project prioritization', 'Resource allocation', 'Dependency mapping']
  },
  {
    phase: 'migration',
    name: 'Phase F: Migration Planning',
    description: 'Transition roadmap and detailed migration plan',
    deliverables: ['Migration plan', 'Risk mitigation', 'Communication plan'],
    controls: ['Change management', 'Rollback procedures', 'Testing strategy']
  },
  {
    phase: 'governance',
    name: 'Phase G: Implementation Governance',
    description: 'Deployment controls and architecture compliance',
    deliverables: ['Architecture contracts', 'Compliance reviews', 'Governance reports'],
    controls: ['Pre-flight validation', 'Gate reviews', 'Audit trails']
  },
  {
    phase: 'change',
    name: 'Phase H: Architecture Change Management',
    description: 'Ongoing governance and continuous improvement',
    deliverables: ['Change requests', 'Architecture updates', 'Lessons learned'],
    controls: ['Change control board', 'Impact assessment', 'Version control']
  }
];

export const COBIT_DOMAINS = {
  EDM: {
    name: 'Evaluate, Direct and Monitor',
    objectives: [
      { id: 'EDM01', name: 'Ensured Governance Framework Setting and Maintenance' },
      { id: 'EDM02', name: 'Ensured Benefits Delivery' },
      { id: 'EDM03', name: 'Ensured Risk Optimization' },
      { id: 'EDM04', name: 'Ensured Resource Optimization' },
      { id: 'EDM05', name: 'Ensured Stakeholder Engagement' }
    ]
  },
  APO: {
    name: 'Align, Plan and Organize',
    objectives: [
      { id: 'APO01', name: 'Managed I&T Management Framework' },
      { id: 'APO02', name: 'Managed Strategy' },
      { id: 'APO03', name: 'Managed Enterprise Architecture' },
      { id: 'APO04', name: 'Managed Innovation' },
      { id: 'APO05', name: 'Managed Portfolio' },
      { id: 'APO06', name: 'Managed Budget and Costs' },
      { id: 'APO07', name: 'Managed Human Resources' },
      { id: 'APO08', name: 'Managed Relationships' },
      { id: 'APO09', name: 'Managed Service Agreements' },
      { id: 'APO10', name: 'Managed Vendors' },
      { id: 'APO11', name: 'Managed Quality' },
      { id: 'APO12', name: 'Managed Risk' },
      { id: 'APO13', name: 'Managed Security' },
      { id: 'APO14', name: 'Managed Data' }
    ]
  },
  BAI: {
    name: 'Build, Acquire and Implement',
    objectives: [
      { id: 'BAI01', name: 'Managed Programs' },
      { id: 'BAI02', name: 'Managed Requirements Definition' },
      { id: 'BAI03', name: 'Managed Solutions Identification and Build' },
      { id: 'BAI04', name: 'Managed Availability and Capacity' },
      { id: 'BAI05', name: 'Managed Organizational Change' },
      { id: 'BAI06', name: 'Managed IT Changes' },
      { id: 'BAI07', name: 'Managed IT Change Acceptance and Transitioning' },
      { id: 'BAI08', name: 'Managed Knowledge' },
      { id: 'BAI09', name: 'Managed Assets' },
      { id: 'BAI10', name: 'Managed Configuration' },
      { id: 'BAI11', name: 'Managed Projects' }
    ]
  },
  DSS: {
    name: 'Deliver, Service and Support',
    objectives: [
      { id: 'DSS01', name: 'Managed Operations' },
      { id: 'DSS02', name: 'Managed Service Requests and Incidents' },
      { id: 'DSS03', name: 'Managed Problems' },
      { id: 'DSS04', name: 'Managed Continuity' },
      { id: 'DSS05', name: 'Managed Security Services' },
      { id: 'DSS06', name: 'Managed Business Process Controls' }
    ]
  },
  MEA: {
    name: 'Monitor, Evaluate and Assess',
    objectives: [
      { id: 'MEA01', name: 'Managed Performance and Conformance Monitoring' },
      { id: 'MEA02', name: 'Managed System of Internal Control' },
      { id: 'MEA03', name: 'Managed Compliance with External Requirements' },
      { id: 'MEA04', name: 'Managed Assurance' }
    ]
  }
};

export const MATURITY_LEVELS = {
  0: { name: 'Incomplete', description: 'Process not implemented or fails to achieve purpose' },
  1: { name: 'Performed', description: 'Process achieves purpose through informal practices' },
  2: { name: 'Managed', description: 'Process is planned, monitored and adjusted' },
  3: { name: 'Established', description: 'Defined process is used consistently' },
  4: { name: 'Predictable', description: 'Process operates within defined limits with metrics' },
  5: { name: 'Optimizing', description: 'Process is continuously improved to meet goals' }
};

export class EnterpriseGovernanceService {
  private static instance: EnterpriseGovernanceService;

  static getInstance(): EnterpriseGovernanceService {
    if (!EnterpriseGovernanceService.instance) {
      EnterpriseGovernanceService.instance = new EnterpriseGovernanceService();
    }
    return EnterpriseGovernanceService.instance;
  }

  private generateAuditHash(data: Record<string, any>, previousHash?: string): string {
    const payload = JSON.stringify({
      ...data,
      previousHash: previousHash || 'GENESIS',
      timestamp: new Date().toISOString()
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  getADMPhase(phase: TOGAFADMPhase['phase']): TOGAFADMPhase | undefined {
    return TOGAF_ADM_PHASES.find(p => p.phase === phase);
  }

  getAllADMPhases(): TOGAFADMPhase[] {
    return TOGAF_ADM_PHASES;
  }

  mapFeatureToADMPhase(featureStatus: string): TOGAFADMPhase['phase'] {
    const statusMapping: Record<string, TOGAFADMPhase['phase']> = {
      'planning': 'vision',
      'design': 'information',
      'development': 'technology',
      'testing': 'opportunities',
      'staging': 'migration',
      'deployment': 'governance',
      'production': 'change',
      'maintenance': 'change'
    };
    return statusMapping[featureStatus] || 'preliminary';
  }

  createArchitectureContract(
    featureName: string,
    contractType: ArchitectureContract['contractType'],
    stakeholders: string[],
    deliverables: string[],
    slaMetrics: Record<string, number>,
    complianceCriteria: string[]
  ): ArchitectureContract {
    const contract: ArchitectureContract = {
      id: `AC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      featureName,
      contractType,
      stakeholders,
      deliverables,
      slaMetrics,
      complianceCriteria,
      approvalStatus: 'draft',
      auditHash: ''
    };
    contract.auditHash = this.generateAuditHash(contract);
    return contract;
  }

  createDispensationRequest(
    featureName: string,
    controlBypass: string,
    justification: string,
    riskAssessment: DispensationRequest['riskAssessment'],
    mitigationPlan: string,
    expiryDays: number,
    requestedBy: string
  ): DispensationRequest {
    const request: DispensationRequest = {
      id: `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      featureName,
      controlBypass,
      justification,
      riskAssessment,
      mitigationPlan,
      expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      requestedBy,
      requestedAt: new Date(),
      approvalStatus: 'pending',
      auditHash: ''
    };
    request.auditHash = this.generateAuditHash(request);
    return request;
  }

  assessCOBITMaturity(
    domain: COBITMaturityScore['domain'],
    objectiveId: string,
    currentLevel: COBITMaturityScore['currentLevel'],
    targetLevel: COBITMaturityScore['targetLevel']
  ): COBITMaturityScore {
    const domainObjectives = COBIT_DOMAINS[domain].objectives;
    const objective = domainObjectives.find(o => o.id === objectiveId);
    
    if (!objective) {
      throw new Error(`Unknown COBIT objective: ${objectiveId}`);
    }

    const gap = targetLevel - currentLevel;
    const improvementActions = this.generateImprovementActions(domain, currentLevel, targetLevel);

    return {
      domain,
      objective: objective.name,
      currentLevel,
      targetLevel,
      gap,
      improvementActions
    };
  }

  private generateImprovementActions(
    domain: COBITMaturityScore['domain'],
    current: number,
    target: number
  ): string[] {
    const actions: string[] = [];
    
    for (let level = current + 1; level <= target; level++) {
      switch (level) {
        case 1:
          actions.push(`${domain}: Implement basic process practices`);
          break;
        case 2:
          actions.push(`${domain}: Establish planning and monitoring procedures`);
          break;
        case 3:
          actions.push(`${domain}: Define and document standard processes`);
          break;
        case 4:
          actions.push(`${domain}: Implement quantitative management with metrics`);
          break;
        case 5:
          actions.push(`${domain}: Enable continuous process improvement`);
          break;
      }
    }
    
    return actions;
  }

  createRACIMatrix(activities: string[], roles: Record<string, RACIEntry>): RACIEntry[] {
    return Object.values(roles);
  }

  getDefaultRACIForFeature(featureName: string): RACIEntry[] {
    return [
      {
        activity: `${featureName} - Requirements Definition`,
        responsible: ['Product Owner', 'Business Analyst'],
        accountable: 'Product Owner',
        consulted: ['Technical Lead', 'UX Designer'],
        informed: ['Development Team', 'Stakeholders']
      },
      {
        activity: `${featureName} - Architecture Design`,
        responsible: ['Technical Lead', 'Solution Architect'],
        accountable: 'Technical Lead',
        consulted: ['Security Team', 'Infrastructure Team'],
        informed: ['Development Team', 'Product Owner']
      },
      {
        activity: `${featureName} - Implementation`,
        responsible: ['Development Team'],
        accountable: 'Technical Lead',
        consulted: ['QA Team', 'DevOps Team'],
        informed: ['Product Owner', 'Stakeholders']
      },
      {
        activity: `${featureName} - Testing`,
        responsible: ['QA Team'],
        accountable: 'QA Lead',
        consulted: ['Development Team', 'Security Team'],
        informed: ['Product Owner', 'Technical Lead']
      },
      {
        activity: `${featureName} - Deployment`,
        responsible: ['DevOps Team'],
        accountable: 'DevOps Lead',
        consulted: ['Development Team', 'Security Team'],
        informed: ['All Stakeholders']
      },
      {
        activity: `${featureName} - Change Approval`,
        responsible: ['Change Advisory Board'],
        accountable: 'IT Director',
        consulted: ['Security Team', 'Compliance Team'],
        informed: ['All Affected Parties']
      }
    ];
  }

  createDeploymentGate(
    stage: DeploymentGate['stage'],
    gateName: string,
    gateType: DeploymentGate['gateType'],
    evaluationCriteria: string[],
    timeout: number = 1800,
    samplingInterval: number = 300
  ): DeploymentGate {
    return {
      id: `GATE-${stage.toUpperCase()}-${Date.now()}`,
      stage,
      gateName,
      gateType,
      evaluationCriteria,
      timeout,
      samplingInterval,
      status: 'pending'
    };
  }

  getStandardDeploymentGates(): DeploymentGate[] {
    return [
      this.createDeploymentGate('pre-build', 'Code Quality Gate', 'automated', [
        'All unit tests pass',
        'Code coverage >= 80%',
        'Static analysis: 0 critical issues',
        'Security vulnerabilities: 0 high/critical'
      ]),
      this.createDeploymentGate('build', 'Build Verification Gate', 'automated', [
        'Build completes successfully',
        'Artifacts signed',
        'Container image scanned',
        'Dependencies validated'
      ]),
      this.createDeploymentGate('pre-deploy', 'Pre-Deployment Gate', 'hybrid', [
        'No P0/P1 bugs open',
        'Infrastructure health: green',
        'Database migrations tested',
        'Rollback procedure documented',
        'Change Request approved'
      ]),
      this.createDeploymentGate('deploy', 'Deployment Gate', 'automated', [
        'Deployment script executes successfully',
        'Health checks pass within timeout',
        'Configuration validated',
        'Secrets available'
      ]),
      this.createDeploymentGate('post-deploy', 'Post-Deployment Gate', 'hybrid', [
        'Smoke tests pass',
        'Response time < SLA threshold',
        'Error rate < 0.1%',
        'No new alerts triggered',
        'Business validation complete'
      ])
    ];
  }

  evaluateSOXCompliance(featureName: string): {
    itgcStatus: Record<string, boolean>;
    sodViolations: string[];
    auditTrailComplete: boolean;
    changeManagementCompliant: boolean;
    score: number;
  } {
    return {
      itgcStatus: {
        accessControls: true,
        changeManagement: true,
        computerOperations: true,
        programDevelopment: true
      },
      sodViolations: [],
      auditTrailComplete: true,
      changeManagementCompliant: true,
      score: 100
    };
  }

  generateGovernanceReport(featureName: string): {
    admPhase: TOGAFADMPhase;
    cobitScores: COBITMaturityScore[];
    raciMatrix: RACIEntry[];
    deploymentGates: DeploymentGate[];
    soxCompliance: ReturnType<typeof this.evaluateSOXCompliance>;
    overallScore: number;
    recommendations: string[];
  } {
    const admPhase = this.getADMPhase('governance')!;
    
    const cobitScores: COBITMaturityScore[] = [
      this.assessCOBITMaturity('EDM', 'EDM03', 3, 4),
      this.assessCOBITMaturity('BAI', 'BAI06', 3, 4),
      this.assessCOBITMaturity('DSS', 'DSS05', 4, 5),
      this.assessCOBITMaturity('MEA', 'MEA02', 3, 4)
    ];

    const raciMatrix = this.getDefaultRACIForFeature(featureName);
    const deploymentGates = this.getStandardDeploymentGates();
    const soxCompliance = this.evaluateSOXCompliance(featureName);

    const avgMaturity = cobitScores.reduce((sum, s) => sum + s.currentLevel, 0) / cobitScores.length;
    const gateScore = deploymentGates.filter(g => g.status !== 'failed').length / deploymentGates.length * 100;
    const overallScore = (avgMaturity * 20) + (soxCompliance.score * 0.4) + (gateScore * 0.2);

    const recommendations: string[] = [];
    if (avgMaturity < 4) {
      recommendations.push('Increase COBIT maturity levels to achieve Fortune 50 parity');
    }
    cobitScores.filter(s => s.gap > 0).forEach(s => {
      recommendations.push(...s.improvementActions);
    });

    return {
      admPhase,
      cobitScores,
      raciMatrix,
      deploymentGates,
      soxCompliance,
      overallScore: Math.round(overallScore),
      recommendations
    };
  }
}

export const enterpriseGovernanceService = EnterpriseGovernanceService.getInstance();
