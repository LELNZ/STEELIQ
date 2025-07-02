/**
 * Create Steel Industry Standard Departments and Roles
 * Based on leading structural steel fabrication companies
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createSteelIndustryStructure() {
  const client = await pool.connect();
  
  try {
    console.log("🏗️ Creating Steel Industry Standard Structure...");
    
    // 1. Create Departments (based on steel fabrication industry standards)
    const departments = [
      {
        name: "Management",
        description: "Executive leadership, business development, strategic planning"
      },
      {
        name: "Estimation", 
        description: "Project estimating, takeoffs, pricing, tender preparation"
      },
      {
        name: "Fabrication",
        description: "Workshop production, welding, cutting, assembly operations"
      },
      {
        name: "Business Development",
        description: "Sales, client relations, project acquisition, marketing"
      },
      {
        name: "Engineering",
        description: "Structural design, connection design, shop drawings"
      },
      {
        name: "Project Management", 
        description: "Job coordination, scheduling, progress tracking"
      },
      {
        name: "Quality Control",
        description: "Inspection, testing, welding procedures, compliance"
      },
      {
        name: "Site Operations",
        description: "Erection, site supervision, crane operations, safety"
      },
      {
        name: "Administration",
        description: "Accounts, HR, purchasing, general administration"
      }
    ];

    console.log("📋 Creating departments...");
    const createdDepartments = [];
    
    for (const dept of departments) {
      const result = await client.query(`
        INSERT INTO departments (name, description, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (name) DO UPDATE SET 
          description = EXCLUDED.description
        RETURNING id, name
      `, [dept.name, dept.description]);
      
      createdDepartments.push(result.rows[0]);
      console.log(`✅ ${dept.name} department created`);
    }

    // 2. Create Roles (steel fabrication specific roles)
    const roles = [
      {
        name: "Business Owner",
        description: "Company owner, strategic decisions, major client relationships",
        hourlyRate: 120.00,
        permissions: JSON.stringify({
          estimation: ["view", "create", "edit", "delete", "approve"],
          materials: ["view", "create", "edit", "delete", "import", "export"],
          cutting: ["view", "create", "edit", "delete", "optimize"],
          jobs: ["view", "create", "edit", "delete", "manage"],
          inventory: ["view", "create", "edit", "delete", "adjust"],
          reports: ["view", "create", "export", "schedule"],
          settings: ["view", "edit", "manage"],
          users: ["view", "create", "edit", "delete", "manage"],
          clients: ["view", "create", "edit", "delete"],
          suppliers: ["view", "create", "edit", "delete"],
          financial: ["view", "edit", "approve", "manage"]
        })
      },
      {
        name: "Business Development Manager",
        description: "Client acquisition, tender management, relationship building",
        hourlyRate: 85.00,
        permissions: JSON.stringify({
          estimation: ["view", "create", "edit"],
          clients: ["view", "create", "edit", "delete"],
          jobs: ["view", "create", "edit"],
          reports: ["view", "create", "export"]
        })
      },
      {
        name: "Senior Estimator",
        description: "Complex estimates, takeoffs, pricing strategies, mentoring",
        hourlyRate: 95.00,
        permissions: JSON.stringify({
          estimation: ["view", "create", "edit", "delete", "approve"],
          materials: ["view", "edit"],
          cutting: ["view", "create", "edit", "optimize"],
          jobs: ["view", "create", "edit"],
          reports: ["view", "create", "export"]
        })
      },
      {
        name: "Estimator",
        description: "Standard estimates, material takeoffs, pricing support",
        hourlyRate: 75.00,
        permissions: JSON.stringify({
          estimation: ["view", "create", "edit"],
          materials: ["view"],
          cutting: ["view", "create"],
          jobs: ["view", "edit"],
          reports: ["view", "create"]
        })
      },
      {
        name: "Welder/Fabricator", 
        description: "Structural welding, fabrication, quality production",
        hourlyRate: 75.00,
        permissions: JSON.stringify({
          jobs: ["view"],
          cutting: ["view"],
          inventory: ["view"],
          reports: ["view"]
        })
      },
      {
        name: "Senior Welder",
        description: "Complex welding, procedures, quality control, training",
        hourlyRate: 85.00,
        permissions: JSON.stringify({
          jobs: ["view", "edit"],
          cutting: ["view", "create"],
          inventory: ["view", "edit"],
          reports: ["view", "create"]
        })
      },
      {
        name: "Project Manager",
        description: "Job coordination, scheduling, client communication",
        hourlyRate: 90.00,
        permissions: JSON.stringify({
          jobs: ["view", "create", "edit", "manage"],
          clients: ["view", "edit"],
          reports: ["view", "create", "export"],
          inventory: ["view", "edit"]
        })
      },
      {
        name: "Site Supervisor",
        description: "Erection supervision, safety management, quality control",
        hourlyRate: 80.00,
        permissions: JSON.stringify({
          jobs: ["view", "edit"],
          reports: ["view", "create"]
        })
      },
      {
        name: "Quality Inspector",
        description: "Inspection, testing, compliance, documentation",
        hourlyRate: 70.00,
        permissions: JSON.stringify({
          jobs: ["view"],
          reports: ["view", "create", "export"]
        })
      },
      {
        name: "Design Engineer",
        description: "Structural design, connection design, shop drawings",
        hourlyRate: 95.00,
        permissions: JSON.stringify({
          estimation: ["view", "edit"],
          materials: ["view"],
          jobs: ["view", "create", "edit"],
          reports: ["view", "create", "export"]
        })
      }
    ];

    console.log("👥 Creating roles...");
    const createdRoles = [];
    
    for (const role of roles) {
      const result = await client.query(`
        INSERT INTO roles (name, description, hourly_rate, permissions, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (name) DO UPDATE SET 
          description = EXCLUDED.description,
          hourly_rate = EXCLUDED.hourly_rate,
          permissions = EXCLUDED.permissions
        RETURNING id, name, hourly_rate
      `, [role.name, role.description, role.hourlyRate, role.permissions]);
      
      createdRoles.push(result.rows[0]);
      console.log(`✅ ${role.name} role created ($${role.hourlyRate}/hr)`);
    }

    // 3. Update existing team members with proper roles
    console.log("🔄 Updating existing team members...");
    
    // Get role IDs for mapping
    const managementDept = createdDepartments.find(d => d.name === "Management");
    const businessDevDept = createdDepartments.find(d => d.name === "Business Development");
    const estimationDept = createdDepartments.find(d => d.name === "Estimation");
    const fabricationDept = createdDepartments.find(d => d.name === "Fabrication");
    
    const businessOwnerRole = createdRoles.find(r => r.name === "Business Owner");
    const businessDevRole = createdRoles.find(r => r.name === "Business Development Manager");
    const seniorEstimatorRole = createdRoles.find(r => r.name === "Senior Estimator");
    const welderRole = createdRoles.find(r => r.name === "Welder/Fabricator");

    // Update Adam Green
    await client.query(`
      UPDATE team_members 
      SET role_id = $1, department_id = $2, hourly_rate = $3
      WHERE user_id = (SELECT id FROM users WHERE name = 'Adam Green')
    `, [businessOwnerRole.id, managementDept.id, 120.00]);

    // Update Chipo Green  
    await client.query(`
      UPDATE team_members 
      SET role_id = $1, department_id = $2, hourly_rate = $3
      WHERE user_id = (SELECT id FROM users WHERE name = 'Chipo Green')
    `, [businessDevRole.id, businessDevDept.id, 85.00]);

    // Update Manny Magallanes
    await client.query(`
      UPDATE team_members 
      SET role_id = $1, department_id = $2, hourly_rate = $3
      WHERE user_id = (SELECT id FROM users WHERE name = 'Manny Magallanes')
    `, [seniorEstimatorRole.id, estimationDept.id, 95.00]);

    // Update Vili Pelenato
    await client.query(`
      UPDATE team_members 
      SET role_id = $1, department_id = $2, hourly_rate = $3
      WHERE user_id = (SELECT id FROM users WHERE name = 'Vili Pelenato')
    `, [welderRole.id, fabricationDept.id, 75.00]);

    console.log("✅ Team members updated with proper roles and departments");

    console.log("\n📊 Steel Industry Structure Summary:");
    console.log(`Departments Created: ${createdDepartments.length}`);
    console.log(`Roles Created: ${createdRoles.length}`);
    console.log("Team Members: Updated with industry-standard assignments");
    
    console.log("\n🏭 Department Structure:");
    createdDepartments.forEach(dept => {
      console.log(`• ${dept.name}`);
    });
    
    console.log("\n👥 Role Structure:");
    createdRoles.forEach(role => {
      console.log(`• ${role.name} - $${role.hourly_rate}/hr`);
    });

    return {
      departments: createdDepartments.length,
      roles: createdRoles.length,
      success: true
    };
    
  } catch (error) {
    console.error("❌ Failed to create industry structure:", error);
    throw error;
  } finally {
    client.release();
  }
}

createSteelIndustryStructure().then(result => {
  console.log("\n🎉 Steel industry structure complete!");
  console.log("Team Management page should now work without errors.");
}).catch(console.error);