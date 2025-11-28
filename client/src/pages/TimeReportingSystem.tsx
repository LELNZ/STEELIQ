import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Download, Calendar as CalendarIcon, Filter, Send,
  FileSpreadsheet, Clock, DollarSign, Users, CheckCircle,
  AlertCircle, Printer, Mail, Archive, TrendingUp, BarChart3,
  Shield, UserCheck, Award, FileBarChart, Loader2
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  parameters: {
    dateRange: boolean;
    departments: boolean;
    employees: boolean;
    jobs: boolean;
    format: string[];
    schedule?: boolean;
  };
  requiredRole?: string[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'payroll-summary',
    name: 'Payroll Summary Report',
    description: 'Comprehensive payroll summary with hours, earnings, deductions, and taxes',
    category: 'Payroll',
    icon: DollarSign,
    parameters: {
      dateRange: true,
      departments: true,
      employees: true,
      jobs: false,
      format: ['pdf', 'csv', 'excel'],
      schedule: true
    }
  },
  {
    id: 'timesheet-detail',
    name: 'Detailed Timesheet Report',
    description: 'Employee timesheets with clock-in/out times, breaks, and totals',
    category: 'Time',
    icon: Clock,
    parameters: {
      dateRange: true,
      departments: true,
      employees: true,
      jobs: true,
      format: ['pdf', 'csv', 'excel']
    }
  },
  {
    id: 'attendance-summary',
    name: 'Attendance Summary',
    description: 'Attendance metrics including late arrivals, absences, and early departures',
    category: 'Time',
    icon: UserCheck,
    parameters: {
      dateRange: true,
      departments: true,
      employees: false,
      jobs: false,
      format: ['pdf', 'csv']
    }
  },
  {
    id: 'overtime-report',
    name: 'Overtime Analysis',
    description: 'Detailed overtime hours and costs by employee and department',
    category: 'Compliance',
    icon: AlertCircle,
    parameters: {
      dateRange: true,
      departments: true,
      employees: true,
      jobs: false,
      format: ['pdf', 'csv', 'excel']
    }
  },
  {
    id: 'job-cost-allocation',
    name: 'Job Cost Allocation',
    description: 'Labor costs allocated to specific jobs and tasks',
    category: 'Financial',
    icon: BarChart3,
    parameters: {
      dateRange: true,
      departments: false,
      employees: false,
      jobs: true,
      format: ['pdf', 'csv', 'excel']
    }
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Report',
    description: 'Labor law compliance including breaks, overtime, and policy violations',
    category: 'Compliance',
    icon: Shield,
    parameters: {
      dateRange: true,
      departments: true,
      employees: false,
      jobs: false,
      format: ['pdf'],
      schedule: true
    },
    requiredRole: ['admin', 'hr', 'owner']
  },
  {
    id: 'productivity-report',
    name: 'Productivity Analysis',
    description: 'Employee and department productivity metrics with utilization rates',
    category: 'Performance',
    icon: TrendingUp,
    parameters: {
      dateRange: true,
      departments: true,
      employees: true,
      jobs: true,
      format: ['pdf', 'csv']
    }
  },
  {
    id: 'leave-balance',
    name: 'Leave Balance Report',
    description: 'Employee leave balances, accruals, and usage history',
    category: 'Time',
    icon: Award,
    parameters: {
      dateRange: false,
      departments: true,
      employees: true,
      jobs: false,
      format: ['pdf', 'csv']
    }
  },
  {
    id: 'payroll-register',
    name: 'Payroll Register',
    description: 'Official payroll register for tax and audit purposes',
    category: 'Payroll',
    icon: FileBarChart,
    parameters: {
      dateRange: true,
      departments: false,
      employees: false,
      jobs: false,
      format: ['pdf'],
      schedule: true
    },
    requiredRole: ['admin', 'accounting', 'owner']
  },
  {
    id: 'department-summary',
    name: 'Department Summary',
    description: 'Department-wise labor costs, hours, and efficiency metrics',
    category: 'Financial',
    icon: Users,
    parameters: {
      dateRange: true,
      departments: true,
      employees: false,
      jobs: false,
      format: ['pdf', 'csv', 'excel']
    }
  }
];

