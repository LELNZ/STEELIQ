import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock, Info, ShieldAlert } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

interface ExpiringCertificate {
  employeeName: string;
  employeeNumber: string;
  certificateType: string;
  certificateName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export function CertificateExpiryNotifications() {
  const { user } = useAuth();
  
  // Query for expiring certificates - only for managers/HR/admin roles
  const { data: expiringCerts = [] } = useQuery<ExpiringCertificate[]>({
    queryKey: ['/api/team/expiring-certificates'],
    enabled: user?.roleId && [1, 2, 25, 26].includes(user.roleId), // Owner, Manager, Admin, HR roles
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
  });

  const today = new Date();
  
  // Categorize certificates by urgency
  const expired = expiringCerts.filter(cert => cert.isExpired);
  const critical = expiringCerts.filter(cert => !cert.isExpired && cert.daysUntilExpiry <= 7);
  const warning = expiringCerts.filter(cert => !cert.isExpired && cert.daysUntilExpiry > 7 && cert.daysUntilExpiry <= 30);
  const upcoming = expiringCerts.filter(cert => !cert.isExpired && cert.daysUntilExpiry > 30 && cert.daysUntilExpiry <= 90);

  if (!user || ![1, 2, 25, 26].includes(user.roleId)) {
    return null; // Only show to authorized roles
  }

  if (expiringCerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Expired Certificates */}
      {expired.length > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Expired Certificates</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {expired.map((cert, idx) => (
                <div key={idx} className="text-sm">
                  <strong>{cert.employeeName}</strong> ({cert.employeeNumber}) - {cert.certificateName}
                  <span className="text-xs ml-2">Expired {Math.abs(cert.daysUntilExpiry)} days ago</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Critical - Expiring within 7 days */}
      {critical.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical - Certificates Expiring Soon</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {critical.map((cert, idx) => (
                <div key={idx} className="text-sm">
                  <strong>{cert.employeeName}</strong> ({cert.employeeNumber}) - {cert.certificateName}
                  <span className="text-xs ml-2">Expires in {cert.daysUntilExpiry} days ({format(new Date(cert.expiryDate), "MMM d, yyyy")})</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning - Expiring within 30 days */}
      {warning.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">Certificates Expiring This Month</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {warning.map((cert, idx) => (
                <div key={idx} className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>{cert.employeeName}</strong> ({cert.employeeNumber}) - {cert.certificateName}
                  <span className="text-xs ml-2">Expires in {cert.daysUntilExpiry} days ({format(new Date(cert.expiryDate), "MMM d, yyyy")})</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming - Expiring within 90 days */}
      {upcoming.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Upcoming Certificate Renewals</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {upcoming.map((cert, idx) => (
                <div key={idx} className="text-sm">
                  <strong>{cert.employeeName}</strong> ({cert.employeeNumber}) - {cert.certificateName}
                  <span className="text-xs ml-2">Expires in {cert.daysUntilExpiry} days ({format(new Date(cert.expiryDate), "MMM d, yyyy")})</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}