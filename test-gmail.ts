import { gmailEmailService } from './server/services/gmailEmailService';

// Test Gmail integration
async function testGmail() {
  console.log('Testing Gmail integration...');
  
  // Initialize Gmail service
  const initialized = await gmailEmailService.initialize();
  
  if (!initialized) {
    console.error('Failed to initialize Gmail. Please check your GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    process.exit(1);
  }
  
  // Get the email address from environment variable
  const testEmail = process.env.GMAIL_USER;
  
  if (!testEmail) {
    console.error('No GMAIL_USER configured');
    process.exit(1);
  }
  
  console.log(`Sending test email to: ${testEmail}`);
  
  // Send test email
  const result = await gmailEmailService.sendTestEmail(testEmail);
  
  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('Check your inbox for the test email.');
  } else {
    console.error('❌ Failed to send test email:', result.error);
  }
  
  process.exit(result.success ? 0 : 1);
}

// Run the test
testGmail().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});