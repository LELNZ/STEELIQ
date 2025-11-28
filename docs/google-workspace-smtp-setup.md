# Google Workspace SMTP Relay Configuration Guide

## Overview
Since Google has updated their authentication methods for Google Workspace, you need to configure SMTP Relay through your Google Workspace Admin Console. This guide walks you through the setup process.

## Admin Console Configuration Steps

### Step 1: Access SMTP Relay Settings
1. Sign in to your [Google Admin Console](https://admin.google.com)
2. Navigate to **Apps** → **Google Workspace** → **Gmail**
3. Click on **Routing**
4. Scroll down to find **SMTP relay service**
5. Click **Configure** or **Add Another** if already configured

### Step 2: Configure SMTP Relay Service

#### Basic Settings
- **Name**: Enter "STEELIQ Email Notifications"
- **Description**: "SMTP relay for STEELIQ Time & Payroll notifications"

#### 1. Allowed Senders
Choose one of:
- ✅ **Recommended**: "Only addresses in my domains"
- This restricts sending to @lateralengineering.co.nz addresses only

#### 2. Authentication
You have two options:

**Option A: IP-based Authentication (Simpler)**
- ✅ Check "Only accept mail from the specified IP addresses"
- Add your Replit app's IP address(es)
- Leave "Require SMTP Authentication" unchecked
- No password needed with this method

**Option B: SMTP Authentication (More Flexible)**
- ✅ Check "Require SMTP Authentication"
- You'll use notifications@lateralengineering.co.nz with an app password
- Better for dynamic IP environments like Replit

**Note**: You can enable both for maximum flexibility

#### 3. Encryption
- ✅ Check "Require TLS encryption" (highly recommended)

#### 4. Spam and Security
- ✅ "Add X-Gm-Original-To header" (helps with debugging)
- ✅ "Add X-Gm-Spam header" (for spam detection)

### Step 3: Save Configuration
- Click **Save**
- Changes can take up to 24 hours to propagate (usually instant)

## Application Configuration

### Environment Variables to Set

For **IP-based Authentication** (no password):
```env
GOOGLE_WORKSPACE_EMAIL=notifications@lateralengineering.co.nz
USE_SMTP_RELAY=true
SMTP_RELAY_AUTH=false
```

For **SMTP Authentication** (with credentials):
```env
GOOGLE_WORKSPACE_EMAIL=notifications@lateralengineering.co.nz
GOOGLE_WORKSPACE_PASSWORD=your-app-password-here
USE_SMTP_RELAY=true
SMTP_RELAY_AUTH=true
```

### Getting Your Replit App's IP Address
Since Replit apps may have dynamic IPs, you might need to:
1. Use SMTP Authentication instead of IP-based
2. Or contact Replit support for static IP options

## Testing the Configuration

Once configured, test with:
```bash
npx tsx test-google-workspace.ts
```

## Troubleshooting

### Common Issues

#### "Mail relay denied"
- Your IP isn't whitelisted (if using IP auth)
- You're sending from a non-authorized domain
- Solution: Check IP whitelist or domain settings

#### "535 Authentication failed"
- App password is incorrect
- 2FA not enabled for the account
- Solution: Generate new app password

#### "TLS required"
- You enabled "Require TLS" but app isn't using TLS
- Solution: Ensure USE_TLS=true in config

## Sending Limits
- **SMTP Relay**: 10,000 messages per user per day
- **Batch sending**: 100 recipients per message
- **Rate limit**: 250 quota units per user per second

## Alternative: Gmail API with Service Account

If SMTP Relay doesn't work for your needs, you can use the Gmail API with a service account:

1. **Create Service Account** in Google Cloud Console
2. **Enable Gmail API** for your project
3. **Delegate domain-wide authority** to the service account
4. **Use OAuth2** for authentication

This is more complex but offers more features like:
- Read receipts
- Thread management
- Label management
- Advanced search

## Next Steps

1. Configure SMTP Relay in Admin Console (5 minutes)
2. Update environment variables in Replit
3. Test email sending
4. Monitor delivery in Email Log Search (Admin Console)

## Support Resources

- [Google SMTP Relay Documentation](https://support.google.com/a/answer/2956491)
- [Send from Apps/Devices](https://support.google.com/a/answer/176600)
- [Troubleshooting Guide](https://support.google.com/a/answer/6140680)