/**
 * Create a simple team members query using only existing database columns
 */

import fs from 'fs';

const simpleFunction = `
  // Team Members - Simple query using only existing fields
  async getTeamMembers(): Promise<any[]> {
    const members = await db.select()
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(roles, eq(teamMembers.roleId, roles.id))
      .leftJoin(departments, eq(teamMembers.departmentId, departments.id));

    return members.map(row => {
      const member = row.team_members;
      const user = row.users;
      const role = row.roles;
      const department = row.departments;
      
      return {
        // Core team member data
        id: member.id,
        userId: member.userId,
        roleId: member.roleId,
        departmentId: member.departmentId,
        isActive: member.isActive,
        
        // Personal information
        firstName: member.firstName,
        lastName: member.lastName,
        preferredName: member.preferredName,
        dateOfBirth: member.dateOfBirth,
        
        // Employment information
        employeeNumber: member.employeeNumber,
        startDate: member.startDate,
        endDate: member.endDate,
        employmentType: member.employmentType,
        
        // Contact information
        personalEmail: member.personalEmail,
        personalPhone: member.personalPhone,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        emergencyContactRelation: member.emergencyContactRelation,
        
        // Address information
        streetAddress: member.streetAddress,
        suburb: member.suburb,
        city: member.city,
        state: member.state,
        postcode: member.postcode,
        country: member.country,
        
        // Position & Skills
        position: member.position,
        jobTitle: member.jobTitle,
        skillLevel: member.skillLevel,
        primarySkills: member.primarySkills,
        secondarySkills: member.secondarySkills,
        experienceYears: member.experienceYears,
        
        // Rates & Compensation
        hourlyRate: member.hourlyRate,
        overtimeRate: member.overtimeRate,
        siteAllowance: member.siteAllowance,
        travelAllowance: member.travelAllowance,
        annualSalary: member.annualSalary,
        payFrequency: member.payFrequency,
        
        // Certifications & Qualifications
        certifications: member.certifications,
        qualifications: member.qualifications,
        licenses: member.licenses,
        trainingRecords: member.trainingRecords,
        
        // Health & Safety
        inductionCompleted: member.inductionCompleted,
        inductionDate: member.inductionDate,
        safetyTrainingExpiry: member.safetyTrainingExpiry,
        medicalClearance: member.medicalClearance,
        medicalExpiryDate: member.medicalExpiryDate,
        
        // Review information
        performanceRating: member.performanceRating,
        lastReviewDate: member.lastReviewDate,
        nextReviewDate: member.nextReviewDate,
        
        // Additional information
        notes: member.notes,
        internalNotes: member.internalNotes,
        profilePhoto: member.profilePhoto,
        
        // Leave balances
        annualLeaveEntitlement: member.annualLeaveEntitlement,
        sickLeaveEntitlement: member.sickLeaveEntitlement,
        currentLeaveBalance: member.currentLeaveBalance,
        
        // Timestamps
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        
        // Related data from joins
        userName: user?.name,
        userUsername: user?.username,
        roleName: role?.name,
        departmentName: department?.name,
        
        // Placeholder Health & Safety fields for frontend compatibility
        firstAidCertifications: [],
        weldingQualifications: [],
        workingAtHeightsCerts: [],
        tradeQualifications: [],
        driversLicenseClass: null,
        driversLicenseExpiry: null,
        driversLicenseDocument: null,
        visaType: null,
        visaNumber: null,
        visaExpiry: null,
        visaDocument: null,
        workEligibility: true,
        bankAccountName: null,
        bankAccountNumber: null,
        bankSortCode: null,
        taxNumber: null,
        kiwisaverProvider: null,
        kiwisaverRate: null
      };
    });
  }
`;

async function fixTeamQuery() {
  try {
    const content = await fs.promises.readFile('server/team.ts', 'utf8');
    
    // Find the start and end of the getTeamMembers function
    const startPattern = /async getTeamMembers\(\): Promise<any\[\]> \{/;
    const startMatch = content.match(startPattern);
    
    if (!startMatch) {
      console.log('Could not find getTeamMembers function');
      return;
    }
    
    const startIndex = startMatch.index;
    let braceCount = 0;
    let endIndex = startIndex;
    let foundStart = false;
    
    // Find the end of the function by counting braces
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        if (!foundStart) foundStart = true;
        braceCount++;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    // Replace the function
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    const newContent = before + simpleFunction + after;
    
    await fs.promises.writeFile('server/team.ts', newContent);
    console.log('Successfully replaced getTeamMembers with simple version');
    
  } catch (error) {
    console.error('Error fixing function:', error);
  }
}

fixTeamQuery();