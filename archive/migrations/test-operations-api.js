const fetch = require('node-fetch');

async function testOperationsAPI() {
  try {
    // Test drilling standards endpoint
    console.log('Testing /api/operations/drilling-standards...');
    const response = await fetch('http://localhost:5000/api/operations/drilling-standards');
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (Array.isArray(data)) {
      console.log(`Found ${data.length} drilling standards`);
      if (data.length > 0) {
        console.log('First item structure:', Object.keys(data[0]));
      }
    } else {
      console.log('Response is not an array:', typeof data);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testOperationsAPI();