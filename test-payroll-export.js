const fetch = require('node-fetch');

async function testPayrollExport() {
  console.log("=== Testing Payroll Export Functionality ===\n");
  
  // First, we need to login to get a session
  console.log("1. Attempting login...");
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });
  
  const loginData = await loginResponse.json();
  const sessionToken = loginData.sessionToken;
  
  if (!sessionToken) {
    console.log("❌ Login failed - cannot test payroll export");
    return;
  }
  
  console.log("✓ Login successful\n");
  
  // Try to export payroll period 1 (without dual auth - should fail)
  console.log("2. Testing payroll export without dual auth...");
  const exportResponse1 = await fetch('http://localhost:5000/api/payroll-periods/1/export', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `sessionToken=${sessionToken}`
    },
    body: JSON.stringify({})
  });
  
  const exportData1 = await exportResponse1.json();
  console.log("Response:", exportData1);
  
  if (exportData1.requiresDualAuth) {
    console.log("✓ Correctly requires dual authorization\n");
  }
  
  // Now test with a mock dual auth request ID
  console.log("3. Testing payroll export WITH dual auth (simulated)...");
  const exportResponse2 = await fetch('http://localhost:5000/api/payroll-periods/1/export', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `sessionToken=${sessionToken}`
    },
    body: JSON.stringify({
      dualAuthRequestId: 'test-dual-auth-123'
    })
  });
  
  const exportData2 = await exportResponse2.json();
  console.log("Response status:", exportResponse2.status);
  console.log("Response data:", exportData2);
  
  if (exportResponse2.status === 500) {
    console.log("\n❌ PAYROLL EXPORT FAILED - Likely SQL error on users.hourlyRate");
    console.log("Error details:", exportData2.error);
  } else if (exportResponse2.status === 403) {
    console.log("\n⚠️ Dual auth validation failed (expected for test)");
  } else if (exportResponse2.status === 200) {
    console.log("\n✓ PAYROLL EXPORT SUCCEEDED - System has workaround for missing hourlyRate");
  }
  
  console.log("\n=== Test Complete ===");
}

testPayrollExport().catch(console.error);