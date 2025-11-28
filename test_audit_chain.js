const { verifyAuditChain, getAuditStats } = require('./server/auditService');

async function test() {
  console.log("=== Testing Audit Chain Integrity ===");
  
  try {
    // Verify the audit chain
    const verification = await verifyAuditChain();
    console.log("Chain verification result:", verification);
    
    // Get audit statistics
    const stats = await getAuditStats();
    console.log("\n=== Audit Statistics ===");
    console.log("Total events:", stats.totalEvents);
    console.log("Events by type:", stats.eventsByType);
    console.log("Failed attempts:", stats.failedAttempts);
    console.log("Unique users:", stats.uniqueUsers);
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

test();
