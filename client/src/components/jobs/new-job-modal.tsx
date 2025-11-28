import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, X, Package } from "lucide-react";
import { Material } from "@shared/schema";

const jobSchema = z.object({
  jobNumber: z.string().min(1, "Job number is required"),
  clientName: z.string().min(1, "Client name is required"),
  projectDescription: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["standard", "high", "rush"]).default("standard"),
  estimatedValue: z.string().optional(),
  isRushOrder: z.boolean().default(false),
});

const materialRequirementSchema = z.object({
  materialId: z.number().min(1, "Material is required"),
  requiredLength: z.string().min(1, "Length is required"),
  quantity: z.string().min(1, "Quantity is required"),
  cutAngle: z.string().default("90"),
});

type JobFormData = z.infer<typeof jobSchema>;
type MaterialRequirement = z.infer<typeof materialRequirementSchema>;

interface NewJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewJobModal({ open, onOpenChange }: NewJobModalProps) {
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirement[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<Partial<MaterialRequirement>>({
    cutAngle: "90"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      jobNumber: `JOB-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      priority: "standard",
      isRushOrder: false,
    },
  });

  const { data: materials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const jobData = {
        ...data,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        isRushOrder: data.priority === "rush",
      };

      const response = await apiRequest("/api/jobs", "POST", jobData);
      return response.json();
    },
    onSuccess: async (job) => {
      // Add material requirements to the job
      for (const req of materialRequirements) {
        await apiRequest(`/api/jobs/${job.id}/materials`, "POST", {
          materialId: req.materialId,
          requiredLength: parseFloat(req.requiredLength),
          quantity: parseInt(req.quantity),
          cutAngle: parseFloat(req.cutAngle),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      onOpenChange(false);
      form.reset();
      setMaterialRequirements([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const addMaterialRequirement = () => {
    if (!currentMaterial.materialId || !currentMaterial.requiredLength || !currentMaterial.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all material requirement fields",
        variant: "destructive",
      });
      return;
    }

    setMaterialRequirements([...materialRequirements, currentMaterial as MaterialRequirement]);
    setCurrentMaterial({ cutAngle: "90" });
  };

  const removeMaterialRequirement = (index: number) => {
    setMaterialRequirements(materialRequirements.filter((_, i) => i !== index));
  };

  const onSubmit = (data: JobFormData) => {
    if (materialRequirements.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one material requirement",
        variant: "destructive",
      });
      return;
    }
    createJobMutation.mutate(data);
  };

  const selectedMaterial = materials?.find(m => m.id === currentMaterial.materialId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Job</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jobNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="JOB-2024-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Client name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="projectDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter project details..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="rush">Rush Order</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value (NZD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Material Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Material Requirements</h3>
              
              {/* Add Material Form */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-5 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Material</label>
                      <Select
                        value={currentMaterial.materialId?.toString() || ""}
                        onValueChange={(value) => setCurrentMaterial({
                          ...currentMaterial,
                          materialId: parseInt(value)
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select material..." />
                        </SelectTrigger>
                        <SelectContent>
                          {materials?.map((material) => (
                            <SelectItem key={material.id} value={material.id.toString()}>
                              {material.code} - {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Length (mm)</label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={currentMaterial.requiredLength || ""}
                        onChange={(e) => setCurrentMaterial({
                          ...currentMaterial,
                          requiredLength: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={currentMaterial.quantity || ""}
                        onChange={(e) => setCurrentMaterial({
                          ...currentMaterial,
                          quantity: e.target.value
                        })}
                      />
                    </div>

                    <Button type="button" onClick={addMaterialRequirement} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {selectedMaterial && (
                    <div className="mt-3 p-3 bg-background rounded border text-sm">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-muted-foreground">Dimensions:</span>
                          <p className="font-medium">
                            {selectedMaterial.width && selectedMaterial.thickness
                              ? `${selectedMaterial.width}×${selectedMaterial.thickness}mm`
                              : 'Custom'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight:</span>
                          <p className="font-medium">{selectedMaterial.weightPerMeter || 0} kg/m</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <p className="font-medium">
                            {selectedMaterial.pricePerMeter
                              ? `$${selectedMaterial.pricePerMeter}/m`
                              : selectedMaterial.pricePerKg
                              ? `$${selectedMaterial.pricePerKg}/kg`
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Material Requirements List */}
              {materialRequirements.length > 0 && (
                <div className="space-y-2">
                  {materialRequirements.map((req, index) => {
                    const material = materials?.find(m => m.id === req.materialId);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Package className="h-4 w-4 text-secondary" />
                          <div>
                            <p className="font-medium">{material?.code} - {material?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {req.requiredLength}mm × {req.quantity} pieces
                              {req.cutAngle !== "90" && ` @ ${req.cutAngle}°`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {req.cutAngle === "90" ? "Standard Cut" : "Angle Cut"}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMaterialRequirement(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-secondary hover:bg-secondary/90"
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
