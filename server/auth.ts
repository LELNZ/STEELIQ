import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import { users, authSessions } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // Hash password with bcrypt
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure session token
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate 2FA secret (Base32 encoded)
  static generate2FASecret(): string {
    const secret = crypto.randomBytes(20);
    return secret.toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  // Generate backup codes for 2FA
  static generate2FABackupCodes(count: number = 8): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Verify 2FA TOTP code (simplified - in production use speakeasy library)
  static verify2FACode(secret: string, code: string): boolean {
    // Simplified TOTP verification for demo
    // In production, use speakeasy.totp.verify()
    const timeStep = Math.floor(Date.now() / 30000);
    const expectedCode = crypto
      .createHmac('sha1', Buffer.from(secret, 'base64'))
      .update(Buffer.from(timeStep.toString()))
      .digest('hex')
      .slice(-6);
    
    return code === expectedCode.substring(0, 6);
  }

  // Create user with hashed password
  static async createUser(userData: {
    username: string;
    password: string;
    name: string;
    email?: string;
    role?: string;
    department?: string;
  }) {
    const hashedPassword = await this.hashPassword(userData.password);
    
    const [user] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
    }).returning();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Authenticate user
  static async authenticateUser(username: string, password: string, twoFactorCode?: string) {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.isActive, true)
      ));

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error("Account temporarily locked due to too many failed attempts");
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, user.password);
    
    if (!passwordValid) {
      // Increment login attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const lockUntil = newAttempts >= this.MAX_LOGIN_ATTEMPTS 
        ? new Date(Date.now() + this.LOCKOUT_DURATION)
        : null;

      await db.update(users)
        .set({
          loginAttempts: newAttempts,
          lockedUntil: lockUntil,
        })
        .where(eq(users.id, user.id));

      throw new Error("Invalid credentials");
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { requires2FA: true };
      }

      const codeValid = this.verify2FACode(user.twoFactorSecret!, twoFactorCode);
      if (!codeValid) {
        // Check backup codes
        const backupCodes = user.twoFactorBackupCodes as string[] || [];
        const codeIndex = backupCodes.indexOf(twoFactorCode);
        
        if (codeIndex === -1) {
          throw new Error("Invalid 2FA code");
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await db.update(users)
          .set({ twoFactorBackupCodes: backupCodes })
          .where(eq(users.id, user.id));
      }
    }

    // Reset login attempts on successful login
    await db.update(users)
      .set({
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    await db.insert(authSessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    // Return user without sensitive data
    const { password: __, twoFactorSecret, twoFactorBackupCodes, sessionToken: _, ...userResponse } = user;
    
    return {
      user: userResponse,
      token: sessionToken,
      expiresAt,
    };
  }

  // Extract token from request with fallback methods
  static extractToken(req: any): string | null {
    // Method 1: Check parsed cookies (if cookie-parser is working)
    if (req.cookies?.auth_token) {
      return req.cookies.auth_token;
    }
    
    // Method 2: Check Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Method 3: Manually parse cookie header as fallback
    const rawCookie = req.headers?.cookie;
    if (rawCookie) {
      const cookies = rawCookie.split(';').map(s => s.trim());
      const authCookie = cookies.find(s => s.startsWith('auth_token='));
      if (authCookie) {
        return decodeURIComponent(authCookie.split('=')[1]);
      }
    }
    
    return null;
  }

  // Get authenticated user from request
  static async getAuthenticatedUser(req: any) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        return null;
      }
      return await this.validateSession(token);
    } catch (error) {
      console.error('Get authenticated user error:', error);
      return null;
    }
  }

  // Validate session token
  static async validateSession(token: string) {
    try {
      const sessions = await db
        .select()
        .from(authSessions)
        .where(and(
          eq(authSessions.token, token),
          gt(authSessions.expiresAt, new Date())
        ))
        .limit(1);

      if (!sessions || sessions.length === 0) {
        return null;
      }

      const session = sessions[0];

      // Get user data
      const users_result = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!users_result || users_result.length === 0) {
        return null;
      }

      const user = users_result[0];

      if (!user.isActive) {
        return null;
      }

      // Remove sensitive data
      const { password, twoFactorSecret, twoFactorBackupCodes, ...userResponse } = user;
      return userResponse;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout user (invalidate session)
  static async logout(token: string) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  // Setup 2FA for user
  static async setup2FA(userId: number) {
    const secret = this.generate2FASecret();
    const backupCodes = this.generate2FABackupCodes();

    await db.update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
      })
      .where(eq(users.id, userId));

    return {
      secret,
      backupCodes,
      qrCodeUrl: `otpauth://totp/Lateral%20Engineering?secret=${secret}&issuer=Lateral%20Engineering`,
    };
  }

  // Enable 2FA after verification
  static async enable2FA(userId: number, verificationCode: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user?.twoFactorSecret) {
      throw new Error("2FA not set up");
    }

    const codeValid = this.verify2FACode(user.twoFactorSecret, verificationCode);
    if (!codeValid) {
      throw new Error("Invalid verification code");
    }

    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));

    return true;
  }

  // Disable 2FA
  static async disable2FA(userId: number, password: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) {
      throw new Error("Invalid password");
    }

    await db.update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(users.id, userId));

    return true;
  }

  // Change password
  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    const passwordValid = await this.verifyPassword(currentPassword, user.password);
    if (!passwordValid) {
      throw new Error("Current password is incorrect");
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    
    await db.update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, userId));

    return true;
  }

  // Clean expired sessions
  static async cleanExpiredSessions() {
    const now = new Date();
    await db.delete(authSessions).where(gt(authSessions.expiresAt, now));
  }
}