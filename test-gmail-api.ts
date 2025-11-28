import { gmailApiService } from './server/services/gmailApiService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGmailApi() {
  console.log('===========================================');
  console.log('      Gmail API Service Test');
  console.log('===========================================\n');

  // Check configuration
  const keyPath = process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH;
  const delegatedEmail = process.env.GMAIL_DELEGATED_EMAIL;
  const serviceEmail = process.env.GMAIL_SERVICE_ACCOUNT_EMAIL;
  const enabled = process.env.ENABLE_GMAIL_API === 'true';

  console.log('📋 Configuration Check:');
  console.log('------------------------');
  console.log(`✓ Service Account Key Path: ${keyPath ? '✅ Set' : '❌ Not set'}`);
  console.log(`✓ Delegated Email: ${delegatedEmail || '❌ Not set'}`);
  console.log(`✓ Service Account Email: ${serviceEmail || '❌ Not set (will use from key file)'}`);
  console.log(`✓ Gmail API Enabled: ${enabled ? '✅ Yes' : '❌ No'}`);
  console.log('');

  if (!keyPath) {
    console.error('❌ ERROR: Please set GMAIL_SERVICE_ACCOUNT_KEY_PATH environment variable');
    console.error('\nExample:');
    console.error('GMAIL_SERVICE_ACCOUNT_KEY_PATH=config/credentials/steeliq-gmail-service-key.json');
    process.exit(1);
  }

  if (!delegatedEmail) {
    console.warn('⚠️  WARNING: Using default email: notifications@lateralengineering.co.nz');
    console.warn('Set GMAIL_DELEGATED_EMAIL to override');
    console.log('');
  }

  // Test initialization
  console.log('🔄 Initializing Gmail API Service...');
  const initialized = await gmailApiService.initialize();

  if (!initialized) {
    console.error('\n❌ Failed to initialize Gmail API service');
    console.error('\n📚 Troubleshooting Guide:');
    console.error('1. Ensure you completed all steps in docs/gmail-api-setup-guide.md');
    console.error('2. Verify service account key file exists at:', keyPath);
    console.error('3. Check domain-wide delegation is enabled in Cloud Console');
    console.error('4. Verify Client ID is authorized in Admin Console with correct scopes');
    console.error('5. Wait up to 24 hours for Admin Console changes to propagate');
    process.exit(1);
  }

  console.log('✅ Gmail API Service initialized successfully!\n');

  // Send test email
  const testEmailAddress = delegatedEmail || 'notifications@lateralengineering.co.nz';
  console.log(`📧 Sending test email to: ${testEmailAddress}`);
  console.log('Please wait...');

  const result = await gmailApiService.sendTestEmail(testEmailAddress);

  if (result.success) {
    console.log('\n🎉 SUCCESS! Test email sent!');
    console.log('✅ Gmail API is fully configured and operational');
    console.log(`📬 Check inbox for: ${testEmailAddress}`);
    console.log('\n===========================================');
    console.log('      Gmail API Setup Complete!');
    console.log('===========================================');
  } else {
    console.error('\n❌ Failed to send test email');
    console.error('Error:', result.error);
    
    console.error('\n📚 Common Issues:');
    console.error('1. "Delegation denied": Client ID not authorized in Admin Console');
    console.error('2. "Invalid grant": Delegated email doesn\'t exist or scopes mismatch');
    console.error('3. "Permission denied": OAuth scopes don\'t match Admin Console');
    console.error('4. "Not found": Gmail API not enabled in Cloud Console');
    
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testGmailApi().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});