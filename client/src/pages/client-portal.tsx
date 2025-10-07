import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Send,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  User,
  FileCheck,
  Shield
} from 'lucide-react';

interface ClientProject {
  id: number;
  projectNumber: string;
  projectDescription: string;
  currentPhase: string;
  phaseStatus: string;
  estimatedValue: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  dueDate: string;
  createdAt: string;
  estimatorName: string;
  estimatorContact: string;
}

interface QuoteItem {
  partMark: string;
  description: string;
  materialCode: string;
  quantity: number;
  length: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
}

// Client Portal Dashboard
export default function ClientPortal() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [clientFeedback, setClientFeedback] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Fetch project data from API
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/client-portal/projects'],
    enabled: true
  });
  
  const projectId = projects?.[0]?.id || 1;
  
  // Fetch quote items from API
  const { data: quoteItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/client-portal/quote-items', projectId],
    enabled: !!projectId
  });
  
  // Use first project as selected or create default structure
  const currentProject: ClientProject = projects?.[0] || {
    id: projectId,
    projectNumber: "Loading...",
    projectDescription: "Loading project details...",
    currentPhase: "initial_simulation",
    phaseStatus: "pending_review",
    estimatedValue: 0,
    materialCost: 0,
    laborCost: 0,
    equipmentCost: 0,
    totalCost: 0,
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString().split('T')[0],
    estimatorName: "Your Estimator",
    estimatorContact: "estimator@lateralengineering.co.nz"
  };

  // Client approval mutation
  const submitApproval = useMutation({
    mutationFn: async (approvalData: { status: string; feedback: string }) => {
      return apiRequest(`/api/projects/${currentProject.id}/client-approval`, {
        method: 'POST',
        body: JSON.stringify(approvalData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Response Submitted",
        description: "Your feedback has been sent to Lateral Engineering",
      });
    }
  });

  const handleApproval = (status: 'approved' | 'rejected') => {
    setApprovalStatus(status);
    submitApproval.mutate({ status, feedback: clientFeedback });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Branded Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Lateral Engineering Limited
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Steel Fabrication Project Portal
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">Welcome</p>
              <p className="font-medium">Construction Company Ltd</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Project Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{currentProject.projectDescription}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Project #{currentProject.projectNumber}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge 
                  variant={currentProject.phaseStatus === 'pending_review' ? 'default' : 'secondary'}
                  className="mb-2"
                >
                  {currentProject.phaseStatus.replace('_', ' ').toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Due: {new Date(currentProject.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">Project Estimator</p>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{currentProject.estimatorName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{currentProject.estimatorContact}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+64 9 123 4567</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">Project Timeline</p>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Quote Submitted: {new Date(currentProject.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Response Due: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300">Estimated Value</p>
                <div className="text-3xl font-bold text-green-600">
                  ${currentProject.totalCost.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  GST Inclusive
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="estimate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="estimate">Quote Details</TabsTrigger>
            <TabsTrigger value="drawings">Drawings</TabsTrigger>
            <TabsTrigger value="timeline">Project Timeline</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
          </TabsList>

          {/* Quote Details Tab */}
          <TabsContent value="estimate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between py-2">
                      <span>Materials</span>
                      <span className="font-medium">${currentProject.materialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Labor</span>
                      <span className="font-medium">${currentProject.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Equipment & Machinery</span>
                      <span className="font-medium">${currentProject.equipmentCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Consumables & Welding</span>
                      <span className="font-medium">$3,420</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Project Management & Overhead</span>
                      <span className="font-medium">$10,220</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between py-2 text-lg font-bold">
                      <span>Total (GST Inclusive)</span>
                      <span>${currentProject.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Cost Distribution</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Materials</span>
                          <span>47%</span>
                        </div>
                        <Progress value={47} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Labor</span>
                          <span>30%</span>
                        </div>
                        <Progress value={30} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Equipment</span>
                          <span>9%</span>
                        </div>
                        <Progress value={9} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Other Costs</span>
                          <span>14%</span>
                        </div>
                        <Progress value={14} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Quote Items */}
            <Card>
              <CardHeader>
                <CardTitle>Material Schedule</CardTitle>
                <CardDescription>
                  Detailed breakdown of steel elements and quantities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Part Mark</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Material Code</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Length (mm)</th>
                        <th className="text-right p-3">Weight (kg/m)</th>
                        <th className="text-right p-3">Unit Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-3 font-medium">{item.partMark}</td>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 font-mono text-sm">{item.materialCode}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{item.length.toLocaleString()}</td>
                          <td className="p-3 text-right">{item.weight}</td>
                          <td className="p-3 text-right">${item.unitPrice}</td>
                          <td className="p-3 text-right font-medium">${item.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Detailed Quote (PDF)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drawings Tab */}
          <TabsContent value="drawings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Drawings
                </CardTitle>
                <CardDescription>
                  Review construction drawings with AI-analyzed elements highlighted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Structural Plan - Ground Level", type: "Structural Plan", status: "reviewed", confidence: 89 },
                  { name: "Elevation - North & South", type: "Elevation", status: "reviewed", confidence: 92 },
                  { name: "Connection Details - Sheet 1", type: "Detail", status: "reviewed", confidence: 85 },
                  { name: "Foundation Plan", type: "Foundation", status: "reviewed", confidence: 88 }
                ].map((drawing, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center space-x-4">
                      <FileCheck className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium">{drawing.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{drawing.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant="secondary">AI Confidence: {drawing.confidence}%</Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {drawing.status === 'reviewed' ? 'Reviewed & Analyzed' : 'Processing'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    All drawings have been analyzed using AI technology to identify steel elements and verify quantities. 
                    Click "View" to see interactive highlighting of detected components.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Project Timeline
                </CardTitle>
                <CardDescription>
                  Estimated schedule from approval to completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { phase: "Client Approval", duration: "7 days", status: "current", date: "Due: Jun 22" },
                    { phase: "Shop Drawings", duration: "10 days", status: "pending", date: "Jun 23 - Jul 2" },
                    { phase: "Material Procurement", duration: "14 days", status: "pending", date: "Jun 25 - Jul 8" },
                    { phase: "Fabrication", duration: "21 days", status: "pending", date: "Jul 3 - Jul 24" },
                    { phase: "Delivery & Installation", duration: "5 days", status: "pending", date: "Jul 25 - Jul 29" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        item.status === 'current' 
                          ? 'bg-blue-600 border-blue-600' 
                          : item.status === 'completed'
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{item.phase}</h4>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Duration: {item.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Important Timeline Notes
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Material procurement begins upon client approval</li>
                    <li>• Weather conditions may affect installation schedule</li>
                    <li>• Site access requirements to be confirmed prior to delivery</li>
                    <li>• Final completion date: July 29, 2025</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approval Tab */}
          <TabsContent value="approval" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quote Approval
                </CardTitle>
                <CardDescription>
                  Review and respond to the project estimate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    This quote is valid for 30 days from issue date. Please respond by June 22, 2025.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Comments or Questions (Optional)
                    </label>
                    <textarea
                      value={clientFeedback}
                      onChange={(e) => setClientFeedback(e.target.value)}
                      className="w-full p-3 border rounded-lg resize-none"
                      rows={4}
                      placeholder="Please provide any feedback, questions, or specific requirements..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproval('approved')}
                      disabled={submitApproval.isPending || approvalStatus !== 'pending'}
                    >
                      <ThumbsUp className="h-5 w-5 mr-2" />
                      Approve Quote
                    </Button>
                    
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleApproval('rejected')}
                      disabled={submitApproval.isPending || approvalStatus !== 'pending'}
                    >
                      <ThumbsDown className="h-5 w-5 mr-2" />
                      Request Changes
                    </Button>
                  </div>

                  {approvalStatus !== 'pending' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your response has been submitted. Lateral Engineering will contact you within 24 hours.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="pt-6 border-t">
                  <h4 className="font-medium mb-4">Need to Discuss?</h4>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call: +64 9 123 4567
                    </Button>
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Estimator
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}