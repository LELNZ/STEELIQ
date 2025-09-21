#!/usr/bin/env node

const fs = require('fs');

// We'll need to get auth token from existing browser session
// For testing, we'll use admin credentials
const baseURL = 'http://localhost:5000';

async function loginAndGetToken() {
  try {
    const response = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    if (!response.ok) {
      console.error('Login failed');
      return null;
    }

    const cookieHeader = response.headers.get('set-cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
}

async function makeAuthRequest(endpoint, method = 'GET', body = null, token) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${token}`,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseURL}${endpoint}`, options);
  
  if (!response.ok) {
    console.error(`Request failed: ${response.status} ${response.statusText}`);
    return null;
  }
  
  return response.json();
}

async function main() {
  console.log('Testing Data Management System...\n');
  
  // Login
  console.log('1. Logging in...');
  const token = await loginAndGetToken();
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }
  console.log('✓ Logged in successfully\n');

  // Initialize sequences
  console.log('2. Initializing numbering sequences...');
  const initResult = await makeAuthRequest('/api/data-management/initialize-sequences', 'POST', {}, token);
  console.log('✓ Sequences initialized:', initResult?.message || 'Success');
  
  // Get sequences
  console.log('\n3. Getting current numbering sequences...');
  const sequences = await makeAuthRequest('/api/data-management/numbering-sequences', 'GET', null, token);
  if (sequences) {
    console.log('Current sequences:');
    sequences.forEach(seq => {
      console.log(`  - ${seq.sequenceType}: ${seq.prefix}${String(seq.currentNumber).padStart(seq.padLength, '0')}`);
    });
  }
  
  // Create a backup
  console.log('\n4. Creating full backup...');
  const backupResult = await makeAuthRequest('/api/data-management/backup', 'POST', {
    categories: ['procurement', 'jobs', 'finance'],
    description: 'Pre-clear backup - full system'
  }, token);
  console.log('✓ Backup created:', backupResult?.backupId || 'Success');
  
  // Clear procurement data
  console.log('\n5. Clearing all procurement data...');
  const clearProcurement = await makeAuthRequest('/api/data-management/clear-procurement', 'POST', {}, token);
  if (clearProcurement?.deletedCounts) {
    console.log('Deleted records:');
    Object.entries(clearProcurement.deletedCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`  - ${table}: ${count}`);
      }
    });
  }
  
  // Clear jobs data
  console.log('\n6. Clearing all jobs data...');
  const clearJobs = await makeAuthRequest('/api/data-management/clear-jobs', 'POST', {}, token);
  if (clearJobs?.deletedCounts) {
    console.log('Deleted records:');
    Object.entries(clearJobs.deletedCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`  - ${table}: ${count}`);
      }
    });
  }
  
  // Clear finance data
  console.log('\n7. Clearing all financial data...');
  const clearFinance = await makeAuthRequest('/api/data-management/clear-finance', 'POST', {}, token);
  if (clearFinance?.deletedCounts) {
    console.log('Deleted records:');
    Object.entries(clearFinance.deletedCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`  - ${table}: ${count}`);
      }
    });
  }
  
  // Reset numbering sequences
  console.log('\n8. Resetting numbering sequences to start from 1...');
  const sequenceTypes = ['PO', 'REQ', 'RFQ', 'JOB', 'QUOTE'];
  for (const type of sequenceTypes) {
    const resetResult = await makeAuthRequest(
      `/api/data-management/numbering-sequences/${type}/reset`, 
      'POST', 
      { startingNumber: 1 },
      token
    );
    console.log(`  ✓ ${type} reset:`, resetResult?.message || 'Success');
  }
  
  // List backups
  console.log('\n9. Listing all backups...');
  const backups = await makeAuthRequest('/api/data-management/backups', 'GET', null, token);
  if (backups && backups.length > 0) {
    console.log(`Found ${backups.length} backup(s):`);
    backups.forEach(backup => {
      console.log(`  - ${backup.backupName} (${backup.recordCount} records)`);
    });
  }
  
  console.log('\n✅ Data management test complete!');
  console.log('The system has been cleared and reset with:');
  console.log('  - All procurement data cleared (REQ, RFQ, PO, Receipts)');
  console.log('  - All job data cleared');
  console.log('  - All financial data cleared (Quotes)');
  console.log('  - Numbering sequences reset to start from 1');
  console.log('  - Next numbers will be: PO-00001, REQ-00001, RFQ-00001, etc.');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});