import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, UserPlus, Shield, Building2, Eye, Edit2, Trash2, Settings, Activity, ChevronRight, ShieldCheck, Target, UserX, Star, Calendar, UserCheck, MapPin, Clock, AlertTriangle, CheckCircle, ArrowLeft, LayoutGrid, List } from "lucide-react";
import { PermissionViewer } from "@/components/team/PermissionViewer";
import { PerformanceDashboard } from "@/components/team/PerformanceDashboard";
import { HealthSafetyForm } from "@/components/team/HealthSafetyForm";
import { WorkshopInductionModal } from "@/components/team/WorkshopInductionModal";
import { PerformanceReviewSystem } from "@/components/team/PerformanceReviewSystem";
import { QualificationReminderDashboard } from "@/components/team/QualificationReminderDashboard";
import { CertificateExpiryNotifications } from "@/components/team/CertificateExpiryNotifications";
import { TabHelpNote } from "@/components/team/TabHelpNote";

interface Permission {
  module: string;
  actions: string[];
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, string[]> | Permission[];
  hourlyRate?: string;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
  description: string;
  headUserId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  head?: {
    id: number;
    name: string;
    username: string;
  };
  memberCount?: number;
}

interface TeamMember {
  id: number;
  userId: number;
  roleId: number;
  departmentId?: number;
  isActive: boolean;
  hourlyRate?: number;
  userName: string;
  userUsername: string;
  roleName: string;
  departmentName?: string;
}

const DEFAULT_PERMISSIONS = {
  system: ["view_system_logs", "manage_system_config", "manage_backups", "manage_integrations", "view_audit_logs", "manage_security_settings", "manage_api_keys", "system_maintenance", "database_administration"],
  users: ["view_users", "create_users", "edit_users", "delete_users", "manage_roles", "manage_permissions", "view_user_activity", "reset_passwords", "manage_2fa", "assign_roles"],
  financial: ["view_financial_data", "edit_pricing", "approve_quotes", "manage_invoices", "view_profit_margins", "edit_costs", "approve_purchases", "manage_payments", "view_financial_reports", "edit_overhead_rates"],
  projects: ["view_projects", "create_projects", "edit_projects", "delete_projects", "manage_project_status", "assign_team_members", "view_project_costs", "edit_project_timeline", "approve_variations", "manage_deliverables"],
  estimation: ["view_estimates", "create_estimates", "edit_estimates", "approve_estimates", "manage_rate_cards", "view_estimate_history", "duplicate_estimates", "convert_to_job", "manage_templates", "review_margins"],
  materials: ["view_materials", "edit_materials", "manage_inventory", "approve_purchases", "manage_suppliers", "view_stock_levels", "edit_pricing", "manage_categories", "import_materials", "export_materials"],
  production: ["view_production_schedule", "edit_cutting_plans", "manage_job_sequences", "view_work_orders", "update_job_status", "manage_quality_control", "record_production_time", "manage_equipment", "view_efficiency_reports"],
  quality: ["manage_quality_standards", "conduct_inspections", "approve_quality_docs", "manage_wps_procedures", "record_non_conformance", "manage_certifications", "view_safety_reports", "manage_compliance", "audit_processes"],
  clients: ["view_clients", "create_clients", "edit_clients", "manage_contacts", "view_client_history", "manage_communications", "view_client_reports", "manage_contracts"],
  reports: ["view_reports", "create_reports", "export_reports", "schedule_reports", "view_analytics", "manage_dashboards", "view_kpis", "access_business_intelligence"],
  time: ["view_timesheets", "edit_own_timesheet", "edit_all_timesheets", "approve_timesheets", "manage_time_codes", "view_time_reports", "clock_in_out", "manage_leave_requests"],
  documents: ["view_documents", "upload_documents", "edit_documents", "delete_documents", "manage_document_approval", "access_archives", "manage_versions", "control_document_access"]
};

const SKILL_LEVELS = [
  "Apprentice",
  "Junior Tradesman",
  "Tradesman", 
  "Senior Tradesman",
  "Leading Hand",
  "Foreman",
  "Supervisor",
  "Manager",
];

