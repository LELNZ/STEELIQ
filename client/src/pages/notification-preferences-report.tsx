import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText,
  Download,
  Search,
  Filter,
  Users,
  Shield,
  Mail,
  Bell,
  MessageCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

type ChannelSource = 'mandatory' | 'user_selected' | 'policy_default';

interface UserCategorySettings {
  hasPreference: boolean;
  channels: { email: boolean; inApp: boolean; whatsapp: boolean };
  channelSource: { email: ChannelSource; inApp: ChannelSource; whatsapp: ChannelSource };
  mandatoryChannels: { email: boolean; inApp: boolean; whatsapp: boolean };
  defaultChannels: { email: boolean; inApp: boolean; whatsapp: boolean };
  userCanModify: boolean;
  frequency: string;
  priority: string;
  lastUpdated: string | null;
  preferenceId: number | null;
}

interface UserPreferenceData {
  userId: number;
  userName: string;
  userEmail: string | null;
  userPhone: string | null;
  roleName: string;
  policyRole: string;
  department: string | null;
  isActive: boolean;
  categories: Record<string, UserCategorySettings>;
}

interface ReportData {
  reportTimestamp: string;
  generatedBy: string;
  totalUsers: number;
  categories: string[];
  users: UserPreferenceData[];
  policies: Array<{
    role: string;
    category: string;
    mandatoryChannels: any;
    defaultChannels: any;
    userCanModify: boolean;
  }>;
}

const CATEGORY_LABELS: Record<string, { name: string; icon: string }> = {
  time_clock: { name: 'Time & Attendance', icon: '🕐' },
  payroll: { name: 'Payroll', icon: '💰' },
  approvals: { name: 'Approvals', icon: '✓' },
  compliance: { name: 'Compliance', icon: '🛡️' }
};

const ROLE_COLORS: Record<string, string> = {
  'Business Owner': 'bg-purple-100 text-purple-800',
  'Owner': 'bg-purple-100 text-purple-800',
  'Administrator': 'bg-blue-100 text-blue-800',
  'Admin': 'bg-blue-100 text-blue-800',
  'Manager': 'bg-green-100 text-green-800',
  'Employee': 'bg-gray-100 text-gray-800',
  'Viewer': 'bg-yellow-100 text-yellow-800'
};

