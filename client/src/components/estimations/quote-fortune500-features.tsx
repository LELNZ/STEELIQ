import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  BarChart,
  Download,
  Send,
  History,
  Shield,
  Zap
} from "lucide-react";

// Enterprise-grade quote features
export const Fortune500QuoteFeatures = {
  // 1. Professional Quote Tracking
  trackingFeatures: {
    versionControl: {
      icon: History,
      title: "Version Control & History",
      description: "Track all quote iterations with full audit trail",
      features: [
        "Automatic version numbering",
        "Change highlighting between versions",
        "Revert to previous versions",
        "Version comparison tool"
      ]
    },
    approvalWorkflow: {
      icon: Shield,
      title: "Multi-level Approval Workflow",
      description: "Enterprise approval chains based on value",
      features: [
        "Manager approval for quotes > $50,000",
        "Director approval for quotes > $250,000",
        "Board approval for quotes > $1,000,000",
        "Electronic signatures with timestamps"
      ]
    },
    clientPortal: {
      icon: Users,
      title: "Client Self-Service Portal",
      description: "Let clients review and accept quotes online",
      features: [
        "Secure client login",
        "Real-time quote status",
        "Electronic acceptance",
        "Direct messaging with estimator"
      ]
    }
  },

  // 2. Advanced Analytics
  analyticsFeatures: {
    winRateAnalysis: {
      icon: BarChart,
      title: "Win Rate Analytics",
      description: "Track quote success metrics",
      metrics: [
        "Quote-to-job conversion rate",
        "Average quote value by client",
        "Time to close analysis",
        "Competitor win/loss analysis"
      ]
    },
    pricingIntelligence: {
      icon: TrendingUp,
      title: "Dynamic Pricing Intelligence",
      description: "AI-powered pricing optimization",
      features: [
        "Market rate comparison",
        "Historical pricing trends",
        "Margin optimization suggestions",
        "Competitor pricing analysis"
      ]
    }
  },

  // 3. Enterprise Automation
  automationFeatures: {
    smartTemplates: {
      icon: Zap,
      title: "Smart Quote Templates",
      description: "Industry-specific templates with dynamic content",
      templates: [
        "Commercial construction",
        "Industrial fabrication",
        "Infrastructure projects",
        "Maintenance contracts"
      ]
    },
    followUpAutomation: {
      icon: Clock,
      title: "Automated Follow-up System",
      description: "Never lose a quote opportunity",
      features: [
        "Automated reminder emails",
        "Quote expiry notifications",
        "Client engagement tracking",
        "Sales pipeline integration"
      ]
    }
  }
};

export function QuoteFortune500Banner() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Shield className="h-5 w-5" />
          Enterprise Quote Management System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Industry Integration</p>
              <p className="text-sm text-muted-foreground">
                Full fabrication workflow tracking
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Advanced Analytics</p>
              <p className="text-sm text-muted-foreground">
                Real-time project insights
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">Enterprise Automation</p>
              <p className="text-sm text-muted-foreground">
                AI-powered quote optimization
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuoteComparisonTable({ quotes }: { quotes: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2">Version</th>
            <th className="text-left py-3 px-2">Date</th>
            <th className="text-left py-3 px-2">Total</th>
            <th className="text-left py-3 px-2">Status</th>
            <th className="text-left py-3 px-2">Changes</th>
            <th className="text-left py-3 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote, index) => (
            <tr key={quote.id} className="border-b hover:bg-muted/50">
              <td className="py-3 px-2">
                <Badge variant={index === 0 ? "default" : "secondary"}>
                  v{quote.version}
                </Badge>
              </td>
              <td className="py-3 px-2 text-sm">
                {new Date(quote.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-2 font-medium">
                ${quote.totalAmount?.toLocaleString() || '0'}
              </td>
              <td className="py-3 px-2">
                <Badge 
                  variant={
                    quote.status === 'accepted' ? 'success' :
                    quote.status === 'sent' ? 'default' :
                    quote.status === 'expired' ? 'destructive' :
                    'secondary'
                  }
                >
                  {quote.status}
                </Badge>
              </td>
              <td className="py-3 px-2 text-sm">
                {index > 0 && (
                  <span className={
                    quote.totalAmount > quotes[index - 1].totalAmount 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }>
                    {quote.totalAmount > quotes[index - 1].totalAmount ? '+' : ''}
                    {((quote.totalAmount - quotes[index - 1].totalAmount) / quotes[index - 1].totalAmount * 100).toFixed(1)}%
                  </span>
                )}
              </td>
              <td className="py-3 px-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuoteMetrics({ estimation }: { estimation: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Quote Value</p>
              <p className="text-2xl font-bold">
                ${(parseFloat(estimation.project?.totalCost || estimation.totalCost || '0') * 1.15).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Versions</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Days to Close</p>
              <p className="text-2xl font-bold">14</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">72%</p>
            </div>
            <BarChart className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}