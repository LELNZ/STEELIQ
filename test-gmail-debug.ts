import nodemailer from 'nodemailer';

async function testGmailDebug() {
  console.log('Testing Gmail with direct configuration...');
  
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;
  
  console.log('User:', user);
  console.log('Password length:', password?.length);
  console.log('Password (first 4 chars):', password?.substring(0, 4));
  console.log('Password (last 4 chars):', password?.substring(12));
  
  if (!user || !password) {
    console.error('Missing credentials');
    return;
  }
  
  // Try different authentication methods
  console.log('\n1. Testing with service: gmail');
  try {
    const transporter1 = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: password
      }
    });
    
    await transporter1.verify();
    console.log('✅ SUCCESS with service: gmail');
    
    // Try sending a test email
    const info = await transporter1.sendMail({
      from: user,
      to: user,
      subject: 'STEELIQ Test Email',
      text: 'This is a test email from STEELIQ notification system.'
    });
    
    console.log('Email sent successfully! Message ID:', info.messageId);
    return;
  } catch (error: any) {
    console.log('❌ Failed with service:', error.message);
  }
  
  console.log('\n2. Testing with host configuration');
  try {
    const transporter2 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: user,
        pass: password
      }
    });
    
    await transporter2.verify();
    console.log('✅ SUCCESS with host configuration');
  } catch (error: any) {
    console.log('❌ Failed with host:', error.message);
  }
  
  console.log('\n3. Testing with port 465 (SSL)');
  try {
    const transporter3 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: user,
        pass: password
      }
    });
    
    await transporter3.verify();
    console.log('✅ SUCCESS with port 465');
  } catch (error: any) {
    console.log('❌ Failed with port 465:', error.message);
  }
}

testGmailDebug().catch(console.error);