export default function NotificationPreferencesReport() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const { data: reportData, isLoading, refetch, isFetching } = useQuery<ReportData>({
    queryKey: ['/api/notifications/preferences/report'],
    staleTime: 0,
    refetchOnMount: true
  });

  const filteredUsers = useMemo(() => {
    if (!reportData?.users) return [];
    
    return reportData.users.filter(user => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          user.userName?.toLowerCase().includes(searchLower) ||
          user.userEmail?.toLowerCase().includes(searchLower) ||
          user.roleName?.toLowerCase().includes(searchLower) ||
          user.department?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      if (roleFilter !== "all" && user.roleName !== roleFilter) {
        return false;
      }
      
      if (categoryFilter !== "all") {
        const categorySettings = user.categories[categoryFilter];
        if (!categorySettings) return false;
      }
      
      if (channelFilter !== "all") {
        const hasChannelEnabled = Object.values(user.categories).some(cat => {
          if (channelFilter === "email") return cat.channels.email;
          if (channelFilter === "inApp") return cat.channels.inApp;
          if (channelFilter === "whatsapp") return cat.channels.whatsapp;
          return false;
        });
        if (!hasChannelEnabled) return false;
      }
      
      return true;
    });
  }, [reportData?.users, searchTerm, roleFilter, categoryFilter, channelFilter]);

  const uniqueRoles = useMemo(() => {
    if (!reportData?.users) return [];
    return [...new Set(reportData.users.map(u => u.roleName))].filter(Boolean);
  }, [reportData?.users]);

  const handleExportCSV = () => {
    if (!reportData) return;
    
    const headers = ['User', 'Email', 'Role', 'Department', 'Status'];
    const categories = reportData.categories;
    
    categories.forEach(cat => {
      const label = CATEGORY_LABELS[cat]?.name || cat;
      headers.push(
        `${label} - Email`, 
        `${label} - Email Source`,
        `${label} - In-App`, 
        `${label} - In-App Source`,
        `${label} - WhatsApp`,
        `${label} - WhatsApp Source`
      );
    });
    
    const getSourceLabel = (source: ChannelSource): string => {
      switch (source) {
        case 'mandatory': return 'MANDATORY';
        case 'user_selected': return 'USER_SELECTED';
        case 'policy_default': return 'POLICY_DEFAULT';
        default: return 'UNKNOWN';
      }
    };
    
    const rows = filteredUsers.map(user => {
      const row = [
        user.userName,
        user.userEmail || '',
        user.roleName,
        user.department || '',
        user.isActive ? 'Active' : 'Inactive'
      ];
      
      categories.forEach(cat => {
        const settings = user.categories[cat];
        const source = settings?.channelSource || { email: 'policy_default', inApp: 'policy_default', whatsapp: 'policy_default' };
        
        row.push(
          settings?.channels.email ? 'ON' : 'OFF',
          getSourceLabel(source.email as ChannelSource),
          settings?.channels.inApp ? 'ON' : 'OFF',
          getSourceLabel(source.inApp as ChannelSource),
          settings?.channels.whatsapp ? 'ON' : 'OFF',
          getSourceLabel(source.whatsapp as ChannelSource)
        );
      });
      
      return row;
    });
    
    const csvContent = [
      `STEELIQ User Notification Preferences Audit Report`,
      ``,
      `Report Metadata:`,
      `Generated: ${reportData.reportTimestamp}`,
      `Generated By: ${reportData.generatedBy}`,
      `Total Users in System: ${reportData.totalUsers}`,
      `Filtered Users in Export: ${filteredUsers.length}`,
      ``,
      `Source Legend:`,
      `MANDATORY = Policy enforced - user cannot disable`,
      `USER_SELECTED = User explicitly changed this setting`,
      `POLICY_DEFAULT = Policy default - user has not modified`,
      ``,
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-preferences-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Audit Report Exported",
      description: `Exported ${filteredUsers.length} user records to CSV with source tracking`
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences/report'] });
    refetch();
  };

  const renderChannelBadge = (
    enabled: boolean, 
    source: ChannelSource,
    label: string,
    icon: typeof Mail
  ) => {
    const Icon = icon;
    
    if (source === 'mandatory') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="text-xs px-1.5 py-0.5 bg-red-600 text-white flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mandatory - Policy enforced, user cannot disable</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (enabled) {
      const isUserSelected = source === 'user_selected';
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`text-xs px-1.5 py-0.5 flex items-center gap-1 ${
                isUserSelected 
                  ? 'bg-green-100 text-green-700 border border-green-300' 
                  : 'bg-blue-100 text-blue-700 border border-blue-300'
              }`}>
                <Icon className="h-3 w-3" />
                {label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isUserSelected ? 'User explicitly enabled' : 'Policy default (user hasn\'t changed)'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    const tooltipText = source === 'user_selected' 
      ? 'User explicitly disabled' 
      : 'Policy default is OFF';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-gray-400 flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="preferences-report-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">User Notification Preferences Report</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            View all users' actual notification settings for audit and troubleshooting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-report"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Metadata */}
      {reportData && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>Generated:</strong> {reportData.reportTimestamp}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>By:</strong> {reportData.generatedBy}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    <strong>Total Users:</strong> {reportData.totalUsers}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Understanding This Report
          </CardTitle>
          <CardDescription className="text-xs">
            What each badge color means
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="text-xs px-1.5 py-0.5 bg-red-600 text-white">E</Badge>
              <span>Mandatory - Policy enforced, user cannot disable</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-300">E</Badge>
              <span>User-Selected ON - User explicitly enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-300">E</Badge>
              <span>Default ON - Policy default, user hasn't changed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-gray-400">E</Badge>
              <span>User Disabled - User turned this channel off</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Troubleshooting:</strong> If a user reports missing notifications, check their settings here. 
            Red badges mean they will always receive notifications on that channel. 
            Gray outlined badges mean they have disabled that channel.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name, email, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([id, { name, icon }]) => (
                    <SelectItem key={id} value={id}>{icon} {name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger data-testid="select-channel-filter">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email Enabled</SelectItem>
                  <SelectItem value="inApp">In-App Enabled</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(searchTerm || roleFilter !== "all" || categoryFilter !== "all" || channelFilter !== "all") && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {reportData?.totalUsers || 0} users
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                  setCategoryFilter("all");
                  setChannelFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Preferences ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Click on any user to see detailed channel settings per category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">User</TableHead>
                  <TableHead className="min-w-[100px]">Role</TableHead>
                  {Object.entries(CATEGORY_LABELS).map(([id, { name, icon }]) => (
                    <TableHead key={id} className="text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{icon}</span>
                        <span className="text-xs">{name}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow 
                      key={user.userId} 
                      data-testid={`row-user-${user.userId}`}
                      className={!user.isActive ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.userName}</p>
                            {!user.isActive && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                          {user.department && (
                            <p className="text-xs text-muted-foreground">{user.department}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[user.roleName] || 'bg-gray-100 text-gray-800'}>
                          {user.roleName}
                        </Badge>
                      </TableCell>
                      {Object.keys(CATEGORY_LABELS).map(categoryId => {
                        const settings = user.categories[categoryId];
                        if (!settings) {
                          return (
                            <TableCell key={categoryId} className="text-center">
                              <span className="text-xs text-muted-foreground">No data</span>
                            </TableCell>
                          );
                        }
                        
                        const getSource = (channel: 'email' | 'inApp' | 'whatsapp'): ChannelSource => 
                          settings.channelSource?.[channel] || 'policy_default';
                        
                        return (
                          <TableCell key={categoryId} className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {renderChannelBadge(
                                settings.channels.email,
                                getSource('email'),
                                'E',
                                Mail
                              )}
                              {renderChannelBadge(
                                settings.channels.inApp,
                                getSource('inApp'),
                                'A',
                                Bell
                              )}
                              {renderChannelBadge(
                                settings.channels.whatsapp,
                                getSource('whatsapp'),
                                'W',
                                MessageCircle
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
