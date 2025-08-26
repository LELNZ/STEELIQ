import { db } from "./db";
import { poDistribution, poEmailLog, purchaseOrders } from "@shared/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import crypto from "crypto";
import { emailService } from "./emailService";

export class POTrackingService {
  // Generate unique access token for supplier portal
  generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create distribution record when PO is sent
  async createDistribution(data: {
    purchaseOrderId: number;
    templateId?: number;
    sentBy: number;
    sentTo: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    deliveryMethod: string;
    emailSubject?: string;
    emailBody?: string;
    messageId?: string;
    requiresSignature?: boolean;
  }): Promise<number> {
    const [distribution] = await db.insert(poDistribution).values({
      purchaseOrderId: data.purchaseOrderId,
      templateId: data.templateId,
      sentAt: new Date(),
      sentBy: data.sentBy,
      sentTo: data.sentTo,
      ccEmails: data.ccEmails,
      bccEmails: data.bccEmails,
      deliveryMethod: data.deliveryMethod,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      emailStatus: 'sent',
      requiresSignature: data.requiresSignature,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Create email log entries for each recipient
    if (data.messageId && data.deliveryMethod === 'email') {
      await this.createEmailLogs(distribution.id, data.sentTo, 'to', data.messageId);
      if (data.ccEmails?.length) {
        await this.createEmailLogs(distribution.id, data.ccEmails, 'cc', data.messageId);
      }
    }

    // Schedule follow-up reminder
    await this.scheduleFollowUp(distribution.id);

    return distribution.id;
  }

  // Create email log entries
  async createEmailLogs(distributionId: number, emails: string[], recipientType: string, messageId: string) {
    const emailLogs = emails.map(email => ({
      distributionId,
      messageId,
      recipientEmail: email,
      recipientType,
      status: 'sent',
      sentAt: new Date(),
      openCount: 0,
      clickCount: 0,
      retryCount: 0,
      createdAt: new Date()
    }));

    await db.insert(poEmailLog).values(emailLogs);
  }

  // Track email events (opened, clicked, delivered, bounced)
  async trackEmailEvent(messageId: string, event: string, data?: any) {
    const [log] = await db.select()
      .from(poEmailLog)
      .where(eq(poEmailLog.messageId, messageId))
      .limit(1);

    if (!log) return;

    const updates: any = { status: event };
    
    switch (event) {
      case 'delivered':
        updates.deliveredAt = new Date();
        break;
      case 'opened':
        updates.openedAt = updates.openedAt || new Date();
        updates.openCount = (log.openCount || 0) + 1;
        updates.ipAddress = data?.ip;
        updates.userAgent = data?.userAgent;
        break;
      case 'clicked':
        updates.clickedAt = updates.clickedAt || new Date();
        updates.clickCount = (log.clickCount || 0) + 1;
        break;
      case 'bounced':
        updates.bouncedAt = new Date();
        updates.errorCode = data?.code;
        updates.errorMessage = data?.message;
        break;
    }

    await db.update(poEmailLog)
      .set(updates)
      .where(eq(poEmailLog.id, log.id));

    // Update distribution status
    await db.update(poDistribution)
      .set({ 
        emailStatus: event,
        openedAt: updates.openedAt,
        updatedAt: new Date()
      })
      .where(eq(poDistribution.id, log.distributionId));
  }

  // Handle PO acknowledgment
  async acknowledgePO(distributionId: number, acknowledgedBy: string, notes?: string) {
    const [distribution] = await db.update(poDistribution)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedBy,
        acknowledgmentMethod: 'portal',
        acknowledgmentNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(poDistribution.id, distributionId))
      .returning();

    if (distribution) {
      // Update PO status
      await db.update(purchaseOrders)
        .set({ 
          status: 'acknowledged',
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, distribution.purchaseOrderId));

      // Send confirmation email
      await this.sendAcknowledgmentNotification(distribution.purchaseOrderId, acknowledgedBy);
    }

    return distribution;
  }

  // Send acknowledgment notification to internal team
  async sendAcknowledgmentNotification(purchaseOrderId: number, acknowledgedBy: string) {
    const [po] = await db.select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, purchaseOrderId))
      .limit(1);

    if (!po) return;

