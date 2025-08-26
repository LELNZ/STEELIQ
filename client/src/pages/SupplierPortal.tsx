import { useState, useEffect } from 'react';
import { useParams, useSearch } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, FileText, Package, Calendar, DollarSign, Building, User, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface POData {
  distribution: any;
  purchaseOrder: any;
  items: any[];
  supplier: any;
}

export default function SupplierPortal() {
  const { distributionId } = useParams();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get('token');
  
  const [loading, setLoading] = useState(true);
  const [poData, setPOData] = useState<POData | null>(null);
  const [acknowledgedBy, setAcknowledgedBy] = useState('');
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPurchaseOrder();
  }, [distributionId, token]);

  const fetchPurchaseOrder = async () => {
    if (!distributionId || !token) {
      toast({
        title: 'Invalid Access',
        description: 'Missing required parameters',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/supplier/po/${distributionId}?token=${token}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired access link');
        }
        throw new Error('Failed to load purchase order');
      }
      
      const data = await response.json();
      setPOData(data);
      setIsAcknowledged(!!data.distribution.acknowledgedAt);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledgedBy.trim()) {
      toast({
        title: 'Required Field',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }

    setAcknowledging(true);
    try {
      const response = await fetch(`/api/supplier/po/${distributionId}/acknowledge?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acknowledgedBy,
          notes: acknowledgmentNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge purchase order');
      }

      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message,
      });
      
      setIsAcknowledged(true);
      await fetchPurchaseOrder(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-center mb-2">Access Error</h2>
            <p className="text-gray-600 text-center">
              Unable to load purchase order. The link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { purchaseOrder, items, supplier, distribution } = poData;
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || item.lineTotal || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Purchase Order #{purchaseOrder.poNumber}
              </h1>
              <p className="text-gray-600">Lateral Engineering Limited</p>
            </div>
            <div className="text-right">
              {isAcknowledged ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledged
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  Awaiting Acknowledgment
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Order Date</Label>
                  <p className="font-medium">
                    {format(new Date(purchaseOrder.orderDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Delivery Date</Label>
                  <p className="font-medium">
                    {purchaseOrder.requestedDeliveryDate 
                      ? format(new Date(purchaseOrder.requestedDeliveryDate), 'MMM dd, yyyy')
                      : 'TBD'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Payment Terms</Label>
                  <p className="font-medium">{purchaseOrder.paymentTerms || 'Net 30'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge variant="outline">{purchaseOrder.status}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">{index + 1}</td>
                          <td className="py-2">{item.description}</td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">
                            ${parseFloat(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="text-right py-2 font-medium">
                            ${parseFloat(item.totalPrice || item.lineTotal || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td colSpan={4} className="text-right py-3">Total:</td>
                        <td className="text-right py-3">${totalAmount.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {purchaseOrder.specialInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle>Special Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{purchaseOrder.specialInstructions}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Supplier Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-gray-600">Company</Label>
                  <p className="font-medium">{supplier.name}</p>
                </div>
                {supplier.address && (
                  <div>
                    <Label className="text-gray-600">Address</Label>
                    <p className="text-sm">{supplier.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acknowledgment Section */}
            {!isAcknowledged ? (
              <Card className="border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle>Acknowledge Receipt</CardTitle>
                  <CardDescription>
                    Please acknowledge that you have received and reviewed this purchase order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={acknowledgedBy}
                      onChange={(e) => setAcknowledgedBy(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any comments or notes..."
                      value={acknowledgmentNotes}
                      onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                    className="w-full"
                  >
                    {acknowledging ? 'Processing...' : 'Acknowledge Purchase Order'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center text-green-800">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Order Acknowledged
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <Label className="text-gray-600">Acknowledged By</Label>
                    <p className="font-medium">{distribution.acknowledgedBy}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Acknowledged At</Label>
                    <p className="font-medium">
                      {format(new Date(distribution.acknowledgedAt), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                  {distribution.acknowledgmentNotes && (
                    <div>
                      <Label className="text-gray-600">Notes</Label>
                      <p className="text-sm">{distribution.acknowledgmentNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Print Purchase Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}