export default function TimeReportingSystem() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);

  // Fetch filter data
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['/api/team/members'],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs/active'],
  });

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ['/api/reports/scheduled'],
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ['/api/reports/recent'],
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (params: any) => {
      return apiRequest('/api/reports/generate', 'POST', params);
    },
    onSuccess: (data) => {
      if (data.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Report Generated",
          description: `${data.fileName} has been downloaded`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/reports/recent'] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Schedule report mutation
  const scheduleReportMutation = useMutation({
    mutationFn: async (params: any) => {
      return apiRequest('/api/reports/schedule', 'POST', params);
    },
    onSuccess: () => {
      toast({
        title: "Report Scheduled",
        description: "Report has been scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/scheduled'] });
    },
    onError: () => {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule report",
        variant: "destructive"
      });
    }
  });

  // Delete scheduled report
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/reports/scheduled/${id}`, 'DELETE', {});
    },
    onSuccess: () => {
      toast({
        title: "Schedule Removed",
        description: "Report schedule has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/scheduled'] });
    }
  });

  const handleGenerateReport = () => {
    if (!selectedReport) {
      toast({
        title: "Select a Report",
        description: "Please select a report template to generate",
        variant: "destructive"
      });
      return;
    }

    const template = reportTemplates.find(r => r.id === selectedReport);
    if (!template) return;

    const params = {
      reportId: selectedReport,
      format: exportFormat,
      dateRange: template.parameters.dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      } : null,
      departments: template.parameters.departments ? selectedDepartments : [],
      employees: template.parameters.employees ? selectedEmployees : [],
      jobs: template.parameters.jobs ? selectedJobs : [],
    };

    if (scheduleEnabled && template.parameters.schedule) {
      scheduleReportMutation.mutate({
        ...params,
        frequency: scheduleFrequency,
        recipients: emailRecipients
      });
    } else {
      generateReportMutation.mutate(params);
    }
  };

  const selectedTemplate = reportTemplates.find(r => r.id === selectedReport);

  // Quick date range presets
  const setQuickDateRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case 'thisWeek':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'lastWeek':
        const lastWeek = subDays(now, 7);
        setDateRange({ from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Time & Payroll Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate, export, and schedule comprehensive reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Mail className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-[500px]">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Templates */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Report Template</CardTitle>
                  <CardDescription>Choose from predefined report templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportTemplates.map((template) => {
                      const Icon = template.icon;
                      return (
                        <div
                          key={template.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedReport === template.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedReport(template.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="w-5 h-5 text-primary mt-1" />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                                {template.requiredRole && (
                                  <Badge variant="outline" className="text-xs">
                                    Restricted
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Report Parameters */}
              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Report Parameters</CardTitle>
                    <CardDescription>Configure report filters and options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date Range */}
                    {selectedTemplate.parameters.dateRange && (
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('today')}
                          >
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('yesterday')}
                          >
                            Yesterday
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('thisWeek')}
                          >
                            This Week
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('lastWeek')}
                          >
                            Last Week
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('thisMonth')}
                          >
                            This Month
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickDateRange('lastMonth')}
                          >
                            Last Month
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? format(dateRange.from, 'PPP') : 'From date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={dateRange.from}
                                onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                              />
                            </PopoverContent>
                          </Popover>
                          <span>to</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, 'PPP') : 'To date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={dateRange.to}
                                onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}

                    {/* Departments */}
                    {selectedTemplate.parameters.departments && (
                      <div className="space-y-2">
                        <Label>Departments</Label>
                        <Select
                          value={selectedDepartments[0] || ''}
                          onValueChange={(value) => setSelectedDepartments(value ? [value] : [])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All departments</SelectItem>
                            {departments.map((dept: any) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Employees */}
                    {selectedTemplate.parameters.employees && (
                      <div className="space-y-2">
                        <Label>Employees</Label>
                        <Select
                          value={selectedEmployees[0] || ''}
                          onValueChange={(value) => setSelectedEmployees(value ? [value] : [])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All employees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All employees</SelectItem>
                            {employees.map((emp: any) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Jobs */}
                    {selectedTemplate.parameters.jobs && (
                      <div className="space-y-2">
                        <Label>Jobs</Label>
                        <Select
                          value={selectedJobs[0] || ''}
                          onValueChange={(value) => setSelectedJobs(value ? [value] : [])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All jobs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All jobs</SelectItem>
                            {jobs.map((job: any) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.jobNumber} - {job.clientName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Export Format */}
                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <div className="flex items-center gap-2">
                        {selectedTemplate.parameters.format.map((format) => (
                          <Button
                            key={format}
                            variant={exportFormat === format ? "default" : "outline"}
                            size="sm"
                            onClick={() => setExportFormat(format)}
                          >
                            {format === 'pdf' && <FileText className="w-4 h-4 mr-1" />}
                            {format === 'csv' && <FileSpreadsheet className="w-4 h-4 mr-1" />}
                            {format === 'excel' && <FileBarChart className="w-4 h-4 mr-1" />}
                            {format.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Schedule Options */}
                    {selectedTemplate.parameters.schedule && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={scheduleEnabled}
                            onCheckedChange={(checked) => setScheduleEnabled(checked as boolean)}
                          />
                          <Label>Schedule this report</Label>
                        </div>
                        {scheduleEnabled && (
                          <div className="ml-6 space-y-2">
                            <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedReport ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Selected Report:</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTemplate?.name}
                        </p>
                      </div>
                      {dateRange.from && dateRange.to && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Date Range:</p>
                          <p className="text-sm text-muted-foreground">
                            {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Format:</p>
                        <p className="text-sm text-muted-foreground">
                          {exportFormat.toUpperCase()}
                        </p>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={handleGenerateReport}
                        disabled={generateReportMutation.isPending || scheduleReportMutation.isPending}
                      >
                        {generateReportMutation.isPending || scheduleReportMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : scheduleEnabled ? (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Schedule Report
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Generate & Download
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Report
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Preview
                      </Button>
                    </>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please select a report template to continue
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Today's Timesheets
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Current Payroll Period
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Overtime This Week
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Manage your automated report schedules</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledReports.length > 0 ? (
                <div className="space-y-3">
                  {scheduledReports.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{schedule.reportName}</p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.frequency} • Next run: {format(new Date(schedule.nextRun), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{schedule.format}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No scheduled reports. Generate a report and enable scheduling to automate.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Previously generated reports available for download</CardDescription>
            </CardHeader>
            <CardContent>
              {recentReports.length > 0 ? (
                <div className="space-y-3">
                  {recentReports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Generated {format(new Date(report.createdAt), 'PPP')} by {report.createdBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{report.format}</Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No reports generated yet. Create your first report above.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}