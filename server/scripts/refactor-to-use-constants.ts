#!/usr/bin/env npx tsx
/**
 * Script to refactor services to use clock type constants instead of string literals
 */

import * as fs from 'fs';
import * as path from 'path';

// Files to update with the import statement and refactoring
const FILES_TO_UPDATE = [
  {
    path: 'server/services/complianceService.ts',
    needsImport: false, // Already has the import
    replacements: [
      { from: "eq(timeClocks.clockType, 'clock_in')", to: "eq(timeClocks.clockType, CLOCK_TYPES[0])" },
      { from: "eq(timeClocks.clockType, 'break_start')", to: "eq(timeClocks.clockType, CLOCK_TYPES[2])" },
      { from: "eq(timeClocks.clockType, 'meal_start')", to: "eq(timeClocks.clockType, CLOCK_TYPES[4])" },
    ]
  },
  {
    path: 'server/services/timeAnalyticsService.ts',
    needsImport: true,
    replacements: [
      { from: "eq(timeClocks.clockType, 'clock_in')", to: "eq(timeClocks.clockType, CLOCK_TYPES[0])" },
      { from: "eq(timeClocks.clockType, 'break_start')", to: "eq(timeClocks.clockType, CLOCK_TYPES[2])" },
    ]
  },
  {
    path: 'server/services/timesheetReportService.ts',
    needsImport: true,
    replacements: [
      { from: "c.clockType === 'clock_in'", to: "c.clockType === CLOCK_TYPES[0]" },
      { from: "c.clockType === 'clock_out'", to: "c.clockType === CLOCK_TYPES[1]" },
      { from: "c.clockType === 'break_start'", to: "c.clockType === CLOCK_TYPES[2]" },
      { from: "c.clockType === 'break_end'", to: "c.clockType === CLOCK_TYPES[3]" },
      { from: "c.clockType === 'meal_start'", to: "c.clockType === CLOCK_TYPES[4]" },
      { from: "c.clockType === 'meal_end'", to: "c.clockType === CLOCK_TYPES[5]" },
    ]
  },
  {
    path: 'server/complianceRulesService.ts',
    needsImport: true,
    replacements: [
      { from: "clock.clockType === 'clock_in'", to: "clock.clockType === CLOCK_TYPES[0]" },
      { from: "clock.clockType === 'clock_out'", to: "clock.clockType === CLOCK_TYPES[1]" },
      { from: "clock.clockType === 'break_start'", to: "clock.clockType === CLOCK_TYPES[2]" },
      { from: "clock.clockType === 'break_end'", to: "clock.clockType === CLOCK_TYPES[3]" },
      { from: "c.clockType === 'break_start'", to: "c.clockType === CLOCK_TYPES[2]" },
      { from: "c.clockType === 'break_end'", to: "c.clockType === CLOCK_TYPES[3]" },
      { from: "eq(timeClocks.clockType, 'clock_out')", to: "eq(timeClocks.clockType, CLOCK_TYPES[1])" },
      { from: "eq(timeClocks.clockType, 'clock_in')", to: "eq(timeClocks.clockType, CLOCK_TYPES[0])" },
    ]
  }
];

const IMPORT_STATEMENT = `import { CLOCK_TYPES, ClockType } from "@shared/constants/timeClock";`;

function addImportIfNeeded(content: string, needsImport: boolean): string {
  if (!needsImport || content.includes('@shared/constants/timeClock')) {
    return content;
  }

  // Find the last import statement and add our import after it
  const importRegex = /^import.*from.*;$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertPosition) + '\n' + IMPORT_STATEMENT + content.slice(insertPosition);
  }
  
  // If no imports found, add at the beginning
  return IMPORT_STATEMENT + '\n\n' + content;
}

function updateFile(fileConfig: typeof FILES_TO_UPDATE[0]): void {
  const fullPath = path.join(process.cwd(), fileConfig.path);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Add import if needed
    content = addImportIfNeeded(content, fileConfig.needsImport);

    // Apply replacements
    let replacementCount = 0;
    for (const replacement of fileConfig.replacements) {
      const before = content;
      content = content.split(replacement.from).join(replacement.to);
      if (before !== content) {
        replacementCount += before.split(replacement.from).length - 1;
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ Updated ${fileConfig.path}: ${replacementCount} replacements`);
    } else {
      console.log(`ℹ️  No changes needed in ${fileConfig.path}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${fileConfig.path}:`, error);
  }
}

console.log('🔄 Refactoring services to use clock type constants...\n');

for (const fileConfig of FILES_TO_UPDATE) {
  updateFile(fileConfig);
}

console.log('\n✨ Refactoring complete!');