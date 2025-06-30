import { db } from "./db";
import { estimationProjects, clients } from "@shared/schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export interface QuotationData {
  sentDate?: Date;
  viewedDate?: Date;
  expiryDate?: Date;
  followUpDate?: Date;
  probability?: number;
  notes?: string;
  clientContactLog?: Array<{
    date: Date;
    type: 'email' | 'phone' | 'meeting';
    notes: string;
  }>;
}

export interface QuotationMetrics {
  totalQuotes: number;
  activeQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  expiredQuotes: number;
  overdueFollowUps: number;
  totalValue: number;
  activeValue: number;
  wonValue: number;
  winRate: number;
  conversionRate: number;
  averageQuoteValue: number;
}

export class QuotationManagementStorage {
  // Update quotation data for an estimation project
  async updateQuotationData(projectId: number, quotationData: Partial<QuotationData>) {
    const [updatedProject] = await db
      .update(estimationProjects)
      .set({
        projectData: sql`COALESCE(project_data, '{}') || ${JSON.stringify({ quotationData })}`,
        updatedAt: new Date(),
      })
      .where(eq(estimationProjects.id, projectId))
      .returning();
    
    return updatedProject;
  }

  // Get quotation metrics for dashboard
  async getQuotationMetrics(startDate?: Date, endDate?: Date): Promise<QuotationMetrics> {
    let query = db.select({
      id: estimationProjects.id,
      status: estimationProjects.status,
      totalCost: estimationProjects.totalCost,
      projectData: estimationProjects.projectData,
      createdAt: estimationProjects.createdAt,
    }).from(estimationProjects);

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(estimationProjects.createdAt, startDate),
          lte(estimationProjects.createdAt, endDate)
        )
      );
    }

    const projects = await query;
    
    const metrics = projects.reduce((acc, project) => {
      const cost = parseFloat(project.totalCost?.toString() || '0');
      
      acc.totalQuotes += 1;
      acc.totalValue += cost;

      switch (project.status) {
        case 'sent':
        case 'viewed':
          acc.activeQuotes += 1;
          acc.activeValue += cost;
          break;
        case 'accepted':
        case 'converted':
          acc.wonQuotes += 1;
          acc.wonValue += cost;
          break;
        case 'declined':
          acc.lostQuotes += 1;
          break;
        case 'expired':
          acc.expiredQuotes += 1;
          break;
      }

      // Check for overdue follow-ups
      const quotationData = project.projectData as any;
      if (quotationData?.quotationData?.followUpDate) {
        const followUpDate = new Date(quotationData.quotationData.followUpDate);
        const now = new Date();
        if (now > followUpDate && !['accepted', 'declined', 'converted'].includes(project.status)) {
          acc.overdueFollowUps += 1;
        }
      }

      return acc;
    }, {
      totalQuotes: 0,
      activeQuotes: 0,
      wonQuotes: 0,
      lostQuotes: 0,
      expiredQuotes: 0,
      overdueFollowUps: 0,
      totalValue: 0,
      activeValue: 0,
      wonValue: 0,
      winRate: 0,
      conversionRate: 0,
      averageQuoteValue: 0,
    });

    // Calculate derived metrics
    const totalDecided = metrics.wonQuotes + metrics.lostQuotes;
    metrics.winRate = totalDecided > 0 ? (metrics.wonQuotes / totalDecided) * 100 : 0;
    metrics.conversionRate = metrics.totalQuotes > 0 ? (metrics.wonQuotes / metrics.totalQuotes) * 100 : 0;
    metrics.averageQuoteValue = metrics.totalQuotes > 0 ? metrics.totalValue / metrics.totalQuotes : 0;

    return metrics;
  }

  // Get overdue follow-ups
  async getOverdueFollowUps() {
    const projects = await db.select({
      id: estimationProjects.id,
      name: estimationProjects.name,
      status: estimationProjects.status,
      totalCost: estimationProjects.totalCost,
      projectData: estimationProjects.projectData,
      clientId: estimationProjects.clientId,
    })
    .from(estimationProjects)
    .where(
      and(
        sql`status NOT IN ('accepted', 'declined', 'converted')`,
        sql`project_data->'quotationData'->>'followUpDate' IS NOT NULL`
      )
    );

    const now = new Date();
    return projects.filter(project => {
      const quotationData = project.projectData as any;
      if (quotationData?.quotationData?.followUpDate) {
        const followUpDate = new Date(quotationData.quotationData.followUpDate);
        return now > followUpDate;
      }
      return false;
    });
  }

  // Get quotes expiring soon
  async getQuotesExpiringSoon(daysAhead: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const projects = await db.select({
      id: estimationProjects.id,
      name: estimationProjects.name,
      status: estimationProjects.status,
      totalCost: estimationProjects.totalCost,
      projectData: estimationProjects.projectData,
      clientId: estimationProjects.clientId,
    })
    .from(estimationProjects)
    .where(
      and(
        sql`status IN ('sent', 'viewed')`,
        sql`project_data->'quotationData'->>'expiryDate' IS NOT NULL`
      )
    );

    const now = new Date();
    return projects.filter(project => {
      const quotationData = project.projectData as any;
      if (quotationData?.quotationData?.expiryDate) {
        const expiryDate = new Date(quotationData.quotationData.expiryDate);
        return expiryDate > now && expiryDate <= futureDate;
      }
      return false;
    });
  }

  // Update quotation status
  async updateQuotationStatus(projectId: number, status: string, additionalData?: any) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (additionalData) {
      updateData.projectData = sql`COALESCE(project_data, '{}') || ${JSON.stringify({ quotationData: additionalData })}`;
    }

    const [updatedProject] = await db
      .update(estimationProjects)
      .set(updateData)
      .where(eq(estimationProjects.id, projectId))
      .returning();
    
    return updatedProject;
  }

  // Track quotation view
  async trackQuotationView(projectId: number) {
    const viewData = {
      viewedDate: new Date(),
    };

    return await this.updateQuotationData(projectId, viewData);
  }

  // Add contact log entry
  async addContactLog(projectId: number, contactEntry: {
    type: 'email' | 'phone' | 'meeting';
    notes: string;
  }) {
    // Get current project data
    const [project] = await db
      .select({ projectData: estimationProjects.projectData })
      .from(estimationProjects)
      .where(eq(estimationProjects.id, projectId));

    if (!project) throw new Error('Project not found');

    const currentData = project.projectData as any || {};
    const quotationData = currentData.quotationData || {};
    const contactLog = quotationData.clientContactLog || [];

    contactLog.push({
      date: new Date(),
      ...contactEntry,
    });

    return await this.updateQuotationData(projectId, {
      ...quotationData,
      clientContactLog: contactLog,
    });
  }

  // Get pipeline analytics
  async getPipelineAnalytics(periodMonths: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const projects = await db.select({
      id: estimationProjects.id,
      status: estimationProjects.status,
      totalCost: estimationProjects.totalCost,
      createdAt: estimationProjects.createdAt,
      projectData: estimationProjects.projectData,
    })
    .from(estimationProjects)
    .where(gte(estimationProjects.createdAt, startDate))
    .orderBy(asc(estimationProjects.createdAt));

    // Group by month
    const monthlyData = projects.reduce((acc: any, project) => {
      const month = project.createdAt.toISOString().slice(0, 7); // YYYY-MM
      
      if (!acc[month]) {
        acc[month] = {
          created: 0,
          sent: 0,
          won: 0,
          lost: 0,
          totalValue: 0,
          wonValue: 0,
        };
      }

      const cost = parseFloat(project.totalCost?.toString() || '0');
      acc[month].created += 1;
      acc[month].totalValue += cost;

      if (['sent', 'viewed', 'accepted', 'declined', 'converted'].includes(project.status)) {
        acc[month].sent += 1;
      }

      if (['accepted', 'converted'].includes(project.status)) {
        acc[month].won += 1;
        acc[month].wonValue += cost;
      }

      if (project.status === 'declined') {
        acc[month].lost += 1;
      }

      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));
  }
}

export const quotationManagementStorage = new QuotationManagementStorage();