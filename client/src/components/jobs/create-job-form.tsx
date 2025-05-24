import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { insertJobSchema, type InsertJob } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User, Building, Phone, Mail, MapPin, FileText, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const jobFormSchema = insertJobSchema.extend({
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface CreateJobFormProps {
  onClose: () => void;
  optimizationData?: {
    cutRequests: any[];
    stockItems: any[];
    optimizationResult: any;
    simulationId?: string;
  };
}

export default function CreateJobForm({ onClose, optimizationData }: CreateJobFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate job number in industry standard format: LAT-YYMMDD-NNN
  const generateJobNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `LAT-${year}${month}${day}-${sequence}`;
  };

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      jobNumber: generateJobNumber(),
      status: "draft",
      priority: "standard",
      optimizationId: optimizationData?.simulationId || undefined,
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create job");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Created Successfully",
        description: "The job has been added to your workflow and is ready for planning.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error Creating Job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JobFormData) => {
    setIsSubmitting(true);
    createJobMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Create New Job</h2>
            <p className="text-muted-foreground">
              {optimizationData ? "Convert optimization to job" : "Create a new fabrication job"}
            </p>
          </div>
        </div>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobNumber">Job Number</Label>
                <Input
                  id="jobNumber"
                  {...form.register("jobNumber")}
                  className="font-mono"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(value) => form.setValue("priority", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="rush">Rush</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="projectDescription">Project Description</Label>
              <Textarea
                id="projectDescription"
                {...form.register("projectDescription")}
                placeholder="Describe the project requirements, materials, and specifications..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register("dueDate")}
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  {...form.register("clientName")}
                  placeholder="Company or individual name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientContact">Contact Person</Label>
                <Input
                  id="clientContact"
                  {...form.register("clientContact")}
                  placeholder="Primary contact name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  {...form.register("clientPhone")}
                  placeholder="+64 21 XXX XXXX"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  {...form.register("clientEmail")}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientAddress">Address</Label>
              <Textarea
                id="clientAddress"
                {...form.register("clientAddress")}
                placeholder="Full delivery or site address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedValue">Estimated Value (NZD)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  {...form.register("estimatedValue")}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  {...form.register("estimatedTime")}
                  placeholder="Total estimated cutting time"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                {...form.register("specialRequirements")}
                placeholder="Any special cutting requirements, tolerances, or specifications..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Textarea
                id="deliveryInstructions"
                {...form.register("deliveryInstructions")}
                placeholder="Delivery method, timing, or special instructions..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="notes">Client Notes</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Any additional notes or requirements from the client..."
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea
                id="internalNotes"
                {...form.register("internalNotes")}
                placeholder="Internal notes for workshop team (not visible to client)..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Optimization Summary (if applicable) */}
        {optimizationData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Optimization Summary
              </CardTitle>
              <CardDescription>
                This job will inherit the cutting optimization from simulation: {optimizationData.simulationId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-bold">{optimizationData.cutRequests?.length || 0}</div>
                  <div className="text-muted-foreground">Cut Requirements</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-bold">{optimizationData.stockItems?.length || 0}</div>
                  <div className="text-muted-foreground">Stock Items</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-bold">
                    {optimizationData.optimizationResult?.summary?.avgEfficiency?.toFixed(1) || "N/A"}%
                  </div>
                  <div className="text-muted-foreground">Efficiency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || createJobMutation.isPending}
          >
            {isSubmitting || createJobMutation.isPending ? "Creating Job..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}