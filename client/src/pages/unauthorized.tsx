import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";

export default function Unauthorized() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    if (user) {
      // Redirect to appropriate dashboard based on role
      const roleDashboards: Record<string, string> = {
        basic: "/dashboards/floor",
        planning: "/dashboards/planning",
        accounting: "/dashboards/accounting",
        supervisor: "/dashboards/supervisor",
        admin: "/dashboards/admin",
        full: "/dashboards/executive"
      };
      setLocation(roleDashboards[user.role] || "/");
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg w-full">
              <p className="text-sm text-muted-foreground">
                {user ? (
                  <>
                    Your current role: <span className="font-medium capitalize">{user.role}</span>
                    <br />
                    If you believe you should have access to this page, please contact your system administrator.
                  </>
                ) : (
                  "Please log in to access this page."
                )}
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={handleGoBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button 
                onClick={handleGoHome}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}