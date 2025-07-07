import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, TrendingUp, AlertTriangle, CheckCircle, Clock, User, Target, Award, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PerformanceReview, TeamMember } from "@shared/schema";

interface PerformanceReviewSystemProps {
  teamMember: TeamMember;
  isOpen: boolean;
  onClose: () => void;
}

// Steel Fabrication KPI Categories
const KPI_CATEGORIES = [
  {
    key: 'productionQuality',
    label: 'Production Quality',
    description: 'Defect rates, rework frequency, precision in work',
    icon: Star,
    color: 'blue'
  },
  {
    key: 'safetyCompliance',
    label: 'Safety Compliance',
    description: 'Safety protocol adherence, incident rates, safety awareness',
    icon: AlertTriangle,
    color: 'red'
  },
  {
    key: 'technicalSkills',
    label: 'Technical Skills',
    description: 'Welding proficiency, equipment operation, blueprint reading',
    icon: Award,
    color: 'purple'
  },
  {
    key: 'teamwork',
    label: 'Teamwork & Collaboration',
    description: 'Cross-functional cooperation, communication, support',
    icon: User,
    color: 'green'
  },
  {
    key: 'reliability',
    label: 'Reliability & Attendance',
    description: 'Punctuality, consistency, dependability',
    icon: Clock,
    color: 'orange'
  },
  {
    key: 'problemSolving',
    label: 'Problem Solving',
    description: 'Troubleshooting, innovation, continuous improvement',
    icon: TrendingUp,
    color: 'indigo'
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Clear reporting, issue escalation, documentation',
    icon: FileText,
    color: 'teal'
  },
  {
    key: 'initiative',
    label: 'Initiative & Leadership',
    description: 'Proactive approach, mentoring, process improvement',
    icon: Target,
    color: 'yellow'
  }
];

// Review Types
const REVIEW_TYPES = [
  { value: 'probation', label: '90-Day Probation Review', duration: 90 },
  { value: 'annual', label: 'Annual Performance Review', duration: 365 },
  { value: 'project', label: 'Project-Based Review', duration: null },
  { value: 'improvement', label: 'Performance Improvement Review', duration: 90 }
];

