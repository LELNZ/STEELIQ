// Quick test to check material schema validation
const { insertMaterialSchema } = require('./shared/schema.ts');

const testMaterial = {
  code: "DGA03025",
  name: "Duragal Angle 30x30x2.5mm",
  category: "Duragal Angles",
  isActive: true
};

try {
  const result = insertMaterialSchema.parse(testMaterial);
  console.log("SUCCESS:", result);
} catch (error) {
  console.log("VALIDATION ERROR:", error.issues);
}