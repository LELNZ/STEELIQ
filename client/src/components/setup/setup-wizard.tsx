import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Settings, 
  Package, 
  Briefcase,
  Zap,
  Target
} from "lucide-react";
import MaterialUpload from "@/components/materials/material-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface SetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SetupWizard({ open, onOpenChange }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showMaterialUpload, setShowMaterialUpload] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current data to check completion status
  const { data: materials } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const steps: SetupStep[] = [
    {
      id: "welcome",
      title: "Welcome to Lateral Engineering Steel Manager",
      description: "Let's set up your steel cutting optimization system for maximum efficiency",
      icon: <Target className="w-6 h-6" />,
      completed: false
    },
    {
      id: "materials",
      title: "Add Your Steel Materials",
      description: "Import your steel catalog with flats, angles, channels, and RHS/SHS profiles",
      icon: <Package className="w-6 h-6" />,
      completed: (materials?.length || 0) > 0
    },
    {
      id: "inventory",
      title: "Set Up Initial Inventory",
      description: "Add your current stock levels and locations for tracking",
      icon: <Settings className="w-6 h-6" />,
      completed: (inventory?.length || 0) > 0
    },
    {
      id: "test-job",
      title: "Create Your First Job",
      description: "Test the cutting optimization with a sample fabrication job",
      icon: <Briefcase className="w-6 h-6" />,
      completed: (jobs?.length || 0) > 0
    },
    {
      id: "optimization",
      title: "Test Cutting Optimization",
      description: "Run the optimization algorithms to minimize waste and cutting time",
      icon: <Zap className="w-6 h-6" />,
      completed: false
    },
    {
      id: "complete",
      title: "Setup Complete!",
      description: "Your steel cutting optimization system is ready for production use",
      icon: <CheckCircle className="w-6 h-6" />,
      completed: false
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createInitialMaterials = useMutation({
    mutationFn: async () => {
      // Create initial materials for the system
      const initialMaterials = [
        {
          code: "FL-100x10",
          name: "Flat Bar 100x10mm",
          categoryId: 1,
          width: 100,
          thickness: 10,
          weightPerMeter: 7.85,
          grade: "300W",
          pricePerKg: 2.50,
          supplier: "Primary Supplier"
        },
        {
          code: "ANG-50x50x5",
          name: "Equal Angle 50x50x5mm",
          categoryId: 2,
          width: 50,
          height: 50,
          thickness: 5,
          weightPerMeter: 3.77,
          grade: "300W",
          pricePerKg: 2.50,
          supplier: "Primary Supplier"
        },
        {
          code: "RHS-50x25x2.5",
          name: "RHS 50x25x2.5mm",
          categoryId: 3,
          width: 50,
          height: 25,
          thickness: 2.5,
          weightPerMeter: 2.42,
          grade: "350W",
          pricePerKg: 2.75,
          supplier: "Primary Supplier"
        }
      ];

      for (const material of initialMaterials) {
        await apiRequest("/api/materials", "POST", material);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Initial Materials Added",
        description: "3 initial materials from your steel catalog have been added successfully.",
      });
    },
  });

  const createInitialInventory = useMutation({
    mutationFn: async () => {
      const materials = await fetch("/api/materials").then(res => res.json());
      
      if (materials.length > 0) {
        for (const material of materials.slice(0, 3)) {
          await apiRequest("/api/inventory", "POST", {
            materialId: material.id,
            quantityInStock: 10,
            unitLength: 6000, // 6m standard length
            location: "Warehouse A",
            batchNumber: `BATCH-${Date.now()}`,
            pricePerUnit: material.pricePerKg * material.weightPerMeter * 6
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Initial Inventory Added",
        description: "Initial stock levels have been set for your materials.",
      });
    },
  });

  const renderStepContent = () => {
    const currentStepData = steps[currentStep];

    switch (currentStepData.id) {
      case "welcome":
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Your Steel Cutting Optimization System</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                This wizard will help you set up your fabrication management system with your steel catalog, 
                inventory tracking, and cutting optimization for maximum efficiency.
              </p>
            </div>
            <div className="bg-secondary/5 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What we'll set up:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Steel material library with your catalog</li>
                <li>• Inventory tracking with QR codes</li>
                <li>• Job management and cutting sequences</li>
                <li>• Optimization algorithms (2.4mm kerf, 0.5mm tolerance)</li>
              </ul>
            </div>
          </div>
        );

      case "materials":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Package className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Add Your Steel Materials</h2>
              <p className="text-muted-foreground">
                Import your steel catalog or add materials manually. We support flats, angles, channels, and RHS/SHS profiles.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => setShowMaterialUpload(true)}
                className="h-20 flex-col space-y-2"
              >
                <Upload className="w-6 h-6" />
                <span>Upload CSV/Excel</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => createInitialMaterials.mutate()}
                disabled={createInitialMaterials.isPending}
                className="h-20 flex-col space-y-2"
              >
                <Package className="w-6 h-6" />
                <span>Add Initial Materials</span>
              </Button>
            </div>

            {materials && materials.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    {materials.length} materials added successfully!
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case "inventory":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Set Up Initial Inventory</h2>
              <p className="text-muted-foreground">
                Add your current stock levels and warehouse locations for accurate tracking.
              </p>
            </div>

            <Button 
              onClick={() => createInitialInventory.mutate()}
              disabled={createInitialInventory.isPending || (materials?.length || 0) === 0}
              className="w-full h-16"
            >
              <Settings className="w-5 h-5 mr-2" />
              Set Up Initial Inventory
            </Button>

            {(materials?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Please add materials first before setting up inventory.
              </p>
            )}

            {inventory && inventory.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Inventory set up with {inventory.length} items!
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case "test-job":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Briefcase className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Create Your First Job</h2>
              <p className="text-muted-foreground">
                Let's create a test fabrication job to see the cutting optimization in action.
              </p>
            </div>

            <div className="bg-secondary/5 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Test Job Example:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Job: Handrail Frame</li>
                <li>• Materials: RHS 50x25, Flat Bar 100x10</li>
                <li>• Cuts: Various lengths with 2.4mm kerf allowance</li>
                <li>• Target: &lt;5% waste percentage</li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Go to the Jobs page to create your first job, or continue to see the optimization demo.
              </p>
              
              {jobs && jobs.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {jobs.length} job(s) created successfully!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "optimization":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Zap className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Test Cutting Optimization</h2>
              <p className="text-muted-foreground">
                Your system is configured with your specifications: 2.4mm kerf width, 0.5mm tolerance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-green-600">Minimize Waste</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optimize for maximum material utilization
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-blue-600">Minimize Cuts</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reduce cutting time and labor
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-purple-600">Balanced</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optimize both waste and cutting time
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Go to the Optimization page to test these algorithms with your materials and jobs.
              </p>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-green-800">Setup Complete!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your steel cutting optimization system is now ready for production use. 
                You can start managing jobs, tracking inventory, and optimizing cuts.
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Next Steps:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Import your complete steel catalog</li>
                <li>• Set up your full inventory with locations</li>
                <li>• Create real fabrication jobs</li>
                <li>• Use QR codes for material tracking</li>
                <li>• Monitor efficiency and waste metrics</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Setup Wizard</CardTitle>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {renderStepContent()}
          
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button onClick={() => onOpenChange(false)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Start Using System
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <MaterialUpload 
        open={showMaterialUpload} 
        onOpenChange={setShowMaterialUpload} 
      />
    </div>
  );
}