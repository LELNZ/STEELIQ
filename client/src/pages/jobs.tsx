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
import JobList from "@/components/jobs/job-list";
import JobTable from "@/components/jobs/job-table";
import NewJobModal from "@/components/jobs/new-job-modal";
import { ViewSwitcher } from "@/components/ui/view-switcher";
import { MetricCard } from "@/components/ui/metric-card";
import { Plus, Zap, Download, Search, Filter, ListOrdered, Briefcase, TrendingUp, Clock, CheckCircle } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs & Cutting</h1>
          <p className="text-muted-foreground">Manage cutting jobs and optimize material usage</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Jobs"
          value={activeJobs}
          subtitle={`${jobs.length > 0 ? Math.round((activeJobs / jobs.length) * 100) : 0}% of total`}
          icon={<Briefcase />}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Material Efficiency"
          value={`${efficiency}%`}
          subtitle="Target: 95%"
          icon={<TrendingUp />}
          trend={{ value: 5, isPositive: true }}
        />
        <MetricCard
          title="Weekly Volume"
          value={`${jobs.filter((j: any) => j.status === 'active').length} jobs`}
          subtitle="of 51 capacity"
          icon={<Clock />}
        />
        <MetricCard
          title="Total Value"
          value={`$${totalValue.toLocaleString()}`}
          subtitle="This month"
          icon={<CheckCircle />}
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            className="bg-secondary hover:bg-secondary/90"
            onClick={() => setShowNewJobModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
          <Button className="bg-accent hover:bg-accent/90">
            <Zap className="w-4 h-4 mr-2" />
            Optimize All
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search jobs, materials..."
              className="pl-10 w-80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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

      {/* New Job Modal */}
      <NewJobModal 
        open={showNewJobModal} 
        onOpenChange={setShowNewJobModal} 
      />
    </div>
  );
}
