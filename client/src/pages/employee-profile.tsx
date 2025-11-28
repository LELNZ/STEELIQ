import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, Save, Edit2, Mail, Phone, Calendar, MapPin, Clock, Shield, ChevronRight, User, Briefcase, DollarSign, Heart, Award, FileText, Building } from "lucide-react";
import { format } from "date-fns";

// Import form components
import { HealthSafetyFormEnterprise } from "@/components/team/HealthSafetyFormEnterprise";
import { TradeQualificationsForm } from "@/components/team/TradeQualificationsForm";
import { SkillsDevelopmentForm } from "@/components/team/SkillsDevelopmentForm";
import { PerformanceReviewSystem } from "@/components/team/PerformanceReviewSystem";

interface EmployeeProfile {
  id: number;
  userId: number;
  roleId: number;
  departmentId?: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  userName: string;
  userUsername: string;
  roleName: string;
  departmentName?: string;
  position?: string;
  hourlyRate?: number;
  isActive: boolean;
  startDate?: string;
  personalEmail?: string;
  personalPhone?: string;
  streetAddress?: string;
  suburb?: string;
  city?: string;
  // Add other fields as needed
}

export default function EmployeeProfile() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Use the auth context properly
  const isNewEmployee = !id || id === "new";
  const [isEditing, setIsEditing] = useState(isNewEmployee);
  const [activeTab, setActiveTab] = useState("overview");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Fetch employee data (only if not creating new)
  const { data: employee, isLoading } = useQuery<EmployeeProfile>({
    queryKey: [`/api/team/members/${id}`],
    enabled: !!id && id !== "new",
  });

  // Initialize form data when employee loads
  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  // Fetch roles, departments, and users for forms
  const { data: roles = [] } = useQuery({
    queryKey: ["/api/team/roles"],
    enabled: isNewEmployee || isEditing,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/team/departments"],
    enabled: isNewEmployee || isEditing,
  });

  const { data: availableUsers = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isNewEmployee || isEditing,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNewEmployee) {
        return apiRequest("/api/team/members", "POST", data);
      } else {
        return apiRequest(`/api/team/members/${id}`, "PUT", data);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      if (!isNewEmployee) {
        queryClient.invalidateQueries({ queryKey: [`/api/team/members/${id}`] });
      }
      setIsEditing(false);
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: isNewEmployee ? "Employee created successfully" : "Employee profile updated successfully",
      });
      
      // If creating new, navigate to the created employee's profile
      if (isNewEmployee && result?.id) {
        navigate(`/team-management/employee/${result.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isNewEmployee ? 'create' : 'update'} employee profile`,
        variant: "destructive",
      });
    },
  });

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !isEditing) {
      const timer = setTimeout(() => {
        handleSave();
      }, 10000); // Auto-save after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, isEditing]);

  // Warn when navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleFieldUpdate = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    console.log('Saving employee data:', {
      id: formData.id,
      name: formData.firstName + ' ' + formData.lastName,
      safetyCertificates: formData.safetyCertificates,
      totalFields: Object.keys(formData).length
    });
    saveMutation.mutate(formData);
  };

  // Check permissions - simplified for now
  const canEdit = () => {
    return true; // Allow all users to edit for now
  };

  if (isLoading && !isNewEmployee) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!employee && !isNewEmployee) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Employee not found</p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <h1 className="text-2xl font-bold">
              {isNewEmployee ? "Create New Employee" : `${employee?.firstName || ''} ${employee?.lastName || ''}`}
            </h1>
            {!isNewEmployee && employee && (
              <Badge variant={employee.isActive ? "default" : "secondary"}>
                {employee.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-md">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">You have unsaved changes</span>
              </div>
            )}
            <Button
              variant={hasUnsavedChanges ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              className={hasUnsavedChanges ? "animate-pulse" : ""}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            {canEdit() && !isNewEmployee && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? "View Mode" : "Edit Mode"}
              </Button>
            )}
          </div>
        </div>

        {/* Employee Summary */}
        {!isNewEmployee && employee && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-semibold">{employee.employeeNumber}</p>
                <p className="text-sm text-muted-foreground">{employee.position || employee.roleName}</p>
              </div>
            </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.departmentName || "No Department"}</span>
            </div>
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Started {employee.startDate ? format(new Date(employee.startDate), "MMM d, yyyy") : "N/A"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.personalEmail || "No email"}</span>
            </div>
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.personalPhone || "No phone"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.city ? `${employee.suburb || ""} ${employee.city}`.trim() : "No address"}</span>
            </div>
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{employee.hourlyRate ? `$${employee.hourlyRate}/hr` : "Rate not set"}</span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto w-full">
          <TabsList className="w-max">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="employment">
              <Briefcase className="h-4 w-4 mr-2" />
              Employment
            </TabsTrigger>
            <TabsTrigger value="compensation">
              <DollarSign className="h-4 w-4 mr-2" />
              Compensation
            </TabsTrigger>
            <TabsTrigger value="health-safety">
              <Shield className="h-4 w-4 mr-2" />
              Health & Safety
            </TabsTrigger>
            <TabsTrigger value="trade-quals">
              <Award className="h-4 w-4 mr-2" />
              Trade Quals
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Award className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isNewEmployee ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Employee</CardTitle>
                <CardDescription>
                  Fill in the basic information to create a new employee profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="userId" className="text-sm font-medium">
                      User Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="userId"
                      value={formData.userId || ""}
                      onChange={(e) => handleFieldUpdate("userId", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="">Select User Account</option>
                      {availableUsers.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="roleId" className="text-sm font-medium">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="roleId"
                      value={formData.roleId || ""}
                      onChange={(e) => handleFieldUpdate("roleId", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((role: any) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="departmentId" className="text-sm font-medium">
                      Department
                    </label>
                    <select
                      id="departmentId"
                      value={formData.departmentId || ""}
                      onChange={(e) => handleFieldUpdate("departmentId", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="startDate" className="text-sm font-medium">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={formData.startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleFieldUpdate("startDate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName || ""}
                      onChange={(e) => handleFieldUpdate("firstName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName || ""}
                      onChange={(e) => handleFieldUpdate("lastName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="position" className="text-sm font-medium">
                      Position/Title
                    </label>
                    <input
                      type="text"
                      id="position"
                      value={formData.position || ""}
                      onChange={(e) => handleFieldUpdate("position", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Senior Welder, Site Foreman"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hourlyRate" className="text-sm font-medium">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      id="hourlyRate"
                      value={formData.hourlyRate || ""}
                      onChange={(e) => handleFieldUpdate("hourlyRate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., 85"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/team-management")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !formData.userId || !formData.roleId}
                  >
                    Create Employee
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Performance Review
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Employment Letter
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    View Qualification Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profile updated</span>
                    <span>2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Performance review completed</span>
                    <span>1 week ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">First Aid certification renewed</span>
                    <span>2 weeks ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
            </>
          )}
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Employee's personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="text"
                      value={formData.firstName || ""}
                      onChange={(e) => handleFieldUpdate("firstName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.firstName || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="text"
                      value={formData.lastName || ""}
                      onChange={(e) => handleFieldUpdate("lastName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.lastName || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Personal Email</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="email"
                      value={formData.personalEmail || ""}
                      onChange={(e) => handleFieldUpdate("personalEmail", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.personalEmail || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Personal Phone</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="tel"
                      value={formData.personalPhone || ""}
                      onChange={(e) => handleFieldUpdate("personalPhone", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.personalPhone || "Not provided"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>
                Position, department, and employment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Employee Number</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="text"
                      value={formData.employeeNumber || ""}
                      onChange={(e) => handleFieldUpdate("employeeNumber", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="Auto-generated if empty"
                    />
                  ) : (
                    <p className="mt-1">{employee?.employeeNumber || "Not assigned"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Employment Type</label>
                  {isEditing || isNewEmployee ? (
                    <select
                      value={formData.employmentType || "full_time"}
                      onChange={(e) => handleFieldUpdate("employmentType", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contractor">Contractor</option>
                      <option value="casual">Casual</option>
                    </select>
                  ) : (
                    <p className="mt-1">{employee?.employmentType || "Full Time"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Position</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="text"
                      value={formData.position || ""}
                      onChange={(e) => handleFieldUpdate("position", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., Senior Welder"
                    />
                  ) : (
                    <p className="mt-1">{employee?.position || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Job Title</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="text"
                      value={formData.jobTitle || ""}
                      onChange={(e) => handleFieldUpdate("jobTitle", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., Workshop Foreman"
                    />
                  ) : (
                    <p className="mt-1">{employee?.jobTitle || "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="date"
                      value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleFieldUpdate("startDate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.startDate ? format(new Date(employee.startDate), "MMM d, yyyy") : "Not specified"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Years of Experience</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.experienceYears || ""}
                      onChange={(e) => handleFieldUpdate("experienceYears", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 5"
                    />
                  ) : (
                    <p className="mt-1">{employee?.experienceYears || "Not specified"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compensation & Benefits</CardTitle>
              <CardDescription>
                Salary, rates, and allowances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Hourly Rate</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.hourlyRate || ""}
                      onChange={(e) => handleFieldUpdate("hourlyRate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 85"
                      step="0.01"
                    />
                  ) : (
                    <p className="mt-1">{employee?.hourlyRate ? `$${employee.hourlyRate}/hr` : "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Overtime Rate</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.overtimeRate || ""}
                      onChange={(e) => handleFieldUpdate("overtimeRate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 127.50"
                      step="0.01"
                    />
                  ) : (
                    <p className="mt-1">{employee?.overtimeRate ? `$${employee.overtimeRate}/hr` : "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Site Allowance</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.siteAllowance || ""}
                      onChange={(e) => handleFieldUpdate("siteAllowance", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 5"
                      step="0.01"
                    />
                  ) : (
                    <p className="mt-1">{employee?.siteAllowance ? `$${employee.siteAllowance}/hr` : "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Travel Allowance</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.travelAllowance || ""}
                      onChange={(e) => handleFieldUpdate("travelAllowance", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 50"
                      step="0.01"
                    />
                  ) : (
                    <p className="mt-1">{employee?.travelAllowance ? `$${employee.travelAllowance}/day` : "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Annual Salary</label>
                  {isEditing || isNewEmployee ? (
                    <input
                      type="number"
                      value={formData.annualSalary || ""}
                      onChange={(e) => handleFieldUpdate("annualSalary", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      placeholder="e.g., 176800"
                      step="1"
                    />
                  ) : (
                    <p className="mt-1">{employee?.annualSalary ? `$${employee.annualSalary.toLocaleString()}` : "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Pay Frequency</label>
                  {isEditing || isNewEmployee ? (
                    <select
                      value={formData.payFrequency || "weekly"}
                      onChange={(e) => handleFieldUpdate("payFrequency", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-1"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  ) : (
                    <p className="mt-1">{employee?.payFrequency || "Weekly"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health & Safety Tab */}
        <TabsContent value="health-safety" className="space-y-6">
          <HealthSafetyFormEnterprise
            member={formData}
            onUpdate={handleFieldUpdate}
            isEditing={isEditing}
            isNewEmployee={isNewEmployee}
          />
        </TabsContent>

        {/* Trade Quals Tab */}
        <TabsContent value="trade-quals" className="space-y-6">
          <TradeQualificationsForm
            member={formData}
            onUpdate={handleFieldUpdate}
            isEditing={isEditing}
            isNewEmployee={isNewEmployee}
          />
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <SkillsDevelopmentForm
            member={formData}
            onUpdate={handleFieldUpdate}
            isEditing={isEditing}
            isNewEmployee={isNewEmployee}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents & Records</CardTitle>
              <CardDescription>
                Employee documents and certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Document management coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload and manage employee documents, certificates, and contracts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}