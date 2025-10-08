import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Edit,
  Archive,
  Filter,
  Calendar,
  FileCheck,
  AlertCircle,
  Clock,
  Folder,
  RefreshCw,
  FileX,
  Shield
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: number;
  documentNumber: string;
  documentType: string;
  category: string;
  title: string;
  description?: string;
  version?: string;
  status: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  entityType?: string;
  entityId?: number;
  jobId?: number;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  reviewDate?: string;
  confidentialityLevel?: string;
  keywords?: string[];
  downloadCount?: number;
  uploadedBy: number;
  uploadedAt: string;
  lastAccessedAt?: string;
  notes?: string;
}

interface DocumentStats {
  totalDocuments: number;
  activeDocuments: number;
  expiringDocuments: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  recentlyUploaded: number;
}

const documentTypes = [
  { value: "certificate", label: "Certificate" },
  { value: "report", label: "Report" },
  { value: "drawing", label: "Technical Drawing" },
  { value: "specification", label: "Specification" },
  { value: "manual", label: "Manual" },
  { value: "permit", label: "Permit" }
];

const documentCategories = [
  { value: "quality", label: "Quality Control" },
  { value: "safety", label: "Safety & Compliance" },
  { value: "procurement", label: "Procurement" },
  { value: "technical", label: "Technical" },
  { value: "compliance", label: "Regulatory Compliance" }
];

const confidentialityLevels = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" }
];

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "review", label: "Under Review" },
  { value: "archived", label: "Archived" },
  { value: "obsolete", label: "Obsolete" }
];

