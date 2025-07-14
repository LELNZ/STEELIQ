import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Timer, Clock, Calendar, MapPin, Users, DollarSign, 
  Smartphone, Wifi, WifiOff, Camera, Upload, Download,
  Play, Pause, CheckCircle, AlertCircle, TrendingUp, CreditCard
} from "lucide-react";
import { format } from "date-fns";
import type { LaborRateCard, PayrollIntegration } from "@shared/schema";

export default function TimePayroll() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showPayrollSetup, setShowPayrollSetup] = useState(false);
  const [showAddRateCardDialog, setShowAddRateCardDialog] = useState(false);
  const [skillLevel, setSkillLevel] = useState("");
  const [employeeType, setEmployeeType] = useState("");

  // Fetch labor rate cards
  const { data: laborRateCards = [] } = useQuery({
    queryKey: ["/api/labor-rates/cards"],
  });

  // Fetch payroll integration status
  const { data: payrollIntegration } = useQuery({
    queryKey: ["/api/payroll/integration"],
  });

  // Fetch time clock summary
  const { data: timeClockSummary = {} } = useQuery({
    queryKey: ["/api/time/summary", format(selectedWeek, 'yyyy-MM-dd')],
  });

  // Save labor rate mutation
  const saveLaborRateMutation = useMutation({
    mutationFn: async (rateCard: Partial<LaborRateCard>) => {
      return apiRequest("/api/labor-rates/cards", {
        method: rateCard.id ? "PATCH" : "POST",
        body: JSON.stringify(rateCard),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labor-rates/cards"] });
      toast({
        title: "Success",
        description: "Labor rate saved successfully.",
      });
    },
  });

  // Sync payroll mutation
  const syncPayrollMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/payroll/sync", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/integration"] });
      toast({
        title: "Payroll Sync Complete",
        description: "Time data has been synchronized with your payroll system.",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Time & Payroll Management</h1>
          <p className="text-muted-foreground">Integrated time tracking, labor rates, and payroll processing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Timesheets
          </Button>
          <Button 
            onClick={() => syncPayrollMutation.mutate()}
            disabled={!payrollIntegration?.isActive}
          >
            <Upload className="w-4 h-4 mr-2" />
            Sync Payroll
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rates">Labor Rates</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Integration</TabsTrigger>
          <TabsTrigger value="mobile">Mobile App</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeClockSummary.activeWorkers || 0}</div>
                <p className="text-xs text-muted-foreground">Currently clocked in</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Week Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeClockSummary.weekHours || "0"}h</div>
                <p className="text-xs text-muted-foreground">Total this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${timeClockSummary.weekLaborCost || "0"}</div>
                <p className="text-xs text-muted-foreground">Week to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {payrollIntegration?.isActive ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Disconnected</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payrollIntegration?.provider || "No payroll system"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Real-Time Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeClockSummary.recentActivity?.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'clock_in' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {activity.type === 'clock_in' ? (
                          <Play className="w-4 h-4 text-green-600" />
                        ) : (
                          <Pause className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{activity.employeeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type === 'clock_in' ? 'Clocked In' : 'Clocked Out'} • {activity.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{format(new Date(activity.timestamp), 'HH:mm')}</p>
                      <p className="text-xs text-muted-foreground">{activity.method}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Labor Rate Cards</span>
                <Button size="sm" onClick={() => setShowAddRateCardDialog(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Add Rate Card
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {laborRateCards.map((rate: LaborRateCard) => (
                  <div key={rate.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{rate.name}</h4>
                        <p className="text-sm text-muted-foreground">{rate.code} • {rate.skillLevel}</p>
                      </div>
                      <Badge variant={rate.employeeType === 'employee' ? 'default' : 'secondary'}>
                        {rate.employeeType}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Rate</p>
                        <p className="font-medium">${rate.baseRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cost Rate</p>
                        <p className="font-medium">${rate.costRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Overtime</p>
                        <p className="font-medium">{rate.overtimeMultiplier}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Weekend</p>
                        <p className="font-medium">{rate.weekendMultiplier}x</p>
                      </div>
                    </div>

                    {rate.certificationRequirements && rate.certificationRequirements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Required Certifications</p>
                        <div className="flex flex-wrap gap-1">
                          {(rate.certificationRequirements as string[]).map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll System Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollIntegration?.isActive ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Connected to {payrollIntegration.provider}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last sync: {payrollIntegration.lastSyncAt ? format(new Date(payrollIntegration.lastSyncAt), 'PPp') : 'Never'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Sync Frequency</Label>
                      <Select defaultValue={payrollIntegration.syncFrequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Mapping Status</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Employee IDs</span>
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mapped
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Cost Centers</span>
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mapped
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pay Codes</span>
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Partial
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payroll System Connected</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your payroll system to automatically sync time data
                  </p>
                  <Button onClick={() => setShowPayrollSetup(true)}>
                    Configure Payroll Integration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {showPayrollSetup && (
            <Card>
              <CardHeader>
                <CardTitle>Setup Payroll Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Payroll Provider</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xero">Xero Payroll</SelectItem>
                        <SelectItem value="adp">ADP</SelectItem>
                        <SelectItem value="workday">Workday</SelectItem>
                        <SelectItem value="myob">MYOB</SelectItem>
                        <SelectItem value="employmenthero">Employment Hero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>API Endpoint</Label>
                    <Input placeholder="https://api.payrollprovider.com/v2" />
                  </div>

                  <div>
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Enter your API key" />
                  </div>

                  <div className="flex gap-2">
                    <Button>Test Connection</Button>
                    <Button variant="outline" onClick={() => setShowPayrollSetup(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Mobile Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">GPS Clock In/Out</p>
                        <p className="text-sm text-muted-foreground">
                          Automatic location verification with geofencing
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Camera className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Photo Verification</p>
                        <p className="text-sm text-muted-foreground">
                          Site photos for time entry validation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <WifiOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Offline Mode</p>
                        <p className="text-sm text-muted-foreground">
                          Works without internet, syncs when connected
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Timer className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Break Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          Automatic break time deduction
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Setup Status</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Progressive Web App</span>
                        <span className="text-sm font-medium">Ready</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Offline Storage</span>
                        <span className="text-sm font-medium">Configured</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Push Notifications</span>
                        <span className="text-sm font-medium">Pending</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Biometric Auth</span>
                        <span className="text-sm font-medium">Not Setup</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button className="w-full">
                      Configure Mobile Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Labor Rate Card Dialog */}
      <Dialog open={showAddRateCardDialog} onOpenChange={(open) => {
        setShowAddRateCardDialog(open);
        if (!open) {
          // Reset form when dialog closes
          setSkillLevel("");
          setEmployeeType("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Labor Rate Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            
            // Get select values directly from form elements
            const skillLevelSelect = form.querySelector('[name="skillLevel"]') as HTMLSelectElement;
            const employeeTypeSelect = form.querySelector('[name="employeeType"]') as HTMLSelectElement;
            
            const rateCard = {
              name: formData.get('name') as string,
              code: formData.get('code') as string,
              description: formData.get('description') as string,
              skillLevel: skillLevel,
              employeeType: employeeType,
              baseRate: parseFloat(formData.get('baseRate') as string),
              costRate: parseFloat(formData.get('costRate') as string),
              overtimeMultiplier: parseFloat(formData.get('overtimeMultiplier') as string) || 1.5,
              weekendMultiplier: parseFloat(formData.get('weekendMultiplier') as string) || 1.5,
              holidayMultiplier: parseFloat(formData.get('holidayMultiplier') as string) || 2.0,
              nightShiftMultiplier: parseFloat(formData.get('nightShiftMultiplier') as string) || 1.2,
              effectiveFrom: new Date().toISOString()
            };

            // Validation
            if (!skillLevel || !employeeType) {
              toast({
                title: "Validation Error",
                description: "Please select both skill level and employee type.",
                variant: "destructive"
              });
              return;
            }

            console.log('Submitting rate card:', rateCard);

            saveLaborRateMutation.mutate(rateCard, {
              onSuccess: () => {
                setShowAddRateCardDialog(false);
                setSkillLevel("");
                setEmployeeType("");
                queryClient.invalidateQueries({ queryKey: ['/api/labor-rates/cards'] });
              },
              onError: (error) => {
                console.error('Error creating rate card:', error);
                toast({
                  title: "Error",
                  description: "Failed to create rate card. Please try again.",
                  variant: "destructive"
                });
              }
            });
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Rate Card Name</Label>
                <Input id="name" name="name" placeholder="e.g., Senior Welder" required />
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="e.g., SW01" required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe this rate card..." />
              </div>
              <div>
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select name="skillLevel" value={skillLevel} onValueChange={setSkillLevel} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                    <SelectItem value="tradesman">Tradesman</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="employeeType">Employee Type</Label>
                <Select name="employeeType" value={employeeType} onValueChange={setEmployeeType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="baseRate">Base Rate ($/hr)</Label>
                <Input id="baseRate" name="baseRate" type="number" step="0.01" placeholder="120.00" required />
              </div>
              <div>
                <Label htmlFor="costRate">Cost Rate ($/hr)</Label>
                <Input id="costRate" name="costRate" type="number" step="0.01" placeholder="85.00" required />
              </div>
              <div>
                <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
                <Input id="overtimeMultiplier" name="overtimeMultiplier" type="number" step="0.1" placeholder="1.5" defaultValue="1.5" />
              </div>
              <div>
                <Label htmlFor="weekendMultiplier">Weekend Multiplier</Label>
                <Input id="weekendMultiplier" name="weekendMultiplier" type="number" step="0.1" placeholder="1.5" defaultValue="1.5" />
              </div>
              <div>
                <Label htmlFor="holidayMultiplier">Holiday Multiplier</Label>
                <Input id="holidayMultiplier" name="holidayMultiplier" type="number" step="0.1" placeholder="2.0" defaultValue="2.0" />
              </div>
              <div>
                <Label htmlFor="nightShiftMultiplier">Night Shift Multiplier</Label>
                <Input id="nightShiftMultiplier" name="nightShiftMultiplier" type="number" step="0.1" placeholder="1.2" defaultValue="1.2" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddRateCardDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveLaborRateMutation.isPending}>
                {saveLaborRateMutation.isPending ? "Creating..." : "Create Rate Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}