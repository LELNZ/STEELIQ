import type { Express } from "express";
import { eq, desc, and, lte, gte } from "drizzle-orm";
import { db } from "./db";
import { performanceReviews, qualificationReminders, teamMembers, users } from "@shared/schema";

export function setupPerformanceReviewRoutes(app: Express) {
  // Get performance reviews for a team member
  app.get("/api/performance-reviews/:teamMemberId", async (req, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      
      const reviews = await db
        .select()
        .from(performanceReviews)
        .where(eq(performanceReviews.teamMemberId, teamMemberId))
        .orderBy(desc(performanceReviews.reviewPeriodStart));

      res.json(reviews);
    } catch (error) {
      console.error("Error fetching performance reviews:", error);
      res.status(500).json({ error: "Failed to fetch performance reviews" });
    }
  });

  // Create a new performance review
  app.post("/api/performance-reviews", async (req, res) => {
    try {
      const reviewData = req.body;
      
      // Convert string dates to Date objects
      if (reviewData.reviewPeriodStart) {
        reviewData.reviewPeriodStart = new Date(reviewData.reviewPeriodStart);
      }
      if (reviewData.reviewPeriodEnd) {
        reviewData.reviewPeriodEnd = new Date(reviewData.reviewPeriodEnd);
      }

      // Convert numeric strings to proper numbers
      const numericFields = [
        'overallRating', 'productionQuality', 'safetyCompliance', 'teamwork',
        'technicalSkills', 'problemSolving', 'reliability', 'communication',
        'initiative', 'defectRate', 'productivityScore', 'attendanceScore'
      ];

      numericFields.forEach(field => {
        if (reviewData[field] && reviewData[field] !== '') {
          reviewData[field] = parseFloat(reviewData[field]);
        } else {
          delete reviewData[field];
        }
      });

      // Convert integer fields
      if (reviewData.safetyIncidents) {
        reviewData.safetyIncidents = parseInt(reviewData.safetyIncidents);
      }

      const [newReview] = await db
        .insert(performanceReviews)
        .values({
          ...reviewData,
          reviewStatus: 'pending'
        })
        .returning();

      // Update team member's last review date
      await db
        .update(teamMembers)
        .set({ 
          lastReviewDate: new Date(),
          nextReviewDate: calculateNextReviewDate(reviewData.reviewType)
        })
        .where(eq(teamMembers.id, reviewData.teamMemberId));

      res.json(newReview);
    } catch (error) {
      console.error("Error creating performance review:", error);
      res.status(500).json({ error: "Failed to create performance review" });
    }
  });

  // Update performance review
  app.put("/api/performance-reviews/:id", async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const reviewData = req.body;

      // Convert dates
      if (reviewData.reviewPeriodStart) {
        reviewData.reviewPeriodStart = new Date(reviewData.reviewPeriodStart);
      }
      if (reviewData.reviewPeriodEnd) {
        reviewData.reviewPeriodEnd = new Date(reviewData.reviewPeriodEnd);
      }
      if (reviewData.reviewDate) {
        reviewData.reviewDate = new Date(reviewData.reviewDate);
      }

      const [updatedReview] = await db
        .update(performanceReviews)
        .set({
          ...reviewData,
          updatedAt: new Date()
        })
        .where(eq(performanceReviews.id, reviewId))
        .returning();

      res.json(updatedReview);
    } catch (error) {
      console.error("Error updating performance review:", error);
      res.status(500).json({ error: "Failed to update performance review" });
    }
  });

  // Get qualification reminders for a team member
  app.get("/api/qualification-reminders/:teamMemberId", async (req, res) => {
    try {
      const teamMemberId = parseInt(req.params.teamMemberId);
      
      const reminders = await db
        .select()
        .from(qualificationReminders)
        .where(eq(qualificationReminders.teamMemberId, teamMemberId))
        .orderBy(desc(qualificationReminders.expiryDate));

      res.json(reminders);
    } catch (error) {
      console.error("Error fetching qualification reminders:", error);
      res.status(500).json({ error: "Failed to fetch qualification reminders" });
    }
  });

  // Create qualification reminder
  app.post("/api/qualification-reminders", async (req, res) => {
    try {
      const reminderData = req.body;
      
      // Convert dates
      if (reminderData.issueDate) {
        reminderData.issueDate = new Date(reminderData.issueDate);
      }
      if (reminderData.expiryDate) {
        reminderData.expiryDate = new Date(reminderData.expiryDate);
      }

      const [newReminder] = await db
        .insert(qualificationReminders)
        .values(reminderData)
        .returning();

      res.json(newReminder);
    } catch (error) {
      console.error("Error creating qualification reminder:", error);
      res.status(500).json({ error: "Failed to create qualification reminder" });
    }
  });

  // Get overdue performance reviews
  app.get("/api/performance-reviews/overdue", async (req, res) => {
    try {
      const currentDate = new Date();
      
      const overdueReviews = await db
        .select({
          review: performanceReviews,
          teamMember: teamMembers,
          user: users
        })
        .from(performanceReviews)
        .leftJoin(teamMembers, eq(performanceReviews.teamMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(
            eq(performanceReviews.reviewStatus, 'pending'),
            lte(performanceReviews.reviewPeriodEnd, currentDate)
          )
        )
        .orderBy(desc(performanceReviews.reviewPeriodEnd));

      res.json(overdueReviews);
    } catch (error) {
      console.error("Error fetching overdue reviews:", error);
      res.status(500).json({ error: "Failed to fetch overdue reviews" });
    }
  });

  // Get expiring qualifications (next 90 days)
  app.get("/api/qualification-reminders/expiring", async (req, res) => {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + 90);
      
      const expiringQualifications = await db
        .select({
          reminder: qualificationReminders,
          teamMember: teamMembers,
          user: users
        })
        .from(qualificationReminders)
        .leftJoin(teamMembers, eq(qualificationReminders.teamMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(
          and(
            eq(qualificationReminders.isActive, true),
            gte(qualificationReminders.expiryDate, currentDate),
            lte(qualificationReminders.expiryDate, futureDate)
          )
        )
        .orderBy(qualificationReminders.expiryDate);

      res.json(expiringQualifications);
    } catch (error) {
      console.error("Error fetching expiring qualifications:", error);
      res.status(500).json({ error: "Failed to fetch expiring qualifications" });
    }
  });

  // Send reminder notifications (to be called by cron job)
  app.post("/api/qualification-reminders/send-notifications", async (req, res) => {
    try {
      const currentDate = new Date();
      
      // Get all active reminders that need notifications
      const remindersToNotify = await db
        .select({
          reminder: qualificationReminders,
          teamMember: teamMembers,
          user: users
        })
        .from(qualificationReminders)
        .leftJoin(teamMembers, eq(qualificationReminders.teamMemberId, teamMembers.id))
        .leftJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(qualificationReminders.isActive, true));

      const notificationsSent = [];

      for (const item of remindersToNotify) {
        const { reminder, teamMember, user } = item;
        const daysUntilExpiry = Math.ceil(
          (new Date(reminder.expiryDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if we need to send a reminder for this qualification
        if (reminder.reminderDays.includes(daysUntilExpiry)) {
          // Here you would integrate with your notification system
          // For now, we'll just log and update the reminder tracking
          
          console.log(`Reminder needed: ${reminder.qualificationName} expires in ${daysUntilExpiry} days for ${user?.name}`);
          
          // Update reminder tracking
          await db
            .update(qualificationReminders)
            .set({
              lastReminderSent: currentDate,
              remindersSent: reminder.remindersSent + 1
            })
            .where(eq(qualificationReminders.id, reminder.id));

          notificationsSent.push({
            qualificationName: reminder.qualificationName,
            employeeName: user?.name,
            daysUntilExpiry
          });
        }
      }

      res.json({
        message: `Sent ${notificationsSent.length} reminder notifications`,
        notifications: notificationsSent
      });
    } catch (error) {
      console.error("Error sending reminder notifications:", error);
      res.status(500).json({ error: "Failed to send reminder notifications" });
    }
  });
}

// Helper function to calculate next review date
function calculateNextReviewDate(reviewType: string): Date {
  const currentDate = new Date();
  const nextReviewDate = new Date(currentDate);

  switch (reviewType) {
    case 'probation':
      nextReviewDate.setDate(currentDate.getDate() + 90); // 3 months
      break;
    case 'annual':
      nextReviewDate.setFullYear(currentDate.getFullYear() + 1); // 1 year
      break;
    case 'improvement':
      nextReviewDate.setDate(currentDate.getDate() + 90); // 3 months
      break;
    default:
      nextReviewDate.setFullYear(currentDate.getFullYear() + 1); // Default to 1 year
  }

  return nextReviewDate;
}