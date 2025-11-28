import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Shield, CheckCircle, XCircle } from "lucide-react";
import { useBiometric } from "@/hooks/useBiometric";
import { useAuth } from "@/contexts/auth-context";

export function BiometricSettings() {
  const { user } = useAuth();
  const {
    isSupported,
    isEnrolled,
    isAuthenticating,
    biometricType,
    enrollBiometric,
    authenticateWithBiometric,
    removeBiometric
  } = useBiometric();

  const handleEnroll = async () => {
    if (user?.id) {
      await enrollBiometric(user.id);
    }
  };

  const handleTestAuth = async () => {
    await authenticateWithBiometric();
  };

  const handleRemove = async () => {
    await removeBiometric();
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'webauthn':
        return 'Biometric';
      default:
        return 'Biometric Authentication';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          {getBiometricLabel()}
        </CardTitle>
        <CardDescription>
          Use biometric authentication for quick and secure clock-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Biometric authentication is not supported on this device</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEnrolled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Biometric authentication is enabled</span>
                    <Badge variant="default">Active</Badge>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span>Biometric authentication is not set up</span>
                    <Badge variant="secondary">Inactive</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {!isEnrolled ? (
                <Button
                  onClick={handleEnroll}
                  disabled={isAuthenticating}
                  data-testid="button-enroll-biometric"
                >
                  {isAuthenticating ? "Setting Up..." : `Enable ${getBiometricLabel()}`}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTestAuth}
                    disabled={isAuthenticating}
                    data-testid="button-test-biometric"
                  >
                    {isAuthenticating ? "Testing..." : "Test Authentication"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemove}
                    disabled={isAuthenticating}
                    data-testid="button-remove-biometric"
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Benefits of biometric authentication:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Quick clock-in without passwords</li>
                <li>Enhanced security with device-level authentication</li>
                <li>Works offline for field operations</li>
                <li>Automatic user verification</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BiometricSettings;