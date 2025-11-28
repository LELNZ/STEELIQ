#!/usr/bin/env npx tsx
/**
 * Migration script to systematically update all hyphenated clock types to underscores
 * This ensures consistency with the database constraint
 */

import * as fs from 'fs';
import * as path from 'path';

// Map of old hyphenated values to new underscore values
const CLOCK_TYPE_REPLACEMENTS: Record<string, string> = {
  "'clock-in'": "'clock_in'",
  "'clock-out'": "'clock_out'",
  "'break-start'": "'break_start'",
  "'break-end'": "'break_end'",
  "'meal-start'": "'meal_start'",
  "'meal-end'": "'meal_end'",
  '"clock-in"': '"clock_in"',
  '"clock-out"': '"clock_out"',
  '"break-start"': '"break_start"',
  '"break-end"': '"break_end"',
  '"meal-start"': '"meal_start"',
  '"meal-end"': '"meal_end"',
};

// Files to process
const FILES_TO_UPDATE = [
  'server/services/complianceService.ts',
  'server/services/timeAnalyticsService.ts',
  'server/services/timesheetReportService.ts',
  'server/complianceRulesService.ts',
  'server/geofenceService.ts',
  'server/test-time-payroll-flow.ts',
  'server/routes.ts'
];

interface UpdateResult {
  file: string;
  replacements: number;
  errors: string[];
}

function updateFile(filePath: string): UpdateResult {
  const result: UpdateResult = {
    file: filePath,
    replacements: 0,
    errors: []
  };

  try {
    // Read the file
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      result.errors.push(`File not found: ${fullPath}`);
      return result;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Apply each replacement
    for (const [oldValue, newValue] of Object.entries(CLOCK_TYPE_REPLACEMENTS)) {
      const regex = new RegExp(escapeRegExp(oldValue), 'g');
      const matches = content.match(regex);
      if (matches) {
        result.replacements += matches.length;
        content = content.replace(regex, newValue);
      }
    }

    // Only write if there were changes
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Updated ${filePath}: ${result.replacements} replacements`);
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`);
    }

  } catch (error) {
    result.errors.push(`Error processing file: ${error}`);
    console.error(`❌ Error updating ${filePath}:`, error);
  }

  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runMigration() {
  console.log('🔄 Starting clock type migration...\n');
  
  const results: UpdateResult[] = [];
  let totalReplacements = 0;
  let filesUpdated = 0;

  for (const file of FILES_TO_UPDATE) {
    const result = updateFile(file);
    results.push(result);
    
    if (result.replacements > 0) {
      totalReplacements += result.replacements;
      filesUpdated++;
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   Files processed: ${FILES_TO_UPDATE.length}`);
  console.log(`   Files updated: ${filesUpdated}`);
  console.log(`   Total replacements: ${totalReplacements}`);

  // Check for any remaining hyphenated clock types
  console.log('\n🔍 Verification: Checking for remaining hyphenated clock types...');
  
  const remainingIssues: string[] = [];
  for (const file of FILES_TO_UPDATE) {
    try {
      const fullPath = path.join(process.cwd(), file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Check for any remaining hyphenated patterns
      const hyphenPattern = /(clock|break|meal)-(in|out|start|end)/gi;
      const matches = content.match(hyphenPattern);
      
      if (matches && matches.length > 0) {
        // Filter out comments and non-code occurrences
        const realMatches = matches.filter(match => {
          const lineWithMatch = content.split('\n').find(line => line.includes(match));
          return lineWithMatch && !lineWithMatch.trim().startsWith('//') && !lineWithMatch.trim().startsWith('*');
        });
        
        if (realMatches.length > 0) {
          remainingIssues.push(`${file}: Found ${realMatches.length} remaining hyphenated values`);
        }
      }
    } catch (error) {
      console.error(`Error verifying ${file}:`, error);
    }
  }

  if (remainingIssues.length > 0) {
    console.log('⚠️  Remaining issues found:');
    remainingIssues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ All hyphenated clock types have been successfully migrated!');
  }

  // Report any errors
  const errors = results.filter(r => r.errors.length > 0);
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(r => {
      r.errors.forEach(e => console.log(`   - ${r.file}: ${e}`));
    });
  }

  console.log('\n✨ Migration complete!');
}

// Run the migration
runMigration().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});