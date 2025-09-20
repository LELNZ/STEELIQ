import { db } from '../db';
import { 
  communicationTemplates, 
  supplierTemplateOverrides,
  templateVersions,
  organizationBranding 
} from '@shared/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

export class TemplateHierarchyService {
  /**
   * Get the appropriate template for a document type and supplier
   * Hierarchy: Supplier-specific > Division > Organization default
   */
  async getTemplateForSupplier(
    documentType: string, 
    supplierId?: number,
    divisionId?: number
  ): Promise<any> {
    try {
      // 1. Check for supplier-specific template override
      if (supplierId) {
        const [supplierOverride] = await db
          .select({
            template: communicationTemplates,
            version: templateVersions,
            override: supplierTemplateOverrides
          })
          .from(supplierTemplateOverrides)
          .innerJoin(
            communicationTemplates,
            eq(supplierTemplateOverrides.templateId, communicationTemplates.id)
          )
          .leftJoin(
            templateVersions,
            eq(communicationTemplates.currentVersionId, templateVersions.id)
          )
          .where(
            and(
              eq(supplierTemplateOverrides.supplierId, supplierId),
              eq(supplierTemplateOverrides.templateType, documentType),
              eq(supplierTemplateOverrides.isActive, true)
            )
          )
          .orderBy(desc(supplierTemplateOverrides.priority))
          .limit(1);

        if (supplierOverride) {
          return {
            template: supplierOverride.template,
            version: supplierOverride.version,
            source: 'supplier_override'
          };
        }
      }

      // 2. Check for supplier-specific template in communicationTemplates
      if (supplierId) {
        const [supplierTemplate] = await db
          .select({
            template: communicationTemplates,
            version: templateVersions
          })
          .from(communicationTemplates)
          .leftJoin(
            templateVersions,
            eq(communicationTemplates.currentVersionId, templateVersions.id)
          )
          .where(
            and(
              eq(communicationTemplates.type, documentType),
              eq(communicationTemplates.scope, 'supplier'),
              eq(communicationTemplates.scopeId, supplierId),
              eq(communicationTemplates.status, 'published')
            )
          )
          .limit(1);

        if (supplierTemplate) {
          return {
            template: supplierTemplate.template,
            version: supplierTemplate.version,
            source: 'supplier_template'
          };
        }
      }

      // 3. Check for division-specific template
      if (divisionId) {
        const [divisionTemplate] = await db
          .select({
            template: communicationTemplates,
            version: templateVersions
          })
          .from(communicationTemplates)
          .leftJoin(
            templateVersions,
            eq(communicationTemplates.currentVersionId, templateVersions.id)
          )
          .where(
            and(
              eq(communicationTemplates.type, documentType),
              eq(communicationTemplates.scope, 'division'),
              eq(communicationTemplates.scopeId, divisionId),
              eq(communicationTemplates.status, 'published')
            )
          )
          .limit(1);

        if (divisionTemplate) {
          return {
            template: divisionTemplate.template,
            version: divisionTemplate.version,
            source: 'division_template'
          };
        }
      }

      // 4. Fall back to organization default template
      const [orgTemplate] = await db
        .select({
          template: communicationTemplates,
          version: templateVersions
        })
        .from(communicationTemplates)
        .leftJoin(
          templateVersions,
          eq(communicationTemplates.currentVersionId, templateVersions.id)
        )
        .where(
          and(
            eq(communicationTemplates.type, documentType),
            eq(communicationTemplates.scope, 'org'),
            eq(communicationTemplates.defaultForScope, true),
            eq(communicationTemplates.status, 'published')
          )
        )
        .limit(1);

      if (orgTemplate) {
        return {
          template: orgTemplate.template,
          version: orgTemplate.version,
          source: 'organization_default'
        };
      }

      // 5. Final fallback - any published template of this type
      const [anyTemplate] = await db
        .select({
          template: communicationTemplates,
          version: templateVersions
        })
        .from(communicationTemplates)
        .leftJoin(
          templateVersions,
          eq(communicationTemplates.currentVersionId, templateVersions.id)
        )
        .where(
          and(
            eq(communicationTemplates.type, documentType),
            eq(communicationTemplates.status, 'published')
          )
        )
        .limit(1);

      return anyTemplate ? {
        template: anyTemplate.template,
        version: anyTemplate.version,
        source: 'fallback'
      } : null;

    } catch (error) {
      console.error('Error getting template for supplier:', error);
      throw error;
    }
  }

