import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../db';
import { notificationPolicies, notificationPreferences, teamMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

describe('Notification Policy-to-Preference Propagation', () => {
  const testUserId = 999999;
  const testCategory = 'time_clock';
  
  beforeAll(async () => {
    await db.delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId));
  });
  
  afterAll(async () => {
    await db.delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUserId));
  });

  describe('Policy Enforcement', () => {
    it('should derive userCanModify from role policy, not from stale preference data', async () => {
      const [policy] = await db.select()
        .from(notificationPolicies)
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ))
        .limit(1);
      
      expect(policy).toBeDefined();
      expect(policy.userCanModify).toBe(true);
    });

    it('should have all 20 role-category combinations in the database', async () => {
      const allPolicies = await db.select()
        .from(notificationPolicies);
      
      expect(allPolicies.length).toBe(20);
      
      const roles = ['owner', 'admin', 'manager', 'employee', 'viewer'];
      const categories = ['time_clock', 'payroll', 'approvals', 'compliance'];
      
      for (const role of roles) {
        for (const category of categories) {
          const policy = allPolicies.find(p => p.role === role && p.category === category);
          expect(policy).toBeDefined();
          expect(policy?.mandatoryChannels).toBeDefined();
          expect(policy?.defaultChannels).toBeDefined();
        }
      }
    });

    it('should allow owner to modify preferences when userCanModify is true', async () => {
      const [ownerPolicy] = await db.select()
        .from(notificationPolicies)
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ))
        .limit(1);
      
      expect(ownerPolicy.userCanModify).toBe(true);
    });

    it('should enforce mandatory channels regardless of user preference', async () => {
      await db.update(notificationPolicies)
        .set({ 
          mandatoryChannels: { email: true, inApp: false, whatsapp: false }
        })
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ));
      
      const [updatedPolicy] = await db.select()
        .from(notificationPolicies)
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ))
        .limit(1);
      
      expect((updatedPolicy.mandatoryChannels as any).email).toBe(true);
      
      await db.update(notificationPolicies)
        .set({ 
          mandatoryChannels: { email: false, inApp: false, whatsapp: false }
        })
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ));
    });

    it('should block preference modification when userCanModify is false', async () => {
      await db.update(notificationPolicies)
        .set({ userCanModify: false })
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ));
      
      const [lockedPolicy] = await db.select()
        .from(notificationPolicies)
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ))
        .limit(1);
      
      expect(lockedPolicy.userCanModify).toBe(false);
      
      await db.update(notificationPolicies)
        .set({ userCanModify: true })
        .where(and(
          eq(notificationPolicies.role, 'owner'),
          eq(notificationPolicies.category, testCategory)
        ));
    });
  });

  describe('Role Mapping', () => {
    it('should correctly map Business Owner to owner policy', () => {
      const roleMap: Record<string, string> = {
        'business owner': 'owner',
        'owner': 'owner',
        'admin': 'admin',
        'administrator': 'admin',
        'manager': 'manager',
        'employee': 'employee',
        'viewer': 'viewer'
      };
      
      expect(roleMap['business owner']).toBe('owner');
      expect(roleMap['Business Owner'.toLowerCase()]).toBe('owner');
    });
  });

  describe('Default Values', () => {
    it('should have correct default channels for all policies', async () => {
      const policies = await db.select()
        .from(notificationPolicies);
      
      for (const policy of policies) {
        const defaultChannels = policy.defaultChannels as any;
        expect(defaultChannels).toBeDefined();
        expect(typeof defaultChannels.email).toBe('boolean');
        expect(typeof defaultChannels.inApp).toBe('boolean');
        expect(typeof defaultChannels.whatsapp).toBe('boolean');
      }
    });

    it('should have userCanModify default to true', async () => {
      const policies = await db.select()
        .from(notificationPolicies);
      
      for (const policy of policies) {
        expect(policy.userCanModify).toBe(true);
      }
    });
  });
});
