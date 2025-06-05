import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SupplierForm, SupplierFormData } from "@/components/forms/supplier-form";
import { Building2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SupplierFormDemo() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Sample data for edit mode demonstration
  const sampleSupplierData: Partial<SupplierFormData> = {
    name: "ASMUSS Steel Distributors",
    company: "ASMUSS Steel Distributors Limited",
    address: "123 Industrial Drive, Penrose",
    city: "Auckland",
    postcode: "1061",
    country: "New Zealand",
    nzbn: "9429000000000",
    gstNumber: "123-456-789",
    website: "https://www.asmuss.co.nz",
    email: "sales@asmuss.co.nz",
    phone: "+64 9 123 4567",
    paymentTerms: "30 days",
    accountManager: "John Smith",
    leadTimeStandard: 5,
    leadTimeExpress: 2,
    minimumOrderQuantity: 100,
    minimumOrderValue: 500,
    deliveryAreas: "Auckland, Hamilton, Tauranga",
    certifications: "ISO 9001:2015, AS/NZS 3678",
    standardsCompliance: "Australian Standards AS/NZS 3678, New Zealand Building Code",
    notes: "Preferred supplier for structural steel. Excellent quality and reliable delivery times.",
    isActive: true,
    isPreferredSupplier: true
  };

  const handleCreateSubmit = async (data: SupplierFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: "Supplier created successfully", description: `${data.name} has been added to the system.` });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({ title: "Error creating supplier", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (data: SupplierFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: "Supplier updated successfully", description: `${data.name} has been updated.` });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({ title: "Error updating supplier", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Standardized Supplier Form Demo</h1>
        <p className="text-muted-foreground">
          Preview the new unified supplier form design with comprehensive sections and enhanced validation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Form Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Create New Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test the standardized form for creating a new supplier with clean, empty fields.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  Open Create Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Create New Supplier
                  </DialogTitle>
                </DialogHeader>
                <SupplierForm
                  mode="create"
                  onSubmit={handleCreateSubmit}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isLoading={isLoading}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Edit Form Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              Edit Existing Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test the form pre-populated with sample supplier data (ASMUSS Steel Distributors).
            </p>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Open Edit Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    Edit Supplier - ASMUSS Steel Distributors
                  </DialogTitle>
                </DialogHeader>
                <SupplierForm
                  mode="edit"
                  initialData={sampleSupplierData}
                  onSubmit={handleEditSubmit}
                  onCancel={() => setIsEditDialogOpen(false)}
                  isLoading={isLoading}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Form Features Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>New Form Features & Improvements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Organized Sections
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Company Information</li>
                <li>• Address Information</li>
                <li>• Business Registration</li>
                <li>• Commercial Terms</li>
                <li>• Lead Times</li>
                <li>• Quality & Compliance</li>
                <li>• Status Settings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-600" />
                Enhanced Fields
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Google Places address search</li>
                <li>• Enhanced validation rules</li>
                <li>• Payment terms dropdown</li>
                <li>• Lead time management</li>
                <li>• Minimum order controls</li>
                <li>• Preferred supplier toggle</li>
                <li>• Comprehensive notes fields</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                User Experience
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Color-coded section icons</li>
                <li>• Clear visual hierarchy</li>
                <li>• Responsive design</li>
                <li>• Consistent styling</li>
                <li>• Loading state feedback</li>
                <li>• Form validation messages</li>
                <li>• Logical field progression</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}