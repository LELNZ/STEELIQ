import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuoteDetailsDialog from "./QuoteDetailsDialog";
import { 
  Trophy, 
  DollarSign, 
  Clock, 
  Shield, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  TrendingDown,
  TrendingUp,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Quote {
  id: number;
  supplierId: number;
  supplierName: string;
  responseNumber: string;
  status: string;
  totalAmount: string | number;
  currency: string;
  deliveryDays: number;
  paymentTermsOffered: string;
  warrantyOffered: string;
  priceScore: string | number;
  qualityScore: string | number;
  deliveryScore: string | number;
  totalScore: string | number;
  ranking: number;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
  attachments?: any[];
  lineItems?: any[];
  isWinner?: boolean;
}

interface QuoteHistoryPanelProps {
  rfqId?: number;
  rfqNumber?: string;
  poId?: number;
  quotes: Quote[];
  winningQuoteId?: number;
  showComparison?: boolean;
  showActions?: boolean;
  onViewQuote?: (quote: Quote) => void;
}

export default function QuoteHistoryPanel({
  rfqId,
  rfqNumber,
  poId,
  quotes = [],
  winningQuoteId,
  showComparison = true,
  showActions = true,
  onViewQuote,
}: QuoteHistoryPanelProps) {
  const [expandedQuotes, setExpandedQuotes] = useState<Set<number>>(new Set());
  const [comparisonView, setComparisonView] = useState<"list" | "table">("list");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const toggleQuoteExpansion = (quoteId: number) => {
    const newExpanded = new Set(expandedQuotes);
    if (newExpanded.has(quoteId)) {
      newExpanded.delete(quoteId);
    } else {
      newExpanded.add(quoteId);
    }
    setExpandedQuotes(newExpanded);
  };

  const formatCurrency = (amount: string | number, currency: string = "NZD") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: currency,
    }).format(numAmount);
  };

  const getStatusBadge = (status: string, isWinner?: boolean) => {
    if (isWinner) {
      return (
        <Badge variant="default" className="bg-green-500 text-white">
          <Trophy className="h-3 w-3 mr-1" />
          Winner
        </Badge>
      );
    }

    const config: Record<string, { variant: any; icon: any; label: string }> = {
      submitted: { variant: "secondary", icon: CheckCircle2, label: "Submitted" },
      under_review: { variant: "warning", icon: Clock, label: "Under Review" },
      selected: { variant: "success", icon: Award, label: "Selected" },
      rejected: { variant: "destructive", icon: XCircle, label: "Not Selected" },
    };

    const cfg = config[status] || { variant: "outline", icon: AlertCircle, label: status };
    const Icon = cfg.icon;
    
    return (
      <Badge variant={cfg.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const calculateSavings = () => {
    if (quotes.length < 2) return null;
    
    const amounts = quotes.map(q => typeof q.totalAmount === "string" ? parseFloat(q.totalAmount) : q.totalAmount);
    const lowest = Math.min(...amounts);
    const highest = Math.max(...amounts);
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const winnerAmount = quotes.find(q => q.id === winningQuoteId)?.totalAmount || lowest;
    const winnerAmountNum = typeof winnerAmount === "string" ? parseFloat(winnerAmount) : winnerAmount;
    
    return {
      lowest,
      highest,
      average,
      spread: highest - lowest,
      savingsVsHighest: highest - winnerAmountNum,
      savingsVsAverage: average - winnerAmountNum,
    };
  };

  const savings = calculateSavings();

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {savings && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Quotes Received</p>
                  <p className="text-2xl font-bold">{quotes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Price Range</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(savings.lowest)} - {formatCurrency(savings.highest)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Average Price</p>
                  <p className="text-lg font-bold">{formatCurrency(savings.average)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Savings Achieved</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(savings.savingsVsHighest)}
                  </p>
                  <p className="text-xs text-muted-foreground">vs highest quote</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quotes Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Quote History
              </CardTitle>
              <CardDescription>
                All quotes received for {rfqNumber || `PO #${poId}`}
              </CardDescription>
            </div>
            {showComparison && quotes.length > 1 && (
              <Tabs value={comparisonView} onValueChange={(v: any) => setComparisonView(v)}>
                <TabsList>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="table">Comparison</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {comparisonView === "list" ? (
            <div className="space-y-3">
              {quotes
                .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
                .map((quote, index) => {
                  const isWinner = quote.id === winningQuoteId || quote.status === "selected";
                  const isExpanded = expandedQuotes.has(quote.id);
                  
                  return (
                    <Collapsible
                      key={quote.id}
                      open={isExpanded}
                      onOpenChange={() => toggleQuoteExpansion(quote.id)}
                    >
                      <Card className={cn(
                        "transition-all",
                        isWinner && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                      )}>
                        <CollapsibleTrigger className="w-full">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                                  isWinner ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                )}>
                                  {quote.ranking || index + 1}
                                </div>
                                
                                <div className="text-left">
                                  <p className="font-semibold">{quote.supplierName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Quote #{quote.responseNumber}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-lg">
                                    {formatCurrency(quote.totalAmount, quote.currency)}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {quote.deliveryDays} days delivery
                                  </div>
                                </div>
                                
                                {getStatusBadge(quote.status, isWinner)}
                                
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Score Summary */}
                            {quote.totalScore && (
                              <div className="mt-3 flex items-center gap-4 border-t pt-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm font-medium">
                                          {parseFloat(quote.totalScore.toString()).toFixed(1)}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total Score</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>Price: {parseFloat(quote.priceScore.toString()).toFixed(1)}</span>
                                  <span>Quality: {parseFloat(quote.qualityScore.toString()).toFixed(1)}</span>
                                  <span>Delivery: {parseFloat(quote.deliveryScore.toString()).toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="border-t p-4 space-y-4">
                            {/* Quote Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Payment Terms</p>
                                <p className="text-sm font-medium">{quote.paymentTermsOffered || "Standard"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Warranty</p>
                                <p className="text-sm font-medium">{quote.warrantyOffered || "None"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Submitted</p>
                                <p className="text-sm font-medium">
                                  {format(new Date(quote.submittedAt), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Validity</p>
                                <p className="text-sm font-medium">30 days</p>
                              </div>
                            </div>
                            
                            {/* Notes */}
                            {quote.notes && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Supplier Notes</p>
                                <p className="text-sm bg-muted/50 p-2 rounded">{quote.notes}</p>
                              </div>
                            )}
                            
                            {/* Rejection Reason */}
                            {quote.rejectionReason && (
                              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded">
                                <p className="text-xs text-red-600 font-medium mb-1">Not Selected - Reason:</p>
                                <p className="text-sm">{quote.rejectionReason}</p>
                              </div>
                            )}
                            
                            {/* Actions */}
                            {showActions && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedQuote(quote);
                                    setDetailsDialogOpen(true);
                                    onViewQuote?.(quote);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                {quote.attachments?.length > 0 && (
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1" />
                                    Download Quote
                                  </Button>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="p-2 w-12">#</TableHead>
                    <TableHead className="p-2">Supplier</TableHead>
                    <TableHead className="p-2 text-right">Price</TableHead>
                    <TableHead className="p-2 text-center">Delivery</TableHead>
                    <TableHead className="p-2 text-center">Terms</TableHead>
                    <TableHead className="p-2 text-center">Score</TableHead>
                    <TableHead className="p-2 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes
                    .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
                    .map((quote, index) => {
                      const isWinner = quote.id === winningQuoteId || quote.status === "selected";
                      
                      return (
                        <TableRow 
                          key={quote.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            isWinner && "bg-green-50 dark:bg-green-950/20 hover:bg-green-100/50"
                          )}
                          onClick={() => {
                            setSelectedQuote(quote);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <TableCell className="p-2">
                            <div className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                              isWinner ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            )}>
                              {quote.ranking || index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <div>
                              <p className="font-medium truncate max-w-[150px]">{quote.supplierName}</p>
                              <p className="text-[10px] text-muted-foreground">#{quote.responseNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell className="p-2 text-right font-bold">
                            {formatCurrency(quote.totalAmount, quote.currency)}
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {quote.deliveryDays}d
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2 text-center text-[10px]">
                            {quote.paymentTermsOffered || "Net 30"}
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            {quote.totalScore ? (
                              <div className="flex items-center justify-center gap-0.5">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium text-xs">
                                  {parseFloat(quote.totalScore.toString()).toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex justify-center">
                              {isWinner ? (
                                <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                  <Trophy className="h-2.5 w-2.5 mr-0.5" />
                                  Won
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Lost
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      <QuoteDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        quote={selectedQuote}
        isWinner={selectedQuote?.id === winningQuoteId}
      />
    </div>
  );
}