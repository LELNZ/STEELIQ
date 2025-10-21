#!/usr/bin/env node

const API_URL = 'http://localhost:5000/api';

async function testConsumptionRates() {
  console.log('Testing Consumption Rates System...\n');
  
  try {
    // Test 1: GET all consumption rates
    console.log('1. Testing GET /api/consumption-rates...');
    const getResponse = await fetch(`${API_URL}/consumption-rates?activeOnly=false`);
    const rates = await getResponse.json();
    console.log(`   ✓ Retrieved ${rates.length} rates`);
    
    // Test 2: POST a new consumption rate (requires authentication)
    console.log('\n2. Testing POST /api/consumption-rates...');
    console.log('   Note: This endpoint requires authentication');
    const newRate = {
      operation_type: 'test_cutting',
      method: 'test_method',
      primary_consumable: 'Test Consumable',
      primary_consumable_rate: 0.5,
      primary_consumable_unit: 'per cut',
      is_active: true,
      is_company_default: false
    };
    
    const postResponse = await fetch(`${API_URL}/consumption-rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newRate),
      credentials: 'include'
    });
    
    if (postResponse.status === 401) {
      console.log('   ℹ️  POST requires authentication (401) - This is expected');
    } else if (postResponse.ok) {
      const created = await postResponse.json();
      console.log('   ✓ Created rate with ID:', created.id);
      
      // Test 3: PATCH to update the rate
      console.log('\n3. Testing PATCH /api/consumption-rates/:id...');
      const updateData = {
        primary_consumable_rate: 0.75,
        notes: 'Updated via test'
      };
      
      const patchResponse = await fetch(`${API_URL}/consumption-rates/${created.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });
      
      if (patchResponse.ok) {
        const updated = await patchResponse.json();
        console.log('   ✓ Updated rate successfully');
      } else {
        console.log('   ❌ PATCH failed:', patchResponse.status);
      }
      
      // Test 4: DELETE the test rate
      console.log('\n4. Testing DELETE /api/consumption-rates/:id...');
      const deleteResponse = await fetch(`${API_URL}/consumption-rates/${created.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (deleteResponse.ok) {
        console.log('   ✓ Deleted rate successfully');
      } else {
        console.log('   ❌ DELETE failed:', deleteResponse.status);
      }
    } else {
      const error = await postResponse.text();
      console.log('   ❌ POST failed:', postResponse.status, error);
    }
    
    // Test 5: Lookup endpoint
    console.log('\n5. Testing GET /api/consumption-rates/lookup...');
    const lookupResponse = await fetch(`${API_URL}/consumption-rates/lookup?operationType=cutting`);
    if (lookupResponse.ok) {
      const lookupResult = await lookupResponse.json();
      if (lookupResult) {
        console.log('   ✓ Lookup successful:', lookupResult.operation_type, '-', lookupResult.method);
      } else {
        console.log('   ℹ️  No matching rate found (this is OK if no rates exist)');
      }
    } else {
      console.log('   ❌ Lookup failed:', lookupResponse.status);
    }
    
    // Test 6: Operation templates
    console.log('\n6. Testing GET /api/operation-templates...');
    const templatesResponse = await fetch(`${API_URL}/operation-templates`);
    if (templatesResponse.ok) {
      const templates = await templatesResponse.json();
      console.log(`   ✓ Retrieved ${templates.length} templates`);
    } else {
      console.log('   ❌ Failed to fetch templates:', templatesResponse.status);
    }
    
    console.log('\n✅ Basic connectivity tests completed!');
    console.log('Note: Full CRUD testing requires authentication.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testConsumptionRates();