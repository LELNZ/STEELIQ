import sgMail from '@sendgrid/mail';

async function testSendGrid() {
  console.log('Testing SendGrid integration...');
  
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('No SENDGRID_API_KEY configured');
    process.exit(1);
  }
  
  sgMail.setApiKey(apiKey);
  
  const msg = {
    to: 'notifications@lateralengineering.co.nz',
    from: 'noreply@steeliq.com', // This needs to be verified in SendGrid
    subject: 'STEELIQ Test Notification',
    text: 'This is a test notification from STEELIQ Time & Payroll system.',
    html: '<strong>This is a test notification from STEELIQ Time & Payroll system.</strong>',
  };
  
  try {
    await sgMail.send(msg);
    console.log('✅ Test email sent successfully via SendGrid!');
    console.log('Check your inbox at notifications@lateralengineering.co.nz');
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    process.exit(1);
  }
}

testSendGrid();
