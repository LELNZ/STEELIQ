#!/usr/bin/env node
/**
 * HTTP Endpoint Analyzer for STEELIQ
 * Analyzes all API routes for security, auth, rate-limiting, and validation
 */

const fs = require('fs');
const path = require('path');

// Read routes.ts and analyze endpoints
function analyzeEndpoints() {
  const routesPath = path.join(__dirname, '../server/routes.ts');
  
  if (!fs.existsSync(routesPath)) {
    console.error('Routes file not found');
    return [];
  }
  
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  const endpoints = [];
  
  // Pattern to match Express routes
  const routePatterns = [
    /app\.(get|post|put|patch|delete|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /router\.(get|post|put|patch|delete|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/g
  ];
  
  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(routesContent)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      
      // Check if auth is required (simplified check)
      const authRequired = routesContent.includes('AuthService.getAuthenticatedUser') &&
        routesContent.indexOf('AuthService.getAuthenticatedUser') < 
        routesContent.indexOf(match[0]) + 500;
      
      // Check for validation
      const hasValidation = routesContent.includes('insertSchema') || 
        routesContent.includes('.parse(') ||
        routesContent.includes('z.');
      
      // Determine resource type
      let resourceType = 'general';
      if (path.includes('/materials')) resourceType = 'materials';
      else if (path.includes('/jobs')) resourceType = 'jobs';
      else if (path.includes('/users') || path.includes('/team')) resourceType = 'users';
      else if (path.includes('/ai') || path.includes('/estimation')) resourceType = 'ai';
      else if (path.includes('/financial') || path.includes('/cost')) resourceType = 'financial';
      else if (path.includes('/production')) resourceType = 'production';
      else if (path.includes('/procurement')) resourceType = 'procurement';
      else if (path.includes('/audit')) resourceType = 'audit';
      
      endpoints.push({
        method,
        path,
        authRequired,
        hasValidation,
        resourceType,
        rateLimitBucket: determineRateLimitBucket(path),
        hasSideEffects: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      });
    }
  });
  
  return endpoints;
}

function determineRateLimitBucket(path) {
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/ai') || path.includes('/estimation')) return 'ai';
  if (path.includes('/upload') || path.includes('/files')) return 'upload';
  return 'general';
}

// Generate report
const endpoints = analyzeEndpoints();

const report = {
  timestamp: new Date().toISOString(),
  totalEndpoints: endpoints.length,
  byMethod: {
    GET: endpoints.filter(e => e.method === 'GET').length,
    POST: endpoints.filter(e => e.method === 'POST').length,
    PUT: endpoints.filter(e => e.method === 'PUT').length,
    PATCH: endpoints.filter(e => e.method === 'PATCH').length,
    DELETE: endpoints.filter(e => e.method === 'DELETE').length
  },
  byAuth: {
    authenticated: endpoints.filter(e => e.authRequired).length,
    public: endpoints.filter(e => !e.authRequired).length
  },
  byResource: endpoints.reduce((acc, e) => {
    acc[e.resourceType] = (acc[e.resourceType] || 0) + 1;
    return acc;
  }, {}),
  endpoints: endpoints.sort((a, b) => a.path.localeCompare(b.path))
};

console.log(JSON.stringify(report, null, 2));