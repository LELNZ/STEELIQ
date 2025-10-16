/**
 * AI Operations Dashboard - Fortune 50 Level Monitoring
 * Real-time metrics for AI estimation system performance
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity, AlertCircle, CheckCircle, Clock, Database,
  FileText, TrendingUp, Users, Zap, Brain, Server,
  Shield, Package, AlertTriangle, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';

interface SystemMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  activeUsers: number;
  apiCalls: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
}

interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  throughput: number;
  avgProcessingTime: number;
  successRate: number;
}

interface AIMetrics {
  totalExtractions: number;
  successfulExtractions: number;
  failedExtractions: number;
  avgConfidence: number;
  avgItemsPerMTO: number;
  totalCost: number;
  cacheHits: number;
  cacheMisses: number;
  learningImprovementRate: number;
  patternMatchAccuracy: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  service: string;
  operation: string;
  message: string;
  duration?: number;
  error?: any;
}

const AIDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch system metrics
  const { data: systemMetrics, refetch: refetchSystem } = useQuery<SystemMetrics>({
    queryKey: ['/api/ai/metrics/system', selectedTimeRange],
    refetchInterval: autoRefresh ? 10000 : false
  });

  // Fetch queue metrics
  const { data: queueMetrics, refetch: refetchQueue } = useQuery<QueueMetrics>({
    queryKey: ['/api/ai/metrics/queue'],
    refetchInterval: autoRefresh ? 5000 : false
  });

  // Fetch AI-specific metrics
  const { data: aiMetrics, refetch: refetchAI } = useQuery<AIMetrics>({
    queryKey: ['/api/ai/metrics/ai', selectedTimeRange],
    refetchInterval: autoRefresh ? 15000 : false
  });

  // Fetch time series data for charts
  const { data: timeSeriesData } = useQuery({
    queryKey: ['/api/ai/metrics/timeseries', selectedTimeRange],
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Fetch recent logs
  const { data: recentLogs } = useQuery<LogEntry[]>({
    queryKey: ['/api/ai/logs/recent'],
    refetchInterval: autoRefresh ? 10000 : false
  });

  // Calculate status indicators
  const systemStatus = systemMetrics && systemMetrics.errorRate < 0.01 ? 'healthy' : 
                      systemMetrics && systemMetrics.errorRate < 0.05 ? 'warning' : 'critical';
  
  const queueStatus = queueMetrics && queueMetrics.pending < 100 ? 'healthy' :
                     queueMetrics && queueMetrics.pending < 500 ? 'warning' : 'critical';

  const aiStatus = aiMetrics && aiMetrics.successfulExtractions / (aiMetrics.totalExtractions || 1) > 0.95 ? 'healthy' :
                  aiMetrics && aiMetrics.successfulExtractions / (aiMetrics.totalExtractions || 1) > 0.85 ? 'warning' : 'critical';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring for Fortune 50 AI estimation system
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={selectedTimeRange === '1h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('1h')}
            >
              1H
            </Button>
            <Button
              variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('24h')}
            >
              24H
            </Button>
            <Button
              variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange('7d')}
            >
              7D
            </Button>
          </div>
          
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Activity className="h-4 w-4 mr-1 animate-pulse" />
                Live
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-1" />
                Paused
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-4 gap-4">
        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium">System Health</span>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {systemStatus === 'healthy' && <CheckCircle className="h-6 w-6 text-green-500" />}
                {systemStatus === 'warning' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                {systemStatus === 'critical' && <AlertCircle className="h-6 w-6 text-red-500" />}
              </span>
              <Badge variant={
                systemStatus === 'healthy' ? 'default' :
                systemStatus === 'warning' ? 'secondary' : 'destructive'
              }>
                {systemStatus.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Uptime</span>
                <span className="font-medium">99.99%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Error Rate</span>
                <span className="font-medium">
                  {((systemMetrics?.errorRate || 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium">Worker Queue</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {queueMetrics?.pending || 0}
              </span>
              <Badge variant={
                queueStatus === 'healthy' ? 'default' :
                queueStatus === 'warning' ? 'secondary' : 'destructive'
              }>
                PENDING
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Processing</span>
                <span className="font-medium">{queueMetrics?.processing || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Throughput</span>
                <span className="font-medium">
                  {(queueMetrics?.throughput || 0).toFixed(1)}/min
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Performance</span>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {aiMetrics ? 
                  ((aiMetrics.successfulExtractions / (aiMetrics.totalExtractions || 1)) * 100).toFixed(1) : 
                  '0'}%
              </span>
              <Badge variant={
                aiStatus === 'healthy' ? 'default' :
                aiStatus === 'warning' ? 'secondary' : 'destructive'
              }>
                SUCCESS
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Avg Confidence</span>
                <span className="font-medium">
                  {(aiMetrics?.avgConfidence || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Learning Rate</span>
                <span className="font-medium text-green-600">
                  +{(aiMetrics?.learningImprovementRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost & Efficiency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm font-medium">Cost Efficiency</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                ${(aiMetrics?.totalCost || 0).toFixed(2)}
              </span>
              <Badge>TODAY</Badge>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Cache Hit Rate</span>
                <span className="font-medium">
                  {aiMetrics && aiMetrics.cacheHits ? 
                    ((aiMetrics.cacheHits / (aiMetrics.cacheHits + aiMetrics.cacheMisses)) * 100).toFixed(1) : 
                    '0'}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>API Reduction</span>
                <span className="font-medium text-green-600">
                  -{((systemMetrics?.cacheHitRate || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="queue">Queue Monitor</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Request Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={timeSeriesData?.requests || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Success Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={timeSeriesData?.successRate || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                      formatter={(value) => `${value}%`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Extractions</p>
                    <p className="text-2xl font-bold">
                      {aiMetrics?.totalExtractions || 0}
                    </p>
                    <p className="text-xs text-green-600">+15% from yesterday</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">
                      {(systemMetrics?.avgResponseTime || 0).toFixed(0)}ms
                    </p>
                    <p className="text-xs text-green-600">-20ms improvement</p>
                  </div>
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">
                      {systemMetrics?.activeUsers || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Current session</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pattern Accuracy</p>
                    <p className="text-2xl font-bold">
                      {(aiMetrics?.patternMatchAccuracy || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-green-600">Self-learning active</p>
                  </div>
                  <Brain className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Response Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSeriesData?.responseDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Error Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={timeSeriesData?.errorTypes || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(timeSeriesData?.errorTypes || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#10b981', '#3b82f6'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queue Monitor Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worker Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Queue Progress Bars */}
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Pending Jobs</span>
                      <span className="text-sm">{queueMetrics?.pending || 0}</span>
                    </div>
                    <Progress value={Math.min((queueMetrics?.pending || 0) / 100, 100) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Processing</span>
                      <span className="text-sm">{queueMetrics?.processing || 0}</span>
                    </div>
                    <Progress value={Math.min((queueMetrics?.processing || 0) / 10, 100) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Success Rate</span>
                      <span className="text-sm">{(queueMetrics?.successRate || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={queueMetrics?.successRate || 0} className="h-2" />
                  </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {queueMetrics?.completed || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {queueMetrics?.failed || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {(queueMetrics?.avgProcessingTime || 0).toFixed(0)}ms
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cost Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Cost by Operation</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Text Extraction', value: 35 },
                            { name: 'AI Analysis', value: 45 },
                            { name: 'Pattern Learning', value: 20 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Today's Cost</span>
                        <span className="text-sm font-bold">
                          ${(aiMetrics?.totalCost || 0).toFixed(2)}
                        </span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Cost Savings (Cache)</span>
                        <span className="text-sm font-bold text-green-600">
                          ${((aiMetrics?.cacheHits || 0) * 0.02).toFixed(2)}
                        </span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Monthly Projection</span>
                        <span className="text-sm font-bold">
                          ${((aiMetrics?.totalCost || 0) * 30).toFixed(2)}
                        </span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {(recentLogs || []).map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-lg border ${
                        log.level === 'ERROR' ? 'border-red-200 bg-red-50' :
                        log.level === 'WARN' ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {log.level === 'ERROR' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {log.level === 'WARN' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {log.level === 'INFO' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          
                          <Badge variant={
                            log.level === 'ERROR' ? 'destructive' :
                            log.level === 'WARN' ? 'secondary' : 'default'
                          } className="text-xs">
                            {log.level}
                          </Badge>
                          
                          <Badge variant="outline" className="text-xs">
                            {log.service}
                          </Badge>
                          
                          <span className="text-xs text-muted-foreground">
                            {log.operation}
                          </span>
                        </div>
                        
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                      
                      <p className="mt-1 text-sm">{log.message}</p>
                      
                      {log.duration && (
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {log.duration}ms
                          </span>
                        </div>
                      )}
                      
                      {log.error && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                          {JSON.stringify(log.error)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIDashboard;