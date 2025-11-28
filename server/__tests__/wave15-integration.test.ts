/**
 * Wave 1.5 Integration Tests
 * Tests shift reminders, geofences, and GPS battery optimization
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../index';
import { db } from '../db';
import { shiftNotifications, geofenceZones, gpsBatteryProfiles } from '@shared/schema';

describe('Wave 1.5 Integration Tests', () => {
  let authToken: string;
  let testUserId: number;
  let testDepartmentId: number;
  let testShiftId: number;

  beforeAll(async () => {
    // Setup test data and authenticate
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;
    
    // Create test department and shift
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Department', code: 'TD001' });
    
    testDepartmentId = deptRes.body.id;
    
    const shiftRes = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Shift',
        startTime: '08:00',
        endTime: '16:00',
        departmentId: testDepartmentId
      });
    
    testShiftId = shiftRes.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(shiftNotifications).where({ departmentId: testDepartmentId });
    await db.delete(geofenceZones).where({ name: 'Test Zone' });
    await db.delete(gpsBatteryProfiles).where({ profileName: 'Test Profile' });
  });

  describe('Shift Reminder Features', () => {
    let reminderId: number;

    it('should schedule a shift reminder', async () => {
      const res = await request(app)
        .post('/api/time/reminders/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shiftId: testShiftId,
          departmentId: testDepartmentId,
          scheduleType: 'daily',
          scheduledTime: '07:45',
          minutesBefore: 15,
          notificationChannels: ['email', 'push'],
          message: 'Time to clock in',
          enabled: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reminder).toHaveProperty('id');
      reminderId = res.body.reminder.id;
    });

    it('should list reminders', async () => {
      const res = await request(app)
        .get('/api/time/reminders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reminders)).toBe(true);
      expect(res.body.reminders.length).toBeGreaterThan(0);
    });

    it('should update a reminder', async () => {
      const res = await request(app)
        .put(`/api/time/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          minutesBefore: 30,
          message: 'Updated reminder message'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should toggle reminder status', async () => {
      const res = await request(app)
        .post(`/api/time/reminders/${reminderId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get upcoming reminders', async () => {
      const res = await request(app)
        .get('/api/time/reminders/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reminders)).toBe(true);
    });

    it('should delete a reminder', async () => {
      const res = await request(app)
        .delete(`/api/time/reminders/${reminderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Geofence Features', () => {
    let geofenceId: number;

    it('should create a geofence zone', async () => {
      const res = await request(app)
        .post('/api/time/geofences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Zone',
          centerLat: -33.8688,
          centerLng: 151.2093,
          radius: 100,
          type: 'work_site',
          departmentId: testDepartmentId,
          enabled: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.geofence).toHaveProperty('id');
      geofenceId = res.body.geofence.id;
    });

    it('should list geofences', async () => {
      const res = await request(app)
        .get('/api/time/geofences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.geofences)).toBe(true);
      expect(res.body.geofences.length).toBeGreaterThan(0);
    });

    it('should update a geofence', async () => {
      const res = await request(app)
        .put(`/api/time/geofences/${geofenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          radius: 150,
          name: 'Updated Test Zone'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should verify location within geofence', async () => {
      const res = await request(app)
        .post('/api/time/geofences/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lat: -33.8688,
          lng: 151.2093
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('withinGeofence');
      expect(res.body.withinGeofence).toBe(true);
    });

    it('should delete a geofence', async () => {
      const res = await request(app)
        .delete(`/api/time/geofences/${geofenceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GPS Battery Optimization Features', () => {
    let profileId: number;

    it('should create a battery profile', async () => {
      const res = await request(app)
        .post('/api/time/gps/battery-profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileName: 'Test Profile',
          trackingInterval: 60,
          accuracy: 'balanced',
          batteryThreshold: 20,
          smartSampling: true,
          metadata: { description: 'Test battery profile' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile).toHaveProperty('id');
      profileId = res.body.profile.id;
    });

    it('should list battery profiles', async () => {
      const res = await request(app)
        .get('/api/time/gps/battery-profiles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.profiles)).toBe(true);
      expect(res.body.profiles.length).toBeGreaterThan(0);
    });

    it('should update a battery profile', async () => {
      const res = await request(app)
        .put(`/api/time/gps/battery-profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingInterval: 30,
          accuracy: 'high'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get GPS analytics', async () => {
      const res = await request(app)
        .get('/api/time/gps/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('analytics');
      expect(res.body.analytics).toHaveProperty('totalPoints');
      expect(res.body.analytics).toHaveProperty('averageAccuracy');
      expect(res.body.analytics).toHaveProperty('batteryUsage');
    });

    it('should archive old GPS data', async () => {
      const res = await request(app)
        .post('/api/time/gps/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          daysToKeep: 30
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('archived');
    });

    it('should delete a battery profile', async () => {
      const res = await request(app)
        .delete(`/api/time/gps/battery-profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Permission and Security Tests', () => {
    it('should reject unauthorized access to reminders', async () => {
      const res = await request(app)
        .get('/api/time/reminders');

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized access to geofences', async () => {
      const res = await request(app)
        .get('/api/time/geofences');

      expect(res.status).toBe(401);
    });

    it('should reject unauthorized access to GPS settings', async () => {
      const res = await request(app)
        .get('/api/time/gps/battery-profiles');

      expect(res.status).toBe(401);
    });

    it('should enforce permission for GPS archival', async () => {
      // Create a user without admin permissions
      const limitedUserRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'user123' });

      const limitedToken = limitedUserRes.body.token;

      const res = await request(app)
        .post('/api/time/gps/archive')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ daysToKeep: 30 });

      expect(res.status).toBe(403);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should validate shift reminder data', async () => {
      const res = await request(app)
        .post('/api/time/reminders/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          scheduleType: 'invalid_type'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should validate geofence coordinates', async () => {
      const res = await request(app)
        .post('/api/time/geofences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Zone',
          centerLat: 200, // Invalid latitude
          centerLng: 500, // Invalid longitude
          radius: -10 // Invalid radius
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should validate battery profile settings', async () => {
      const res = await request(app)
        .post('/api/time/gps/battery-profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileName: '',
          trackingInterval: -5,
          accuracy: 'invalid',
          batteryThreshold: 150
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});