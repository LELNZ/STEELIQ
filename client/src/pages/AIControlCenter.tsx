/**
 * AI Control Center - Fortune 50 Level Unified AI Hub
 * Central command for all AI-powered operations in STEELIQ
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Activity, AlertCircle, CheckCircle, Clock, Database, Upload,
  FileText, TrendingUp, Users, Zap, Brain, Server, ArrowRight,
  Shield, Package, AlertTriangle, BarChart3, Play, Pause,
  FileSearch, Calculator, Workflow, DollarSign, Target,
  Sparkles, ChevronRight, RefreshCw, Settings, HelpCircle,
  Layers, Bot, Gauge, CheckSquare, XCircle
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

// Interfaces
interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  estimatedTime?: string;
  completedAt?: Date;
  error?: string;
}

interface ActiveWorkflow {
  id: string;
  type: 'drawing-analysis' | 'mto-generation' | 'cost-estimation' | 'pattern-learning';
  name: string;
  startedAt: Date;
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
  progress: number;
}

interface QuickLaunchCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: string;
  status?: 'available' | 'processing' | 'disabled';
  metrics?: {
    label: string;
    value: string | number;
  };
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'success' | 'destructive';
}

interface AIMetrics {
  totalProcessed: number;
  successRate: number;
  avgProcessingTime: number;
  costSavings: number;
  accuracyRate: number;
  learningImprovement: number;
  queueLength: number;
  activeWorkers: number;
  cacheHitRate: number;
  apiCostReduction: number;
}

interface AIAssistantSuggestion {
  id: string;
  type: 'action' | 'insight' | 'warning';
  title: string;
  description: string;
  action?: () => void;
  priority: 'high' | 'medium' | 'low';
}

const AIControlCenter = () => {
  const [location, setLocation] = useLocation();
  const [selectedView, setSelectedView] = useState<'estimator' | 'operations' | 'executive'>('estimator');
  const [activeWorkflows, setActiveWorkflows] = useState<ActiveWorkflow[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch AI metrics
  const { data: aiMetrics } = useQuery<AIMetrics>({
    queryKey: ['/api/ai/metrics/summary'],
    refetchInterval: autoRefresh ? 10000 : false
  });

  // Fetch active workflows
  const { data: workflows } = useQuery<ActiveWorkflow[]>({
    queryKey: ['/api/ai/workflows/active'],
    refetchInterval: autoRefresh ? 5000 : false
  });

  // Quick Launch Cards Configuration
  const quickLaunchCards: QuickLaunchCard[] = [
    {
      id: 'upload-drawing',
      title: 'Upload Drawing',
      description: 'Process PDF, DXF, DWG, or IFC files',
      icon: Upload,
      action: '/drawing-intelligence',
      status: 'available',
      metrics: { label: 'Queue', value: aiMetrics?.queueLength || 0 },
      badge: 'QUICK',
      badgeVariant: 'success'
    },
    {
      id: 'analyze-mto',
      title: 'Analyze MTO',
      description: 'Extract material take-off with AI',
      icon: FileSearch,
      action: '/estimation',
      status: workflows?.some(w => w.type === 'mto-generation') ? 'processing' : 'available',
      metrics: { label: 'Accuracy', value: `${aiMetrics?.accuracyRate || 95}%` }
    },
    {
      id: 'cost-estimation',
      title: 'Cost Estimation',
      description: 'Generate detailed cost breakdown',
      icon: Calculator,
      action: '/estimation-pipeline',
      status: 'available',
      metrics: { label: 'Saved', value: `$${(aiMetrics?.costSavings || 0).toLocaleString()}` }
    },
    {
      id: 'pattern-learning',
      title: 'Pattern Learning',
      description: 'View AI self-learning progress',
      icon: Brain,
      action: '#learning',
      status: 'available',
      metrics: { label: 'Improvement', value: `+${aiMetrics?.learningImprovement || 15}%` },
      badge: 'AI',
      badgeVariant: 'secondary'
    },
    {
      id: 'queue-status',
      title: 'Queue Monitor',
      description: 'View processing queue status',
      icon: Package,
      action: '#queue',
      status: aiMetrics?.queueLength && aiMetrics.queueLength > 0 ? 'processing' : 'available',
      metrics: { label: 'Active', value: aiMetrics?.activeWorkers || 0 }
    },
    {
      id: 'roi-dashboard',
      title: 'ROI Dashboard',
      description: 'View cost savings & efficiency',
      icon: TrendingUp,
      action: '#roi',
      status: 'available',
      metrics: { label: 'API Savings', value: `${aiMetrics?.apiCostReduction || 60}%` },
      badge: 'NEW',
      badgeVariant: 'success'
    }
  ];

  // AI Assistant Suggestions
  const getAIAssistantSuggestions = (): AIAssistantSuggestion[] => {
    const suggestions: AIAssistantSuggestion[] = [];

    // Check for pending items
    if (aiMetrics?.queueLength && aiMetrics.queueLength > 10) {
      suggestions.push({
        id: 'high-queue',
        type: 'warning',
        title: 'High Queue Volume',
        description: `${aiMetrics.queueLength} drawings pending. Consider scaling workers.`,
        priority: 'high',
        action: () => setLocation('/ai-dashboard?tab=queue')
      });
    }

    // Check for learning opportunities
    if (aiMetrics?.learningImprovement && aiMetrics.learningImprovement < 10) {
      suggestions.push({
        id: 'learning-opportunity',
        type: 'insight',
        title: 'Learning Opportunity',
        description: 'Review recent corrections to improve AI accuracy.',
        priority: 'medium',
        action: () => setLocation('/ai-dashboard?tab=learning')
      });
    }

    // Suggest next action based on workflows
    if (!workflows || workflows.length === 0) {
      suggestions.push({
        id: 'start-workflow',
        type: 'action',
        title: 'Ready to Process',
        description: 'Upload a drawing to start AI analysis.',
        priority: 'medium',
        action: () => setLocation('/drawing-intelligence')
      });
    }

    // Cost savings insight
    if (aiMetrics?.costSavings && aiMetrics.costSavings > 10000) {
      suggestions.push({
        id: 'cost-milestone',
        type: 'insight',
        title: 'Milestone Achieved!',
        description: `You've saved $${aiMetrics.costSavings.toLocaleString()} this month.`,
        priority: 'low'
      });
    }

    return suggestions;
  };

  const suggestions = getAIAssistantSuggestions();

  // Workflow Timeline Component
  const WorkflowTimeline = ({ workflow }: { workflow: ActiveWorkflow }) => {
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">{workflow.name}</h4>
            <p className="text-sm text-muted-foreground">
              Started {format(new Date(workflow.startedAt), 'HH:mm:ss')}
            </p>
          </div>
          <Badge variant={workflow.progress === 100 ? 'success' : 'default'}>
            {workflow.progress}% Complete
          </Badge>
        </div>

        <div className="relative">
          <Progress value={workflow.progress} className="h-2 mb-4" />
          
          <div className="flex justify-between relative">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index < workflow.steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    step.status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : step.status === 'active'
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                      : step.status === 'error'
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'bg-background border-muted-foreground'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === 'active' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : step.status === 'error' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium">{step.name}</p>
                  {step.estimatedTime && step.status === 'active' && (
                    <p className="text-xs text-muted-foreground">
                      ~{step.estimatedTime}
                    </p>
                  )}
                  {step.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(step.completedAt), 'HH:mm:ss')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {workflow.steps.find(s => s.status === 'error') && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {workflow.steps.find(s => s.status === 'error')?.error || 'An error occurred'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Header with Persona Switcher */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Control Center
              </h1>
              <p className="text-muted-foreground mt-1">
                Unified command center for all AI-powered operations • Fortune 50 Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Persona Switcher */}
            <div className="flex gap-2 p-1 bg-background/50 rounded-lg backdrop-blur">
              <Button
                size="sm"
                variant={selectedView === 'estimator' ? 'default' : 'ghost'}
                onClick={() => setSelectedView('estimator')}
              >
                <Calculator className="h-4 w-4 mr-1" />
                Estimator
              </Button>
              <Button
                size="sm"
                variant={selectedView === 'operations' ? 'default' : 'ghost'}
                onClick={() => setSelectedView('operations')}
              >
                <Gauge className="h-4 w-4 mr-1" />
                Operations
              </Button>
              <Button
                size="sm"
                variant={selectedView === 'executive' ? 'default' : 'ghost'}
                onClick={() => setSelectedView('executive')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Executive
              </Button>
            </div>

            {/* Auto-refresh Toggle */}
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
                  <Pause className="h-4 w-4 mr-1" />
                  Paused
                </>
              )}
            </Button>

            {/* Help Button */}
            <Button variant="outline" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-6 gap-4 mt-6">
          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Processed Today</span>
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{aiMetrics?.totalProcessed || 0}</p>
            <p className="text-xs text-green-600">+12% from yesterday</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Success Rate</span>
              <Target className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{aiMetrics?.successRate || 98}%</p>
            <p className="text-xs text-green-600">Above target</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Avg Time</span>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{aiMetrics?.avgProcessingTime || 45}s</p>
            <p className="text-xs text-orange-600">-5s improvement</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cost Saved</span>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(aiMetrics?.costSavings || 18500).toLocaleString()}
            </p>
            <p className="text-xs text-green-600">This month</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Learning Rate</span>
              <Brain className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-1">+{aiMetrics?.learningImprovement || 15}%</p>
            <p className="text-xs text-purple-600">After 10 runs</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Queue</span>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{aiMetrics?.queueLength || 0}</p>
            <p className="text-xs text-muted-foreground">
              {aiMetrics?.activeWorkers || 0} workers active
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Active Workflows Timeline */}
        {workflows && workflows.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-blue-500" />
                    Active Workflows
                  </CardTitle>
                  <CardDescription>
                    Real-time tracking of AI processing pipelines
                  </CardDescription>
                </div>
                <Badge variant="outline" className="animate-pulse">
                  {workflows.length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {workflows.map(workflow => (
                <WorkflowTimeline key={workflow.id} workflow={workflow} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Launch Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </h2>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Customize
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {quickLaunchCards.map(card => (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                  card.status === 'disabled' ? 'opacity-50' : ''
                } ${card.status === 'processing' ? 'border-blue-500 animate-pulse' : ''}`}
                onClick={() => {
                  if (card.status !== 'disabled') {
                    if (card.action.startsWith('#')) {
                      // Internal navigation
                      const tab = card.action.substring(1);
                      // Handle internal tab switching
                    } else {
                      setLocation(card.action);
                    }
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <card.icon className={`h-8 w-8 ${
                      card.status === 'processing' ? 'text-blue-500' : 'text-muted-foreground'
                    }`} />
                    {card.badge && (
                      <Badge variant={card.badgeVariant || 'default'}>{card.badge}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                {card.metrics && (
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">{card.metrics.label}</span>
                      <span className="text-lg font-bold">{card.metrics.value}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* AI Assistant Panel */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Intelligent suggestions based on your workflow
                </CardDescription>
              </div>
              <Badge variant="secondary">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map(suggestion => (
                  <Alert
                    key={suggestion.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      suggestion.type === 'warning'
                        ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20'
                        : suggestion.type === 'insight'
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
                        : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                    }`}
                    onClick={suggestion.action}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {suggestion.type === 'warning' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          )}
                          {suggestion.type === 'insight' && (
                            <Sparkles className="h-4 w-4 text-blue-600" />
                          )}
                          {suggestion.type === 'action' && (
                            <Play className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium text-sm">{suggestion.title}</span>
                          <Badge
                            variant={
                              suggestion.priority === 'high'
                                ? 'destructive'
                                : suggestion.priority === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                      {suggestion.action && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>All systems optimal. No actions needed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Metrics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="costs">ROI Analysis</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* System Health Radial Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      data={[
                        { name: 'Health', value: 98, fill: '#10b981' }
                      ]}
                    >
                      <RadialBar dataKey="value" cornerRadius={10} fill="#10b981" />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-3xl font-bold"
                      >
                        98%
                      </text>
                      <text
                        x="50%"
                        y="50%"
                        dy={25}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm text-muted-foreground"
                      >
                        Optimal
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Processing Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Processing Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'PDF Analysis', value: 45, fill: '#3b82f6' },
                          { name: 'DXF Processing', value: 30, fill: '#10b981' },
                          { name: 'MTO Generation', value: 15, fill: '#f59e0b' },
                          { name: 'Cost Estimation', value: 10, fill: '#8b5cf6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((entry, index) => (
                          <Cell key={`cell-${index}`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Other tabs would follow similar pattern */}
        </Tabs>
      </div>
    </div>
  );
};

export default AIControlCenter;