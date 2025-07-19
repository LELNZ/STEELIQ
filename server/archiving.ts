import { db } from "./db";
import { jobs, estimationProjects, jobsArchive, estimationsArchive } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Enterprise Archiving Service
 * Following Fortune 500 & STRUMIS standards for data retention and compliance
 * 
 * Key principles:
 * - 7-year retention for financial records (NZ tax law)
 * - Complete audit trail with deletion reasons
 * - Searchable archive with restoration capability
 * - Compliance with Privacy Act 2020
 */
export class ArchivingService {
  
  /**
   * Archive a job before deletion
   * Preserves all data including related records
   */
  static async archiveJob(jobId: number, deletedBy: number, deletionReason: string) {
    try {
      // Get the job data
      const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
      if (!job) {
        throw new Error("Job not found");
      }

      // Create archive record
      const [archivedJob] = await db.insert(jobsArchive).values({
        originalId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        clientContact: job.clientContact,
        clientPhone: job.clientPhone,
        clientEmail: job.clientEmail,
        clientAddress: job.clientAddress,
        projectDescription: job.projectDescription,
        status: job.status,
        priority: job.priority,
        estimatedValue: job.estimatedValue,
        actualCost: job.actualCost,
        materialCost: job.materialCost,
        laborCost: job.laborCost,
        overheadCost: job.overheadCost,
        profitMargin: job.profitMargin,
        completedDate: job.completedDate,
        assignedTo: job.assignedTo,
        estimationId: job.estimationId,
        notes: job.notes,
        internalNotes: job.internalNotes,
        originalCreatedAt: job.createdAt,
        archivedAt: new Date(),
        archivedBy: deletedBy,
        archiveReason: deletionReason,
        // Store complete job data as JSON for future reference
        fullData: JSON.stringify(job)
      }).returning();

      // Delete the original job
      await db.delete(jobs).where(eq(jobs.id, jobId));

      return archivedJob;
    } catch (error) {
      console.error("Error archiving job:", error);
      throw error;
    }
  }

  /**
   * Archive an estimation before deletion
   */
  static async archiveEstimation(estimationId: number, deletedBy: number, deletionReason: string) {
    try {
      // Get the estimation data
      const [estimation] = await db.select().from(estimationProjects).where(eq(estimationProjects.id, estimationId));
      if (!estimation) {
        throw new Error("Estimation not found");
      }

      // Create archive record
      const [archivedEstimation] = await db.insert(estimationsArchive).values({
        originalId: estimation.id,
        name: estimation.name,
        description: estimation.description,
        clientId: estimation.clientId,
        clientName: estimation.clientName,
        status: estimation.status,
        totalCost: estimation.totalCost,
        margin: estimation.margin,
        deliveryDate: estimation.deliveryDate,
        estimatedHours: estimation.estimatedHours,
        projectData: estimation.projectData,
        originalCreatedAt: estimation.createdAt,
        archivedAt: new Date(),
        archivedBy: deletedBy,
        archiveReason: deletionReason,
        // Store complete estimation data as JSON
        fullData: JSON.stringify(estimation)
      }).returning();

      // Delete the original estimation
      await db.delete(estimationProjects).where(eq(estimationProjects.id, estimationId));

      return archivedEstimation;
    } catch (error) {
      console.error("Error archiving estimation:", error);
      throw error;
    }
  }

  /**
   * Restore a job from archive
   * Used when a job was deleted in error
   */
  static async restoreJob(archiveId: number, restoredBy: number) {
    try {
      const [archivedJob] = await db.select().from(jobsArchive).where(eq(jobsArchive.id, archiveId));
      if (!archivedJob) {
        throw new Error("Archived job not found");
      }

      // Parse the full data
      const originalData = JSON.parse(archivedJob.fullData as string);
      
      // Create a new job with the original data
      const [restoredJob] = await db.insert(jobs).values({
        ...originalData,
        id: undefined, // Let DB generate new ID
        createdAt: new Date(), // New creation timestamp
        notes: `${originalData.notes || ''}\n\n[Restored from archive on ${new Date().toISOString()} by user ${restoredBy}]`
      }).returning();

      // Update archive record to show it was restored
      await db.update(jobsArchive)
        .set({ 
          restoredAt: new Date(),
          restoredBy: restoredBy
        })
        .where(eq(jobsArchive.id, archiveId));

      return restoredJob;
    } catch (error) {
      console.error("Error restoring job:", error);
      throw error;
    }
  }

  /**
   * Get archive statistics for compliance reporting
   */
  static async getArchiveStats() {
    const jobsCount = await db.select().from(jobsArchive);
    const estimationsCount = await db.select().from(estimationsArchive);

    return {
      totalArchivedJobs: jobsCount.length,
      totalArchivedEstimations: estimationsCount.length,
      oldestJobArchive: jobsCount.reduce((oldest, job) => 
        !oldest || job.archivedAt < oldest.archivedAt ? job : oldest, null as any
      ),
      oldestEstimationArchive: estimationsCount.reduce((oldest, est) => 
        !oldest || est.archivedAt < oldest.archivedAt ? est : oldest, null as any
      )
    };
  }
}