export function PerformanceReviewSystem({ teamMember, isOpen, onClose }: PerformanceReviewSystemProps) {
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [formData, setFormData] = useState<any>({
    reviewType: 'annual',
    reviewPeriodStart: '',
    reviewPeriodEnd: '',
    productionQuality: '',
    safetyCompliance: '',
    technicalSkills: '',
    teamwork: '',
    reliability: '',
    problemSolving: '',
    communication: '',
    initiative: '',
    defectRate: '',
    productivityScore: '',
    attendanceScore: '',
    safetyIncidents: '0',
    achievements: '',
    areasForImprovement: '',
    developmentGoals: '',
    trainingRecommendations: '',
    employeeComments: '',
    managerComments: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch performance reviews for this team member
  const { data: reviews, isLoading } = useQuery({
    queryKey: [`/api/performance-reviews/${teamMember.id}`],
    enabled: !!teamMember.id && isOpen
  });

  // Create performance review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return await apiRequest(`/api/performance-reviews`, {
        method: 'POST',
        body: JSON.stringify({
          ...reviewData,
          teamMemberId: teamMember.id
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Performance Review Created",
        description: "Review has been saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/performance-reviews/${teamMember.id}`] });
      setShowCreateReview(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      reviewType: 'annual',
      reviewPeriodStart: '',
      reviewPeriodEnd: '',
      productionQuality: '',
      safetyCompliance: '',
      technicalSkills: '',
      teamwork: '',
      reliability: '',
      problemSolving: '',
      communication: '',
      initiative: '',
      defectRate: '',
      productivityScore: '',
      attendanceScore: '',
      safetyIncidents: '0',
      achievements: '',
      areasForImprovement: '',
      developmentGoals: '',
      trainingRecommendations: '',
      employeeComments: '',
      managerComments: ''
    });
  };

  const handleSubmit = () => {
    // Calculate overall rating based on KPIs
    const kpiScores = [
      formData.productionQuality,
      formData.safetyCompliance,
      formData.technicalSkills,
      formData.teamwork,
      formData.reliability,
      formData.problemSolving,
      formData.communication,
      formData.initiative
    ].filter(score => score && !isNaN(parseFloat(score))).map(score => parseFloat(score));

    const overallRating = kpiScores.length > 0 
      ? (kpiScores.reduce((sum, score) => sum + score, 0) / kpiScores.length).toFixed(2)
      : null;

    createReviewMutation.mutate({
      ...formData,
      overallRating: overallRating ? parseFloat(overallRating) : null
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-50';
    if (rating >= 3.5) return 'text-blue-600 bg-blue-50';
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 3.5) return 'Proficient';
    if (rating >= 2.5) return 'Developing';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            Performance Reviews - {teamMember.firstName} {teamMember.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Review Summary */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Review Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {reviews?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reviews?.filter((r: any) => r.reviewStatus === 'completed').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {reviews?.filter((r: any) => r.reviewStatus === 'pending').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowCreateReview(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create New Review
            </Button>
          </div>

          {/* Existing Reviews List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review History</h3>
            {isLoading ? (
              <div className="text-center py-8">Loading reviews...</div>
            ) : reviews?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No performance reviews found. Create the first review to get started.
              </div>
            ) : (
              <div className="grid gap-4">
                {reviews?.map((review: any) => (
                  <Card key={review.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {review.reviewType}
                            </Badge>
                            <Badge 
                              className={`${review.reviewStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                                review.reviewStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}`}
                            >
                              {review.reviewStatus}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Review Period: {new Date(review.reviewPeriodStart).toLocaleDateString()} - {new Date(review.reviewPeriodEnd).toLocaleDateString()}
                          </div>
                        </div>
                        {review.overallRating && (
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(review.overallRating)}`}>
                            {review.overallRating}/5.0 - {getRatingLabel(review.overallRating)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Create Review Modal */}
          {showCreateReview && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">Create New Performance Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Review Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Review Type</Label>
                    <Select value={formData.reviewType} onValueChange={(value) => setFormData({...formData, reviewType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEW_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Period Start</Label>
                    <Input
                      type="date"
                      value={formData.reviewPeriodStart}
                      onChange={(e) => setFormData({...formData, reviewPeriodStart: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Period End</Label>
                    <Input
                      type="date"
                      value={formData.reviewPeriodEnd}
                      onChange={(e) => setFormData({...formData, reviewPeriodEnd: e.target.value})}
                    />
                  </div>
                </div>

                {/* KPI Ratings */}
                <div>
                  <h4 className="font-semibold mb-4">Performance Ratings (1-5 Scale)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    {KPI_CATEGORIES.map((category) => (
                      <div key={category.key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <category.icon className={`h-4 w-4 text-${category.color}-600`} />
                          <Label className="text-sm font-medium">{category.label}</Label>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{category.description}</div>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          placeholder="1.0 - 5.0"
                          value={formData[category.key]}
                          onChange={(e) => setFormData({...formData, [category.key]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quantitative Metrics */}
                <div>
                  <h4 className="font-semibold mb-4">Quantitative Metrics</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Defect Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.defectRate}
                        onChange={(e) => setFormData({...formData, defectRate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Productivity (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="100.0"
                        value={formData.productivityScore}
                        onChange={(e) => setFormData({...formData, productivityScore: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Attendance (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="100.0"
                        value={formData.attendanceScore}
                        onChange={(e) => setFormData({...formData, attendanceScore: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Safety Incidents</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.safetyIncidents}
                        onChange={(e) => setFormData({...formData, safetyIncidents: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Comments and Development */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Comments and Development</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Key Achievements</Label>
                      <Textarea
                        placeholder="Notable accomplishments during review period..."
                        value={formData.achievements}
                        onChange={(e) => setFormData({...formData, achievements: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Areas for Improvement</Label>
                      <Textarea
                        placeholder="Skills or behaviors to develop..."
                        value={formData.areasForImprovement}
                        onChange={(e) => setFormData({...formData, areasForImprovement: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Development Goals</Label>
                      <Textarea
                        placeholder="Specific goals for next review period..."
                        value={formData.developmentGoals}
                        onChange={(e) => setFormData({...formData, developmentGoals: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Training Recommendations</Label>
                      <Textarea
                        placeholder="Recommended courses or certifications..."
                        value={formData.trainingRecommendations}
                        onChange={(e) => setFormData({...formData, trainingRecommendations: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Manager Comments</Label>
                    <Textarea
                      placeholder="Overall manager assessment and feedback..."
                      value={formData.managerComments}
                      onChange={(e) => setFormData({...formData, managerComments: e.target.value})}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSubmit} disabled={createReviewMutation.isPending}>
                    {createReviewMutation.isPending ? 'Creating...' : 'Save Review'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateReview(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}