export function DocumentManagementTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents', selectedCategory, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      const response = await fetch(`/api/documents?${params}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/documents/stats']
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data: Partial<Document>) =>
      apiRequest('/api/documents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/stats'] });
      setIsDialogOpen(false);
      setEditingDocument(null);
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Document> & { id: number }) =>
      apiRequest(`/api/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/stats'] });
      setIsDialogOpen(false);
      setEditingDocument(null);
      toast({
        title: "Success",
        description: "Document updated successfully"
      });
    }
  });

  const archiveDocumentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/documents/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents/stats'] });
      toast({
        title: "Success",
        description: "Document archived successfully"
      });
    }
  });

  const trackDownloadMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/documents/${id}/download`, {
        method: 'POST'
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Download Tracked",
        description: `File: ${data.fileName}`
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const documentData = {
      documentType: formData.get('documentType') as string,
      category: formData.get('category') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      version: formData.get('version') as string || '1.0',
      status: formData.get('status') as string,
      fileName: formData.get('fileName') as string || 'document.pdf',
      filePath: formData.get('filePath') as string || '/uploads/documents/',
      fileSize: 0,
      mimeType: 'application/pdf',
      issuer: formData.get('issuer') as string,
      issueDate: formData.get('issueDate') as string,
      expiryDate: formData.get('expiryDate') as string,
      reviewDate: formData.get('reviewDate') as string,
      confidentialityLevel: formData.get('confidentialityLevel') as string,
      notes: formData.get('notes') as string
    };

    if (editingDocument) {
      updateDocumentMutation.mutate({ id: editingDocument.id, ...documentData });
    } else {
      createDocumentMutation.mutate(documentData);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
      active: "success",
      draft: "default",
      review: "warning",
      archived: "secondary",
      obsolete: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      quality: FileCheck,
      safety: Shield,
      procurement: FileText,
      technical: FileText,
      compliance: Shield
    };
    const Icon = icons[category] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6" data-testid="document-management-tab">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold" data-testid="total-documents">
                  {stats?.totalDocuments || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold" data-testid="active-documents">
                  {stats?.activeDocuments || 0}
                </p>
              </div>
              <FileCheck className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold" data-testid="expiring-documents">
                  {stats?.expiringDocuments || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recently Uploaded</p>
                <p className="text-2xl font-bold" data-testid="recent-documents">
                  {stats?.recentlyUploaded || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quality Docs</p>
                <p className="text-2xl font-bold" data-testid="quality-documents">
                  {stats?.byCategory?.quality || 0}
                </p>
              </div>
              <FileCheck className="h-8 w-8 text-teal-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Safety Docs</p>
                <p className="text-2xl font-bold" data-testid="safety-documents">
                  {stats?.byCategory?.safety || 0}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Document Management Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Repository</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {documentCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  setEditingDocument(null);
                  setIsDialogOpen(true);
                }}
                data-testid="button-upload-document"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentsLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc: Document) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">
                      {doc.documentNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(doc.category)}
                        <span className="font-medium">{doc.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{doc.documentType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.category}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{doc.version || '1.0'}</TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.expiryDate), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{doc.downloadCount || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewDocument(doc)}
                          data-testid={`button-view-${doc.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => trackDownloadMutation.mutate(doc.id)}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingDocument(doc);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-${doc.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {doc.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => archiveDocumentMutation.mutate(doc.id)}
                            data-testid={`button-archive-${doc.id}`}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Edit Document' : 'Upload New Document'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select 
                    name="documentType" 
                    defaultValue={editingDocument?.documentType || 'report'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    name="category" 
                    defaultValue={editingDocument?.category || 'technical'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingDocument?.title}
                  required
                  placeholder="e.g., Mill Test Certificate - Steel Plate A36"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingDocument?.description}
                  placeholder="Brief description of the document..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    name="version"
                    defaultValue={editingDocument?.version || '1.0'}
                    placeholder="1.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    name="status" 
                    defaultValue={editingDocument?.status || 'active'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confidentialityLevel">Confidentiality</Label>
                  <Select 
                    name="confidentialityLevel" 
                    defaultValue={editingDocument?.confidentialityLevel || 'internal'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {confidentialityLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    name="fileName"
                    defaultValue={editingDocument?.fileName || 'document.pdf'}
                    placeholder="document.pdf"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuer">Issuer</Label>
                  <Input
                    id="issuer"
                    name="issuer"
                    defaultValue={editingDocument?.issuer}
                    placeholder="e.g., ISO Certification Body"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    defaultValue={editingDocument?.issueDate?.split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    defaultValue={editingDocument?.expiryDate?.split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewDate">Review Date</Label>
                  <Input
                    id="reviewDate"
                    name="reviewDate"
                    type="date"
                    defaultValue={editingDocument?.reviewDate?.split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingDocument?.notes}
                  placeholder="Additional notes or comments..."
                />
              </div>

              {!editingDocument && (
                <div className="space-y-2">
                  <Label htmlFor="filePath">File Path (Demo)</Label>
                  <Input
                    id="filePath"
                    name="filePath"
                    defaultValue="/uploads/documents/"
                    placeholder="/uploads/documents/"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDocumentMutation.isPending || updateDocumentMutation.isPending}
                data-testid="button-save-document"
              >
                {editingDocument ? 'Update Document' : 'Upload Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      {viewDocument && (
        <Dialog open={!!viewDocument} onOpenChange={() => setViewDocument(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Document Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Document Number</p>
                  <p className="font-mono">{viewDocument.documentNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div>{getStatusBadge(viewDocument.status)}</div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="font-medium">{viewDocument.title}</p>
              </div>

              {viewDocument.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{viewDocument.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p>{viewDocument.documentType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p>{viewDocument.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p>{viewDocument.version || '1.0'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Name</p>
                  <p>{viewDocument.fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Size</p>
                  <p>{formatFileSize(viewDocument.fileSize)}</p>
                </div>
              </div>

              {viewDocument.issuer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Issuer</p>
                  <p>{viewDocument.issuer}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {viewDocument.issueDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Issue Date</p>
                    <p>{format(new Date(viewDocument.issueDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {viewDocument.expiryDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                    <p>{format(new Date(viewDocument.expiryDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {viewDocument.reviewDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Review Date</p>
                    <p>{format(new Date(viewDocument.reviewDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                  <p>{viewDocument.downloadCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidentiality</p>
                  <p>{viewDocument.confidentialityLevel || 'Internal'}</p>
                </div>
              </div>

              {viewDocument.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p>{viewDocument.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p>{format(new Date(viewDocument.uploadedAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {viewDocument.lastAccessedAt && (
                    <div>
                      <p className="text-muted-foreground">Last Accessed</p>
                      <p>{format(new Date(viewDocument.lastAccessedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDocument(null)}>
                Close
              </Button>
              <Button onClick={() => {
                trackDownloadMutation.mutate(viewDocument.id);
                setViewDocument(null);
              }}>
                <Download className="mr-2 h-4 w-4" />
                Download Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}