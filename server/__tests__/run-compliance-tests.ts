#!/usr/bin/env tsx

/**
 * Fortune 50 GPS Override System - Compliance Test Runner
 * 
 * This script runs comprehensive tests to validate Fortune 50 compliance
 * for the GPS override dual authorization system.
 */

import { jwtOverrideService } from '../services/jwtOverrideService';
import { 
  setupTestDatabase, 
  createTestUsers, 
  cleanupTestDatabase,
  calculateHaversineDistance,
  TestUsers
} from './setup/test-setup';
import { storage } from '../storage';
import { gpsOverrideApprovals, gpsOverrideAuditLog } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const db = (storage as any).db;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log();
  log('═'.repeat(60), colors.bright);
  log(title, colors.cyan + colors.bright);
  log('═'.repeat(60), colors.bright);
}

function section(title: string) {
  console.log();
  log('─'.repeat(60), colors.cyan);
  log(title, colors.cyan + colors.bright);
  log('─'.repeat(60), colors.cyan);
}

async function runComplianceTests() {
  header('🚀 FORTUNE 50 GPS OVERRIDE COMPLIANCE TEST SUITE');
  
  let testUsers: TestUsers;
  const results: { [key: string]: boolean } = {};
  
  try {
    // Setup
    section('🔧 Test Environment Setup');
    await setupTestDatabase();
    testUsers = await createTestUsers();
    log('✅ Test environment initialized', colors.green);
    
    // Test 1: Role Validation
    section('1️⃣  SUPERVISOR ROLE VALIDATION');
    try {
      log('Testing non-supervisor rejection...');
      await jwtOverrideService.createOverrideRequest({
        requesterId: testUsers.nonSupervisorId,
        employeeId: testUsers.employeeId,
        clockType: 'clock_in',
        reason: 'Should fail'
      });
      results['Role Validation'] = false;
      log('❌ FAILED: Non-supervisor was allowed to create request', colors.red);
    } catch (error: any) {
      if (error.message.includes('Only supervisors')) {
        results['Role Validation'] = true;
        log('✅ PASSED: Non-supervisors correctly rejected', colors.green);
      } else {
        results['Role Validation'] = false;
        log(`❌ FAILED: Unexpected error: ${error.message}`, colors.red);
      }
    }
    
    // Test 2: Self-Approval Prevention
    section('2️⃣  DUAL AUTHORIZATION - SELF APPROVAL PREVENTION');
    try {
      log('Creating override request...');
      const request = await jwtOverrideService.createOverrideRequest({
        requesterId: testUsers.supervisorId,
        employeeId: testUsers.employeeId,
        clockType: 'clock_in',
        reason: 'Test self-approval'
      });
      
      log('Attempting self-approval...');
      await jwtOverrideService.approveOverrideRequest({
        requestId: request.requestId,
        approverId: testUsers.supervisorId,
        approvalPin: '1234',
        approvalMethod: 'pin'
      });
      results['Self-Approval Prevention'] = false;
      log('❌ FAILED: Self-approval was allowed', colors.red);
    } catch (error: any) {
      if (error.message.includes('Self-approval not allowed')) {
        results['Self-Approval Prevention'] = true;
        log('✅ PASSED: Self-approval correctly prevented', colors.green);
      } else {
        results['Self-Approval Prevention'] = false;
        log(`❌ FAILED: Unexpected error: ${error.message}`, colors.red);
      }
    }
    
    // Test 3: 2FA PIN Validation
    section('3️⃣  2FA PIN VALIDATION');
    try {
      log('Creating override request...');
      const request = await jwtOverrideService.createOverrideRequest({
        requesterId: testUsers.supervisorId,
        employeeId: testUsers.employeeId,
        clockType: 'clock_in',
        reason: 'Test PIN validation'
      });
      
      // Test wrong PIN
      log('Testing incorrect PIN rejection...');
      try {
        await jwtOverrideService.approveOverrideRequest({
          requestId: request.requestId,
          approverId: testUsers.secondSupervisorId,
          approvalPin: 'wrong',
          approvalMethod: 'pin'
        });
        results['PIN Validation'] = false;
        log('❌ FAILED: Wrong PIN was accepted', colors.red);
      } catch (error: any) {
        if (error.message.includes('Invalid PIN')) {
          log('✓ Wrong PIN correctly rejected');
          
          // Test correct PIN
          log('Testing correct PIN acceptance...');
          const approval = await jwtOverrideService.approveOverrideRequest({
            requestId: request.requestId,
            approverId: testUsers.secondSupervisorId,
            approvalPin: '5678',
            approvalMethod: 'pin'
          });
          
          if (approval.token && approval.jti) {
            results['PIN Validation'] = true;
            log('✅ PASSED: 2FA PIN validation working correctly', colors.green);
            log(`   Token: ${approval.token.substring(0, 20)}...`);
            log(`   JTI: ${approval.jti}`);
          } else {
            results['PIN Validation'] = false;
            log('❌ FAILED: No token generated', colors.red);
          }
        }
      }
    } catch (error: any) {
      results['PIN Validation'] = false;
      log(`❌ FAILED: ${error.message}`, colors.red);
    }
    
    // Test 4: Token Replay Prevention
    section('4️⃣  JWT TOKEN REPLAY PREVENTION');
    try {
      log('Creating and approving request...');
      const request = await jwtOverrideService.createOverrideRequest({
        requesterId: testUsers.supervisorId,
        employeeId: testUsers.employeeId,
        clockType: 'clock_in',
        reason: 'Test token replay'
      });
      
      const approval = await jwtOverrideService.approveOverrideRequest({
        requestId: request.requestId,
        approverId: testUsers.secondSupervisorId,
        approvalPin: '5678',
        approvalMethod: 'pin'
      });
      
      log('First token use (should succeed)...');
      const firstUse = await jwtOverrideService.validateOverrideToken(approval.token);
      
      if (firstUse.valid) {
        log('✓ Token validated successfully');
        log(`   Location ID: ${firstUse.locationTrackingId}`);
        
        log('Second token use (should fail - replay attack)...');
        const secondUse = await jwtOverrideService.validateOverrideToken(approval.token);
        
        if (!secondUse.valid && secondUse.error?.includes('already')) {
          results['Token Replay Prevention'] = true;
          log('✅ PASSED: Token replay correctly prevented', colors.green);
        } else {
          results['Token Replay Prevention'] = false;
          log('❌ FAILED: Token replay was allowed', colors.red);
        }
      } else {
        results['Token Replay Prevention'] = false;
        log('❌ FAILED: Initial token validation failed', colors.red);
      }
    } catch (error: any) {
      results['Token Replay Prevention'] = false;
      log(`❌ FAILED: ${error.message}`, colors.red);
    }
    
    // Test 5: Rate Limiting
    section('5️⃣  RATE LIMITING (5 per hour)');
    try {
      log('Clearing existing requests...');
      await db.delete(gpsOverrideApprovals)
        .where(eq(gpsOverrideApprovals.requesterId, testUsers.supervisorId));
      
      log('Creating 5 requests (should succeed)...');
      for (let i = 0; i < 5; i++) {
        await jwtOverrideService.createOverrideRequest({
          requesterId: testUsers.supervisorId,
          employeeId: testUsers.employeeId,
          clockType: 'clock_in',
          reason: `Rate test ${i + 1}`
        });
        log(`   ✓ Request ${i + 1}/5 created`);
      }
      
      log('Creating 6th request (should fail)...');
      await jwtOverrideService.createOverrideRequest({
        requesterId: testUsers.supervisorId,
        employeeId: testUsers.employeeId,
        clockType: 'clock_in',
        reason: 'Should be rate limited'
      });
      
      results['Rate Limiting'] = false;
      log('❌ FAILED: Rate limit not enforced', colors.red);
    } catch (error: any) {
      if (error.message.includes('Rate limit exceeded')) {
        results['Rate Limiting'] = true;
        log('✅ PASSED: Rate limiting correctly enforced at 5 requests', colors.green);
      } else {
        results['Rate Limiting'] = false;
        log(`❌ FAILED: ${error.message}`, colors.red);
      }
    }
    
    // Test 6: Audit Hash Chain
    section('6️⃣  IMMUTABLE AUDIT LOG WITH HASH CHAIN');
    try {
      log('Fetching recent audit logs...');
      const auditLogs = await db.select()
        .from(gpsOverrideAuditLog)
        .orderBy(desc(gpsOverrideAuditLog.sequenceNumber))
        .limit(5);
      
      if (auditLogs.length >= 2) {
        let hashChainValid = true;
        log(`Verifying hash chain for ${auditLogs.length} entries...`);
        
        for (let i = 0; i < auditLogs.length - 1; i++) {
          const current = auditLogs[i];
          const previous = auditLogs[i + 1];
          
          if (current.previousHash !== previous.currentHash) {
            hashChainValid = false;
            log(`   ❌ Hash chain broken between entries ${i} and ${i + 1}`, colors.red);
          } else {
            log(`   ✓ Entry ${i}: Hash verified`);
          }
          
          // Verify SHA-256 format
          if (!current.currentHash.match(/^[a-f0-9]{64}$/)) {
            hashChainValid = false;
            log(`   ❌ Invalid hash format for entry ${i}`, colors.red);
          }
        }
        
        // Check sequence numbers
        let sequenceValid = true;
        for (let i = 0; i < auditLogs.length - 1; i++) {
          const current = BigInt(auditLogs[i].sequenceNumber);
          const next = BigInt(auditLogs[i + 1].sequenceNumber);
          
          if (current - next !== 1n) {
            sequenceValid = false;
            log(`   ❌ Sequence gap: ${current} to ${next}`, colors.red);
          }
        }
        
        results['Audit Hash Chain'] = hashChainValid && sequenceValid;
        if (results['Audit Hash Chain']) {
          log('✅ PASSED: Tamper-evident hash chain verified', colors.green);
        } else {
          log('❌ FAILED: Hash chain integrity issues detected', colors.red);
        }
      } else {
        results['Audit Hash Chain'] = false;
        log('❌ FAILED: Not enough audit entries to verify chain', colors.red);
      }
    } catch (error: any) {
      results['Audit Hash Chain'] = false;
      log(`❌ FAILED: ${error.message}`, colors.red);
    }
    
    // Test 7: GPS Distance Calculation
    section('7️⃣  GPS DISTANCE CALCULATION');
    try {
      log('Testing Haversine distance formula...');
      
      const nyc = { lat: 40.7128, lon: -74.0060 };
      const timesSquare = { lat: 40.7580, lon: -73.9855 };
      const sydney = { lat: -33.8688, lon: 151.2093 };
      const melbourne = { lat: -37.8136, lon: 144.9631 };
      
      const distance1 = calculateHaversineDistance(nyc.lat, nyc.lon, timesSquare.lat, timesSquare.lon);
      const distance2 = calculateHaversineDistance(sydney.lat, sydney.lon, melbourne.lat, melbourne.lon);
      
      log(`   NYC to Times Square: ${distance1.toFixed(2)} miles (expected ~3.5)`);
      log(`   Sydney to Melbourne: ${distance2.toFixed(2)} miles (expected ~435)`);
      
      const accurate1 = distance1 > 3 && distance1 < 4;
      const accurate2 = distance2 > 400 && distance2 < 500;
      
      results['GPS Calculations'] = accurate1 && accurate2;
      if (results['GPS Calculations']) {
        log('✅ PASSED: GPS distance calculations accurate', colors.green);
      } else {
        log('❌ FAILED: GPS calculations inaccurate', colors.red);
      }
    } catch (error: any) {
      results['GPS Calculations'] = false;
      log(`❌ FAILED: ${error.message}`, colors.red);
    }
    
    // Summary
    header('📊 COMPLIANCE TEST SUMMARY');
    
    const testCategories = [
      'Role Validation',
      'Self-Approval Prevention',
      'PIN Validation',
      'Token Replay Prevention',
      'Rate Limiting',
      'Audit Hash Chain',
      'GPS Calculations'
    ];
    
    let passedCount = 0;
    let failedCount = 0;
    
    testCategories.forEach(category => {
      const passed = results[category] === true;
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const color = passed ? colors.green : colors.red;
      
      if (passed) passedCount++;
      else failedCount++;
      
      log(`${category.padEnd(30)} ${status}`, color);
    });
    
    log('─'.repeat(60), colors.cyan);
    log(`Total: ${passedCount} passed, ${failedCount} failed`, colors.bright);
    
    const overallStatus = failedCount === 0 ? 
      '🏆 FORTUNE 50 COMPLIANT' : 
      '⚠️  COMPLIANCE GAPS DETECTED';
    
    const statusColor = failedCount === 0 ? colors.green : colors.yellow;
    
    header(overallStatus);
    log(overallStatus, statusColor + colors.bright);
    
    // Cleanup
    section('🧹 Test Cleanup');
    await cleanupTestDatabase();
    log('✅ Test data cleaned up', colors.green);
    
    // Exit with appropriate code
    process.exit(failedCount === 0 ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ CRITICAL TEST FAILURE: ${error}`, colors.red + colors.bright);
    
    // Attempt cleanup
    try {
      await cleanupTestDatabase();
    } catch (cleanupError) {
      log('⚠️  Cleanup failed, manual cleanup may be required', colors.yellow);
    }
    
    process.exit(1);
  }
}

// Run the tests
console.log(colors.bright + '\n🔬 GPS Override Dual Authorization System' + colors.reset);
console.log(colors.cyan + 'Fortune 50 Compliance Test Suite v1.0' + colors.reset);

runComplianceTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});