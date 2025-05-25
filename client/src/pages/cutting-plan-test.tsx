import StandardCuttingPlan from "@/components/optimization/standard-cutting-plan";

export default function CuttingPlanTest() {
  // Sample cutting plan data to test the visual indicators
  const samplePlans = [
    {
      stockLength: 6000,
      materialType: "SHS 50x50x3mm",
      materialGrade: "C350LO",
      efficiency: 95.0,
      totalCuts: 5,
      wasteLength: 300,
      instructions: {
        general: "Deburr all edges after cutting",
        cuttingMethod: "Bandsaw - standard setup",
        heatNumber: "H12345-2024",
        millCertNumber: "MC-789456"
      },
      cuts: [
        {
          id: "cut1",
          length: 1200,
          position: 0,
          startAngle: 90,
          endAngle: 45,
          quantity: 2,
          description: "Main beam sections",
          cuttingInstructions: "Mark with job number after cutting"
        },
        {
          id: "cut2", 
          length: 800,
          position: 1200,
          startAngle: 45,
          endAngle: 90,
          quantity: 1,
          description: "Angled brace",
          cuttingInstructions: "Drill 10mm hole at 200mm from left end"
        },
        {
          id: "cut3",
          length: 1500,
          position: 2000,
          startAngle: 90,
          endAngle: 90,
          quantity: 1,
          description: "Standard length piece"
        },
        {
          id: "cut4",
          length: 1000,
          position: 3500,
          startAngle: 30,
          endAngle: 60,
          quantity: 1,
          description: "Complex angled cut",
          cuttingInstructions: "Check angles with protractor before cutting"
        }
      ]
    },
    {
      stockLength: 8000,
      materialType: "RHS 100x50x4mm",
      materialGrade: "300",
      efficiency: 88.5,
      totalCuts: 3,
      wasteLength: 920,
      instructions: {
        general: "Use cutting fluid for all cuts",
        cuttingMethod: "Bandsaw - slow feed rate",
        heatNumber: "H67890-2024",
        millCertNumber: "MC-123789"
      },
      cuts: [
        {
          id: "cut5",
          length: 2500,
          position: 0,
          startAngle: 90,
          endAngle: 90,
          quantity: 2,
          description: "Frame members"
        },
        {
          id: "cut6",
          length: 1580,
          position: 2500,
          startAngle: 90,
          endAngle: 45,
          quantity: 1,
          description: "Corner piece",
          cuttingInstructions: "File smooth after cutting angle"
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Standard Cutting Plan - Visual Examples</h1>
        <p className="text-muted-foreground mt-2">
          Review the different visual indicator options for bandsaw cutting guidance
        </p>
      </div>
      
      <StandardCuttingPlan 
        plans={samplePlans}
        materialCode="TEST-MATERIAL-001"
        jobNumber="JOB-2024-001"
      />
    </div>
  );
}