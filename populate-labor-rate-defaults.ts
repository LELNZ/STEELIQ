import { db } from './server/db';
import { skillLevels, laborAllowances } from './shared/schema';

async function populateLaborRateDefaults() {
  try {
    console.log('Populating default skill levels...');
    
    // Insert default skill levels
    const defaultSkillLevels = [
      { code: 'APPR', name: 'Apprentice', multiplier: 0.7, description: 'Learning the trade, requires supervision', requiredExperience: 0 },
      { code: 'TRADE', name: 'Tradesman', multiplier: 1.0, description: 'Competent in standard tasks', requiredExperience: 1 },
      { code: 'JOURN', name: 'Journeyman', multiplier: 1.2, description: 'Experienced with complex tasks', requiredExperience: 3 },
      { code: 'MAST', name: 'Master', multiplier: 1.5, description: 'Expert level, can train others', requiredExperience: 5 },
      { code: 'SPEC', name: 'Specialist', multiplier: 1.8, description: 'Specialized expertise in specific areas', requiredExperience: 7 }
    ];
    
    for (const level of defaultSkillLevels) {
      await db.insert(skillLevels).values(level).onConflictDoNothing();
    }
    
    console.log('Populating default labor allowances...');
    
    // Insert default labor allowances
    const defaultAllowances = [
      { code: 'OT', name: 'Overtime', type: 'percentage', value: 50, conditions: { minHours: 8 } },
      { code: 'NS', name: 'Night Shift', type: 'percentage', value: 25, conditions: { shift: 'night' } },
      { code: 'WE', name: 'Weekend Work', type: 'percentage', value: 50, conditions: { days: ['saturday', 'sunday'] } },
      { code: 'HEIGHT', name: 'Height Allowance', type: 'percentage', value: 15, conditions: { minHeight: 10 } },
      { code: 'TOOL', name: 'Tool Allowance', type: 'fixed', value: 5, conditions: {} },
      { code: 'TRAVEL', name: 'Travel Allowance', type: 'fixed', value: 0.67, conditions: { unit: 'per_km' } },
      { code: 'SITE', name: 'Site Premium', type: 'percentage', value: 20, conditions: { location: 'onsite' } },
      { code: 'HAZARD', name: 'Hazard Pay', type: 'percentage', value: 30, conditions: { hazardous: true } }
    ];
    
    for (const allowance of defaultAllowances) {
      await db.insert(laborAllowances).values(allowance).onConflictDoNothing();
    }
    
    console.log('Labor rate defaults populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating labor rate defaults:', error);
    process.exit(1);
  }
}

populateLaborRateDefaults();