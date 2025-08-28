import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Edit,
  Save,
  X,
  Mail,
  Trophy,
  XCircle,
  Send,
  Plus,
  Copy,
  Eye,
  Bell,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
  variables: string[];
  isActive: boolean;
}

export default function EmailTemplates() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EmailTemplate | null>(null);

  // Pre-defined email templates for RFQ notifications
  const templates: EmailTemplate[] = [
    {
      id: "acceptance-standard",
      name: "Standard Acceptance",
      subject: "Congratulations! Your quote for {RFQ_NUMBER} has been accepted",
      message: `Dear {SUPPLIER_NAME},

We are pleased to inform you that your quote for RFQ {RFQ_NUMBER} - {RFQ_TITLE} has been accepted.

Quote Details:
• Quote Amount: {QUOTE_AMOUNT}
• Delivery Timeline: {DELIVERY_DAYS} days (by {DELIVERY_DATE})

Next Steps:
1. A purchase order will be issued shortly
2. Please acknowledge receipt within 24 hours
3. Confirm the delivery schedule

We look forward to working with you on this project. Our procurement team will contact you with the formal purchase order within 1-2 business days.

Best regards,
Lateral Engineering Limited
Procurement Team`,
      category: "acceptance",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{RFQ_TITLE}", "{QUOTE_AMOUNT}", "{DELIVERY_DAYS}", "{DELIVERY_DATE}"],
      isActive: true
    },
    {
      id: "acceptance-urgent",
      name: "Urgent Acceptance",
      subject: "URGENT: Your quote for {RFQ_NUMBER} accepted - Immediate action required",
      message: `Dear {SUPPLIER_NAME},

URGENT NOTIFICATION: Your quote for RFQ {RFQ_NUMBER} has been accepted.

IMMEDIATE ACTION REQUIRED:
• Confirm material availability within 4 hours
• Begin procurement/production immediately
• Contact us at procurement@lateralengineering.co.nz

Quote Details:
• Amount: {QUOTE_AMOUNT}
• Required Delivery: {DELIVERY_DAYS} days MAXIMUM

Time is critical for this project. Please acknowledge immediately.

Lateral Engineering Procurement Team
Phone: +64 9 XXX XXXX`,
      category: "acceptance",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{QUOTE_AMOUNT}", "{DELIVERY_DAYS}"],
      isActive: true
    },
    {
      id: "rejection-standard",
      name: "Standard Rejection",
      subject: "RFQ {RFQ_NUMBER} - Quote Status Update",
      message: `Dear {SUPPLIER_NAME},

Thank you for submitting your quote for RFQ {RFQ_NUMBER} - {RFQ_TITLE}.

After careful evaluation of all submissions, we regret to inform you that we have selected another supplier for this particular project.

Your quote details:
• Quote Amount: {QUOTE_AMOUNT}
• Delivery Timeline: {DELIVERY_DAYS} days

We appreciate your time and effort in preparing this quotation. We value our relationship with {SUPPLIER_NAME} and look forward to opportunities to work together on future projects.

Please continue to participate in our RFQ processes as we have many upcoming projects where your expertise would be valuable.

Best regards,
Lateral Engineering Limited
Procurement Team`,
      category: "rejection",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{RFQ_TITLE}", "{QUOTE_AMOUNT}", "{DELIVERY_DAYS}"],
      isActive: true
    },
    {
      id: "rejection-feedback",
      name: "Rejection with Feedback",
      subject: "RFQ {RFQ_NUMBER} - Quote Evaluation Results",
      message: `Dear {SUPPLIER_NAME},

Thank you for your quote submission for RFQ {RFQ_NUMBER}.

While your proposal demonstrated strong capabilities, we have selected another supplier for this project based on the following evaluation criteria:
• Price competitiveness
• Delivery timeline
• Technical specifications alignment
• Previous project experience

Your Submission:
• Quote: {QUOTE_AMOUNT}
• Delivery: {DELIVERY_DAYS} days

Feedback for future submissions:
{CUSTOM_FEEDBACK}

We encourage you to continue participating in our RFQ processes and value your partnership.

Regards,
Lateral Engineering Procurement Team`,
      category: "rejection",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{QUOTE_AMOUNT}", "{DELIVERY_DAYS}", "{CUSTOM_FEEDBACK}"],
      isActive: true
    },
    {
      id: "rfq-invitation",
      name: "RFQ Invitation",
      subject: "Invitation to Quote: RFQ {RFQ_NUMBER} - {RFQ_TITLE}",
      message: `Dear {SUPPLIER_NAME},

You are invited to submit a quotation for RFQ {RFQ_NUMBER} - {RFQ_TITLE}.

Project Details:
• Description: {RFQ_DESCRIPTION}
• Estimated Value: {ESTIMATED_VALUE}
• Required Delivery: {REQUIRED_DATE}

Submission Deadline: {SUBMISSION_DEADLINE}

Please access the full RFQ documentation and submit your quote through our supplier portal:
{PORTAL_LINK}

For technical queries, please contact our procurement team.

Best regards,
Lateral Engineering Limited`,
      category: "invitation",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{RFQ_TITLE}", "{RFQ_DESCRIPTION}", "{ESTIMATED_VALUE}", "{REQUIRED_DATE}", "{SUBMISSION_DEADLINE}", "{PORTAL_LINK}"],
      isActive: true
    },
    {
      id: "rfq-reminder",
      name: "RFQ Submission Reminder",
      subject: "Reminder: RFQ {RFQ_NUMBER} closing in {HOURS_REMAINING} hours",
      message: `Dear {SUPPLIER_NAME},

This is a reminder that RFQ {RFQ_NUMBER} - {RFQ_TITLE} will close in {HOURS_REMAINING} hours.

Submission Deadline: {SUBMISSION_DEADLINE}

If you intend to submit a quote, please ensure it is received before the deadline. Late submissions cannot be accepted.

Submit your quote here: {PORTAL_LINK}

Thank you for your participation.

Lateral Engineering Procurement Team`,
      category: "reminder",
      variables: ["{SUPPLIER_NAME}", "{RFQ_NUMBER}", "{RFQ_TITLE}", "{HOURS_REMAINING}", "{SUBMISSION_DEADLINE}", "{PORTAL_LINK}"],
      isActive: true
    }
  ];

  const templateCategories = [
    { value: "all", label: "All Templates", icon: <Mail className="h-4 w-4" /> },
    { value: "acceptance", label: "Acceptance", icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
    { value: "rejection", label: "Rejection", icon: <XCircle className="h-4 w-4 text-red-600" /> },
    { value: "invitation", label: "Invitation", icon: <Send className="h-4 w-4 text-blue-600" /> },
    { value: "reminder", label: "Reminder", icon: <Bell className="h-4 w-4 text-yellow-600" /> }
  ];

  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData(template);
    setIsEditing(false);
  };

  const handleSaveTemplate = () => {
    toast({
      title: "Success",
      description: "Email template saved successfully",
    });
    setIsEditing(false);
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case "acceptance": return <Trophy className="h-4 w-4 text-green-600" />;
      case "rejection": return <XCircle className="h-4 w-4 text-red-600" />;
      case "invitation": return <Send className="h-4 w-4 text-blue-600" />;
      case "reminder": return <Bell className="h-4 w-4 text-yellow-600" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Templates</CardTitle>
          <CardDescription>
            Manage email templates for RFQ notifications, acceptance/rejection messages, and procurement communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-6">
              {templateCategories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
                  {cat.icon}
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Available Templates</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(template.category)}
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {template.variables.length} variables
                          </div>
                        </div>
                        <Badge variant={template.isActive ? "success" : "secondary"}>
                          {template.isActive ? "Active" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template Editor */}
              {selectedTemplate && formData && (
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      {getCategoryIcon(selectedTemplate.category)}
                      {selectedTemplate.name}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Preview",
                            description: "Email preview will open in a new window",
                          });
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Template Duplicated",
                            description: "A copy of this template has been created",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                      {!isEditing ? (
                        <Button
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setFormData(selectedTemplate);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveTemplate}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Email Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="min-h-[300px] font-mono text-sm"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Available Variables
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.variables.map(variable => (
                          <code key={variable} className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
                            {variable}
                          </code>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        These variables will be automatically replaced with actual values when sending emails
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Industry Best Practice</h4>
                      <ul className="text-xs space-y-1 text-green-700 dark:text-green-300">
                        <li>• Always include RFQ number and title for reference</li>
                        <li>• Provide clear next steps in acceptance emails</li>
                        <li>• Maintain professional tone in rejection emails</li>
                        <li>• Include contact information for follow-up questions</li>
                        <li>• Send notifications within 24 hours of decision</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}