import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, 
  Edit, 
  Copy, 
  ArrowRight,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { tableStyles } from "@/lib/design-system";

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
            estimations.map((estimation) => (
                <TableRow 
                  key={estimation.id}
                  className={tableStyles.clickableRow}
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
                    <StatusBadge status={estimation.status} />
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
                  <TableCell className={tableStyles.actionsCell}>
                    <ActionMenu
                      items={[
                        {
                          label: 'View Details',
                          icon: <Eye className="h-4 w-4" />,
                          onClick: () => handleView(estimation.id)
                        },
                        {
                          label: 'Edit Estimation',
                          icon: <Edit className="h-4 w-4" />,
                          onClick: () => navigate(`/estimation/${estimation.id}`)
                        },
                        {
                          label: 'Duplicate',
                          icon: <Copy className="h-4 w-4" />,
                          onClick: () => console.log('Duplicate', estimation.id)
                        },
                        {
                          label: 'Send to Client',
                          icon: <ArrowRight className="h-4 w-4" />,
                          onClick: () => onStatusChange(estimation.id, 'sent'),
                          disabled: estimation.status === 'sent' || estimation.status === 'accepted',
                          separator: true
                        }
                      ]}
                    />
                  </TableCell>
                </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}