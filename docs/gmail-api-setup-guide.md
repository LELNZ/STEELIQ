# Gmail API Service Account Setup Guide for STEELIQ

This guide walks you through setting up Gmail API with service account authentication and domain-wide delegation for your Google Workspace account.

## 📋 Prerequisites
- Google Workspace account (lateralengineering.co.nz)
- Super Administrator access to Google Workspace Admin Console
- Access to Google Cloud Console

---

## Part 1: Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown (top left) → **New Project**
3. Enter project details:
   - **Project name**: `STEELIQ Email Service`
   - **Organization**: Select `lateralengineering.co.nz` if available
4. Click **Create**
5. Wait for project creation (takes ~30 seconds)

### Step 2: Enable Gmail API

1. Select your new project from the dropdown
2. Navigate to **APIs & Services** → **Library**
3. Search for **"Gmail API"**
4. Click on **Gmail API**
5. Click **ENABLE**
6. Wait for API to enable (shows "API Enabled" when done)

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **Service Account**
3. Fill in the details:
   - **Service account name**: `steeliq-gmail-service`
   - **Service account ID**: (auto-generated, leave as is)
   - **Service account description**: `Service account for STEELIQ Time & Payroll email notifications`
4. Click **CREATE AND CONTINUE**
5. Skip the optional role section → Click **CONTINUE**
6. Skip the optional user access section → Click **DONE**

### Step 4: Enable Domain-Wide Delegation

1. In the **Service Accounts** list, click on `steeliq-gmail-service@...`
2. Click on **SHOW ADVANCED SETTINGS** (if collapsed)
3. Under **Domain-wide Delegation**, check the box:
   - ☑️ **Enable Google Workspace Domain-wide Delegation**
4. Click **SAVE**
5. **IMPORTANT**: Copy and save the **Client ID** (it's the long numeric string like `103456789012345678901`)
   - You'll need this for Admin Console setup
   - It's shown right after enabling delegation

### Step 5: Create JSON Key

1. Still on the service account page
2. Go to the **KEYS** tab
3. Click **ADD KEY** → **Create new key**
4. Select **JSON** format
5. Click **CREATE**
6. A JSON file will download automatically
7. **IMPORTANT**: Save this file securely - you cannot download it again!
   - Save as: `steeliq-gmail-service-key.json`

---

## Part 2: Google Workspace Admin Console Setup

### Step 6: Configure Domain-Wide Delegation

1. Sign in to [Google Admin Console](https://admin.google.com) as Super Administrator
2. Navigate through the menu:
   ```
   Menu (☰) → Security → Access and data control → API controls
   ```
3. Scroll down to **Domain wide delegation**
4. Click **MANAGE DOMAIN WIDE DELEGATION**

### Step 7: Authorize the Service Account

1. Click **Add new**
2. In the **Add a new Client ID** dialog:
   
   **Client ID**: 
   ```
   [Paste the Client ID from Step 4]
   ```
   
   **OAuth Scopes** (copy and paste exactly):
   ```
   https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.compose
   ```
   
3. Click **AUTHORIZE**
4. You should see your entry in the list with:
   - Client ID
   - Scopes listed
   - Status showing as authorized

**Note**: Changes typically apply within minutes but can take up to 24 hours.

---

## Part 3: Application Configuration

### Step 8: Upload Service Account Key to Replit

1. In your Replit project, create a folder for credentials:
   ```
   mkdir -p config/credentials
   ```

2. Upload the JSON key file you downloaded in Step 5:
   - Click the Files icon in Replit
   - Navigate to `config/credentials/`
   - Upload `steeliq-gmail-service-key.json`

### Step 9: Set Environment Variables

In Replit, go to the Secrets tab and add:

```
GMAIL_SERVICE_ACCOUNT_EMAIL=steeliq-gmail-service@[your-project-id].iam.gserviceaccount.com
GMAIL_DELEGATED_EMAIL=notifications@lateralengineering.co.nz
GMAIL_SERVICE_ACCOUNT_KEY_PATH=config/credentials/steeliq-gmail-service-key.json
ENABLE_GMAIL_API=true
```

**To find your service account email**:
- Go back to Cloud Console → APIs & Services → Credentials
- Click on your service account
- Copy the email address (ends with `.iam.gserviceaccount.com`)

---

## Part 4: Testing

### Step 10: Verify Setup

Once you've completed all steps, we'll test the setup to ensure:
1. Service account can authenticate
2. Domain-wide delegation is working
3. Emails can be sent successfully

The test will send an email from `notifications@lateralengineering.co.nz` to verify everything is configured correctly.

---

## 🔒 Security Notes

1. **Never commit the JSON key file to Git**
   - Add to `.gitignore`: `config/credentials/*.json`
2. **Limit OAuth scopes** to only what's needed
3. **Regularly rotate service account keys** (every 90 days recommended)
4. **Monitor API usage** in Cloud Console

---

## 🚀 What This Enables

Once configured, STEELIQ can:
- Send shift reminders and notifications
- Send time clock confirmations
- Send approval request emails
- Send payroll processing alerts
- Send compliance notifications
- All without requiring individual user authentication

---

## ⚠️ Common Issues

### "Delegation denied for user"
- Verify Client ID matches exactly
- Check OAuth scopes are comma-separated without spaces
- Wait up to 24 hours for propagation

### "Client is unauthorized"
- Ensure domain-wide delegation checkbox is enabled
- Verify service account email is correct

### "Invalid grant"
- Check that delegated email exists in your domain
- Verify JSON key file is valid
- Ensure system time is synchronized

---

## 📞 Need Help?

If you encounter issues:
1. Check all Client IDs match
2. Verify scopes are exact
3. Ensure 24 hours have passed since setup
4. Contact Google Workspace support if needed