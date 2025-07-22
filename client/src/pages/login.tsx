import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Shield, Clock, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import companyLogo from "@assets/LEL Variations Logo Symbol 01-01_1753176530831.jpg";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    twoFactorCode: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const result = await login(
        formData.username,
        formData.password,
        formData.twoFactorCode || undefined
      );

      if (result?.requires2FA) {
        setRequires2FA(true);
        setLoginError("");
      } else {
        // Login successful, redirect to dashboard
        setLocation("/");
      }
    } catch (error: any) {
      setLoginError(error.message || "Login failed");
      setRequires2FA(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Company Logo & Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-64 h-32 bg-white rounded-xl flex items-center justify-center shadow-lg border p-4">
            <img 
              src={companyLogo} 
              alt="Lateral Engineering Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Steel Fabrication Management System</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              {requires2FA ? "Enter your 2FA verification code" : "Enter your credentials to access the system"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!requires2FA ? (
                <>
                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      <User className="w-4 h-4 inline mr-2" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="h-11 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* 2FA Code Field */
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode" className="text-sm font-medium">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Verification Code
                  </Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={formData.twoFactorCode}
                    onChange={(e) => handleInputChange("twoFactorCode", e.target.value)}
                    className="h-11 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Check your authenticator app for the verification code
                  </p>
                </div>
              )}

              {/* Error Display */}
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Signing In..."
                ) : requires2FA ? (
                  "Verify & Sign In"
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Back Button for 2FA */}
              {requires2FA && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setRequires2FA(false);
                    setFormData(prev => ({ ...prev, twoFactorCode: "" }));
                  }}
                >
                  Back to Login
                </Button>
              )}
            </form>

            <Separator className="my-6" />

            {/* Additional Information */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                For account setup or password reset, contact your administrator
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Time Tracking
                </div>
                <div className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Secure Access
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}