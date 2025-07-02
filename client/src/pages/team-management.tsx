import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Shield, Building2, Eye, Edit2, Trash2, Settings, Activity, ChevronRight } from "lucide-react";

interface Permission {
  module: string;
  actions: string[];
}

interface Role {
  id: number;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
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
  estimation: ["view", "create", "edit", "delete", "approve"],
  materials: ["view", "create", "edit", "delete", "import", "export"],
  cutting: ["view", "create", "edit", "delete", "optimize"],
  jobs: ["view", "create", "edit", "delete", "manage"],
  inventory: ["view", "create", "edit", "delete", "adjust"],
  reports: ["view", "create", "export", "schedule"],
  settings: ["view", "edit", "manage"],
  users: ["view", "create", "edit", "delete", "manage"],
  clients: ["view", "create", "edit", "delete"],
  suppliers: ["view", "create", "edit", "delete"],
  financial: ["view", "edit", "approve", "manage"],
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
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);

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
      if (data.id) {
        return apiRequest(`/api/team/members/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/team/members", {
          method: "POST", 
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setIsEditingMember(false);
      setSelectedMember(null);
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  // Create/Update Role Mutation
  const roleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest(`/api/team/roles/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/team/roles", {
          method: "POST",
          body: JSON.stringify(data),
        });
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
        return apiRequest(`/api/team/departments/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return apiRequest("/api/team/departments", {
          method: "POST",
          body: JSON.stringify(data),
        });
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

  // Delete mutations
  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/team/members/${id}`, { method: "DELETE" });
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
      return apiRequest(`/api/team/roles/${id}`, { method: "DELETE" });
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
      return apiRequest(`/api/team/departments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/departments"] });
      toast({
        title: "Success", 
        description: "Department deleted successfully",
      });
    },
  });

  const getRolePermissionBadge = (role: Role) => {
    const permissionCount = role.permissions.reduce((acc, perm) => acc + perm.actions.length, 0);
    return (
      <Badge variant={role.isSystemRole ? "default" : "secondary"}>
        {role.isSystemRole ? "System" : "Custom"} • {permissionCount} permissions
      </Badge>
    );
  };

  const MemberCard = ({ member }: { member: TeamMember }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {member.userName?.[0]}{member.userName?.split(' ')[1]?.[0] || ''}
              </span>
            </div>
            <div>
              <h3 className="font-medium">{member.userName}</h3>
              <p className="text-sm text-muted-foreground">{member.userUsername}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">{member.roleName}</Badge>
                {member.departmentName && (
                  <Badge variant="secondary">{member.departmentName}</Badge>
                )}

              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedMember(member);
                setIsEditingMember(true);
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
                  <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {member.user.name} from the team?
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
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Employee #:</span>
            <span className="ml-1">{member.employeeNumber || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Position:</span>
            <span className="ml-1">{member.position || "N/A"}</span>
          </div>
          {member.hourlyRate && (
            <div>
              <span className="text-muted-foreground">Hourly Rate:</span>
              <span className="ml-1">${member.hourlyRate}/hr</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={member.isActive ? "default" : "secondary"} className="ml-1">
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RoleCard = ({ role }: { role: Role }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              {role.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
            <div className="mt-2">
              {getRolePermissionBadge(role)}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRole(role);
                setIsEditingRole(true);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {!role.isSystemRole && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
          <Dialog open={isEditingMember} onOpenChange={setIsEditingMember}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMember(null)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedMember ? "Edit Team Member" : "Add Team Member"}
                </DialogTitle>
              </DialogHeader>
              <MemberForm
                member={selectedMember}
                roles={roles}
                departments={departments}
                users={availableUsers}
                onSubmit={memberMutation.mutate}
                isLoading={memberMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Team Members ({teamMembers.length})</h2>
          </div>
          {membersLoading ? (
            <div>Loading team members...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member: TeamMember) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Roles & Permissions ({roles.length})</h2>
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role: Role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Departments ({departments.length})</h2>
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((department: Department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Member Form Component
function MemberForm({ member, roles, departments, users, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    userId: member?.userId || "",
    roleId: member?.roleId || "",
    departmentId: member?.departmentId || "",
    employeeNumber: member?.employeeNumber || "",
    position: member?.position || "",
    skillLevel: member?.skillLevel || "",
    hourlyRate: member?.hourlyRate || "",
    overtimeRate: member?.overtimeRate || "",
    isActive: member?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: member?.id,
      userId: parseInt(formData.userId),
      roleId: parseInt(formData.roleId.toString()),
      departmentId: formData.departmentId && formData.departmentId !== "0" ? parseInt(formData.departmentId.toString()) : undefined,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="userId">User</Label>
          <Select value={formData.userId} onValueChange={(value) => setFormData({...formData, userId: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
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
          <Label htmlFor="roleId">Role</Label>
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
          <Label htmlFor="employeeNumber">Employee Number</Label>
          <Input
            id="employeeNumber"
            value={formData.employeeNumber}
            onChange={(e) => setFormData({...formData, employeeNumber: e.target.value})}
            placeholder="EMP001"
          />
        </div>

        <div>
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            placeholder="Steel Fabricator"
          />
        </div>

        <div>
          <Label htmlFor="skillLevel">Skill Level</Label>
          <Select value={formData.skillLevel} onValueChange={(value) => setFormData({...formData, skillLevel: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select skill level" />
            </SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            value={formData.hourlyRate}
            onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
            placeholder="45.00"
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
            placeholder="67.50"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
        />
        <Label htmlFor="isActive">Active Member</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : member ? "Update Member" : "Add Member"}
        </Button>
      </div>
    </form>
  );
}

// Role Form Component
function RoleForm({ role, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    permissions: role?.permissions || [],
  });

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    const updatedPermissions = [...formData.permissions];
    const moduleIndex = updatedPermissions.findIndex(p => p.module === module);
    
    if (moduleIndex >= 0) {
      if (checked) {
        if (!updatedPermissions[moduleIndex].actions.includes(action)) {
          updatedPermissions[moduleIndex].actions.push(action);
        }
      } else {
        updatedPermissions[moduleIndex].actions = updatedPermissions[moduleIndex].actions.filter(a => a !== action);
      }
    } else if (checked) {
      updatedPermissions.push({ module, actions: [action] });
    }
    
    setFormData({...formData, permissions: updatedPermissions});
  };

  const hasPermission = (module: string, action: string) => {
    const modulePerms = formData.permissions.find(p => p.module === module);
    return modulePerms?.actions.includes(action) || false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: role?.id,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
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