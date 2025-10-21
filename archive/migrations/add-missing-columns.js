/**
 * Add missing columns to team_members table
 */
import { pool } from './server/db.ts';

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Adding missing columns to team_members table...");
    
    // Add all the missing columns
    const columns = [
      // Additional H&S fields
      { name: 'safety_card_number', type: 'varchar(50)' },
      { name: 'safety_card_expiry', type: 'date' },
      { name: 'working_at_heights_expiry', type: 'date' },
      { name: 'first_aid_expiry', type: 'date' },
      { name: 'driver_license_type', type: 'varchar(50)' },
      { name: 'driver_license_expiry', type: 'date' },
      { name: 'trade_certificates', type: 'jsonb' },
      
      // Banking & Financial
      { name: 'bank_account_name', type: 'varchar(100)' },
      { name: 'bank_account_number', type: 'varchar(50)' },
      { name: 'bank_sort_code', type: 'varchar(20)' },
      { name: 'tax_number', type: 'varchar(20)' },
      { name: 'kiwisaver_rate', type: 'decimal(5,2)' },
      
      // Visa & Immigration
      { name: 'visa_type', type: 'varchar(50)' },
      { name: 'visa_expiry', type: 'date' },
      
      // Next of Kin
      { name: 'next_of_kin_name', type: 'varchar(100)' },
      { name: 'next_of_kin_phone', type: 'varchar(20)' },
      { name: 'next_of_kin_relation', type: 'varchar(50)' },
      
      // Leave balances
      { name: 'annual_leave_balance', type: 'decimal(5,2) DEFAULT 0' },
      { name: 'sick_leave_balance', type: 'decimal(5,2) DEFAULT 0' }
    ];
    
    for (const column of columns) {
      try {
        await client.query(`
          ALTER TABLE team_members 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`✅ Added ${column.name}`);
      } catch (error) {
        if (error.code === '42701') { // column already exists
          console.log(`ℹ️  ${column.name} already exists`);
        } else {
          console.error(`❌ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    console.log("\n✨ All columns added successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns().catch(console.error);