    // Send notification to procurement team
    await emailService.sendEmail({
      to: 'procurement@lateralengineering.co.nz',
      from: 'accounts@lateralengineering.co.nz',
      subject: `PO ${po.poNumber} Acknowledged`,
      html: `
        <h2>Purchase Order Acknowledged</h2>
        <p>PO Number: ${po.poNumber}</p>
        <p>Acknowledged by: ${acknowledgedBy}</p>
        <p>Timestamp: ${new Date().toLocaleString()}</p>
      `
    });
  }

  // Schedule follow-up reminders for unacknowledged POs
  async scheduleFollowUp(distributionId: number) {
    // Schedule first reminder for 2 days later
    const nextReminderDate = new Date();
    nextReminderDate.setDate(nextReminderDate.getDate() + 2);

    await db.update(poDistribution)
      .set({
        nextReminderAt: nextReminderDate,
        updatedAt: new Date()
      })
      .where(eq(poDistribution.id, distributionId));
  }

  // Send follow-up reminders for unacknowledged POs
  async sendFollowUpReminders() {
    const now = new Date();
    
    // Find distributions needing reminders
    const distributions = await db.select()
      .from(poDistribution)
      .where(and(
        isNull(poDistribution.acknowledgedAt),
        lte(poDistribution.nextReminderAt, now),
        lte(poDistribution.remindersSent, 3) // Max 3 reminders
      ));

    for (const dist of distributions) {
      const [po] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, dist.purchaseOrderId))
        .limit(1);

      if (!po) continue;

      // Send reminder email
      if (dist.sentTo && dist.sentTo.length > 0) {
        await emailService.sendEmail({
          to: dist.sentTo,
          from: 'accounts@lateralengineering.co.nz',
          subject: `Reminder: Purchase Order ${po.poNumber} Awaiting Acknowledgment`,
          html: `
            <h2>Purchase Order Reminder</h2>
            <p>This is a reminder that Purchase Order ${po.poNumber} is still awaiting acknowledgment.</p>
            <p>Please review and acknowledge the PO at your earliest convenience.</p>
            <p>Original sent date: ${dist.sentAt?.toLocaleDateString()}</p>
            <p>Reminder #${(dist.remindersSent || 0) + 1}</p>
          `
        });
      }

      // Update reminder tracking
      const nextReminderDate = new Date();
      nextReminderDate.setDate(nextReminderDate.getDate() + 3); // Next reminder in 3 days

      await db.update(poDistribution)
        .set({
          remindersSent: (dist.remindersSent || 0) + 1,
          lastReminderAt: now,
          nextReminderAt: nextReminderDate,
          updatedAt: new Date()
        })
        .where(eq(poDistribution.id, dist.id));
    }
  }

  // Get PO tracking status
  async getPOTrackingStatus(purchaseOrderId: number) {
    const distributions = await db.select()
      .from(poDistribution)
      .where(eq(poDistribution.purchaseOrderId, purchaseOrderId))
      .orderBy(poDistribution.sentAt);

    const emailLogs = await Promise.all(
      distributions.map(dist => 
        db.select()
          .from(poEmailLog)
          .where(eq(poEmailLog.distributionId, dist.id))
      )
    );

    return {
      distributions,
      emailLogs: emailLogs.flat(),
      summary: {
        totalSent: distributions.length,
        acknowledged: distributions.filter(d => d.acknowledgedAt).length,
        pending: distributions.filter(d => !d.acknowledgedAt).length,
        lastSent: distributions[distributions.length - 1]?.sentAt,
        lastAcknowledged: distributions.find(d => d.acknowledgedAt)?.acknowledgedAt
      }
    };
  }

  // Generate supplier portal URL
  generatePortalUrl(distributionId: number, token: string): string {
    // Use Replit domain if available, otherwise fall back to environment variable
    const replitDomains = process.env.REPLIT_DOMAINS;
    let baseUrl: string;
    
    if (replitDomains) {
      // Use the first Replit domain (they're comma-separated)
      const firstDomain = replitDomains.split(',')[0];
      baseUrl = `https://${firstDomain}`;
    } else {
      baseUrl = process.env.APP_URL || 'http://localhost:5000';
    }
    
    return `${baseUrl}/supplier/po/${distributionId}?token=${token}`;
  }

  // Validate supplier portal access
  async validatePortalAccess(distributionId: number, token: string): Promise<boolean> {
    // In production, you'd store and validate tokens
    // For now, we'll use a simple validation
    return true; // Implement proper token validation
  }
}

export const poTrackingService = new POTrackingService();