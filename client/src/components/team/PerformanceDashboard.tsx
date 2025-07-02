import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Award, 
  Shield, 
  Users, 
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign
} from "lucide-react";

interface PerformanceMetrics {
  efficiency: number;
  qualityScore: number;
  safetyScore: number;
  attendanceRate: number;
  overtimeHours: number;
  billableHours: number;
  projectsCompleted: number;
}

interface TeamMemberPerformance {
  id: number;
  name: string;
  role: string;
  department: string;
  metrics: PerformanceMetrics;
  trend: 'up' | 'down' | 'stable';
  alerts: string[];
  certifications: string[];
}

interface PerformanceDashboardProps {
  teamData: TeamMemberPerformance[];
  dateRange: string;
}

export function PerformanceDashboard({ teamData, dateRange }: PerformanceDashboardProps) {
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 75) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const TeamMemberCard = ({ member }: { member: TeamMemberPerformance }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{member.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{member.role} • {member.department}</p>
          </div>
          <div className="flex items-center space-x-2">
            {member.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
            {member.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
            {member.alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {member.alerts.length} alert{member.alerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Efficiency</span>
              <span className={`text-sm font-medium ${getPerformanceColor(member.metrics.efficiency)}`}>
                {member.metrics.efficiency}%
              </span>
            </div>
            <Progress value={member.metrics.efficiency} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quality</span>
              <span className={`text-sm font-medium ${getPerformanceColor(member.metrics.qualityScore)}`}>
                {member.metrics.qualityScore}%
              </span>
            </div>
            <Progress value={member.metrics.qualityScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Safety</span>
              <span className={`text-sm font-medium ${getPerformanceColor(member.metrics.safetyScore)}`}>
                {member.metrics.safetyScore}%
              </span>
            </div>
            <Progress value={member.metrics.safetyScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance</span>
              <span className={`text-sm font-medium ${getPerformanceColor(member.metrics.attendanceRate)}`}>
                {member.metrics.attendanceRate}%
              </span>
            </div>
            <Progress value={member.metrics.attendanceRate} className="h-2" />
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{member.metrics.billableHours}</div>
            <div className="text-xs text-muted-foreground">Billable Hours</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{member.metrics.projectsCompleted}</div>
            <div className="text-xs text-muted-foreground">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{member.metrics.overtimeHours}</div>
            <div className="text-xs text-muted-foreground">OT Hours</div>
          </div>
        </div>

        {/* Certifications */}
        {member.certifications.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Active Certifications</div>
            <div className="flex flex-wrap gap-1">
              {member.certifications.map((cert, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {member.alerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-red-600">Performance Alerts</div>
            {member.alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const departmentMetrics = teamData.reduce((acc, member) => {
    if (!acc[member.department]) {
      acc[member.department] = {
        members: 0,
        avgEfficiency: 0,
        avgQuality: 0,
        avgSafety: 0,
        totalBillable: 0,
        totalProjects: 0
      };
    }
    
    const dept = acc[member.department];
    dept.members++;
    dept.avgEfficiency += member.metrics.efficiency;
    dept.avgQuality += member.metrics.qualityScore;
    dept.avgSafety += member.metrics.safetyScore;
    dept.totalBillable += member.metrics.billableHours;
    dept.totalProjects += member.metrics.projectsCompleted;
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages
  Object.keys(departmentMetrics).forEach(dept => {
    const data = departmentMetrics[dept];
    data.avgEfficiency = Math.round(data.avgEfficiency / data.members);
    data.avgQuality = Math.round(data.avgQuality / data.members);
    data.avgSafety = Math.round(data.avgSafety / data.members);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">Team performance metrics for {dateRange}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{dateRange}</span>
        </div>
      </div>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual Performance</TabsTrigger>
          <TabsTrigger value="department">Department Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamData.map(member => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="department" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(departmentMetrics).map(([deptName, data]) => (
              <Card key={deptName}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>{deptName}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{data.members} team members</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Efficiency</span>
                        <span className={`text-sm font-medium ${getPerformanceColor(data.avgEfficiency)}`}>
                          {data.avgEfficiency}%
                        </span>
                      </div>
                      <Progress value={data.avgEfficiency} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Quality</span>
                        <span className={`text-sm font-medium ${getPerformanceColor(data.avgQuality)}`}>
                          {data.avgQuality}%
                        </span>
                      </div>
                      <Progress value={data.avgQuality} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Safety</span>
                        <span className={`text-sm font-medium ${getPerformanceColor(data.avgSafety)}`}>
                          {data.avgSafety}%
                        </span>
                      </div>
                      <Progress value={data.avgSafety} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Projects</span>
                        <span className="text-sm font-medium">{data.totalProjects}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Billable Hours</span>
                      <span className="font-medium">{data.totalBillable}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(teamData.reduce((sum, m) => sum + m.metrics.efficiency, 0) / teamData.length)}%
                </div>
                <p className="text-xs text-muted-foreground">Average across all members</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(teamData.reduce((sum, m) => sum + m.metrics.safetyScore, 0) / teamData.length)}%
                </div>
                <p className="text-xs text-muted-foreground">Zero incidents this period</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Billable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamData.reduce((sum, m) => sum + m.metrics.billableHours, 0)}h
                </div>
                <p className="text-xs text-muted-foreground">This reporting period</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {teamData.reduce((sum, m) => sum + m.alerts.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}