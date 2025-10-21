# STEELIQ Archive Recovery Guide
## Created: October 21, 2025

## Purpose
This archive contains files that were identified as one-time scripts, unused test files, and SQL migration files that are no longer actively used in the production application. These files were archived to clean up the codebase for Wave 3 completion.

## Recovery Instructions

If you encounter an error after archiving (e.g., "Cannot find module './[filename]'"), follow these steps:

### 1. Identify the Missing File
The error message will specify the exact file path that's missing.

### 2. Restore the File
```bash
# For one-time scripts
mv archive/one-time-scripts/[filename] server/[filename]

# For SQL files  
mv archive/sql-files/[filename] server/[filename]

# For test files
mv archive/test-files/[filename] server/testing/[filename]
```

### 3. Verify Application Restart
The workflow should automatically restart after restoring the file.

## Archived Files Manifest

### One-Time Scripts (archive/one-time-scripts/)
These files were verified to have NO active imports after 6 cross-reference checks:
- create-labor-profile-tables.ts - One-time table creation script
- create-labor-tables.ts - One-time table creation script
- create-quote-tables.js - One-time table creation script  
- seed-labor-rates.ts - One-time data seeding script
- populate-connection-components.ts - One-time data population
- populateTemplates.ts - One-time template population (imports templateContent but not imported elsewhere)
- testFeedbackLoop.ts - Test script not in package.json

### SQL Files (archive/sql-files/)
These SQL files are not referenced in any code:
- addTemplates.sql - Manual SQL template insertion
- insertTemplateVersions.sql - Manual SQL version insertion
- populateAllTemplates.sql - Manual SQL template population

### Test Files (archive/test-files/)
Test files outside standard test directory:
- testing/testTemplateSystem.ts - Standalone test file
- testing/testTemplateContent.ts - Standalone test file

## Files NOT Archived (Actively Used)
These files remain in production as they have active dependencies:
- server/emailService.ts - Used by server/poTracking.ts
- server/templateService.ts - Used by emailService.ts and rfqEmailService.ts
- server/defaultTemplates.ts - Imported by routes.ts (line 60)
- server/initializeProfessionalTemplates.ts - Imported by routes.ts (line 72)  
- server/templateContent.ts - Imported by initializeProfessionalTemplates.ts
- server/services/defaultTemplatesService.ts - Imported by routes.ts (line 17729)

## Verification Methods Used
1. Direct import statement search (`import.*filename`)
2. Require statement search (`require.*filename`)
3. Dynamic import search in routes.ts
4. Package.json script references
5. SQL file usage in code
6. Cross-reference with Wave 3 core services

## Contact
If you need assistance with recovery, check the error logs first to identify the exact missing file path.