import { googleWorkspaceEmailService } from './server/services/googleWorkspaceEmailService';

async function testGoogleWorkspace() {
  console.log('Testing Google Workspace Email Service...\n');
  
  // Set environment for SMTP Relay
  process.env.USE_SMTP_RELAY = 'true';
  process.env.SMTP_RELAY_AUTH = 'true'; // Set to 'false' if using IP whitelist
  
  console.log('Configuration:');
  console.log('- Email:', process.env.GMAIL_USER || 'Not set');
  console.log('- Using SMTP Relay:', process.env.USE_SMTP_RELAY);
  console.log('- Requires Auth:', process.env.SMTP_RELAY_AUTH);
  console.log('');
  
  // Initialize the service
  const initialized = await googleWorkspaceEmailService.initialize();
  
  if (!initialized) {
    console.error('❌ Failed to initialize Google Workspace email service');
    console.error('\nPossible issues:');
    console.error('1. SMTP Relay not configured in Admin Console');
    console.error('2. Authentication required but no app password provided');
    console.error('3. IP not whitelisted (if using IP-based auth)');
    process.exit(1);
  }
  
  console.log('✅ Service initialized successfully!\n');
  
  // Send test email
  const testEmail = process.env.GMAIL_USER || 'notifications@lateralengineering.co.nz';
  console.log(`Sending test email to: ${testEmail}`);
  
  const result = await googleWorkspaceEmailService.sendTestEmail(testEmail);
  
  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('Check your inbox for the test email.');
  } else {
    console.error('❌ Failed to send test email:', result.error);
    console.error('\nTroubleshooting:');
    console.error('1. Check SMTP Relay settings in Admin Console');
    console.error('2. Verify TLS encryption is enabled');
    console.error('3. Check if your domain is authorized');
  }
  
  process.exit(result.success ? 0 : 1);
}

testGoogleWorkspace().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});