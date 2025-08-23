import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// OAuth 2.0 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// Scopes needed for Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://mail.google.com/',
  'email',
  'profile'
];

export class GoogleAuthService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
  }

  // Generate authorization URL
  generateAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      prompt: 'consent', // Force consent screen to get refresh token
      scope: SCOPES,
      state: state || ''
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Set credentials for API calls
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Get Gmail client
  getGmailClient() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Get user profile
  async getUserProfile(accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials.access_token || '';
  }

  // List emails with attachments
  async listEmailsWithAttachments(tokens: any, query: string = 'has:attachment') {
    this.setCredentials(tokens);
    const gmail = this.getGmailClient();
    
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      return response.data.messages || [];
    } catch (error) {
      console.error('Error listing emails:', error);
      throw error;
    }
  }

  // Get email details with attachments
  async getEmailWithAttachments(tokens: any, messageId: string) {
    this.setCredentials(tokens);
    const gmail = this.getGmailClient();
    
    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });

      const message = response.data;
      const attachments = [];

      // Extract attachments
      if (message.payload?.parts) {
        for (const part of message.payload.parts) {
          if (part.filename && part.body?.attachmentId) {
            const attachment = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: messageId,
              id: part.body.attachmentId
            });

            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              data: attachment.data.data // Base64 encoded
            });
          }
        }
      }

      return {
        id: message.id,
        snippet: message.snippet,
        attachments
      };
    } catch (error) {
      console.error('Error getting email:', error);
      throw error;
    }
  }
}

export const googleAuth = new GoogleAuthService();