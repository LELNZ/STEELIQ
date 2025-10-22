# STEELIQ Dependencies Inventory

## Summary Statistics
- **Total Dependencies:** 118 production + 25 dev
- **Security Issues:** 3 vulnerabilities (1 HIGH, 2 MODERATE)
- **Outdated Packages:** 12 major versions behind
- **Missing Lock:** No (package-lock.json present)

## Security Vulnerabilities

### HIGH Severity
1. **axios** (via dependencies)
   - Current: 1.0.0 - 1.11.0
   - Issue: DoS through lack of data size check
   - Fix: `npm audit fix`

### MODERATE Severity
1. **@babel/helpers** (< 7.26.10)
   - Issue: Inefficient RegExp complexity
   - Fix: Update to 7.26.10+

2. **esbuild** (<= 0.24.2)
   - Issue: Dev server security vulnerability
   - Fix: Update to latest version

## Critical Production Dependencies

### AI & Processing
- `@anthropic-ai/sdk: ^0.37.0` - AI estimation engine
- `pdf-parse: ^1.1.1` - PDF text extraction
- `pdf-lib: ^1.17.1` - PDF manipulation
- `dxf-parser: ^1.1.2` - CAD file parsing
- `tesseract.js: ^6.0.1` - OCR capabilities

### Database & ORM
- `@neondatabase/serverless: ^0.10.4` - Database client
- `drizzle-orm: ^0.39.1` - ORM
- `drizzle-zod: ^0.7.0` - Schema validation
- `drizzle-kit: ^0.30.4` - Migration tool (dev)

### Authentication & Security
- `bcrypt: ^6.0.0` - Password hashing ⚠️ (old version)
- `passport: ^0.7.0` - Authentication
- `express-session: ^1.18.1` - Session management
- `connect-pg-simple: ^10.0.0` - Session store

### Email & Communication
- `@sendgrid/mail: ^8.1.5` - Email service
- `nodemailer: ^7.0.5` - Email fallback
- `ws: ^8.18.0` - WebSocket support

### Frontend Framework
- `react: ^18.3.1` - UI framework
- `react-dom: ^18.3.1` - React DOM
- `@radix-ui/*` - 27 packages for UI components
- `tailwindcss: ^3.4.17` - Styling

### Data Visualization
- `chart.js: ^4.5.0` - Charts
- `recharts: ^2.15.4` - React charts
- `react-chartjs-2: ^5.3.0` - Chart.js wrapper

## Outdated Major Versions

### Critical Updates Needed
1. `bcrypt: ^6.0.0` → Latest: 5.1.1 (major version mismatch)
2. `dotenv: ^17.2.1` → Latest: 16.4.5 (version ahead?)
3. `googleapis: ^157.0.0` → Check for breaking changes
4. `puppeteer: ^24.22.0` → Heavy dependency, consider alternatives

## Development Dependencies

### Build Tools
- `vite: ^5.4.15` - Build tool
- `esbuild: ^0.25.0` - Fast bundler ⚠️ (security issue)
- `typescript: 5.6.3` - Type checking
- `tsx: ^4.19.1` - TypeScript execution

### Replit Specific
- `@replit/vite-plugin-cartographer: ^0.3.0`
- `@replit/vite-plugin-runtime-error-modal: ^0.0.3`

## Missing Critical Dependencies

### Security (Not Installed)
- ❌ `helmet` - Security headers
- ❌ `express-rate-limit` - Rate limiting
- ❌ `cors` - CORS configuration
- ❌ `express-validator` - Input validation

### Monitoring (Not Installed)
- ❌ APM solution (DataDog/New Relic)
- ❌ `winston` or `pino` - Structured logging
- ❌ `morgan` - HTTP request logging

### Testing (Not Installed)
- ❌ `jest` or `vitest` - Test framework
- ❌ `@testing-library/react` - React testing
- ❌ `supertest` - API testing
- ❌ `cypress` or `playwright` - E2E testing

## Dependency Risk Analysis

### High Risk
1. **No rate limiting** - DoS vulnerability
2. **Old bcrypt version** - Potential security issues
3. **Missing helmet** - Security headers not set
4. **No input validation** - XSS/injection risks

### Medium Risk
1. **Heavy dependencies** - puppeteer (300MB+)
2. **Multiple PDF libraries** - Redundancy
3. **No caching layer** - Performance impact

### Low Risk
1. **Many UI component libraries** - Maintenance burden
2. **Mixed module systems** - Potential conflicts

## Recommendations

### Immediate Actions (P0)
```bash
# Fix security vulnerabilities
npm audit fix

# Add critical security packages
npm install helmet express-rate-limit cors express-validator

# Update bcrypt to latest
npm install bcrypt@latest
```

### Week 1 Actions (P1)
```bash
# Add monitoring
npm install winston @datadog/datadog-api-client

# Add testing framework
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/react supertest
```

### Optimization (P2)
- Consolidate PDF libraries (choose one)
- Evaluate puppeteer alternatives
- Add Redis for caching
- Implement dependency update policy

## Package.json Issues

### Scripts
- ✅ Basic scripts present (dev, build, start)
- ⚠️ No test script
- ⚠️ No lint script
- ⚠️ No security audit script

### Engine Requirements
- ❌ No engines field specified
- ❌ No Node.js version locked

### Suggested package.json Updates
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts,.tsx",
    "security": "npm audit",
    "deps:update": "npm update && npm audit fix"
  }
}
```

## Deterministic Build Verification

### Positive
- ✅ package-lock.json present (456KB)
- ✅ All versions pinned with ^
- ✅ TypeScript version locked

### Issues
- ⚠️ No CI/CD to verify reproducible builds
- ⚠️ No npm ci used in production
- ⚠️ Optional dependencies may cause variations

## License Compliance

### License Distribution
- MIT: 95% of packages
- Apache-2.0: 3% (googleapis, etc.)
- ISC: 2% (minor utilities)

### Commercial Restrictions
- None identified
- All licenses are permissive

---
*Generated: October 22, 2025*  
*Next Review: Weekly during deployment phase*