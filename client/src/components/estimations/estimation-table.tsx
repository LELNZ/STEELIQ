import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Copy, 
  ArrowRight,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface EstimationProject {
  id: number;
  name: string;
  description?: string;
  clientId?: number;
  clientName?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'sent' | 'accepted' | 'declined';
  totalCost: string;
  margin: string;
  deliveryDate?: string;
  estimatedHours?: string;
  createdAt: string;
  updatedAt: string;
  lifecycleProgress?: number;
  currentPhase?: string;
  projectNumber?: string;
}

interface EstimationTableProps {
  estimations: EstimationProject[];
  onStatusChange: (id: number, status: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  sent: { label: 'Sent to Client', color: 'bg-yellow-100 text-yellow-800', icon: ArrowRight },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function EstimationTable({ estimations, onStatusChange }: EstimationTableProps) {
  const [, navigate] = useLocation();

  const handleView = (id: number) => {
    navigate(`/estimation/${id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? '-' : `$${num.toLocaleString()}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Project #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[100px]">Progress</TableHead>
            <TableHead className="w-[120px]">Value</TableHead>
            <TableHead className="w-[80px]">Margin</TableHead>
            <TableHead className="w-[100px]">Est. Hours</TableHead>
            <TableHead className="w-[100px]">Delivery</TableHead>
            <TableHead className="w-[100px]">Updated</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No estimations found
              </TableCell>
            </TableRow>
          ) : (
            estimations.map((estimation) => {
              const StatusIcon = statusConfig[estimation.status]?.icon || FileText;
              return (
                <TableRow 
                  key={estimation.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleView(estimation.id);
                  }}
                >
                  <TableCell className="font-medium">
                    {estimation.projectNumber || `EST-${estimation.id.toString().padStart(4, '0')}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{estimation.name}</p>
                      {estimation.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{estimation.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{estimation.clientName || '-'}</TableCell>
                  <TableCell>
                    <Badge className={cn(statusConfig[estimation.status]?.color || 'bg-gray-100 text-gray-800', "text-xs")}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[estimation.status]?.label || estimation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {estimation.lifecycleProgress !== undefined ? (
                      <div className="space-y-1">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${estimation.lifecycleProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{estimation.lifecycleProgress}%</p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatCurrency(estimation.totalCost)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {estimation.margin ? `${estimation.margin}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {estimation.estimatedHours ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {estimation.estimatedHours}h
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {estimation.deliveryDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(estimation.deliveryDate)}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(estimation.updatedAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(estimation.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/estimation/${estimation.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Estimation
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(estimation.id, 'sent')}
                          disabled={estimation.status === 'sent' || estimation.status === 'accepted'}
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Send to Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}