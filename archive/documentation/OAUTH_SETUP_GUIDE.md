# Gmail OAuth 2.0 Setup Guide

This guide will help you set up Gmail OAuth 2.0 authentication for the Email Cost Import module.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Steel Fabrication Email Import")
5. Click "Create"

### 2. Enable Gmail API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" from the results
4. Click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in the required fields:
   - App name: "Steel Fabrication Management"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `email`
     - `profile`
5. Add test users (during development):
   - Add your email and any test emails
6. Save and continue

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Steel Fabrication Web Client"
5. Add Authorized JavaScript origins:
   - For local: `http://localhost:5000`
   - For Replit deployment: `https://your-app-name.replit.app`
   - For custom domain (optional): `https://yourdomain.com`
6. Add Authorized redirect URIs:
   - For local: `http://localhost:5000/api/auth/google/callback`
   - For Replit deployment: `https://your-app-name.replit.app/api/auth/google/callback`
   - For custom domain (optional): `https://yourdomain.com/api/auth/google/callback`
7. Click "Create"
8. **IMPORTANT**: Save the Client ID and Client Secret

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   ```

### 6. Test the Integration

1. Start your application
2. Navigate to Email Cost Import module
3. Click "Add Email Account"
4. Click "Connect Gmail with OAuth"
5. You'll be redirected to Google's OAuth consent screen
6. Sign in with your Google account
7. Grant the requested permissions
8. You'll be redirected back to the application

## Production Deployment

### Important Considerations

1. **Update Redirect URI**: Change `GOOGLE_REDIRECT_URI` to your production domain
2. **Verify Domain**: Add and verify your domain in Google Cloud Console
3. **OAuth Verification**: For production apps with >100 users, submit for OAuth verification
4. **Security Best Practices**:
   - Never commit `.env` files to version control
   - Use environment variables in your deployment platform
   - Rotate credentials regularly
   - Monitor API usage in Google Cloud Console

### Troubleshooting

**Error: "redirect_uri_mismatch"**
- Ensure the redirect URI in your `.env` exactly matches one configured in Google Cloud Console
- Check for trailing slashes - they must match exactly

**Error: "access_blocked"**
- Make sure you've added test users during development
- For production, ensure OAuth consent screen is published

**Error: "insufficient_scope"**
- Check that all required scopes are added in OAuth consent screen
- User may need to re-authenticate to grant new scopes

**Token Expiration**
- Access tokens expire after 1 hour
- The system automatically refreshes tokens using the refresh token
- Refresh tokens don't expire unless revoked

## Security Notes

- OAuth 2.0 is more secure than App Passwords
- No passwords are stored in the database
- Tokens are automatically refreshed
- Users can revoke access anytime from their Google Account settings
- Consider encrypting tokens in database for production use

## API Quotas

Gmail API has usage quotas:
- 250 quota units per user per second
- 1,000,000,000 quota units per day
- Reading emails uses 5 units per request
- Monitor usage in Google Cloud Console → APIs & Services → Gmail API → Quotas

## Support

For issues with:
- Google Cloud setup: Check [Google Cloud Documentation](https://cloud.google.com/docs)
- Gmail API: See [Gmail API Documentation](https://developers.google.com/gmail/api)
- OAuth 2.0: Review [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)