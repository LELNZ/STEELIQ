import { db } from "./db";
import { projectLifecycleTemplates } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

interface TemplatePhase {
  phaseName: string;
  phaseCode: string;
  description: string;
  sequenceOrder: number;
  tasks: TemplateTask[];
}

interface TemplateTask {
  taskName: string;
  taskCode: string;
  description: string;
  responsibleParty: string;
  approvalRequired: boolean;
  requiredDocuments: string[];
  automationTrigger?: string;
  sequenceOrder: number;
}

interface CreateTemplateInput {
  name: string;
  description: string;
  industry: string;
  projectType: string;
  phases: TemplatePhase[];
}

class LifecycleTemplateService {
  async getAllTemplates() {
    const templates = await db.select()
      .from(projectLifecycleTemplates)
      .orderBy(desc(projectLifecycleTemplates.createdAt));
    
    return templates;
  }

  async getTemplateById(id: number) {
    const [template] = await db.select()
      .from(projectLifecycleTemplates)
      .where(eq(projectLifecycleTemplates.id, id));
    
    return template;
  }

  async createTemplate(data: CreateTemplateInput) {
    const [template] = await db.insert(projectLifecycleTemplates)
      .values({
        name: data.name,
        description: data.description,
        industry: data.industry,
        projectType: data.projectType,
        phases: data.phases,
        isActive: true
      })
      .returning();
    
    return template;
  }

  async updateTemplate(id: number, data: Partial<CreateTemplateInput>) {
    const [template] = await db.update(projectLifecycleTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(projectLifecycleTemplates.id, id))
      .returning();
    
    return template;
  }

  async deleteTemplate(id: number) {
    await db.delete(projectLifecycleTemplates)
      .where(eq(projectLifecycleTemplates.id, id));
  }

  async getTemplatesForIndustry(industry: string) {
    const templates = await db.select()
      .from(projectLifecycleTemplates)
      .where(
        and(
          eq(projectLifecycleTemplates.industry, industry),
          eq(projectLifecycleTemplates.isActive, true)
        )
      )
      .orderBy(projectLifecycleTemplates.name);
    
    return templates;
  }

  async duplicateTemplate(id: number, newName: string) {
    const original = await this.getTemplateById(id);
    if (!original) {
      throw new Error('Template not found');
    }

    const [duplicate] = await db.insert(projectLifecycleTemplates)
      .values({
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        industry: original.industry,
        projectType: original.projectType,
        phases: original.phases,
        isActive: true
      })
      .returning();
    
    return duplicate;
  }