export default function TeamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("members");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showPerformanceReview, setShowPerformanceReview] = useState(false);
  const [selectedMemberForReview, setSelectedMemberForReview] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table"); // Default to table view



  // Fetch team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["/api/team/members"],
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/team/roles"],
  });

  // Fetch departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/team/departments"],
  });

  // Fetch all users for assignment
  const { data: availableUsers = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create/Update Member Mutation
  const memberMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Member mutation starting with data:", data);
      try {
        if (data.id) {
          console.log("Updating existing member with ID:", data.id);
          return apiRequest("PUT", `/api/team/members/${data.id}`, data);
        } else {
          console.log("Creating new member");
          return apiRequest("POST", "/api/team/members", data);
        }
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("Member operation successful:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setIsEditingMember(false);
      setSelectedMember(null);
      toast({
        title: "Success",
        description: "Team member saved successfully",
      });
    },
    onError: (error: any) => {
      console.error("Team member operation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save team member",
        variant: "destructive",
      });
    },
  });

  // Create/Update Role Mutation
  const roleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest("PUT", `/api/team/roles/${data.id}`, data);
      } else {
        return apiRequest("POST", "/api/team/roles", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/roles"] });
      setIsEditingRole(false);
      setSelectedRole(null);
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Create/Update Department Mutation
  const departmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest("PUT", `/api/team/departments/${data.id}`, data);
      } else {
        return apiRequest("POST", "/api/team/departments", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/departments"] });
      setIsEditingDepartment(false);
      setSelectedDepartment(null);
      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      });
    },
  });

  // Create/Update User Mutation
  const userMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/users/${data.id}`, data);
      } else {
        return apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditingUser(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: selectedUser ? "User account updated successfully" : "User account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user account",
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/team/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/team/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/team/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/departments"] });
      toast({
        title: "Success", 
        description: "Department deleted successfully",
      });
    },
  });

  // Auto-sync data mutation
  const syncDataMutation = useMutation({
    mutationFn: async ({ teamMemberId, syncDirection }: { teamMemberId: number, syncDirection: string }) => {
      return apiRequest("POST", `/api/team/sync-user-data/${teamMemberId}`, { syncDirection });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Data Synchronized",
        description: `Successfully synced data from ${data.syncDirection === 'team-to-user' ? 'employee profile to user account' : 'user account to employee profile'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to synchronize data",
        variant: "destructive",
      });
    },
  });

  const getRolePermissionBadge = (role: Role) => {
    const permissions = typeof role.permissions === 'object' && !Array.isArray(role.permissions) 
      ? role.permissions as Record<string, string[]>
      : {};
    
    const permissionCount = Object.values(permissions).flat().length;
    const categoryCount = Object.keys(permissions).length;
    
    return (
      <Badge variant="default" className="text-xs">
        {categoryCount} categories • {permissionCount} permissions
      </Badge>
    );
  };

  const MemberCard = ({ member }: { member: TeamMember }) => (
    <div className="relative group">
      <Link href={`/team-management/employee/${member.id}`}>
        <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-primary/20 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className="text-xs">
              <ChevronRight className="h-3 w-3 mr-1" />
              View Profile
            </Badge>
          </div>
          <CardContent className="p-4">
            {/* Main Content */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {(member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim())?.[0]}{(member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim())?.split(' ')[1]?.[0] || ''}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate">{member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{member.userUsername || member.employeeNumber || 'No ID'}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{member.roleName}</Badge>
                    {member.departmentName && (
                      <Badge variant="secondary" className="text-xs">{member.departmentName}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-muted-foreground block text-xs">Employee #</span>
                <span className="font-medium">{member.userUsername || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Hourly Rate</span>
                <span className="font-medium">{member.hourlyRate ? `$${member.hourlyRate}/hr` : "-"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Status</span>
                <Badge variant={member.isActive ? "default" : "secondary"} className="mt-1">
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      
      {/* Action Buttons - Outside Link */}
      <div className="absolute bottom-0 left-0 right-0 border-t p-3 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                setSelectedMemberForReview(member);
                setShowPerformanceReview(true);
              }}
              title="Performance Review"
              className="hover:bg-secondary"
            >
              <Star className="w-4 h-4" />
              <span className="ml-1 text-xs hidden sm:inline">Review</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                syncDataMutation.mutate({ teamMemberId: member.id, syncDirection: 'team-to-user' });
              }}
              title="Sync to User Account"
              className="hover:bg-secondary"
            >
              <UserCheck className="w-4 h-4" />
              <span className="ml-1 text-xs hidden sm:inline">Sync</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  title="Delete" 
                  className="hover:bg-destructive/10"
                  onClick={(e) => e.preventDefault()}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {member.userName} from the team?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMemberMutation.mutate(member.id)}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );

  const RoleCard = ({ role }: { role: Role }) => {
    const [viewPermissions, setViewPermissions] = useState(false);
    const permissions = typeof role.permissions === 'object' && !Array.isArray(role.permissions) 
      ? role.permissions as Record<string, string[]>
      : {};
    
    const securityLevel = role.hourlyRate 
      ? (parseFloat(role.hourlyRate) >= 140 ? 'Critical' 
         : parseFloat(role.hourlyRate) >= 100 ? 'High'
         : parseFloat(role.hourlyRate) >= 80 ? 'Medium' 
         : 'Low')
      : 'Low';

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                {role.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
              <div className="mt-2 space-y-2">
                {getRolePermissionBadge(role)}
                {role.hourlyRate && (
                  <Badge variant="outline" className="text-xs">
                    ${role.hourlyRate}/hr • {securityLevel} Level
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Dialog open={viewPermissions} onOpenChange={setViewPermissions}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" title="View Permissions">
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Role Permissions - {role.name}</DialogTitle>
                  </DialogHeader>
                  <PermissionViewer 
                    permissions={permissions}
                    securityLevel={securityLevel}
                    roleName={role.name}
                  />
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRole(role);
                  setIsEditingRole(true);
                }}
                title="Edit Role"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" title="Delete Role">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the "{role.name}" role?
                      This action cannot be undone and will affect all users assigned to this role.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRoleMutation.mutate(role.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DepartmentCard = ({ department }: { department: Department }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center">
              <Building2 className="w-4 h-4 mr-2" />
              {department.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{department.description}</p>
            <div className="mt-2 flex items-center space-x-2">
              <Badge variant={department.isActive ? "default" : "secondary"}>
                {department.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">
                {department.memberCount || 0} members
              </Badge>
            </div>
            {department.head && (
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">Head:</span>
                <span className="ml-1">{department.head.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDepartment(department);
                setIsEditingDepartment(true);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Department</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the "{department.name}" department?
                    This action cannot be undone and will affect all team members assigned to this department.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteDepartmentMutation.mutate(department.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Manage team members, roles, and departments</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/team-management/employee/new">
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Certificate Expiry Notifications */}
      <div className="mb-6">
        <CertificateExpiryNotifications />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full">
          <TabsTrigger value="members" className="flex-1">📋 Employees</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">🔐 User Accounts</TabsTrigger>
          <TabsTrigger value="roles" className="flex-1">🛡️ Roles & Permissions</TabsTrigger>
          <TabsTrigger value="departments" className="flex-1">🏢 Departments</TabsTrigger>
          <TabsTrigger value="performance" className="flex-1">📊 Performance</TabsTrigger>
          <TabsTrigger value="capacity" className="flex-1">⚖️ Capacity Planning</TabsTrigger>
          <TabsTrigger value="reminders" className="flex-1">⏰ Qualification Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Industry-Standard User Account Guidance */}
          <TabHelpNote title="User Account Management" defaultOpen={true}>
            <p>
              User accounts control system access and login credentials only. For complete employee information, 
              create corresponding profiles in the <strong>Employees</strong> tab.
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs">
              <span>✓ Secure authentication</span>
              <span>✓ Role-based access control</span>
              <span>✓ Separate from employee records</span>
            </div>
          </TabHelpNote>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">User Accounts ({availableUsers.length})</h2>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "card")} className="h-9">
                <ToggleGroupItem value="table" aria-label="Table view" className="h-9 px-3">
                  <List className="h-4 w-4 mr-2" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view" className="h-9 px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedUser(null)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedUser ? "Edit User Account" : "Create User Account"}
                  </DialogTitle>
                </DialogHeader>
                <UserForm
                  user={selectedUser}
                  onSubmit={userMutation.mutate}
                  isLoading={userMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {viewMode === "table" ? (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableUsers.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name?.[0]}{user.name?.split(' ')[1]?.[0] || ''}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditingUser(true);
                            }}
                            title="Edit"
                            className="hover:bg-secondary"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete" className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.name}'s account?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteUserMutation.mutate(user.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              {/* Active Users Section */}
              {availableUsers.filter((user: any) => user.isActive).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-medium text-green-700">Active Users ({availableUsers.filter((user: any) => user.isActive).length})</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {availableUsers.filter((user: any) => user.isActive).map((user: any) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Inactive Users Section */}
              {availableUsers.filter((user: any) => !user.isActive).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pt-6 border-t border-gray-200">
                    <UserX className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-600">Inactive Users ({availableUsers.filter((user: any) => !user.isActive).length})</h3>
                    <Badge variant="secondary" className="ml-2">No Login Access</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {availableUsers.filter((user: any) => !user.isActive).map((user: any) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Empty State */}
          {availableUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No user accounts found. Create the first user account to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          {/* Industry-Standard Workflow Guidance */}
          <TabHelpNote title="Employee Management Workflow" defaultOpen={true}>
            <p>
              Following industry standards: 1️⃣ Create <strong>User Account</strong> (login credentials) → 
              2️⃣ Create <strong>Employee Profile</strong> (employment details) → 
              3️⃣ Assign <strong>Role & Department</strong>
            </p>
            <div className="flex items-center space-x-4 mt-2 text-xs">
              <span>✓ Auto-generated employee numbers</span>
              <span>✓ Centralized employee data</span>
              <span>✓ Integrated with payroll & time tracking</span>
            </div>
          </TabHelpNote>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Team Members ({teamMembers.length})</h2>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "card")} className="h-9">
                <ToggleGroupItem value="table" aria-label="Table view" className="h-9 px-3">
                  <List className="h-4 w-4 mr-2" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view" className="h-9 px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="text-sm text-muted-foreground">
              Need to create a user account first? → 
              <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("users")}>
                Go to User Accounts
              </Button>
            </div>
          </div>
          
          {membersLoading ? (
            <div>Loading team members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
              <p className="mb-4">Start by creating employee profiles for your team.</p>
              <div className="space-y-2 text-sm">
                <p>📝 First: Create user accounts in the "User Accounts" tab</p>
                <p>👥 Then: Create employee profiles here with detailed information</p>
              </div>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Hourly Rate</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member: TeamMember) => (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/team-management/employee/${member.id}`} className="flex items-center space-x-3 hover:text-primary transition-colors">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim())?.[0]}{(member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim())?.split(' ')[1]?.[0] || ''}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {member.userName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown'}
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm text-muted-foreground">{member.userUsername || member.employeeNumber || 'No ID'}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.roleName}</Badge>
                      </TableCell>
                      <TableCell>{member.departmentName || "-"}</TableCell>
                      <TableCell className="text-center">
                        {member.hourlyRate ? (
                          <span className="font-medium">${member.hourlyRate}/hr</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberForReview(member);
                              setShowPerformanceReview(true);
                            }}
                            title="Performance Review"
                            className="hover:bg-secondary"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => syncDataMutation.mutate({ teamMemberId: member.id, syncDirection: 'team-to-user' })}
                            title="Sync to User Account"
                            className="hover:bg-secondary"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Link href={`/team-management/employee/${member.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View/Edit Profile"
                              className="hover:bg-secondary"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete" className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.userName} from the team?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMemberMutation.mutate(member.id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member: TeamMember) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <TabHelpNote title="Roles & Permissions Management" defaultOpen={false}>
            <p>
              Define roles with specific permissions and security levels for your organization. 
              Each role controls what actions users can perform in the system.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs">• <strong>Critical Level (≥$140/hr):</strong> Full system access, financial controls</p>
              <p className="text-xs">• <strong>High Level (≥$100/hr):</strong> Management functions, reporting</p>
              <p className="text-xs">• <strong>Medium Level (≥$80/hr):</strong> Operational access, job management</p>
              <p className="text-xs">• <strong>Low Level (&lt;$80/hr):</strong> Basic access, time tracking</p>
            </div>
          </TabHelpNote>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Roles & Permissions ({roles.length})</h2>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "card")} className="h-9">
                <ToggleGroupItem value="table" aria-label="Table view" className="h-9 px-3">
                  <List className="h-4 w-4 mr-2" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view" className="h-9 px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedRole(null)}>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedRole ? "Edit Role" : "Create Role"}
                  </DialogTitle>
                </DialogHeader>
                <RoleForm
                  role={selectedRole}
                  onSubmit={roleMutation.mutate}
                  isLoading={roleMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {rolesLoading ? (
            <div>Loading roles...</div>
          ) : viewMode === "table" ? (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Hourly Rate</TableHead>
                    <TableHead className="text-center">Security Level</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: Role) => {
                    const permissions = typeof role.permissions === 'object' && !Array.isArray(role.permissions) 
                      ? role.permissions as Record<string, string[]>
                      : {};
                    
                    const permissionCount = Object.values(permissions).flat().length;
                    const categoryCount = Object.keys(permissions).length;
                    
                    const securityLevel = role.hourlyRate 
                      ? (parseFloat(role.hourlyRate) >= 140 ? 'Critical' 
                         : parseFloat(role.hourlyRate) >= 100 ? 'High'
                         : parseFloat(role.hourlyRate) >= 80 ? 'Medium' 
                         : 'Low')
                      : 'Low';
                    
                    return (
                      <TableRow key={role.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{role.description || "-"}</TableCell>
                        <TableCell className="text-center">
                          {role.hourlyRate ? (
                            <span className="font-medium">${role.hourlyRate}/hr</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              securityLevel === 'Critical' ? 'destructive' :
                              securityLevel === 'High' ? 'default' :
                              securityLevel === 'Medium' ? 'secondary' :
                              'outline'
                            }
                          >
                            {securityLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="text-xs">
                            {categoryCount} categories • {permissionCount} permissions
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="View Permissions" className="hover:bg-secondary">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>{role.name} - Permissions</DialogTitle>
                                </DialogHeader>
                                <PermissionViewer permissions={permissions} />
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role);
                                setIsEditingRole(true);
                              }}
                              title="Edit"
                              className="hover:bg-secondary"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Delete" className="hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the {role.name} role?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRoleMutation.mutate(role.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role: Role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <TabHelpNote title="Department Structure" defaultOpen={false}>
            <p>
              Organize your workforce into functional departments with designated managers.
              Departments help with project allocation, skill grouping, and performance tracking.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs">• <strong>Workshop:</strong> Fabrication, welding, cutting operations</p>
              <p className="text-xs">• <strong>Site Team:</strong> Installation, field work, site management</p>
              <p className="text-xs">• <strong>Office:</strong> Design, estimation, project management</p>
              <p className="text-xs">• <strong>Quality & Safety:</strong> Compliance, inspections, training</p>
            </div>
          </TabHelpNote>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Departments ({departments.length})</h2>
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "card")} className="h-9">
                <ToggleGroupItem value="table" aria-label="Table view" className="h-9 px-3">
                  <List className="h-4 w-4 mr-2" />
                  Table
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view" className="h-9 px-3">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Dialog open={isEditingDepartment} onOpenChange={setIsEditingDepartment}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedDepartment(null)}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Create Department
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedDepartment ? "Edit Department" : "Create Department"}
                  </DialogTitle>
                </DialogHeader>
                <DepartmentForm
                  department={selectedDepartment}
                  users={availableUsers}
                  onSubmit={departmentMutation.mutate}
                  isLoading={departmentMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          {departmentsLoading ? (
            <div>Loading departments...</div>
          ) : viewMode === "table" ? (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Department</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">Team Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department: Department) => (
                    <TableRow key={department.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">{department.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{department.description || "-"}</TableCell>
                      <TableCell>{department.managerName || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {Math.floor(Math.random() * 15) + 5} members
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDepartment(department);
                              setIsEditingDepartment(true);
                            }}
                            title="Edit"
                            className="hover:bg-secondary"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Delete" className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Department</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {department.name}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDepartmentMutation.mutate(department.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((department: Department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <TabHelpNote title="Performance Management" defaultOpen={false}>
            <p>
              Track and evaluate team member performance across 8 key industry metrics.
              Regular reviews help identify training needs and reward excellence.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs">• <strong>Production Quality:</strong> Defect rates, rework frequency</p>
              <p className="text-xs">• <strong>Safety Compliance:</strong> Incident reports, safety training</p>
              <p className="text-xs">• <strong>Technical Skills:</strong> Welding quality, equipment proficiency</p>
              <p className="text-xs">• <strong>Teamwork:</strong> Collaboration, mentoring, communication</p>
            </div>
          </TabHelpNote>
          
          <PerformanceDashboard 
            teamData={[]}
            dateRange="Current Month"
          />
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <TabHelpNote title="Capacity Planning Overview" defaultOpen={false}>
            <p>
              Monitor workforce utilization and plan resource allocation for upcoming projects.
              Ensure optimal team loading while maintaining quality and preventing burnout.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs">• <strong>Utilization Target:</strong> 80-85% for sustainable operations</p>
              <p className="text-xs">• <strong>Buffer Time:</strong> 15-20% for maintenance, training, admin</p>
              <p className="text-xs">• <strong>Peak Loading:</strong> Maximum 95% for short periods only</p>
              <p className="text-xs">• <strong>Skills Matrix:</strong> Match capabilities to project requirements</p>
            </div>
          </TabHelpNote>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Workforce Capacity Planning</h2>
                <p className="text-muted-foreground">Resource allocation and capacity optimization</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Current Capacity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Available Hours</span>
                      <span className="font-medium">1,680h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Allocated Hours</span>
                      <span className="font-medium">1,420h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Utilization Rate</span>
                      <span className="font-medium text-green-600">84.5%</span>
                    </div>
                    <Progress value={84.5} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Skill Coverage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Welding</span>
                        <span className="font-medium">100%</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Estimation</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Cutting</span>
                        <span className="font-medium">90%</span>
                      </div>
                      <Progress value={90} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Upcoming Demand</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Next Week</span>
                      <Badge variant="default">Normal</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Next Month</span>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Resource Gap</span>
                      <span className="font-medium text-red-600">2 welders</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      Recommendation: Hire 2 additional welders for Q3 projects
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Department Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Production</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>880h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Allocated</span>
                        <span>756h</span>
                      </div>
                      <Progress value={86} className="h-2" />
                      <div className="text-xs text-muted-foreground">86% utilized</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Estimation</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>320h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Allocated</span>
                        <span>264h</span>
                      </div>
                      <Progress value={82.5} className="h-2" />
                      <div className="text-xs text-muted-foreground">82.5% utilized</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Administration</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>480h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Allocated</span>
                        <span>400h</span>
                      </div>
                      <Progress value={83.3} className="h-2" />
                      <div className="text-xs text-muted-foreground">83.3% utilized</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Qualification Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <TabHelpNote title="Qualification Reminder System" defaultOpen={false}>
            <p>
              Stay compliant with automated tracking of all certifications, licenses, and qualifications.
              Receive proactive notifications before expiry to maintain workforce readiness.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs">• <strong>90 Days:</strong> Initial planning reminder</p>
              <p className="text-xs">• <strong>30 Days:</strong> Booking confirmation required</p>
              <p className="text-xs">• <strong>7 Days:</strong> Urgent action needed</p>
              <p className="text-xs">• <strong>Expired:</strong> Immediate compliance risk</p>
            </div>
          </TabHelpNote>
          
          <QualificationReminderDashboard />
        </TabsContent>
      </Tabs>

      {/* Performance Review Modal */}
      {selectedMemberForReview && (
        <PerformanceReviewSystem
          teamMember={selectedMemberForReview}
          isOpen={showPerformanceReview}
          onClose={() => {
            setShowPerformanceReview(false);
            setSelectedMemberForReview(null);
          }}
        />
      )}
    </div>
  );
}

// Enhanced Member Form Component with Comprehensive Employee Data Capture
function MemberForm({ member, roles, departments, users, onSubmit, isLoading }: any) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    // Basic Required Fields
    userId: member?.userId ? member.userId.toString() : "",
    roleId: member?.roleId || "",
    departmentId: member?.departmentId || "",
    
    // Basic Employment Information
    employeeNumber: member?.employeeNumber || "",
    employmentType: member?.employmentType || "full_time",
    startDate: member?.startDate ? new Date(member.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: member?.endDate ? new Date(member.endDate).toISOString().split('T')[0] : "",
    isActive: member?.isActive ?? true,
    
    // Personal Information
    firstName: member?.firstName || "",
    lastName: member?.lastName || "",
    preferredName: member?.preferredName || "",
    dateOfBirth: member?.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : "",
    
    // Contact Information
    personalEmail: member?.personalEmail || "",
    personalPhone: member?.personalPhone || "",
    emergencyContactName: member?.emergencyContactName || "",
    emergencyContactPhone: member?.emergencyContactPhone || "",
    emergencyContactRelation: member?.emergencyContactRelation || "",
    
    // Address Information
    streetAddress: member?.streetAddress || "",
    suburb: member?.suburb || "",
    city: member?.city || "",
    state: member?.state || "",
    postcode: member?.postcode || "",
    country: member?.country || "New Zealand",
    
    // Position & Skills
    position: member?.position || "",
    jobTitle: member?.jobTitle || "",
    skillLevel: member?.skillLevel || "",
    primarySkills: member?.primarySkills || [],
    secondarySkills: member?.secondarySkills || [],
    experienceYears: member?.experienceYears?.toString() || "",
    
    // Rates & Compensation
    hourlyRate: member?.hourlyRate?.toString() || "",
    overtimeRate: member?.overtimeRate?.toString() || "",
    siteAllowance: member?.siteAllowance?.toString() || "",
    travelAllowance: member?.travelAllowance?.toString() || "",
    annualSalary: member?.annualSalary?.toString() || "",
    payFrequency: member?.payFrequency || "weekly",
    
    // Certifications & Qualifications
    certifications: member?.certifications || [],
    qualifications: member?.qualifications || [],
    licenses: member?.licenses || [],
    
    // Health & Safety
    inductionCompleted: member?.inductionCompleted ?? false,
    inductionDate: member?.inductionDate ? new Date(member.inductionDate).toISOString().split('T')[0] : "",
    safetyTrainingExpiry: member?.safetyTrainingExpiry ? new Date(member.safetyTrainingExpiry).toISOString().split('T')[0] : "",
    medicalClearance: member?.medicalClearance ?? false,
    medicalExpiryDate: member?.medicalExpiryDate ? new Date(member.medicalExpiryDate).toISOString().split('T')[0] : "",
    
    // Health & Safety Certifications
    firstAidCertifications: member?.firstAidCertifications || [],
    weldingQualifications: member?.weldingQualifications || [],
    workingAtHeightsCerts: member?.workingAtHeightsCerts || [],
    tradeQualifications: member?.tradeQualifications || [],
    driversLicenses: member?.driversLicenses || [],
    
    // Performance & Review
    performanceRating: member?.performanceRating?.toString() || "",
    lastReviewDate: member?.lastReviewDate ? new Date(member.lastReviewDate).toISOString().split('T')[0] : "",
    nextReviewDate: member?.nextReviewDate ? new Date(member.nextReviewDate).toISOString().split('T')[0] : "",
    
    // Benefits & Leave
    annualLeaveEntitlement: member?.annualLeaveEntitlement?.toString() || "20",
    sickLeaveEntitlement: member?.sickLeaveEntitlement?.toString() || "5",
    currentLeaveBalance: member?.currentLeaveBalance?.toString() || "0",
    
    // Notes
    notes: member?.notes || "",
    internalNotes: member?.internalNotes || "",
    
    // Banking & Financial Information (fields will be added to schema later)
    bankAccountName: "",
    bankAccountNumber: "",
    bankSortCode: "",
    taxNumber: "",
    kiwisaverRate: "",
    
    // Visa & Immigration (fields will be added to schema later)
    visaType: "",
    visaExpiry: "",
    
    // Next of Kin (fields will be added to schema later)
    nextOfKinName: "",
    nextOfKinPhone: "",
    nextOfKinRelation: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submission started with data:", formData);
    
    // Process and validate form data
    const processedData = {
      ...formData,
      id: member?.id,
      userId: parseInt(formData.userId),
      roleId: parseInt(formData.roleId.toString()),
      departmentId: formData.departmentId && formData.departmentId !== "0" ? parseInt(formData.departmentId.toString()) : undefined,
      
      // Convert numeric fields
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : undefined,
      siteAllowance: formData.siteAllowance ? parseFloat(formData.siteAllowance) : undefined,
      travelAllowance: formData.travelAllowance ? parseFloat(formData.travelAllowance) : undefined,
      annualSalary: formData.annualSalary ? parseFloat(formData.annualSalary) : undefined,
      experienceYears: formData.experienceYears !== "" ? parseInt(formData.experienceYears || "0") : undefined,
      performanceRating: formData.performanceRating ? parseFloat(formData.performanceRating) : undefined,
      annualLeaveEntitlement: formData.annualLeaveEntitlement ? parseFloat(formData.annualLeaveEntitlement) : undefined,
      sickLeaveEntitlement: formData.sickLeaveEntitlement ? parseFloat(formData.sickLeaveEntitlement) : undefined,
      currentLeaveBalance: formData.currentLeaveBalance ? parseFloat(formData.currentLeaveBalance) : undefined,
      
      // Convert date fields (ensure proper Date objects or null)
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
      inductionDate: formData.inductionDate ? new Date(formData.inductionDate) : null,
      safetyTrainingExpiry: formData.safetyTrainingExpiry ? new Date(formData.safetyTrainingExpiry) : null,
      medicalExpiryDate: formData.medicalExpiryDate ? new Date(formData.medicalExpiryDate) : null,
      lastReviewDate: formData.lastReviewDate ? new Date(formData.lastReviewDate) : null,
      nextReviewDate: formData.nextReviewDate ? new Date(formData.nextReviewDate) : null,
      
      // Health & Safety Certifications
      firstAidCertifications: formData.firstAidCertifications || [],
      weldingQualifications: formData.weldingQualifications || [],
      workingAtHeightsCerts: formData.workingAtHeightsCerts || [],
      tradeQualifications: formData.tradeQualifications || [],
      driversLicenses: formData.driversLicenses || [],
    };
    
    console.log("Processed data for submission:", processedData);
    onSubmit(processedData);
  };

  const skillOptions = [
    "Welding (MIG/TIG/Stick)", "Cutting (Plasma/Oxy)", "Steel Fabrication", "Assembly", 
    "Fitting", "Machining", "Quality Control", "Site Erection", "Crane Operation",
    "Rigging", "Safety Management", "Project Management", "Estimation", "Drawing Reading"
  ];

  const certificationOptions = [
    "Advanced Welding", "Safety Supervisor", "Crane Operator", "Rigging Supervisor",
    "ISO 9001 Lead Auditor", "First Aid", "Working at Height", "Confined Space"
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-100">
            📋 Basic Info
          </TabsTrigger>
          <TabsTrigger value="personal" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 dark:data-[state=active]:bg-green-900 dark:data-[state=active]:text-green-100">
            👤 Personal
          </TabsTrigger>
          <TabsTrigger value="employment" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 dark:data-[state=active]:bg-purple-900 dark:data-[state=active]:text-purple-100">
            💼 Employment
          </TabsTrigger>
          <TabsTrigger value="compensation" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-900 dark:data-[state=active]:text-orange-100">
            💰 Compensation
          </TabsTrigger>
          <TabsTrigger value="healthsafety" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 dark:data-[state=active]:bg-red-900 dark:data-[state=active]:text-red-100">
            🛡️ Health & Safety
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="flex-1 overflow-y-auto space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">Select User Account *</Label>
                <Select value={formData.userId} onValueChange={(value) => setFormData({...formData, userId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user account" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employeeNumber">Employee Number</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber || (member ? formData.employeeNumber : "Auto-generated on save")}
                  readOnly={!member}
                  onChange={(e) => member ? setFormData({...formData, employeeNumber: e.target.value}) : undefined}
                  placeholder={member ? "Enter employee number" : "Auto-generated on save"}
                  className={!member ? "bg-muted text-muted-foreground" : ""}
                />
                {!member && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Employee number will be automatically generated (e.g., EMP2025052)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Smith"
                  required
                />
              </div>

              <div>
                <Label htmlFor="roleId">Role *</Label>
                <Select value={formData.roleId.toString()} onValueChange={(value) => setFormData({...formData, roleId: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role: Role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="departmentId">Department</Label>
                <Select value={formData.departmentId?.toString() || ""} onValueChange={(value) => setFormData({...formData, departmentId: value ? parseInt(value) : undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Department</SelectItem>
                    {departments.map((dept: Department) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employmentType">Employment Type</Label>
                <Select value={formData.employmentType} onValueChange={(value) => setFormData({...formData, employmentType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
              <Label>Active Employee</Label>
            </div>
          </TabsContent>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="flex-1 overflow-y-auto space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({...formData, personalEmail: e.target.value})}
                  placeholder="user@email.com"
                />
              </div>

              <div>
                <Label htmlFor="personalPhone">Personal Phone</Label>
                <Input
                  id="personalPhone"
                  value={formData.personalPhone}
                  onChange={(e) => setFormData({...formData, personalPhone: e.target.value})}
                  placeholder="+64 21 123 4567"
                />
              </div>

              <div>
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => setFormData({...formData, suburb: e.target.value})}
                  placeholder="Mt Eden"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Auckland"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})}
                    placeholder="+64 21 123 4567"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Employment Information Tab */}
          <TabsContent value="employment" className="flex-1 overflow-y-auto space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position Title</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Senior Steel Fabricator"
                />
              </div>

              <div>
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={formData.skillLevel} onValueChange={(value) => setFormData({...formData, skillLevel: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                    <SelectItem value="tradesman">Tradesman</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({...formData, experienceYears: e.target.value})}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <Label>Primary Skills</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {skillOptions.slice(0, 8).map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={formData.primarySkills.includes(skill)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, primarySkills: [...formData.primarySkills, skill]});
                        } else {
                          setFormData({...formData, primarySkills: formData.primarySkills.filter((s: string) => s !== skill)});
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`skill-${skill}`} className="text-sm">{skill}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Performance & Review</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="performanceRating">Performance Rating (1.0-5.0)</Label>
                  <Input
                    id="performanceRating"
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={formData.performanceRating}
                    onChange={(e) => setFormData({...formData, performanceRating: e.target.value})}
                    placeholder="4.2"
                  />
                </div>

                <div>
                  <Label htmlFor="lastReviewDate">Last Review Date</Label>
                  <Input
                    id="lastReviewDate"
                    type="date"
                    value={formData.lastReviewDate}
                    onChange={(e) => setFormData({...formData, lastReviewDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="nextReviewDate">Next Review Date</Label>
                  <Input
                    id="nextReviewDate"
                    type="date"
                    value={formData.nextReviewDate}
                    onChange={(e) => setFormData({...formData, nextReviewDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Compensation Tab */}
          <TabsContent value="compensation" className="flex-1 overflow-y-auto space-y-4 p-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                  placeholder="35.00"
                />
              </div>

              <div>
                <Label htmlFor="overtimeRate">Overtime Rate ($)</Label>
                <Input
                  id="overtimeRate"
                  type="number"
                  step="0.01"
                  value={formData.overtimeRate}
                  onChange={(e) => setFormData({...formData, overtimeRate: e.target.value})}
                  placeholder="52.50"
                />
              </div>

              <div>
                <Label htmlFor="siteAllowance">Site Allowance ($)</Label>
                <Input
                  id="siteAllowance"
                  type="number"
                  step="0.01"
                  value={formData.siteAllowance}
                  onChange={(e) => setFormData({...formData, siteAllowance: e.target.value})}
                  placeholder="10.00"
                />
              </div>

              <div>
                <Label htmlFor="annualSalary">Annual Salary ($)</Label>
                <Input
                  id="annualSalary"
                  type="number"
                  step="0.01"
                  value={formData.annualSalary}
                  onChange={(e) => setFormData({...formData, annualSalary: e.target.value})}
                  placeholder="72800"
                />
              </div>

              <div>
                <Label htmlFor="payFrequency">Pay Frequency</Label>
                <Select value={formData.payFrequency} onValueChange={(value) => setFormData({...formData, payFrequency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Leave Entitlements</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="annualLeaveEntitlement">Annual Leave (days)</Label>
                  <Input
                    id="annualLeaveEntitlement"
                    type="number"
                    step="0.5"
                    value={formData.annualLeaveEntitlement}
                    onChange={(e) => setFormData({...formData, annualLeaveEntitlement: e.target.value})}
                    placeholder="20"
                  />
                </div>

                <div>
                  <Label htmlFor="sickLeaveEntitlement">Sick Leave (days)</Label>
                  <Input
                    id="sickLeaveEntitlement"
                    type="number"
                    step="0.5"
                    value={formData.sickLeaveEntitlement}
                    onChange={(e) => setFormData({...formData, sickLeaveEntitlement: e.target.value})}
                    placeholder="5"
                  />
                </div>

                <div>
                  <Label htmlFor="currentLeaveBalance">Current Balance (days)</Label>
                  <Input
                    id="currentLeaveBalance"
                    type="number"
                    step="0.5"
                    value={formData.currentLeaveBalance}
                    onChange={(e) => setFormData({...formData, currentLeaveBalance: e.target.value})}
                    placeholder="15.5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">General Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="General notes about the employee..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Health & Safety Tab */}
          <TabsContent value="healthsafety" className="flex-1 overflow-hidden p-1">
            <div className="h-full">
              <HealthSafetyForm 
                member={formData}
                onUpdate={(field, value) => setFormData({...formData, [field]: value})}
              />
            </div>
          </TabsContent>

          {/* Form Actions */}
          <div className="flex-shrink-0 flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
              Back to Basic Info
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : member ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
          </form>
        </div>
      </Tabs>
    </div>
  );
}

// Role Form Component
function RoleForm({ role, onSubmit, isLoading }: any) {
  // Convert existing role permissions to new format if needed
  const convertPermissions = (perms: any) => {
    if (!perms) return {};
    if (typeof perms === 'object' && !Array.isArray(perms)) {
      return perms;
    }
    // Convert old array format to new object format if needed
    const converted: Record<string, string[]> = {};
    if (Array.isArray(perms)) {
      perms.forEach((perm: any) => {
        if (perm.module && perm.actions) {
          converted[perm.module] = perm.actions;
        }
      });
    }
    return converted;
  };

  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    hourlyRate: role?.hourlyRate || "",
    permissions: convertPermissions(role?.permissions),
  });

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    const updatedPermissions = { ...formData.permissions };
    
    if (!updatedPermissions[module]) {
      updatedPermissions[module] = [];
    }
    
    if (checked) {
      if (!updatedPermissions[module].includes(action)) {
        updatedPermissions[module] = [...updatedPermissions[module], action];
      }
    } else {
      updatedPermissions[module] = updatedPermissions[module].filter(a => a !== action);
      if (updatedPermissions[module].length === 0) {
        delete updatedPermissions[module];
      }
    }
    
    setFormData({...formData, permissions: updatedPermissions});
  };

  const hasPermission = (module: string, action: string) => {
    return formData.permissions[module]?.includes(action) || false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure at least some permissions are selected
    const hasPermissions = Object.keys(formData.permissions).length > 0;
    if (!hasPermissions) {
      // Add at least one basic permission if none selected
      formData.permissions = { time: ["edit_own_timesheet", "clock_in_out"] };
    }
    
    console.log("Submitting role data:", formData);
    
    onSubmit({
      ...formData,
      id: role?.id,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Custom Role"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Role description"
          />
        </div>
        <div>
          <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
            placeholder="75.00"
          />
        </div>
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="grid grid-cols-2 gap-4 mt-2 max-h-96 overflow-y-auto">
          {Object.entries(DEFAULT_PERMISSIONS).map(([module, actions]) => (
            <Card key={module}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{module}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actions.map((action) => (
                  <div key={action} className="flex items-center space-x-2">
                    <Switch
                      id={`${module}-${action}`}
                      checked={hasPermission(module, action)}
                      onCheckedChange={(checked) => handlePermissionChange(module, action, checked)}
                    />
                    <Label htmlFor={`${module}-${action}`} className="text-sm capitalize">
                      {action}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : role ? "Update Role" : "Create Role"}
        </Button>
      </div>
    </form>
  );
}

// Department Form Component
function DepartmentForm({ department, users, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: department?.name || "",
    description: department?.description || "",
    headUserId: department?.headUserId || "",
    isActive: department?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: department?.id,
      headUserId: formData.headUserId && formData.headUserId !== "0" ? parseInt(formData.headUserId) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Department Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Engineering"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Department description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="headUserId">Department Head</Label>
        <Select value={formData.headUserId} onValueChange={(value) => setFormData({...formData, headUserId: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Select department head" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">No Head Assigned</SelectItem>
            {users.map((user: any) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
        />
        <Label htmlFor="isActive">Active Department</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : department ? "Update Department" : "Create Department"}
        </Button>
      </div>
    </form>
  );
}

// User Card Component
function UserCard({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasTeamMember = user.teamMemberId !== null && user.teamMemberId !== undefined;
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      console.log("Making API request with data:", userData);
      console.log("User ID:", user.id);
      return await apiRequest("PATCH", `/api/users/${user.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Updated",
        description: "User account has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userData: { userId: number; archiveReason: string }) => {
      return await apiRequest(`/api/users/${userData.userId}/archive`, "POST", {
        archiveReason: userData.archiveReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({
        title: "User Archived",
        description: "User account has been archived with all data retained for legal compliance.",
      });
    },
    onError: (error) => {
      toast({
        title: "Archive Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleArchiveUser = () => {
    const reason = hasTeamMember 
      ? "Employee termination - full data archived" 
      : "Unused account removal - basic data archived";
      
    deleteUserMutation.mutate({
      userId: user.id,
      archiveReason: reason
    });
  };
  
  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${
      !user.isActive ? "opacity-60 border-gray-300 bg-gray-50" : "hover:shadow-md"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-medium flex items-center ${
              !user.isActive ? "text-gray-600" : ""
            }`}>
              {user.isActive ? (
                <Users className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <UserX className="w-4 h-4 mr-2 text-gray-500" />
              )}
              {user.name}
              {!user.isActive && (
                <span className="ml-2 text-xs font-normal text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  INACTIVE
                </span>
              )}
            </h3>
            <p className={`text-sm mt-1 ${
              !user.isActive ? "text-gray-500" : "text-muted-foreground"
            }`}>@{user.username}</p>
            {user.email && (
              <p className={`text-sm ${
                !user.isActive ? "text-gray-500" : "text-muted-foreground"
              }`}>{user.email}</p>
            )}
            <div className="mt-2 flex items-center space-x-2">
              <Badge variant={user.isActive ? "default" : "secondary"}>
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={hasTeamMember ? "default" : "secondary"}>
                {hasTeamMember ? "Employee Profile" : "Account Only"}
              </Badge>
              {user.isActive && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Login Access
                </Badge>
              )}
              {!user.isActive && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  No Login Access
                </Badge>
              )}
            </div>
            {hasTeamMember && (
              <p className="text-sm mt-2 text-green-600">
                ✓ Linked to employee: {user.teamMemberFirstName} {user.teamMemberLastName} ({user.teamMemberEmployeeNumber})
              </p>
            )}
            {!hasTeamMember && (
              <p className="text-sm mt-2 text-orange-600">
                ⚠ No employee profile yet
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-1">
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit User Account</DialogTitle>
                </DialogHeader>
                <UserForm
                  user={user}
                  onSubmit={(updatedUser) => {
                    updateUserMutation.mutate(updatedUser);
                    setShowEditDialog(false);
                  }}
                  isLoading={updateUserMutation.isPending}
                />
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleteUserMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive User Account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div>
                      Archive user account <strong>"{user.username}"</strong>?
                    </div>
                    <div className="bg-orange-50 p-3 rounded-md text-sm">
                      <strong>This will:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Remove login access immediately</li>
                        <li>Archive all data for legal retention (7 years)</li>
                        <li>Cannot be undone</li>
                      </ul>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Reason:</strong> {hasTeamMember 
                        ? "Employee termination - full data archived" 
                        : "Unused account removal - basic data archived"}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleArchiveUser}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Archive User
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// Simple User Account Form - Login Information Only
function UserForm({ user, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    confirmPassword: "",
    isActive: user?.isActive ?? true,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.name) {
      alert("Username and name are required");
      return;
    }
    
    if (!user && !formData.password) {
      alert("Password is required for new users");
      return;
    }
    
    if (!user && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    // Submit data
    const submitData = {
      ...formData,
      id: user?.id,
    };
    
    // Remove password fields if not creating new user and password is empty
    if (user && !formData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="John Smith"
            required
          />
        </div>

        <div>
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            placeholder="username"
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="user@lateralengineering.co.nz"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="+64 21 123 4567"
          />
        </div>
      </div>

      {/* Active Account Toggle - Only show for editing existing users */}
      {user && (
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
          />
          <Label htmlFor="isActive" className="font-medium">
            Active Account
          </Label>
          <span className="text-sm text-muted-foreground ml-2">
            {formData.isActive ? "(User can log in)" : "(Login access disabled)"}
          </span>
        </div>
      )}

      {/* View Current Password - Only for editing existing users */}
      {user && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">Current Password</h3>
          <div className="flex items-center space-x-2">
            <Input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              readOnly
              placeholder="Click 'View Password' to display"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!currentPassword) {
                  try {
                    const response = await fetch(`/api/users/${user.id}/password`);
                    if (response.ok) {
                      const data = await response.json();
                      // Check if it's a bcrypt hash
                      if (data.password.startsWith('$2b$')) {
                        setCurrentPassword("Password is encrypted (bcrypt hash) - actual password cannot be recovered");
                      } else {
                        setCurrentPassword(data.password);
                      }
                      setShowCurrentPassword(true);
                    }
                  } catch (error) {
                    console.error("Error fetching password:", error);
                  }
                } else {
                  setShowCurrentPassword(!showCurrentPassword);
                }
              }}
            >
              {!currentPassword ? "View Password" : (showCurrentPassword ? "Hide" : "Show")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Password storage: bcrypt encrypted (cannot be decrypted). To change, enter new password below.
          </p>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">
          {user ? "Change Password (Optional)" : "Set Password *"}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="password">
              {user ? "New Password" : "Password *"}
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={user ? "Leave blank to keep current" : "Enter secure password"}
              required={!user}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">
              {user ? "Confirm New Password" : "Confirm Password *"}
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Confirm password"
              required={!user && !!formData.password}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={showPassword}
            onCheckedChange={setShowPassword}
          />
          <Label>Show passwords</Label>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900">
          {user ? "Edit User Account - Login Credentials Only" : "User Account - Login Information Only"}
        </h4>
        <p className="text-sm text-blue-700 mt-1">
          {user 
            ? "Update login credentials and contact information. For employee details, salary, and personal information, use the 'Employees' tab to manage the team member profile."
            : "This creates a basic user account for system login. For employee details, salary, and personal information, go to the 'Employees' tab to create a team member profile and link it to this user account."
          }
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : user ? "Update Account" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}