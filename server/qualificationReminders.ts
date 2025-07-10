import { db } from "./db";
import { teamMembers, qualificationReminders, users } from "@shared/schema";
import { eq, and, lte, gte } from "drizzle-orm";

export async function generateQualificationReminders() {
  try {
    // Get all active team members with their user info
    const members = await db
      .select()
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.isActive, true));

    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const remindersToCreate: any[] = [];

    for (const { team_members: member, users: user } of members) {
      if (!member || !user) continue;

      // Check safety certificates
      if (member.safetyCertificates && Array.isArray(member.safetyCertificates)) {
        for (const cert of member.safetyCertificates as any[]) {
          if (cert.expiryDate) {
            const expiryDate = new Date(cert.expiryDate);
            if (expiryDate <= ninetyDaysFromNow) {
              remindersToCreate.push({
                teamMemberId: member.id,
                userId: user.id,
                qualificationType: cert.type || 'first_aid',
                qualificationName: cert.name,
                expiryDate: cert.expiryDate,
                reminderDate: calculateReminderDate(expiryDate),
                isActive: true,
                remindersSent: 0
              });
            }
          }
        }
      }

      // Check welding certificates
      if (member.weldingCertificates && Array.isArray(member.weldingCertificates)) {
        for (const cert of member.weldingCertificates as any[]) {
          if (cert.expiryDate) {
            const expiryDate = new Date(cert.expiryDate);
            if (expiryDate <= ninetyDaysFromNow) {
              remindersToCreate.push({
                teamMemberId: member.id,
                userId: user.id,
                qualificationType: 'welding',
                qualificationName: `${cert.process} - ${cert.name}`,
                expiryDate: cert.expiryDate,
                reminderDate: calculateReminderDate(expiryDate),
                isActive: true,
                remindersSent: 0
              });
            }
          }
        }
      }

      // Check trade licenses
      if (member.tradeLicenses && Array.isArray(member.tradeLicenses)) {
        for (const cert of member.tradeLicenses as any[]) {
          if (cert.expiryDate) {
            const expiryDate = new Date(cert.expiryDate);
            if (expiryDate <= ninetyDaysFromNow) {
              remindersToCreate.push({
                teamMemberId: member.id,
                userId: user.id,
                qualificationType: 'trade',
                qualificationName: cert.name,
                expiryDate: cert.expiryDate,
                reminderDate: calculateReminderDate(expiryDate),
                isActive: true,
                remindersSent: 0
              });
            }
          }
        }
      }

      // Check individual date fields
      const dateFields = [
        { field: 'firstAidExpiry', name: 'First Aid Certificate', type: 'first_aid' },
        { field: 'workingAtHeightsExpiry', name: 'Working at Heights', type: 'heights' },
        { field: 'driverLicenseExpiry', name: 'Driver License', type: 'drivers' },
        { field: 'safetyCardExpiry', name: 'Safety Card', type: 'safety_card' }
      ];

      for (const { field, name, type } of dateFields) {
        const value = member[field as keyof typeof member];
        if (value) {
          const expiryDate = new Date(value as string);
          if (expiryDate <= ninetyDaysFromNow) {
            remindersToCreate.push({
              teamMemberId: member.id,
              userId: user.id,
              qualificationType: type,
              qualificationName: name,
              expiryDate: value,
              reminderDate: calculateReminderDate(expiryDate),
              isActive: true,
              remindersSent: 0
            });
          }
        }
      }
    }

    // Clear existing reminders and insert new ones
    if (remindersToCreate.length > 0) {
      // Deactivate old reminders
      await db
        .update(qualificationReminders)
        .set({ isActive: false })
        .where(eq(qualificationReminders.isActive, true));

      // Insert new reminders
      await db.insert(qualificationReminders).values(remindersToCreate);
    }

    return remindersToCreate.length;
  } catch (error) {
    console.error("Error generating qualification reminders:", error);
    throw error;
  }
}

function calculateReminderDate(expiryDate: Date): Date {
  const reminderDate = new Date(expiryDate);
  reminderDate.setDate(reminderDate.getDate() - 90); // Start reminding 90 days before expiry
  return reminderDate;
}

export async function getExpiringQualifications() {
  try {
    const reminders = await db
      .select({
        reminder: qualificationReminders,
        teamMember: teamMembers,
        user: users
      })
      .from(qualificationReminders)
      .innerJoin(teamMembers, eq(qualificationReminders.teamMemberId, teamMembers.id))
      .innerJoin(users, eq(qualificationReminders.userId, users.id))
      .where(
        and(
          eq(qualificationReminders.isActive, true),
          lte(qualificationReminders.reminderDate, new Date())
        )
      )
      .orderBy(qualificationReminders.expiryDate);

    return reminders;
  } catch (error) {
    console.error("Error fetching expiring qualifications:", error);
    throw error;
  }
}