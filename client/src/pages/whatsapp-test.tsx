import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MessageCircle, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function WhatsAppTest() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('+642102490517');
  const [category, setCategory] = useState('time_clock');
  const [subject, setSubject] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from STEELIQ.');

  const statusQuery = useQuery({
    queryKey: ['/api/whatsapp/status'],
    staleTime: 30000,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/whatsapp/test', 'POST', { phoneNumber });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Test Message Sent',
        description: `Message ID: ${data.messageId?.substring(0, 20)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send',
        description: error.message || 'Check console for details',
        variant: 'destructive',
      });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/whatsapp/send', 'POST', { phoneNumber, category, subject, body });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Notification Sent',
        description: `Message ID: ${data.messageId?.substring(0, 20)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send',
        description: error.message || 'Check console for details',
        variant: 'destructive',
      });
    },
  });

  const status = statusQuery.data as any;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-green-500" />
          WhatsApp Business API Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Test WhatsApp notifications for the STEELIQ notification system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>WhatsApp Business API configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusQuery.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking status...</span>
              </div>
            ) : statusQuery.isError ? (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle className="h-4 w-4" />
                <span>Failed to check status (Owner/Admin only)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span>Service Available</span>
                  {status?.available ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" /> Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Access Token</span>
                  <Badge variant={status?.accessToken === '***configured***' ? 'default' : 'destructive'}>
                    {status?.accessToken || 'Not Set'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phone Number ID</span>
                  <Badge variant={status?.phoneNumberId === '***configured***' ? 'default' : 'destructive'}>
                    {status?.phoneNumberId || 'Not Set'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Business Account ID</span>
                  <Badge variant={status?.businessAccountId === '***configured***' ? 'default' : 'destructive'}>
                    {status?.businessAccountId || 'Not Set'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Test</CardTitle>
            <CardDescription>Send a simple test message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Phone Number</Label>
              <Input
                id="test-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+642102490517"
                data-testid="input-test-phone"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +64 for NZ)
              </p>
            </div>
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !phoneNumber}
              className="w-full"
              data-testid="button-send-test"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test Message
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Send Custom Notification</CardTitle>
            <CardDescription>Test category-specific notification formatting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-phone">Phone Number</Label>
                <Input
                  id="custom-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+642102490517"
                  data-testid="input-custom-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_clock">🕐 Time & Attendance</SelectItem>
                    <SelectItem value="payroll">💰 Payroll</SelectItem>
                    <SelectItem value="approvals">✅ Approvals</SelectItem>
                    <SelectItem value="compliance">⚠️ Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Notification subject"
                data-testid="input-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Notification message content"
                rows={3}
                data-testid="input-body"
              />
            </div>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !phoneNumber || !subject || !body}
              className="w-full"
              data-testid="button-send-notification"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Notification
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="font-medium">Not receiving messages?</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Check "Message Requests" in WhatsApp (not main inbox)</li>
                  <li>Verify your phone number is added as a test recipient in Meta Developer Console</li>
                  <li>Ensure the first message from a business is "accepted" in WhatsApp</li>
                  <li>Messages may take 1-2 minutes during high traffic</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium">Using Meta's Test Number</p>
                <p className="text-muted-foreground mt-1">
                  The current setup uses Meta's test phone number. For production, 
                  register your own business phone number in the Meta Business Manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
