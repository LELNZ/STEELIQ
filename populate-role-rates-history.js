import { db } from './server/db.ts';
import { roleRates, laborRateHistory, laborRateProfiles, skillLevels } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function populateRoleRatesAndHistory() {
  try {
    console.log('Checking existing data...');
    
    // Get existing profiles and skill levels
    const profiles = await db.select().from(laborRateProfiles);
    const skills = await db.select().from(skillLevels);
    
    if (profiles.length === 0) {
      console.log('No labor rate profiles found. Please populate profiles first.');
      return;
    }
    
    if (skills.length === 0) {
      console.log('No skill levels found. Please populate skill levels first.');
      return;
    }
    
    // Check if role rates already exist
    const existingRoleRates = await db.select().from(roleRates);
    
    if (existingRoleRates.length === 0) {
      console.log('Populating default role rates...');
      
      const defaultRoleRates = [
        {
          role: 'Welder',
          department: 'Fabrication',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[2].id, // Qualified level
          isActive: true
        },
        {
          role: 'Fitter',
          department: 'Fabrication',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[2].id, // Qualified level
          isActive: true
        },
        {
          role: 'Machine Operator',
          department: 'Fabrication',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[1].id, // Semi-Skilled level
          isActive: true
        },
        {
          role: 'Fabricator',
          department: 'Fabrication',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[3].id, // Lead level
          isActive: true
        },
        {
          role: 'Workshop Assistant',
          department: 'Fabrication',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[0].id, // Apprentice level
          isActive: true
        },
        {
          role: 'Quality Inspector',
          department: 'Quality',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[3].id, // Lead level
          isActive: true
        },
        {
          role: 'Site Supervisor',
          department: 'Site Work',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[4].id, // Specialist level
          isActive: true
        },
        {
          role: 'Crane Operator',
          department: 'Operations',
          laborRateProfileId: profiles[0].id,
          skillLevelId: skills[3].id, // Lead level
          isActive: true
        }
      ];
      
      await db.insert(roleRates).values(defaultRoleRates);
      console.log(`✓ Inserted ${defaultRoleRates.length} role rates`);
    } else {
      console.log(`Role rates already exist (${existingRoleRates.length} records)`);
    }
    
    // Check if rate history exists
    const existingHistory = await db.select().from(laborRateHistory);
    
    if (existingHistory.length === 0) {
      console.log('Populating sample rate history...');
      
      const sampleHistory = [
        {
          laborRateProfileId: profiles[0].id,
          oldRate: 35.00,
          newRate: 38.50,
          changedBy: 'Adam Green',
          changedAt: new Date('2024-01-15'),
          reason: 'Annual rate review'
        },
        {
          laborRateProfileId: profiles[0].id,
          oldRate: 38.50,
          newRate: 40.00,
          changedBy: 'Adam Green',
          changedAt: new Date('2024-07-01'),
          reason: 'Mid-year adjustment for inflation'
        },
        {
          laborRateProfileId: profiles[0].id,
          oldRate: 40.00,
          newRate: 42.00,
          changedBy: 'Adam Green',
          changedAt: new Date('2025-01-01'),
          reason: 'Annual rate increase'
        }
      ];
      
      // Only add history if we have a profile
      if (profiles.length > 0) {
        await db.insert(laborRateHistory).values(sampleHistory);
        console.log(`✓ Inserted ${sampleHistory.length} rate history records`);
      }
    } else {
      console.log(`Rate history already exists (${existingHistory.length} records)`);
    }
    
    console.log('\nRole rates and history population completed!');
    
  } catch (error) {
    console.error('Error populating role rates and history:', error);
  } finally {
    process.exit(0);
  }
}

populateRoleRatesAndHistory();