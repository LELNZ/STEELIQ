import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { 
  pgTable, 
  serial, 
  integer, 
  text, 
  timestamp, 
  jsonb,
  varchar,
  boolean,
  decimal
} from 'drizzle-orm/pg-core';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Create quotes table
const createQuotesTable = `
  CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    estimation_id INTEGER NOT NULL REFERENCES estimation_projects(id),
    client_id INTEGER REFERENCES clients(id),
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    version INTEGER DEFAULT 1,
    
    -- Quote Configuration
    template VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL,
    display_format VARCHAR(50),
    pricing_display VARCHAR(50),
    
    -- Quote Content
    content JSONB NOT NULL,
    preview_html TEXT,
    
    -- Visibility Settings
    show_cost_breakdown BOOLEAN DEFAULT true,
    show_markups BOOLEAN DEFAULT false,
    show_subtotals BOOLEAN DEFAULT true,
    show_taxes BOOLEAN DEFAULT true,
    show_payment_terms BOOLEAN DEFAULT true,
    show_validity_period BOOLEAN DEFAULT true,
    
    -- Financial Summary
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    
    -- Status and Tracking
    status VARCHAR(50) DEFAULT 'draft',
    sent_at TIMESTAMP,
    sent_to VARCHAR(255),
    sent_by INTEGER REFERENCES users(id),
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    
    -- Metadata
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Email Settings
    email_subject TEXT,
    email_message TEXT,
    cc_emails TEXT[]
  );
`;

// Create quote history table for tracking changes
const createQuoteHistoryTable = `
  CREATE TABLE IF NOT EXISTS quote_history (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id),
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );
`;

// Create quote views table for tracking client interactions
const createQuoteViewsTable = `
  CREATE TABLE IF NOT EXISTS quote_views (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    duration_seconds INTEGER
  );
`;

// Indexes for performance
const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_quotes_estimation_id ON quotes(estimation_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
  CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
  CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
  CREATE INDEX IF NOT EXISTS idx_quote_history_quote_id ON quote_history(quote_id);
  CREATE INDEX IF NOT EXISTS idx_quote_views_quote_id ON quote_views(quote_id);
`;

async function createTables() {
  try {
    console.log('Creating quotes tables...');
    
    await db.execute(createQuotesTable);
    console.log('✓ Created quotes table');
    
    await db.execute(createQuoteHistoryTable);
    console.log('✓ Created quote_history table');
    
    await db.execute(createQuoteViewsTable);
    console.log('✓ Created quote_views table');
    
    await db.execute(createIndexes);
    console.log('✓ Created indexes');
    
    console.log('\nQuote management tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables();