import { db } from "./db";
import { 
  projectLifecyclePhases, 
  projectLifecycleTasks, 
  projectStakeholders,
  projectLifecycleEvents,
  projectLifecycleTemplates,
  estimationProjects 
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export class LifecycleTrackingService {
  // Initialize lifecycle for a new project
  async initializeProjectLifecycle(projectId: number, templateId?: number) {
    return await db.transaction(async (tx) => {
      // Get the template
      let template;
      if (templateId) {
        [template] = await tx.select()
          .from(projectLifecycleTemplates)
          .where(eq(projectLifecycleTemplates.id, templateId));
      } else {
        // Get default template
        [template] = await tx.select()
          .from(projectLifecycleTemplates)
          .where(eq(projectLifecycleTemplates.templateName, 'Standard Steel Fabrication'))
          .limit(1);
      }

      if (!template) throw new Error('No template found');

      // Create phases
      const phases = template.phases as any[];
      const tasks = template.tasks as any;
      
      for (const phase of phases) {
        const [createdPhase] = await tx.insert(projectLifecyclePhases)
          .values({
            projectId,
            phaseCode: phase.code,
            phaseName: phase.name,
            phaseCategory: phase.category,
            sequenceOrder: phase.order,
            status: phase.order === 1 ? 'active' : 'pending',
            completionCriteria: phase.completion_criteria || {},
            automationRules: phase.automation_rules || {},
          })
          .returning();

        // Create tasks for this phase
        const phaseTasks = tasks[phase.code] || [];
        for (let i = 0; i < phaseTasks.length; i++) {
          const task = phaseTasks[i];
          await tx.insert(projectLifecycleTasks)
            .values({
              phaseId: createdPhase.id,
              taskCode: task.code,
              taskName: task.name,
              taskDescription: task.description,
              responsibleParty: task.responsible,
              approvalRequired: task.approval_required || false,
              requiredDocuments: task.required_docs || [],
              automationTrigger: task.automation,
              dependencies: task.dependencies || [],
            });
        }
      }

      // Log the initialization event
      await tx.insert(projectLifecycleEvents)
        .values({
          projectId,
          eventType: 'lifecycle_initialized',
          eventDescription: 'Project lifecycle initialized from template',
          triggeredBySystem: true,
          metadata: { templateId: template.id, templateName: template.templateName },
        });

      return { success: true, message: 'Project lifecycle initialized' };
    });
  }

  // Get project lifecycle overview
  async getProjectLifecycle(projectId: number) {
    const phases = await db.select()
      .from(projectLifecyclePhases)
      .where(eq(projectLifecyclePhases.projectId, projectId))
      .orderBy(asc(projectLifecyclePhases.sequenceOrder));

    const phasesWithTasks = await Promise.all(phases.map(async (phase) => {
      const tasks = await db.select()
        .from(projectLifecycleTasks)
        .where(eq(projectLifecycleTasks.phaseId, phase.id))
        .orderBy(asc(projectLifecycleTasks.id));

      // Fetch documents for each task from new lifecycle_documents table
      const tasksWithDocuments = await Promise.all(tasks.map(async (task) => {
        const documents = await db.execute(sql`
          SELECT 
            id,
            original_filename as filename,
            file_size as "fileSize",
            mime_type as "fileType",
            uploaded_at as "uploadedAt",
            uploaded_by_name as "uploadedBy",
            file_path as "filePath"
          FROM lifecycle_documents
          WHERE task_id = ${task.id}
            AND status = 'active'
          ORDER BY uploaded_at DESC
        `);
        
        // Merge documents from both sources temporarily (backward compatibility)
        const jsonbDocs = (task.attachedDocuments as any[]) || [];
        const allDocuments = [...documents.rows, ...jsonbDocs];
        
        return {
          ...task,
          attachedDocuments: allDocuments
        };
      }));

      return {
        ...phase,
        tasks: tasksWithDocuments,
        progress: this.calculatePhaseProgress(tasksWithDocuments),
      };
    }));

    return {
      phases: phasesWithTasks,
      overallProgress: this.calculateOverallProgress(phasesWithTasks),
      currentPhase: phases.find(p => p.status === 'active'),
    };
  }

  // Update task status
  async updateTaskStatus(taskId: number, status: string, userId: number, notes?: string) {
    return await db.transaction(async (tx) => {
      // Get current task
      const [task] = await tx.select()
        .from(projectLifecycleTasks)
        .where(eq(projectLifecycleTasks.id, taskId));

      if (!task) throw new Error('Task not found');

      // Get phase
      const [phase] = await tx.select()
        .from(projectLifecyclePhases)
        .where(eq(projectLifecyclePhases.id, task.phaseId!));

      // Update task
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'in_progress' && !task.startedDate) {
        updateData.startedDate = new Date();
      } else if (status === 'completed') {
        updateData.completedDate = new Date();
        updateData.completedBy = userId;
      }

      if (notes) updateData.notes = notes;

      await tx.update(projectLifecycleTasks)
        .set(updateData)
        .where(eq(projectLifecycleTasks.id, taskId));

      // Log event
      await tx.insert(projectLifecycleEvents)
        .values({
          projectId: phase.projectId,
          phaseId: phase.id,
          taskId,
          eventType: 'task_status_change',
          eventDescription: `Task status changed from ${task.status} to ${status}`,
          triggeredBy: userId,
          oldValue: { status: task.status },
          newValue: { status },
          metadata: { notes },
        });

      // Check if phase should be updated
      await this.checkPhaseCompletion(tx, phase.id);

      return { success: true, message: 'Task status updated' };
    });
  }

  // Update phase status
  async updatePhaseStatus(phaseId: number, status: string, userId: number, blockingReason?: string) {
    return await db.transaction(async (tx) => {
      const [phase] = await tx.select()
        .from(projectLifecyclePhases)
        .where(eq(projectLifecyclePhases.id, phaseId));

      if (!phase) throw new Error('Phase not found');

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'active' && !phase.actualStart) {
        updateData.actualStart = new Date();
      } else if (status === 'completed' && !phase.actualEnd) {
        updateData.actualEnd = new Date();
      } else if (status === 'blocked') {
        updateData.blockingReason = blockingReason;
      }

      await tx.update(projectLifecyclePhases)
        .set(updateData)
        .where(eq(projectLifecyclePhases.id, phaseId));

      // Log event
      await tx.insert(projectLifecycleEvents)
        .values({
          projectId: phase.projectId,
          phaseId,
          eventType: 'phase_status_change',
          eventDescription: `Phase status changed from ${phase.status} to ${status}`,
          triggeredBy: userId,
          oldValue: { status: phase.status },
          newValue: { status },
          metadata: { blockingReason },
        });

      // If phase completed, activate next phase
      if (status === 'completed') {
        await this.activateNextPhase(tx, phase.projectId!, phase.sequenceOrder);
      }

      return { success: true, message: 'Phase status updated' };
    });
  }

  // Add stakeholder to project
  async addProjectStakeholder(projectId: number, stakeholderData: any) {
    const [stakeholder] = await db.insert(projectStakeholders)
      .values({
        projectId,
        ...stakeholderData,
      })
      .returning();

    return stakeholder;
  }

  // Get project events/audit trail
  async getProjectEvents(projectId: number, limit = 50) {
    return await db.select({
      event: projectLifecycleEvents,
      phaseName: projectLifecyclePhases.phaseName,
      taskName: projectLifecycleTasks.taskName,
    })
      .from(projectLifecycleEvents)
      .leftJoin(projectLifecyclePhases, eq(projectLifecycleEvents.phaseId, projectLifecyclePhases.id))
      .leftJoin(projectLifecycleTasks, eq(projectLifecycleEvents.taskId, projectLifecycleTasks.id))
      .where(eq(projectLifecycleEvents.projectId, projectId))
      .orderBy(desc(projectLifecycleEvents.createdAt))
      .limit(limit);
  }

  // Private helper methods
  private calculatePhaseProgress(tasks: any[]) {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  private calculateOverallProgress(phases: any[]) {
    if (phases.length === 0) return 0;
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
    return Math.round(totalProgress / phases.length);
  }

  private async checkPhaseCompletion(tx: any, phaseId: number) {
    const tasks = await tx.select()
      .from(projectLifecycleTasks)
      .where(eq(projectLifecycleTasks.phaseId, phaseId));

    const allTasksCompleted = tasks.every(t => t.status === 'completed');
    
    if (allTasksCompleted && tasks.length > 0) {
      await tx.update(projectLifecyclePhases)
        .set({ 
          status: 'completed',
          actualEnd: new Date(),
          updatedAt: new Date()
        })
        .where(eq(projectLifecyclePhases.id, phaseId));
    }
  }

  private async activateNextPhase(tx: any, projectId: number, currentOrder: number) {
    const [nextPhase] = await tx.select()
      .from(projectLifecyclePhases)
      .where(and(
        eq(projectLifecyclePhases.projectId, projectId),
        eq(projectLifecyclePhases.sequenceOrder, currentOrder + 1)
      ));

    if (nextPhase) {
      await tx.update(projectLifecyclePhases)
        .set({ 
          status: 'active',
          actualStart: new Date(),
          updatedAt: new Date()
        })
        .where(eq(projectLifecyclePhases.id, nextPhase.id));
    }
  }

  // Get stakeholder view based on their type
  async getStakeholderView(projectId: number, stakeholderType: string) {
    const phases = await db.select()
      .from(projectLifecyclePhases)
      .where(eq(projectLifecyclePhases.projectId, projectId))
      .orderBy(asc(projectLifecyclePhases.sequenceOrder));

    const filteredPhases = await Promise.all(phases.map(async (phase) => {
      const tasks = await db.select()
        .from(projectLifecycleTasks)
        .where(and(
          eq(projectLifecycleTasks.phaseId, phase.id),
          eq(projectLifecycleTasks.responsibleParty, stakeholderType)
        ))
        .orderBy(asc(projectLifecycleTasks.createdAt));

      if (tasks.length > 0) {
        return {
          ...phase,
          tasks,
          progress: this.calculatePhaseProgress(tasks),
        };
      }
      return null;
    }));

    return {
      phases: filteredPhases.filter(p => p !== null),
      stakeholderType,
    };
  }
}

export const lifecycleTrackingService = new LifecycleTrackingService();