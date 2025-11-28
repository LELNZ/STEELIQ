import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, XCircle, Send, Database, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

export default function TestEmailPage() {
  const [emailTo, setEmailTo] = useState('');
  const [notificationType, setNotificationType] = useState('test');
  const [lastResult, setLastResult] = useState<any>(null);
  const [useRealData, setUseRealData] = useState(false);
  const [testDataInfo, setTestDataInfo] = useState<any>(null);
  const { toast } = useToast();

  const createTestData = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/create-test-data', 'POST', {});
    },
    onSuccess: (result) => {
      if (result.success) {
        setTestDataInfo(result.data);
        toast({
          title: 'Test Data Created',
          description: 'Test employee, shift, and timesheet data created successfully',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test data',
        variant: 'destructive',
      });
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async (data: { emailTo: string; notificationType: string; useRealData: boolean; userId?: number; timesheetId?: number; clockId?: number }) => {
      return apiRequest('/api/test-email', 'POST', data);
    },
    onSuccess: (result) => {
      setLastResult(result);
      if (result.success) {
        toast({
          title: '✅ Email Sent Successfully!',
          description: `Test email sent to ${emailTo || 'your registered email'}`,
        });
      } else {
        toast({
          title: '❌ Email Failed',
          description: result.error || 'Failed to send test email',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setLastResult({ success: false, error: error.message });
      toast({
        title: '❌ Error',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    },
  });

  const handleSendTest = () => {
    const data: any = { 
      emailTo, 
      notificationType,
      useRealData 
    };
    
    // Include test data IDs if available and using real data
    if (useRealData && testDataInfo) {
      data.userId = testDataInfo.userId;
      data.timesheetId = testDataInfo.timesheetId;
      data.clockId = testDataInfo.clockInId;
    }
    
    sendTestEmail.mutate(data);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Notification Test</h1>
        <p className="text-muted-foreground">
          Test your STEELIQ email notification system with Gmail OAuth2
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Gmail OAuth2 Connected via Replit</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Emails will be sent from your connected Gmail account
            </p>
          </CardContent>
        </Card>

        {/* Test Data Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Data Management
            </CardTitle>
            <CardDescription>
              Create test data in the database for realistic email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="real-data">Use Real Data</Label>
                <p className="text-xs text-muted-foreground">
                  {useRealData ? 'Emails will show actual database records' : 'Emails will show mock/demo data'}
                </p>
              </div>
              <Switch
                id="real-data"
                checked={useRealData}
                onCheckedChange={setUseRealData}
                data-testid="switch-real-data"
              />
            </div>
            
            {!testDataInfo && (
              <Button
                onClick={() => createTestData.mutate()}
                disabled={createTestData.isPending}
                variant="outline"
                className="w-full"
                data-testid="button-create-test-data"
              >
                {createTestData.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Test Data...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Create Test Data
                  </>
                )}
              </Button>
            )}
            
            {testDataInfo && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Test Data Ready</AlertTitle>
                <AlertDescription className="space-y-1 mt-2">
                  <div className="text-xs">
                    <p>• Employee ID: {testDataInfo.userId}</p>
                    <p>• Email: {testDataInfo.testEmail}</p>
                    <p>• Shift ID: {testDataInfo.shiftId}</p>
                    <p>• Clock In ID: {testDataInfo.clockInId}</p>
                    <p>• Timesheet ID: {testDataInfo.timesheetId}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Email Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Notification</CardTitle>
            <CardDescription>
              Send a test email to verify your notification system is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com (leave empty to use your account email)"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                data-testid="input-test-email"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to send to your registered account email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Notification Type</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger id="type" data-testid="select-notification-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">📧 Simple Test Email</SelectItem>
                  <SelectItem value="shift-reminder">📅 Shift Reminder</SelectItem>
                  <SelectItem value="clock-in">⏰ Clock In Confirmation</SelectItem>
                  <SelectItem value="clock-out">⏰ Clock Out Confirmation</SelectItem>
                  <SelectItem value="approval-request">📝 Approval Request</SelectItem>
                  <SelectItem value="payroll-alert">💰 Payroll Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSendTest}
              disabled={sendTestEmail.isPending}
              className="w-full"
              data-testid="button-send-test"
            >
              {sendTestEmail.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Display */}
        {lastResult && (
          <Alert variant={lastResult.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertTitle>
                  {lastResult.success ? 'Email Sent Successfully!' : 'Email Failed'}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  {lastResult.success ? (
                    <>
                      <p>Check your inbox at: <strong>{emailTo || 'your registered email'}</strong></p>
                      {lastResult.messageId && (
                        <p className="text-xs mt-1">Message ID: {lastResult.messageId}</p>
                      )}
                    </>
                  ) : (
                    <p>{lastResult.error}</p>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <p className="font-medium">To test the email notification system:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Enter your email address (or leave empty to use your account email)</li>
                <li>Select the type of notification you want to test</li>
                <li>Click "Send Test Email"</li>
                <li>Check your inbox for the test notification</li>
              </ol>
            </div>
            
            <div className="border-t pt-3 mt-4">
              <p className="text-sm font-medium mb-2">Available Notification Types:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Simple Test:</strong> Basic connection test</li>
                <li>• <strong>Shift Reminder:</strong> Example shift notification</li>
                <li>• <strong>Clock In/Out:</strong> Time tracking confirmations</li>
                <li>• <strong>Approval Request:</strong> Manager approval workflow</li>
                <li>• <strong>Payroll Alert:</strong> Payroll processing notification</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}