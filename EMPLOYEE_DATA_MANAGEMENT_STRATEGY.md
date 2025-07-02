# Employee Data Management & Retention Strategy
## Industry-Leading Best Practices for Steel Fabrication Companies

### Legal & Compliance Requirements (New Zealand)

**Employment Records Act 2004:**
- Minimum 7 years retention for employment records
- Indefinite retention for health & safety records
- 2 years for personal grievance claims

**Health & Safety at Work Act 2015:**
- 20 years for exposure records (welding, chemicals)
- 5 years for training records
- Indefinite for incident reports

**Privacy Act 2020:**
- Right to be forgotten (with legal exceptions)
- Lawful basis for data retention
- Secure data handling requirements

### Industry Standard Data Retention Strategy

#### 1. **Active Employee Records**
- **Location**: Primary database
- **Access**: Full RBAC permissions
- **Data**: Complete employee profile, real-time activity

#### 2. **Alumni/Former Employee Records** 
- **Location**: Separate "Employee Archive" database
- **Access**: HR Director + Legal only
- **Retention Period**: 
  - Basic employment data: 7 years
  - Health & safety records: 20 years
  - Training certifications: 10 years
  - Performance reviews: 7 years

#### 3. **Audit Trail System**
- **All Changes Logged**: Who, what, when, why
- **Immutable Records**: Cannot be deleted or modified
- **Legal Discovery**: Searchable for compliance

### Leading HR Systems Comparison

#### **BambooHR Approach:**
- Soft delete with archive status
- Role-based access to archived data
- Automatic purging based on legal requirements
- Audit trail for all employee actions

#### **Employment Hero (NZ/AU Focused):**
- Separate "Former Employees" section
- Maintains payroll history for tax compliance
- Health & safety records retained separately
- Integration with ACC and IRD requirements

#### **Workday Enterprise:**
- Three-tier data lifecycle:
  1. Active (full access)
  2. Archived (restricted access) 
  3. Purged (legal retention only)

### Recommended Implementation for Lateral Engineering

#### **Database Architecture:**

```sql
-- Active Employees (Current Primary Database)
team_members (active employees only)

-- Employee Archive Database 
archived_employees (copy of all employee data)
archived_timesheets (historical time tracking)
archived_job_assignments (project history)
archived_performance_reviews
archived_training_records
archived_certifications

-- Audit Trail (Never Deleted)
employee_lifecycle_audit
data_access_audit
compliance_audit
```

#### **Employee Lifecycle Workflow:**

**1. Active → Inactive Transition:**
- Mark as inactive (soft delete)
- Revoke system access immediately
- Maintain data for legal period
- Archive after exit interview

**2. Inactive → Archived:**
- Copy all data to archive database
- Remove from active systems
- Maintain restricted HR access
- Set retention timers

**3. Archived → Purged:**
- Automatic after legal retention period
- Keep audit trail of purge action
- Exception handling for legal holds

#### **Access Control Matrix:**

| Role | Active Data | Archived Data | Audit Trail |
|------|------------|---------------|-------------|
| Business Owner | Full | Full | Full |
| HR Director | Full | Full | Read-Only |
| Department Manager | Team Only | None | None |
| Supervisor | Direct Reports | None | None |
| Employee | Own Data | None | None |

#### **Compliance Features:**

**Privacy Rights:**
- Data portability (employee can request their data)
- Right to correction (while employed)
- Right to be forgotten (with legal exceptions)

**Security Measures:**
- Encrypted archive storage
- Access logging and monitoring
- Regular backup verification
- Secure disposal procedures

### Integration with Current System

#### **Phase 1: User Deletion with Archive**
1. Add "Archive Employee" option instead of hard delete
2. Create archive tables in database
3. Implement data export before archiving
4. Add archive access interface for HR

#### **Phase 2: Enhanced Audit Trail**
1. Log all employee data changes
2. Track system access and actions
3. Monitor data exports and reports
4. Compliance reporting dashboard

#### **Phase 3: Automated Retention**
1. Scheduled archive cleanup
2. Legal hold management
3. Compliance monitoring alerts
4. Integration with legal calendar

### Immediate Actions Needed:

1. **Add Archive Employee Functionality**
2. **Create Audit Logging System** 
3. **Implement Data Export Tools**
4. **Add Compliance Dashboard**
5. **Create Legal Retention Schedules**

This approach ensures Lateral Engineering meets legal requirements while maintaining operational efficiency and protecting employee privacy rights.