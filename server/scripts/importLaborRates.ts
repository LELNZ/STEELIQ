import { db } from "../db";
import { roles, teamMembers, laborRates, skillLevels } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function importLaborRatesFromRoles() {
  console.log("Starting labor rates import from Fortune 50 roles...");
  
  try {
    // Get all active roles with hourly rates
    const allRoles = await db.select().from(roles);
    
    // Get or create skill levels
    const [standardSkill] = await db
      .select()
      .from(skillLevels)
      .where(eq(skillLevels.code, 'standard'))
      .limit(1);
      
    let standardSkillId = standardSkill?.id;
    
    if (!standardSkillId) {
      // Create default skill levels if they don't exist
      const skillLevelsToCreate = [
        { code: 'apprentice', name: 'Apprentice', multiplier: "0.75", requiredExperience: 0 },
        { code: 'standard', name: 'Standard', multiplier: "1.00", requiredExperience: 2 },
        { code: 'senior', name: 'Senior', multiplier: "1.25", requiredExperience: 5 },
        { code: 'specialist', name: 'Specialist', multiplier: "1.50", requiredExperience: 8 }
      ];
      
      for (const skill of skillLevelsToCreate) {
        const [created] = await db.insert(skillLevels).values(skill).returning();
        if (skill.code === 'standard') {
          standardSkillId = created.id;
        }
      }
      
      console.log("Created default skill levels");
    }
    
    // Import labor rates from roles
    let importedCount = 0;
    
    for (const role of allRoles) {
      if (role.hourlyRate && Number(role.hourlyRate) > 0) {
        // Check if rate already exists for this role
        const existing = await db
          .select()
          .from(laborRates)
          .where(eq(laborRates.roleId, role.id))
          .limit(1);
          
        if (existing.length === 0) {
          await db.insert(laborRates).values({
            roleId: role.id,
            skillLevelId: standardSkillId!,
            baseRate: role.hourlyRate,
            overtimeMultiplier: "1.5",
            doubleTimeMultiplier: "2.0",
            siteAllowanceRate: "0",
            siteAllowanceType: "fixed",
            effectiveDate: new Date().toISOString().split('T')[0],
            isActive: true
          });
          
          importedCount++;
          console.log(`Imported rate for role: ${role.name} - $${role.hourlyRate}/hr`);
        } else {
          console.log(`Rate already exists for role: ${role.name}`);
        }
      }
    }
    
    // Also update team members hourly rates from their roles
    const teamMembersWithRoles = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        roleId: teamMembers.roleId,
        currentRate: teamMembers.hourlyRate,
        roleRate: roles.hourlyRate,
        roleName: roles.name
      })
      .from(teamMembers)
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .where(eq(teamMembers.isActive, true));
      
    let updatedMembers = 0;
    
    for (const member of teamMembersWithRoles) {
      if (member.roleRate && (!member.currentRate || Number(member.currentRate) === 0)) {
        await db
          .update(teamMembers)
          .set({ 
            hourlyRate: member.roleRate,
            overtimeRate: (Number(member.roleRate) * 1.5).toFixed(2)
          })
          .where(eq(teamMembers.id, member.id));
          
        updatedMembers++;
        console.log(`Updated hourly rate for team member in role ${member.roleName}: $${member.roleRate}/hr`);
      }
    }
    
    console.log(`\n✅ Labor rates import complete!`);
    console.log(`   - Imported ${importedCount} new labor rates`);
    console.log(`   - Updated ${updatedMembers} team member rates`);
    
    // Show current status
    const rateCount = await db.select({ count: sql`count(*)` }).from(laborRates);
    console.log(`   - Total labor rates in system: ${rateCount[0].count}`);
    
  } catch (error) {
    console.error("Error importing labor rates:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

importLaborRatesFromRoles();