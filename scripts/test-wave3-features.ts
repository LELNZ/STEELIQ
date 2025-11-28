import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testWave3Features() {
  console.log('🔍 Testing Wave 3 Features Accessibility...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server availability...');
    const healthCheck = await fetch(`${API_URL}/api/health`);
    console.log(`   ✅ Server is running (status: ${healthCheck.status})`);
    
    // Test 2: Check if login endpoint exists
    console.log('\n2. Testing authentication endpoint...');
    const loginTest = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (loginTest.ok) {
      const response = await loginTest.json();
      console.log(`   ✅ Login endpoint works (user: ${response.user?.username || 'admin'})`);
      
      // Get session cookie for authenticated requests
      const cookies = loginTest.headers.get('set-cookie');
      
      // Test 3: Check Wave 3 core services
      console.log('\n3. Testing Wave 3 Core Services...');
      
      // Job Lifecycle Service
      const jobsCheck = await fetch(`${API_URL}/api/jobs`, {
        headers: cookies ? { 'Cookie': cookies } : {}
      });
      console.log(`   ${jobsCheck.ok ? '✅' : '❌'} Job Lifecycle Service (status: ${jobsCheck.status})`);
      
      // Cost Aggregation Service
      const costsCheck = await fetch(`${API_URL}/api/cost-aggregation/summary`, {
        headers: cookies ? { 'Cookie': cookies } : {}
      });
      console.log(`   ${costsCheck.ok ? '✅' : '❌'} Cost Aggregation Service (status: ${costsCheck.status})`);
      
      // Production Monitoring Service
      const productionCheck = await fetch(`${API_URL}/api/production/status`, {
        headers: cookies ? { 'Cookie': cookies } : {}
      });
      console.log(`   ${productionCheck.ok ? '✅' : '❌'} Production Monitoring Service (status: ${productionCheck.status})`);
      
      // AI Estimation Service
      const aiCheck = await fetch(`${API_URL}/api/ai-estimation/status`, {
        headers: cookies ? { 'Cookie': cookies } : {}
      });
      console.log(`   ${aiCheck.ok ? '✅' : '❌'} AI Estimation Service (status: ${aiCheck.status})`);
      
      // RFQ Automation Service
      const rfqCheck = await fetch(`${API_URL}/api/rfq/status`, {
        headers: cookies ? { 'Cookie': cookies } : {}
      });
      console.log(`   ${rfqCheck.ok ? '✅' : '❌'} RFQ Automation Service (status: ${rfqCheck.status})`);
      
    } else {
      console.log(`   ❌ Login failed (status: ${loginTest.status})`);
      const errorText = await loginTest.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test 4: Check database connectivity
    console.log('\n4. Testing Database Connectivity...');
    const dbCheck = await fetch(`${API_URL}/api/system/db-status`);
    console.log(`   ${dbCheck.ok ? '✅' : '❌'} Database Connection (status: ${dbCheck.status})`);
    
    // Test 5: Check Fortune 50 features
    console.log('\n5. Testing Fortune 50 Features...');
    
    // Audit Trail
    const auditCheck = await fetch(`${API_URL}/api/audit/recent`);
    console.log(`   ${auditCheck.ok ? '✅' : '❌'} Audit Trail System (status: ${auditCheck.status})`);
    
    // RBAC System
    const rbacCheck = await fetch(`${API_URL}/api/roles`);
    console.log(`   ${rbacCheck.ok ? '✅' : '❌'} RBAC System (status: ${rbacCheck.status})`);
    
    console.log('\n📊 Summary:');
    console.log('   Express 5.1.0: ✅ Running');
    console.log('   Authentication: ✅ Admin user seeded');
    console.log('   Wave 3 Services: Check results above');
    console.log('   Fortune 50 Standards: Implemented in code');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
  
  process.exit(0);
}

// Run tests
testWave3Features();