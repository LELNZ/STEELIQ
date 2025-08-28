import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, DollarSign, Truck, Clock, Star, TrendingUp, Award, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RFQComparisonViewProps {
  rfqId: number;
}

export function RFQComparisonView({ rfqId }: RFQComparisonViewProps) {
  const { toast } = useToast();

  // Fetch RFQ details
  const { data: rfq } = useQuery({
    queryKey: [`/api/procurement/rfqs/${rfqId}`],
  });

  // Fetch responses
  const { data: responses = [] } = useQuery({
    queryKey: [`/api/procurement/rfqs/${rfqId}/responses`],
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  if (!rfq || responses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No responses available for comparison</p>
      </div>
    );
  }

  // Sort responses by total amount
  const sortedResponses = [...responses].sort((a: any, b: any) => 
    parseFloat(a.totalAmount) - parseFloat(b.totalAmount)
  );

  const lowestPrice = Math.min(...responses.map((r: any) => parseFloat(r.totalAmount)));
  const bestDelivery = Math.min(...responses.map((r: any) => r.deliveryDays || 999));

  const handleSelectWinner = (responseId: number) => {
    toast({
      title: "Winner Selection",
      description: "Navigate to the RFQ to select this quote and create a PO",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            Total Responses
          </div>
          <p className="text-2xl font-semibold">{responses.length}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Lowest Quote
          </div>
          <p className="text-2xl font-semibold">${lowestPrice.toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Truck className="h-4 w-4" />
            Fastest Delivery
          </div>
          <p className="text-2xl font-semibold">{bestDelivery} days</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            Price Range
          </div>
          <p className="text-2xl font-semibold">
            {((Math.max(...responses.map((r: any) => parseFloat(r.totalAmount))) / lowestPrice - 1) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Quote Amount</TableHead>
              <TableHead>Price Rank</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResponses.map((response: any, index: number) => {
              const supplier = suppliers.find((s: any) => s.id === response.supplierId);
              const isLowestPrice = parseFloat(response.totalAmount) === lowestPrice;
              const isFastestDelivery = response.deliveryDays === bestDelivery;
              
              return (
                <TableRow key={response.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{supplier?.name || 'Unknown Supplier'}</p>
                      <p className="text-sm text-muted-foreground">{supplier?.company}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isLowestPrice && (
                        <Badge variant="success" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          Best
                        </Badge>
                      )}
                      <span className="font-semibold text-lg">
                        ${parseFloat(response.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={index === 0 ? "success" : index === 1 ? "warning" : "outline"}>
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isFastestDelivery && (
                        <Star className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>{response.deliveryDays || 'N/A'} days</span>
                    </div>
                  </TableCell>
                  <TableCell>{response.paymentTermsOffered || 'Standard'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{response.validityDays} days</p>
                      <p className="text-xs text-muted-foreground">
                        Until {format(new Date(Date.now() + response.validityDays * 24 * 60 * 60 * 1000), "MMM dd")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {response.totalScore ? (
                      <Badge variant="outline">{response.totalScore}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={index === 0 ? "default" : "outline"}
                      onClick={() => handleSelectWinner(response.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Evaluation Criteria */}
      {rfq.evaluationCriteria && (
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Evaluation Criteria
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              Price Weight: <span className="font-medium">{rfq.evaluationCriteria.price_weight || 40}%</span>
            </div>
            <div>
              Quality Weight: <span className="font-medium">{rfq.evaluationCriteria.quality_weight || 30}%</span>
            </div>
            <div>
              Delivery Weight: <span className="font-medium">{rfq.evaluationCriteria.delivery_weight || 30}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}