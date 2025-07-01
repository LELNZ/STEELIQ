/**
 * Analyze coating systems in the database
 * Compare what's currently available vs what should be in coating systems
 */

import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeCoatingSystems() {
    try {
        // Get all materials that might be coating related
        const result = await pool.query(`
            SELECT 
                id, name, category, code, supplier, 
                "pricePerKg", "surfaceAreaPerMeter"
            FROM materials 
            WHERE 
                LOWER(category) LIKE '%coating%' OR
                LOWER(category) LIKE '%paint%' OR
                LOWER(category) LIKE '%galvaniz%' OR
                LOWER(category) LIKE '%powder%' OR
                LOWER(category) LIKE '%anodiz%' OR
                LOWER(category) LIKE '%plat%' OR
                LOWER(name) LIKE '%coating%' OR
                LOWER(name) LIKE '%paint%' OR
                LOWER(name) LIKE '%galvaniz%' OR
                LOWER(name) LIKE '%powder%' OR
                LOWER(name) LIKE '%anodiz%' OR
                LOWER(name) LIKE '%plat%'
            ORDER BY category, name
        `);

        console.log('\n=== COATING SYSTEMS ANALYSIS ===\n');
        console.log(`Found ${result.rows.length} potential coating materials\n`);

        // Group by category
        const byCategory = {};
        const steelMaterials = [];
        const actualCoatings = [];

        result.rows.forEach(material => {
            const category = material.category || 'Uncategorized';
            const name = material.name?.toLowerCase() || '';
            const categoryLower = category.toLowerCase();

            // Check if it's a steel material
            const isSteelMaterial = categoryLower.includes('pipe') ||
                                  categoryLower.includes('beam') ||
                                  categoryLower.includes('column') ||
                                  categoryLower.includes('shs') ||
                                  categoryLower.includes('rhs') ||
                                  categoryLower.includes('flat') ||
                                  categoryLower.includes('angle') ||
                                  categoryLower.includes('round') ||
                                  categoryLower.includes('channel') ||
                                  categoryLower.includes('bar') ||
                                  categoryLower.includes('mesh') ||
                                  categoryLower.includes('rail') ||
                                  categoryLower.includes('purlin') ||
                                  name.includes('pipe') ||
                                  name.includes('beam') ||
                                  name.includes('tube');

            if (isSteelMaterial) {
                steelMaterials.push(material);
            } else {
                actualCoatings.push(material);
                if (!byCategory[category]) {
                    byCategory[category] = [];
                }
                byCategory[category].push(material);
            }
        });

        console.log('🚫 STEEL MATERIALS (Should be excluded from Coating Systems):');
        steelMaterials.forEach(material => {
            console.log(`  - ${material.name} (${material.category}) - ${material.code || 'No code'}`);
        });

        console.log('\n✅ ACTUAL COATING SYSTEMS (Should be included):');
        actualCoatings.forEach(material => {
            console.log(`  - ${material.name} (${material.category}) - ${material.code || 'No code'} - $${material.pricePerKg || 'N/A'}`);
        });

        console.log('\n📊 COATING SYSTEMS BY CATEGORY:');
        Object.keys(byCategory).forEach(category => {
            console.log(`\n${category} (${byCategory[category].length} items):`);
            byCategory[category].forEach(material => {
                console.log(`  - ${material.name} - $${material.pricePerKg || 'N/A'}/kg`);
            });
        });

        console.log('\n🔍 RECOMMENDATIONS:');
        console.log('1. Exclude all steel materials from Coating Systems tab');
        console.log('2. Focus on actual coating services and materials');
        console.log(`3. Currently have ${actualCoatings.length} legitimate coating items`);
        console.log(`4. Need to filter out ${steelMaterials.length} steel materials`);

        if (actualCoatings.length === 0) {
            console.log('\n⚠️  WARNING: No actual coating systems found in database!');
            console.log('   Consider adding proper coating materials like:');
            console.log('   - Paint systems (primers, topcoats)');
            console.log('   - Powder coating services');
            console.log('   - Galvanizing services (not galvanized products)');
            console.log('   - Anodizing services');
            console.log('   - Plating services');
        }

    } catch (error) {
        console.error('Error analyzing coating systems:', error);
    } finally {
        await pool.end();
    }
}

runAnalysis();

async function runAnalysis() {
    await analyzeCoatingSystems();
}