  /**
   * Set a template override for a specific supplier
   */
  async setSupplierTemplateOverride(
    supplierId: number,
    templateType: string,
    templateId: number,
    userId?: number,
    notes?: string
  ) {
    try {
      // Check if override already exists
      const [existing] = await db
        .select()
        .from(supplierTemplateOverrides)
        .where(
          and(
            eq(supplierTemplateOverrides.supplierId, supplierId),
            eq(supplierTemplateOverrides.templateType, templateType)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing override
        await db
          .update(supplierTemplateOverrides)
          .set({
            templateId,
            isActive: true,
            notes,
            updatedAt: new Date()
          })
          .where(eq(supplierTemplateOverrides.id, existing.id));

        return { updated: true, id: existing.id };
      } else {
        // Create new override
        const [newOverride] = await db
          .insert(supplierTemplateOverrides)
          .values({
            supplierId,
            templateType,
            templateId,
            isActive: true,
            notes,
            createdBy: userId
          })
          .returning();

        return { created: true, id: newOverride.id };
      }
    } catch (error) {
      console.error('Error setting supplier template override:', error);
      throw error;
    }
  }

  /**
   * Get all template overrides for a supplier
   */
  async getSupplierOverrides(supplierId: number) {
    try {
      const overrides = await db
        .select({
          override: supplierTemplateOverrides,
          template: communicationTemplates
        })
        .from(supplierTemplateOverrides)
        .innerJoin(
          communicationTemplates,
          eq(supplierTemplateOverrides.templateId, communicationTemplates.id)
        )
        .where(
          and(
            eq(supplierTemplateOverrides.supplierId, supplierId),
            eq(supplierTemplateOverrides.isActive, true)
          )
        );

      return overrides;
    } catch (error) {
      console.error('Error getting supplier overrides:', error);
      throw error;
    }
  }

  /**
   * Get organization branding settings
   */
  async getOrganizationBranding(organizationId: number = 1) {
    try {
      const [branding] = await db
        .select()
        .from(organizationBranding)
        .where(
          and(
            eq(organizationBranding.organizationId, organizationId),
            eq(organizationBranding.isActive, true)
          )
        )
        .limit(1);

      return branding || this.getDefaultBranding();
    } catch (error) {
      console.error('Error getting organization branding:', error);
      return this.getDefaultBranding();
    }
  }

  /**
   * Update organization branding
   */
  async updateOrganizationBranding(brandingData: any, organizationId: number = 1) {
    try {
      const [existing] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, organizationId))
        .limit(1);

      if (existing) {
        // Update existing
        await db
          .update(organizationBranding)
          .set({
            ...brandingData,
            updatedAt: new Date()
          })
          .where(eq(organizationBranding.id, existing.id));
      } else {
        // Create new
        await db
          .insert(organizationBranding)
          .values({
            organizationId,
            ...brandingData
          });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating organization branding:', error);
      throw error;
    }
  }

  /**
   * Get default branding configuration
   */
  private getDefaultBranding() {
    return {
      brandName: 'Lateral Engineering Limited',
      colorScheme: 'professional',
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      accentColor: '#f59e0b',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      headingFontFamily: 'Helvetica Neue, Arial, sans-serif',
      defaultPaperSize: 'A4',
      headerLayout: { style: 'professional', showLogo: true, showDate: true },
      footerLayout: { style: 'simple', showPageNumbers: true, showCompanyInfo: true }
    };
  }

  /**
   * Get available color scheme presets
   */
  getColorSchemePresets() {
    return {
      professional: {
        name: 'Professional',
        description: 'Clean and trustworthy blue tones',
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        accentColor: '#f59e0b',
        textColor: '#1f2937',
        backgroundColor: '#ffffff'
      },
      modern: {
        name: 'Modern',
        description: 'Bold purple and teal combination',
        primaryColor: '#8b5cf6',
        secondaryColor: '#14b8a6',
        accentColor: '#ec4899',
        textColor: '#1e293b',
        backgroundColor: '#ffffff'
      },
      vibrant: {
        name: 'Vibrant',
        description: 'Energetic orange and blue',
        primaryColor: '#f97316',
        secondaryColor: '#0ea5e9',
        accentColor: '#a855f7',
        textColor: '#0f172a',
        backgroundColor: '#ffffff'
      },
      minimal: {
        name: 'Minimal',
        description: 'Simple black and white with gray accents',
        primaryColor: '#000000',
        secondaryColor: '#6b7280',
        accentColor: '#3b82f6',
        textColor: '#000000',
        backgroundColor: '#ffffff'
      },
      corporate: {
        name: 'Corporate',
        description: 'Traditional navy and gray',
        primaryColor: '#1e3a8a',
        secondaryColor: '#64748b',
        accentColor: '#059669',
        textColor: '#0f172a',
        backgroundColor: '#ffffff'
      },
      industrial: {
        name: 'Industrial',
        description: 'Steel gray and safety orange',
        primaryColor: '#475569',
        secondaryColor: '#ea580c',
        accentColor: '#fbbf24',
        textColor: '#1f2937',
        backgroundColor: '#f9fafb'
      }
    };
  }
}

export const templateHierarchyService = new TemplateHierarchyService();