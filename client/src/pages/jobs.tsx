import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobList from "@/components/jobs/job-list";
import JobTable from "@/components/jobs/job-table";
import NewJobModal from "@/components/jobs/new-job-modal";
import { DocumentManagementTab } from "@/components/jobs/DocumentManagementTab";
import { ViewSwitcher } from "@/components/ui/view-switcher";
import { MetricCard } from "@/components/ui/metric-card";
import { Plus, Zap, Download, Search, Filter, ListOrdered, Briefcase, TrendingUp, Clock, CheckCircle, FileText, FolderOpen } from "lucide-react";

export default function Jobs() {
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'list'>('table');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Calculate metrics
  const activeJobs = jobs.filter((job: any) => job.status === 'active' || job.status === 'in_progress').length;
  const completedJobs = jobs.filter((job: any) => job.status === 'completed').length;
  const totalValue = jobs.reduce((sum: number, job: any) => sum + (parseFloat(job.estimatedValue) || 0), 0);
  const efficiency = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs & Production</h1>
          <p className="text-sm text-muted-foreground">Manage jobs, cutting operations, and documentation</p>
        </div>
      </div>

      {/* Tabs for Jobs and Document Management */}
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs & Cutting
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Document Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <MetricCard
              title="Active Jobs"
              value={activeJobs}
              subtitle={`${jobs.length > 0 ? Math.round((activeJobs / jobs.length) * 100) : 0}% of total`}
              icon={<Briefcase className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />}
            />
            <MetricCard
              title="Material Efficiency"
              value={`${efficiency}%`}
              subtitle="Efficiency rate"
              icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />}
            />
            <MetricCard
              title="Weekly Volume"
              value={`${jobs.filter((j: any) => j.status === 'active').length} jobs`}
              subtitle="Active this week"
              icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />}
            />
            <MetricCard
              title="Total Value"
              value={`$${totalValue.toLocaleString()}`}
              subtitle="This month"
              icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />}
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-0 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                className="bg-secondary hover:bg-secondary/90"
                onClick={() => setShowNewJobModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Job
              </Button>
              <Button size="sm" className="bg-accent hover:bg-accent/90">
                <Zap className="w-4 h-4 mr-1" />
                Optimize
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search jobs..."
                  className="pl-8 w-48 lg:w-64 h-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <ViewSwitcher 
                view={viewMode} 
                onViewChange={setViewMode} 
                storageKey="jobs-view-preference" 
              />
            </div>
          </div>

          {/* Jobs Display - based on view mode */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          ) : viewMode === 'table' ? (
            <JobTable jobs={jobs} searchQuery={searchQuery} statusFilter={statusFilter} />
          ) : (
            <JobList searchQuery={searchQuery} statusFilter={statusFilter} />
          )}
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManagementTab />
        </TabsContent>
      </Tabs>

      {/* New Job Modal */}
      <NewJobModal 
        open={showNewJobModal} 
        onOpenChange={setShowNewJobModal} 
      />
    </div>
  );
}
