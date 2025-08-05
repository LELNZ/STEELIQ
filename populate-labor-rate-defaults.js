const { db } = require('./server/db');
const { skillLevels, laborAllowances } = require('./shared/schema');

async function populateLaborRateDefaults() {
  try {
    console.log('Populating default skill levels...');
    
    // Insert default skill levels
    const defaultSkillLevels = [
      { name: 'Apprentice', multiplier: 0.7, description: 'Learning the trade, requires supervision', displayOrder: 1 },
      { name: 'Tradesman', multiplier: 1.0, description: 'Competent in standard tasks', displayOrder: 2 },
      { name: 'Journeyman', multiplier: 1.2, description: 'Experienced with complex tasks', displayOrder: 3 },
      { name: 'Master', multiplier: 1.5, description: 'Expert level, can train others', displayOrder: 4 },
      { name: 'Specialist', multiplier: 1.8, description: 'Specialized expertise in specific areas', displayOrder: 5 }
    ];
    
    for (const level of defaultSkillLevels) {
      await db.insert(skillLevels).values(level).onConflictDoNothing();
    }
    
    console.log('Populating default labor allowances...');
    
    // Insert default labor allowances
    const defaultAllowances = [
      { name: 'Overtime', value: 50, isPercentage: true, description: 'Time and a half for overtime hours' },
      { name: 'Night Shift', value: 25, isPercentage: true, description: 'Additional pay for night shift work' },
      { name: 'Weekend Work', value: 50, isPercentage: true, description: 'Premium for weekend work' },
      { name: 'Height Allowance', value: 15, isPercentage: true, description: 'Working at heights over 10m' },
      { name: 'Tool Allowance', value: 5, isPercentage: false, description: 'Daily tool allowance' },
      { name: 'Travel Allowance', value: 0.67, isPercentage: false, description: 'Per km travel allowance' },
      { name: 'Site Premium', value: 20, isPercentage: true, description: 'On-site work premium' },
      { name: 'Hazard Pay', value: 30, isPercentage: true, description: 'Working in hazardous conditions' }
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