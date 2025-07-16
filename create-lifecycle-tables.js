/**
 * Create project lifecycle tracking tables
 * Based on Fortune 500 and STRUMIS standards
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createLifecycleTables() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Creating project lifecycle tracking tables...");
    
    // 1. Project lifecycle phases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_lifecycle_phases (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES estimation_projects(id) ON DELETE CASCADE,
        phase_code VARCHAR(50) NOT NULL,
        phase_name TEXT NOT NULL,
        phase_category TEXT NOT NULL, -- pre_fabrication, design_documentation, fabrication, post_fabrication
        sequence_order INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed, blocked, skipped
        planned_start TIMESTAMP,
        actual_start TIMESTAMP,
        planned_end TIMESTAMP,
        actual_end TIMESTAMP,
        blocking_reason TEXT,
        completion_criteria JSONB DEFAULT '{}',
        automation_rules JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, phase_code)
      )
    `);
    
    // 2. Project lifecycle tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_lifecycle_tasks (
        id SERIAL PRIMARY KEY,
        phase_id INTEGER REFERENCES project_lifecycle_phases(id) ON DELETE CASCADE,
        task_code VARCHAR(50) NOT NULL,
        task_name TEXT NOT NULL,
        task_description TEXT,
        responsible_party VARCHAR(50), -- LEL, Client, Engineer, Detailer, Subcontractor
        assigned_to INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, blocked, cancelled
        due_date TIMESTAMP,
        started_date TIMESTAMP,
        completed_date TIMESTAMP,
        completed_by INTEGER REFERENCES users(id),
        required_documents JSONB DEFAULT '[]',
        attached_documents JSONB DEFAULT '[]',
        approval_required BOOLEAN DEFAULT false,
        approved_by INTEGER REFERENCES users(id),
        approved_date TIMESTAMP,
        automation_trigger VARCHAR(100), -- document_upload, payment_received, approval_given, etc.
        dependencies JSONB DEFAULT '[]', -- task IDs that must complete first
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 3. Project stakeholders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_stakeholders (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES estimation_projects(id) ON DELETE CASCADE,
        stakeholder_type VARCHAR(50) NOT NULL, -- client, engineer, detailer, subcontractor, supplier
        company_name TEXT,
        contact_person TEXT,
        email VARCHAR(255),
        phone VARCHAR(50),
        portal_access BOOLEAN DEFAULT false,
        portal_role VARCHAR(50), -- viewer, approver, contributor
        notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "in_app": true}',
        access_permissions JSONB DEFAULT '[]', -- specific phases/tasks they can view
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 4. Project lifecycle events log
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_lifecycle_events (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES estimation_projects(id) ON DELETE CASCADE,
        phase_id INTEGER REFERENCES project_lifecycle_phases(id),
        task_id INTEGER REFERENCES project_lifecycle_tasks(id),
        event_type VARCHAR(50) NOT NULL, -- status_change, document_uploaded, approval_given, etc.
        event_description TEXT,
        triggered_by INTEGER REFERENCES users(id),
        triggered_by_system BOOLEAN DEFAULT false,
        old_value JSONB,
        new_value JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 5. Project lifecycle templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_lifecycle_templates (
        id SERIAL PRIMARY KEY,
        template_name TEXT NOT NULL,
        template_description TEXT,
        project_type VARCHAR(50), -- new_construction, renovation, maintenance, etc.
        phases JSONB NOT NULL, -- array of phase definitions
        tasks JSONB NOT NULL, -- array of task definitions per phase
        automation_rules JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 6. Phase transition rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS phase_transition_rules (
        id SERIAL PRIMARY KEY,
        from_phase_code VARCHAR(50),
        to_phase_code VARCHAR(50),
        required_conditions JSONB NOT NULL, -- conditions that must be met
        automatic_transition BOOLEAN DEFAULT false,
        notification_rules JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phases_project_status ON project_lifecycle_phases(project_id, status);
      CREATE INDEX IF NOT EXISTS idx_tasks_phase_status ON project_lifecycle_tasks(phase_id, status);
      CREATE INDEX IF NOT EXISTS idx_tasks_responsible ON project_lifecycle_tasks(responsible_party);
      CREATE INDEX IF NOT EXISTS idx_events_project_time ON project_lifecycle_events(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_stakeholders_project ON project_stakeholders(project_id);
    `);
    
    console.log("✅ All lifecycle tracking tables created successfully");
    
    // Insert default template for steel fabrication projects
    await client.query(`
      INSERT INTO project_lifecycle_templates (template_name, template_description, project_type, phases, tasks)
      VALUES (
        'Standard Steel Fabrication',
        'Default workflow for steel fabrication projects based on LEL process',
        'new_construction',
        $1::jsonb,
        $2::jsonb
      )
      ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([
        { code: 'PRE_FAB', name: 'Pre-Fabrication', category: 'pre_fabrication', order: 1 },
        { code: 'DESIGN_DOC', name: 'Design & Documentation', category: 'design_documentation', order: 2 },
        { code: 'FABRICATION', name: 'Fabrication', category: 'fabrication', order: 3 },
        { code: 'POST_FAB', name: 'Post-Fabrication', category: 'post_fabrication', order: 4 }
      ]),
      JSON.stringify({
        'PRE_FAB': [
          { code: 'SEND_QUOTE', name: 'Send Quote', responsible: 'LEL', automation: 'quote_generation' },
          { code: 'QUOTE_ACCEPT', name: 'Quote Acceptance', responsible: 'Client', approval_required: true },
          { code: 'PO_RECEIVED', name: 'Purchase Order Received', responsible: 'Client', required_docs: ['purchase_order'] },
          { code: 'DEPOSIT_PAID', name: 'Deposit Payment', responsible: 'Client', automation: 'xero_payment' }
        ],
        'DESIGN_DOC': [
          { code: 'DRAWINGS_REC', name: 'Final Drawings Received', responsible: 'Client', required_docs: ['drawings'] },
          { code: 'SHOP_DRAWING', name: 'Shop Drawings Creation', responsible: 'Detailer' },
          { code: 'RFI_SUBMIT', name: 'Submit RFIs', responsible: 'LEL' },
          { code: 'SHOP_APPROVAL', name: 'Shop Drawing Approval', responsible: 'Client', approval_required: true }
        ],
        'FABRICATION': [
          { code: 'MAT_ORDER', name: 'Order Materials', responsible: 'LEL', automation: 'po_creation' },
          { code: 'MAT_RECEIVE', name: 'Materials Received', responsible: 'LEL', automation: 'inventory_update' },
          { code: 'ITP_SUBMIT', name: 'Submit ITP', responsible: 'LEL', required_docs: ['itp'] },
          { code: 'FAB_START', name: 'Fabrication Started', responsible: 'LEL' },
          { code: 'QC_COMPLETE', name: 'QC Completion', responsible: 'LEL', required_docs: ['qc_checklist'] }
        ],
        'POST_FAB': [
          { code: 'COATING', name: 'Coating/Painting', responsible: 'LEL' },
          { code: 'DELIVERY', name: 'Delivery Arrangement', responsible: 'LEL' },
          { code: 'INSTALL', name: 'Installation', responsible: 'LEL' },
          { code: 'INSPECT', name: 'Final Inspection', responsible: 'LEL', approval_required: true },
          { code: 'INVOICE', name: 'Final Invoice', responsible: 'LEL', automation: 'xero_invoice' },
          { code: 'PAYMENT', name: 'Final Payment', responsible: 'Client', automation: 'xero_payment' }
        ]
      })
    ]);
    
    console.log("✅ Default steel fabrication template inserted");
    
  } catch (error) {
    console.error("❌ Error creating lifecycle tables:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createLifecycleTables()
  .then(() => {
    console.log("\n✅ All lifecycle tracking tables created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to create lifecycle tables:", error);
    process.exit(1);
  });