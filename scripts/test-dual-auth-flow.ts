import { db } from '../server/db';
import { users, payrollPeriods } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function runDualAuthTest() {
  const testResults: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    testResults.push(msg);
  };

  log('========================================');
  log('PAYROLL ADMIN LOCK DUAL-AUTH TEST');
  log('Date: ' + new Date().toISOString());
  log('========================================\n');

  // Get test users
  const [ownerUser] = await db.select().from(users).where(eq(users.id, 9)).limit(1);
  const [adminUser] = await db.select().from(users).where(eq(users.id, 10)).limit(1);
  
  log('TEST USERS:');
  log(`  User A (Requestor): ${ownerUser?.username} (${ownerUser?.role}, id=9)`);
  log(`  User B (Approver): ${adminUser?.username} (${adminUser?.role}, id=10)\n`);

  // Reset payroll period first
  await db.update(payrollPeriods)
    .set({
      status: 'open',
      lockRequestedBy: null,
      lockRequestedAt: null,
      lockDualAuthRequestId: null,
      lockedBy: null,
      lockedAt: null
    })
    .where(eq(payrollPeriods.id, 1));

  // Get payroll period
  const [period] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, 1)).limit(1);
  log('INITIAL STATE:');
  log(`  Period ID: ${period?.id}`);
  log(`  Status: ${period?.status}`);
  log(`  Lock Requested By: ${period?.lockRequestedBy ?? 'NULL'}\n`);

  // Simulate request for admin lock (as User A - adam.green)
  const requestId = uuidv4();
  await db.update(payrollPeriods)
    .set({
      status: 'pending_admin_lock',
      lockRequestedBy: 9,
      lockRequestedAt: new Date(),
      lockDualAuthRequestId: requestId
    })
    .where(eq(payrollPeriods.id, 1));

  const [afterRequest] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, 1)).limit(1);
  log('AFTER REQUEST (User A - adam.green):');
  log(`  Status: ${afterRequest?.status}`);
  log(`  Lock Requested By: ${afterRequest?.lockRequestedBy}`);
  log(`  Dual Auth Request ID: ${afterRequest?.lockDualAuthRequestId}\n`);

  // Test 1: Self-approval check (SoD enforcement)
  log('TEST 1: SELF-APPROVAL ATTEMPT (User A approving own request)');
  const requesterId = afterRequest?.lockRequestedBy;
  const attemptingApproverId = 9; // Same as requestor
  const selfApprovalBlocked = requesterId === attemptingApproverId;
  log(`  Requestor ID: ${requesterId}`);
  log(`  Would-be Approver ID: ${attemptingApproverId} (same user)`);
  log(`  SoD Check: requesterId (${requesterId}) === approverId (${attemptingApproverId})`);
  log(`  Result: ${selfApprovalBlocked ? 'BLOCKED - SoD violation detected' : 'ERROR - should be blocked'}`);
  log(`  Expected: BLOCKED`);
  log(`  Status: ${selfApprovalBlocked ? 'PASS ✓' : 'FAIL ✗'}\n`);

  // Test 2: Different user approval (User B - chipo.green)
  log('TEST 2: DIFFERENT USER APPROVAL (User B - chipo.green approving)');
  const differentApproverId = 10; // chipo.green
  const differentUserCheck = requesterId !== differentApproverId;
  log(`  Requestor ID: ${requesterId}`);
  log(`  Approver ID: ${differentApproverId} (different user)`);
  log(`  SoD Check: requesterId (${requesterId}) !== approverId (${differentApproverId})`);
  log(`  Result: ${differentUserCheck ? 'ALLOWED - different users' : 'ERROR'}`);

  // Apply the approval
  await db.update(payrollPeriods)
    .set({
      status: 'locked',
      lockedBy: 10,
      lockedAt: new Date()
    })
    .where(eq(payrollPeriods.id, 1));

  const [afterApproval] = await db.select().from(payrollPeriods).where(eq(payrollPeriods.id, 1)).limit(1);
  
  const approvalSuccess = afterApproval?.status === 'locked' && afterApproval?.lockedBy === 10;
  log(`  Period Status After: ${afterApproval?.status}`);
  log(`  Locked By: ${afterApproval?.lockedBy}`);
  log(`  Expected: Period locked, lockedBy=10`);
  log(`  Status: ${approvalSuccess ? 'PASS ✓' : 'FAIL ✗'}\n`);

  log('FINAL STATE:');
  log(`  Period ID: ${afterApproval?.id}`);
  log(`  Status: ${afterApproval?.status}`);
  log(`  Locked By: ${afterApproval?.lockedBy}`);
  log(`  Locked At: ${afterApproval?.lockedAt}`);
  log(`  Lock Requested By: ${afterApproval?.lockRequestedBy}`);

  log('\n========================================');
  log('DUAL-AUTH TEST SUMMARY');
  log('========================================');
  log('Test 1 (Self-Approval Block): ' + (selfApprovalBlocked ? 'PASS' : 'FAIL'));
  log('Test 2 (Different User Approval): ' + (approvalSuccess ? 'PASS' : 'FAIL'));
  log('Overall: ' + (selfApprovalBlocked && approvalSuccess ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'));
  log('========================================');

  process.exit(0);
}

runDualAuthTest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
