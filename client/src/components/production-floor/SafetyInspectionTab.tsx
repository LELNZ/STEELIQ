import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Plus,
  Shield,
  AlertCircle,
  ClipboardCheck,
  TrendingUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const inspectionSchema = z.object({
  inspectionType: z.string().min(1, "Inspection type is required"),
  location: z.string().min(1, "Location is required"),
  department: z.string().optional(),
  checklistTemplate: z.string().optional(),
  overallResult: z.string().min(1, "Overall result is required"),
  riskLevel: z.string().optional(),
  hazardsIdentified: z.array(z.string()).optional(),
  correctiveActions: z.array(z.string()).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

export default function SafetyInspectionTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const { toast } = useToast();

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      inspectionType: '',
      location: '',
      department: '',
      overallResult: '',
      riskLevel: 'low',
      hazardsIdentified: [],
      correctiveActions: [],
      followUpRequired: false,
      notes: '',
    },
  });

  // Fetch safety inspections
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['/api/safety/inspections'],
  });

  // Fetch safety stats
  const { data: stats } = useQuery({
    queryKey: ['/api/safety/stats'],
  });

  // Create inspection mutation
  const createInspectionMutation = useMutation({
    mutationFn: (data: InspectionFormValues) => 
      apiRequest('/api/safety/inspections', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/safety/inspections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/safety/stats'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Safety inspection created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create safety inspection",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: InspectionFormValues) => {
    const processedData = {
      ...values,
      hazardsIdentified: values.hazardsIdentified?.filter(h => h.length > 0) || [],
      correctiveActions: values.correctiveActions?.filter(c => c.length > 0) || [],
      followUpDate: values.followUpDate ? new Date(values.followUpDate) : undefined,
    };
    createInspectionMutation.mutate(processedData);
  };

  const getRiskBadgeColor = (level: string) => {
    switch(level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'pass': return 'bg-green-500';
      case 'fail': return 'bg-red-500';
      case 'conditional': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Safety Inspections</h2>
          <p className="text-muted-foreground">Monitor workplace safety and compliance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
          >
            {viewMode === 'desktop' ? 'Mobile View' : 'Desktop View'}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compliance Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.complianceRate || 100}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Inspections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalInspections || 0}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.incidents || 0}
            </div>
            <p className="text-xs text-muted-foreground">Reported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.overdueInspections || 0}
            </div>
            <p className="text-xs text-muted-foreground">Inspections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.pendingActions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Follow-ups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.highRiskItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Inspections List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inspections</CardTitle>
          <CardDescription>View and manage safety inspection records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading inspections...</div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No safety inspections recorded</p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="mt-4"
                variant="outline"
              >
                Create First Inspection
              </Button>
            </div>
          ) : (
            <div className={viewMode === 'mobile' ? 'space-y-4' : ''}>
              {viewMode === 'desktop' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Inspection #</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Location</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Result</th>
                        <th className="text-left p-2">Risk Level</th>
                        <th className="text-left p-2">Inspector</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((inspection: any) => (
                        <tr key={inspection.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-sm">
                            {inspection.inspectionNumber}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {inspection.inspectionType}
                            </Badge>
                          </td>
                          <td className="p-2">{inspection.location}</td>
                          <td className="p-2">
                            {format(new Date(inspection.inspectionDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-2">
                            <Badge className={getStatusBadgeColor(inspection.overallResult)}>
                              {inspection.overallResult}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {inspection.riskLevel && (
                              <Badge className={getRiskBadgeColor(inspection.riskLevel)}>
                                {inspection.riskLevel}
                              </Badge>
                            )}
                          </td>
                          <td className="p-2">{inspection.inspectorId}</td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInspection(inspection)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Mobile view
                inspections.map((inspection: any) => (
                  <Card key={inspection.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-sm text-muted-foreground">
                          {inspection.inspectionNumber}
                        </div>
                        <div className="font-semibold">
                          {inspection.location}
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(inspection.overallResult)}>
                        {inspection.overallResult}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{inspection.inspectionType}</Badge>
                        {inspection.riskLevel && (
                          <Badge className={getRiskBadgeColor(inspection.riskLevel)}>
                            {inspection.riskLevel} risk
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(inspection.inspectionDate), 'dd/MM/yyyy HH:mm')}
                      </div>
                      {inspection.followUpRequired && (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          Follow-up required
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => setSelectedInspection(inspection)}
                    >
                      View Details
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Inspection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Safety Inspection</DialogTitle>
            <DialogDescription>
              Record a new safety inspection for workplace compliance
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inspectionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="workplace">Workplace</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="ppe">PPE</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                          <SelectItem value="incident">Incident</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Workshop Floor A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cutting">Cutting</SelectItem>
                          <SelectItem value="welding">Welding</SelectItem>
                          <SelectItem value="assembly">Assembly</SelectItem>
                          <SelectItem value="finishing">Finishing</SelectItem>
                          <SelectItem value="painting">Painting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overallResult"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Result</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select result" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                          <SelectItem value="conditional">Conditional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Follow-up Required</FormLabel>
                      <FormDescription>
                        Check if this inspection requires follow-up actions
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('followUpRequired') && (
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional observations or comments..."
                        className="h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createInspectionMutation.isPending}
                >
                  {createInspectionMutation.isPending ? 'Creating...' : 'Create Inspection'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Inspection Dialog */}
      {selectedInspection && (
        <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Safety Inspection Details</DialogTitle>
              <DialogDescription>
                {selectedInspection.inspectionNumber}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedInspection.inspectionType}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <div className="mt-1">{selectedInspection.location}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <div className="mt-1">
                    {format(new Date(selectedInspection.inspectionDate), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <div className="mt-1">{selectedInspection.department || 'N/A'}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Result</label>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeColor(selectedInspection.overallResult)}>
                      {selectedInspection.overallResult}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Level</label>
                  <div className="mt-1">
                    {selectedInspection.riskLevel && (
                      <Badge className={getRiskBadgeColor(selectedInspection.riskLevel)}>
                        {selectedInspection.riskLevel}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedInspection.followUpRequired && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-orange-900">Follow-up Required</span>
                  </div>
                  {selectedInspection.followUpDate && (
                    <div className="mt-1 text-sm text-orange-800">
                      Due: {format(new Date(selectedInspection.followUpDate), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              )}
              
              {selectedInspection.notes && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    {selectedInspection.notes}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInspection(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}