  async getDefaultSteelFabricationTemplate() {
    // Create a default template for steel fabrication if none exists
    const [existing] = await db.select()
      .from(projectLifecycleTemplates)
      .where(
        and(
          eq(projectLifecycleTemplates.industry, 'steel_fabrication'),
          eq(projectLifecycleTemplates.name, 'Standard Steel Fabrication Workflow')
        )
      );
    
    if (existing) {
      return existing;
    }

    // Create default template
    const defaultTemplate: CreateTemplateInput = {
      name: 'Standard Steel Fabrication Workflow',
      description: 'Complete steel fabrication project lifecycle from inquiry to completion',
      industry: 'steel_fabrication',
      projectType: 'standard',
      phases: [
        {
          phaseName: 'Pre-Fabrication',
          phaseCode: 'PRE-FAB',
          description: 'Initial project setup, documentation, and approvals',
          sequenceOrder: 1,
          tasks: [
            {
              taskName: 'Initial Inquiry',
              taskCode: 'PRE-001',
              description: 'Receive and review initial project inquiry',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Inquiry Form', 'Initial Drawings'],
              sequenceOrder: 1
            },
            {
              taskName: 'Site Measurement',
              taskCode: 'PRE-002',
              description: 'Conduct site visit and take measurements',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Site Photos', 'Measurement Report'],
              sequenceOrder: 2
            },
            {
              taskName: 'Quote Preparation',
              taskCode: 'PRE-003',
              description: 'Prepare detailed quote and submit to client',
              responsibleParty: 'LEL',
              approvalRequired: true,
              requiredDocuments: ['Quote Document', 'Specifications'],
              sequenceOrder: 3
            },
            {
              taskName: 'Quote Acceptance',
              taskCode: 'PRE-004',
              description: 'Client reviews and accepts quote',
              responsibleParty: 'Client',
              approvalRequired: true,
              requiredDocuments: ['Signed Quote', 'Purchase Order'],
              automationTrigger: 'e-signature',
              sequenceOrder: 4
            }
          ]
        },
        {
          phaseName: 'Design & Documentation',
          phaseCode: 'DESIGN',
          description: 'Engineering, detailing, and documentation phase',
          sequenceOrder: 2,
          tasks: [
            {
              taskName: 'Structural Engineering',
              taskCode: 'DES-001',
              description: 'Complete structural engineering calculations',
              responsibleParty: 'Engineer',
              approvalRequired: true,
              requiredDocuments: ['Engineering Calculations', 'PS1'],
              sequenceOrder: 1
            },
            {
              taskName: 'Shop Drawings',
              taskCode: 'DES-002',
              description: 'Create detailed shop drawings',
              responsibleParty: 'Detailer',
              approvalRequired: true,
              requiredDocuments: ['Shop Drawings', 'Assembly Drawings'],
              sequenceOrder: 2
            },
            {
              taskName: 'Client Approval',
              taskCode: 'DES-003',
              description: 'Client approves shop drawings',
              responsibleParty: 'Client',
              approvalRequired: true,
              requiredDocuments: ['Approved Drawings'],
              sequenceOrder: 3
            }
          ]
        },
        {
          phaseName: 'Fabrication',
          phaseCode: 'FAB',
          description: 'Manufacturing and quality control',
          sequenceOrder: 3,
          tasks: [
            {
              taskName: 'Material Ordering',
              taskCode: 'FAB-001',
              description: 'Order materials from suppliers',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Purchase Orders', 'Mill Certificates'],
              sequenceOrder: 1
            },
            {
              taskName: 'Cutting & Preparation',
              taskCode: 'FAB-002',
              description: 'Cut and prepare steel members',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Cutting Lists', 'QC Reports'],
              sequenceOrder: 2
            },
            {
              taskName: 'Welding & Assembly',
              taskCode: 'FAB-003',
              description: 'Weld and assemble components',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Welding Procedures', 'WPS'],
              sequenceOrder: 3
            },
            {
              taskName: 'Surface Treatment',
              taskCode: 'FAB-004',
              description: 'Apply surface treatment and coatings',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Coating Specifications', 'QC Reports'],
              sequenceOrder: 4
            }
          ]
        },
        {
          phaseName: 'Post-Fabrication',
          phaseCode: 'POST-FAB',
          description: 'Delivery, installation, and project closure',
          sequenceOrder: 4,
          tasks: [
            {
              taskName: 'Final Inspection',
              taskCode: 'POST-001',
              description: 'Conduct final quality inspection',
              responsibleParty: 'LEL',
              approvalRequired: true,
              requiredDocuments: ['Inspection Report', 'Photos'],
              sequenceOrder: 1
            },
            {
              taskName: 'Delivery Coordination',
              taskCode: 'POST-002',
              description: 'Coordinate delivery to site',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Delivery Schedule', 'Transport Docs'],
              sequenceOrder: 2
            },
            {
              taskName: 'Site Installation',
              taskCode: 'POST-003',
              description: 'Install steel components on site',
              responsibleParty: 'Subcontractor',
              approvalRequired: false,
              requiredDocuments: ['Installation Report', 'Site Photos'],
              sequenceOrder: 3
            },
            {
              taskName: 'Project Handover',
              taskCode: 'POST-004',
              description: 'Complete project handover to client',
              responsibleParty: 'LEL',
              approvalRequired: true,
              requiredDocuments: ['PS4', 'Warranty', 'O&M Manual'],
              sequenceOrder: 4
            },
            {
              taskName: 'Final Invoice',
              taskCode: 'POST-005',
              description: 'Issue final invoice',
              responsibleParty: 'LEL',
              approvalRequired: false,
              requiredDocuments: ['Invoice'],
              automationTrigger: 'xero_invoice',
              sequenceOrder: 5
            }
          ]
        }
      ]
    };

    return this.createTemplate(defaultTemplate);
  }
}

export const lifecycleTemplateService = new LifecycleTemplateService();