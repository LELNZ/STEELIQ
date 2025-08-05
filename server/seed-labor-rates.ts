import { db } from "./db";
import { laborRates, roles, skillLevels } from "@shared/schema";
import { and, eq } from "drizzle-orm";

async function seedLaborRates() {
  console.log("Seeding labor rates...");
  
  try {
    // Get all roles and skill levels
    const allRoles = await db.select().from(roles).where(eq(roles.id, roles.id));
    const allSkillLevels = await db.select().from(skillLevels).where(eq(skillLevels.isActive, true));
    
    // Define base rates for key roles (in $/hour)
    const roleBaseRates: Record<string, number> = {
      "Business Owner": 120,
      "Business Owner / CEO": 120,
      "General Manager": 110,
      "Project Manager": 90,
      "Senior Estimator": 95,
      "Estimator": 75,
      "Design Engineer": 95,
      "Production Manager": 85,
      "Site Supervisor": 80,
      "Senior Welder / Fabricator": 82,
      "Senior Welder": 85,
      "Welder/Fabricator": 75,
      "Welder / Fabricator": 75,
      "Quality Inspector": 70,
      "System Administrator": 150,
      "Business Development Manager": 85
    };
    
    // Create labor rates for each role and skill level combination
    for (const role of allRoles) {
      const baseRate = roleBaseRates[role.name] || 75; // Default to $75 if role not in map
      
      for (const skillLevel of allSkillLevels) {
        // Calculate rate based on skill level multiplier
        const adjustedRate = baseRate * Number(skillLevel.multiplier);
        
        // Check if rate already exists
        const existing = await db.select()
          .from(laborRates)
          .where(
            and(
              eq(laborRates.roleId, role.id),
              eq(laborRates.skillLevelId, skillLevel.id)
            )
          )
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(laborRates).values({
            roleId: role.id,
            skillLevelId: skillLevel.id,
            baseRate: adjustedRate.toFixed(2),
            overtimeMultiplier: "1.5",
            doubleTimeMultiplier: "2.0",
            nightShiftPremium: "25",
            weekendPremium: "50",
            effectiveDate: new Date(),
            isActive: true
          });
          
          console.log(`Created rate for ${role.name} - ${skillLevel.name}: $${adjustedRate.toFixed(2)}/hr`);
        }
      }
    }
    
    console.log("Labor rates seeding completed!");
  } catch (error) {
    console.error("Error seeding labor rates:", error);
  }
}

// Run the seed function
seedLaborRates().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((error) => {
  console.error("Failed to seed:", error);
  process.exit(1);
});