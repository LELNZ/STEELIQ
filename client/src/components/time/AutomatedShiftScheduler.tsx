import { useState } from "react";
import { CalendarDays, Wand2, Users, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";

interface ShiftRequirement {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minStaff: number;
  preferredStaff: number;
  requiredSkills?: string[];
  jobId?: number;
}

interface ScheduleConstraint {
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  preferConsecutiveShifts: boolean;
  fairnessWeight: number; // 0-1, how much to prioritize equal distribution
}

interface GeneratedSchedule {
  id: number;
  runId: number;
  weekStarting: string;
  shifts: Array<{
    date: string;
    startTime: string;
    endTime: string;
    assignedEmployees: number[];
    jobId?: number;
  }>;
  stats: {
    coverage: number;
    fairness: number;
    violations: string[];
    suggestions: string[];
  };
  status: 'draft' | 'pending_approval' | 'approved' | 'published';
}

export function AutomatedShiftScheduler() {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(addWeeks(new Date(), 1)));
  const [constraints, setConstraints] = useState<ScheduleConstraint>({
    maxHoursPerWeek: 40,
    maxConsecutiveDays: 5,
    minRestHours: 8,
    preferConsecutiveShifts: true,
    fairnessWeight: 0.7
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Query shift requirements
  const { data: requirements = [], isLoading: requirementsLoading } = useQuery<ShiftRequirement[]>({
    queryKey: ['/api/time/scheduling/requirements'],
    queryFn: async () => {
      const res = await fetch('/api/time/scheduling/requirements?isActive=true', { credentials: 'include' });
      const json = await res.json();
      return json.success ? json.data : [];
    }
  });

  // Query generated schedule for selected week
  const weekStartStr = format(selectedWeek, 'yyyy-MM-dd');
  const { data: schedule, isLoading: scheduleLoading } = useQuery<GeneratedSchedule | null>({
    queryKey: ['/api/time/scheduling/schedule', weekStartStr],
    queryFn: async () => {
      const res = await fetch(`/api/time/scheduling/schedule?weekStarting=${weekStartStr}`, { credentials: 'include' });
      const json = await res.json();
      return json.success ? json.data : null;
    }
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await apiRequest('/api/time/scheduling/generate', 'POST', {
        weekStarting: weekStartStr,
        constraints: {
          maxHoursPerWeek: constraints.maxHoursPerWeek,
          maxConsecutiveDays: constraints.maxConsecutiveDays,
          minRestHours: constraints.minRestHours,
          fairnessWeight: constraints.fairnessWeight,
          considerPreferences: constraints.preferConsecutiveShifts,
          autoFillGaps: true,
        },
        optimizationPriority: 'balanced',
      });
      return response;
    },
    onSuccess: (data: any) => {
      setIsGenerating(false);
      const stats = data.stats || {};
      toast({
        title: "Schedule Generated",
        description: `Created schedule with ${stats.coverage || 0}% coverage and ${Math.round((stats.fairness || 0) * 100)}% fairness score.`
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/time/scheduling/schedule', weekStartStr] 
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate schedule.",
        variant: "destructive"
      });
    }
  });

  // Approve schedule mutation
  const approveScheduleMutation = useMutation({
    mutationFn: async (runId: number) => {
      return apiRequest(`/api/time/scheduling/schedule/${runId}/approve`, 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Schedule Approved",
        description: "The schedule has been approved and is ready to publish."
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/time/scheduling/schedule', weekStartStr] 
      });
    }
  });

  // Publish schedule mutation
  const publishScheduleMutation = useMutation({
    mutationFn: async (runId: number) => {
      return apiRequest(`/api/time/scheduling/schedule/${runId}/publish`, 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Schedule Published",
        description: "The schedule has been published and employees have been notified."
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/time/scheduling/schedule', weekStartStr] 
      });
    }
  });

  const handleGenerateSchedule = () => {
    generateScheduleMutation.mutate();
  };

  const handleApproveSchedule = () => {
    const runId = schedule?.runId || schedule?.id;
    if (runId) {
      approveScheduleMutation.mutate(runId);
    }
  };

  const handlePublishSchedule = () => {
    const runId = schedule?.runId || schedule?.id;
    if (runId) {
      publishScheduleMutation.mutate(runId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Automated Shift Scheduler
        </CardTitle>
        <CardDescription>
          AI-powered shift scheduling with fairness optimization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="constraints">Constraints</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            {/* Week Selection */}
            <div>
              <Label>Schedule Week</Label>
              <Input
                type="week"
                value={format(selectedWeek, "yyyy-'W'ww")}
                onChange={(e) => {
                  const [year, week] = e.target.value.split('-W');
                  const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
                  setSelectedWeek(startOfWeek(date));
                }}
                data-testid="input-week-selection"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Week of {format(selectedWeek, 'MMM d')} - {format(endOfWeek(selectedWeek), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Shift Requirements Summary */}
            {requirements && requirements.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Shift Requirements
                </h4>
                <div className="text-sm space-y-1">
                  {requirements.slice(0, 3).map((req, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>Day {req.dayOfWeek}: {req.startTime} - {req.endTime}</span>
                      <span>{req.minStaff}-{req.preferredStaff} staff</span>
                    </div>
                  ))}
                  {requirements.length > 3 && (
                    <p className="text-muted-foreground">
                      ...and {requirements.length - 3} more requirements
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Generation Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Optimization Priority</Label>
                  <p className="text-sm text-muted-foreground">
                    Balance between coverage and fairness
                  </p>
                </div>
                <Select defaultValue="balanced">
                  <SelectTrigger className="w-40" data-testid="select-optimization">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coverage" data-testid="option-coverage">
                      Max Coverage
                    </SelectItem>
                    <SelectItem value="balanced" data-testid="option-balanced">
                      Balanced
                    </SelectItem>
                    <SelectItem value="fairness" data-testid="option-fairness">
                      Max Fairness
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Consider Employee Preferences</Label>
                  <p className="text-sm text-muted-foreground">
                    Use historical data and stated preferences
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-preferences" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-fill Gaps</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically find coverage for unfilled shifts
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-auto-fill" />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full"
              onClick={handleGenerateSchedule}
              disabled={isGenerating || generateScheduleMutation.isPending}
              data-testid="button-generate-schedule"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Schedule...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate AI Schedule
                </>
              )}
            </Button>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={66} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Analyzing patterns and optimizing assignments...
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            {scheduleLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading schedule...
              </div>
            ) : schedule ? (
              <>
                {/* Schedule Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      schedule.status === 'published' ? 'default' :
                      schedule.status === 'approved' ? 'secondary' :
                      'outline'
                    }>
                      {schedule.status.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Generated for week of {format(new Date(schedule.weekStarting), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                {/* Schedule Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Coverage</span>
                      <span className="text-2xl font-bold">{schedule.stats.coverage}%</span>
                    </div>
                    <Progress value={schedule.stats.coverage} className="h-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Fairness</span>
                      <span className="text-2xl font-bold">
                        {Math.round(schedule.stats.fairness * 100)}%
                      </span>
                    </div>
                    <Progress value={schedule.stats.fairness * 100} className="h-2" />
                  </div>
                </div>

                {/* Violations */}
                {schedule.stats.violations.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Constraint Violations:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {schedule.stats.violations.map((violation, idx) => (
                          <li key={idx} className="text-sm">{violation}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Suggestions */}
                {schedule.stats.suggestions.length > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      AI Suggestions
                    </h4>
                    <ul className="text-sm space-y-1">
                      {schedule.stats.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {schedule.status === 'draft' && (
                    <Button
                      onClick={handleApproveSchedule}
                      disabled={approveScheduleMutation.isPending}
                      data-testid="button-approve-schedule"
                    >
                      Approve Schedule
                    </Button>
                  )}
                  {schedule.status === 'approved' && (
                    <Button
                      onClick={handlePublishSchedule}
                      disabled={publishScheduleMutation.isPending}
                      data-testid="button-publish-schedule"
                    >
                      Publish to Employees
                    </Button>
                  )}
                  <Button variant="outline" data-testid="button-edit-schedule">
                    Manual Adjustments
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No schedule generated for this week yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="constraints" className="space-y-4">
            {/* Scheduling Constraints */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="max-hours">Max Hours Per Week</Label>
                <Input
                  id="max-hours"
                  type="number"
                  value={constraints.maxHoursPerWeek}
                  onChange={(e) => setConstraints(prev => ({
                    ...prev,
                    maxHoursPerWeek: parseInt(e.target.value)
                  }))}
                  data-testid="input-max-hours"
                />
              </div>

              <div>
                <Label htmlFor="max-consecutive">Max Consecutive Days</Label>
                <Input
                  id="max-consecutive"
                  type="number"
                  value={constraints.maxConsecutiveDays}
                  onChange={(e) => setConstraints(prev => ({
                    ...prev,
                    maxConsecutiveDays: parseInt(e.target.value)
                  }))}
                  data-testid="input-max-consecutive"
                />
              </div>

              <div>
                <Label htmlFor="min-rest">Minimum Rest Hours Between Shifts</Label>
                <Input
                  id="min-rest"
                  type="number"
                  value={constraints.minRestHours}
                  onChange={(e) => setConstraints(prev => ({
                    ...prev,
                    minRestHours: parseInt(e.target.value)
                  }))}
                  data-testid="input-min-rest"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Prefer Consecutive Shifts</Label>
                  <p className="text-sm text-muted-foreground">
                    Group shifts together when possible
                  </p>
                </div>
                <Switch
                  checked={constraints.preferConsecutiveShifts}
                  onCheckedChange={(checked) => setConstraints(prev => ({
                    ...prev,
                    preferConsecutiveShifts: checked
                  }))}
                  data-testid="switch-consecutive"
                />
              </div>

              <div>
                <Label>Fairness Weight</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  How much to prioritize equal distribution of hours
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-sm">Coverage</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={constraints.fairnessWeight * 100}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      fairnessWeight: parseInt(e.target.value) / 100
                    }))}
                    className="flex-1"
                    data-testid="slider-fairness"
                  />
                  <span className="text-sm">Fairness</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast({
                    title: "Constraints Updated",
                    description: "Scheduling constraints have been saved."
                  });
                }}
                data-testid="button-save-constraints"
              >
                Save Constraints
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}