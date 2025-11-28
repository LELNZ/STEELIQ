import { replitGmailService } from './server/services/replitGmailService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testReplitGmail() {
  console.log('===========================================');
  console.log('    Replit Gmail OAuth2 Service Test');
  console.log('===========================================\n');

  // Check Replit environment
  const hasReplitAuth = !!(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL);
  const hasConnectorHost = !!process.env.REPLIT_CONNECTORS_HOSTNAME;

  console.log('📋 Environment Check:');
  console.log('------------------------');
  console.log(`✓ Replit Auth Token: ${hasReplitAuth ? '✅ Available' : '❌ Not found'}`);
  console.log(`✓ Connector Hostname: ${hasConnectorHost ? '✅ Set' : '❌ Not found'}`);
  console.log(`✓ Gmail Connected: Checking...\n`);

  if (!hasReplitAuth || !hasConnectorHost) {
    console.error('❌ ERROR: Not running in Replit environment or missing configuration');
    console.error('\nThis service requires:');
    console.error('1. Running in Replit environment');
    console.error('2. Gmail connected through Replit integrations');
    process.exit(1);
  }

  // Test initialization
  console.log('🔄 Initializing Replit Gmail Service...');
  
  try {
    const initialized = await replitGmailService.initialize();

    if (!initialized) {
      console.error('\n❌ Failed to initialize Gmail service');
      console.error('\n📚 Troubleshooting:');
      console.error('1. Ensure Gmail is connected through Replit integrations');
      console.error('2. Check that OAuth permissions include gmail.send');
      console.error('3. Try reconnecting the Gmail integration');
      process.exit(1);
    }

    console.log('✅ Gmail Service initialized successfully!\n');

    // Get test email address
    const testEmail = process.env.TEST_EMAIL || 'notifications@lateralengineering.co.nz';
    
    console.log(`📧 Sending test email to: ${testEmail}`);
    console.log('Please wait...');

    const result = await replitGmailService.sendTestEmail(testEmail);

    if (result.success) {
      console.log('\n🎉 SUCCESS! Test email sent!');
      console.log('✅ Gmail OAuth2 integration is fully operational');
      console.log(`📬 Check inbox for: ${testEmail}`);
      console.log('\n===========================================');
      console.log('    Gmail OAuth2 Setup Complete!');
      console.log('===========================================');
      console.log('\n✨ Benefits of Replit Gmail Integration:');
      console.log('  • Automatic OAuth token refresh');
      console.log('  • No service account keys needed');
      console.log('  • Secure credential management');
      console.log('  • Built-in rate limit handling');
    } else {
      console.error('\n❌ Failed to send test email');
      console.error('Error:', result.error);
      
      console.error('\n📚 Common Issues:');
      console.error('1. Gmail permissions may be insufficient');
      console.error('2. Rate limits may have been exceeded');
      console.error('3. Invalid recipient email address');
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n💥 Unexpected error:', error.message);
    
    if (error.message.includes('not connected')) {
      console.error('\n⚠️  Gmail is not connected through Replit');
      console.error('Please connect Gmail through Replit integrations first');
    }
    
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testReplitGmail().catch(error => {
  console.error('\n💥 Critical error:', error);
  process.exit(1);
});