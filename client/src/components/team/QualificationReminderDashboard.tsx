import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Send, 
  Users, 
  Shield,
  Award,
  Car,
  HardHat,
  GraduationCap
} from "lucide-react";

interface QualificationReminder {
  reminder: {
    id: number;
    qualificationType: string;
    qualificationName: string;
    expiryDate: string;
    remindersSent: number;
    isActive: boolean;
  };
  teamMember: {
    id: number;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
}

const QUALIFICATION_ICONS = {
  first_aid: Shield,
  welding: Award,
  heights: HardHat,
  drivers: Car,
  trade: GraduationCap,
};

const QUALIFICATION_COLORS = {
  first_aid: 'red',
  welding: 'orange',
  heights: 'yellow',
  drivers: 'green',
  trade: 'purple',
};

export function QualificationReminderDashboard() {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Fetch expiring qualifications
  const { data: expiringQualifications = [], isLoading } = useQuery({
    queryKey: ["/api/qualification-reminders/expiring"],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Calculate days until expiry
  const getExpiryInfo = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      daysUntilExpiry: diffDays,
      isExpired: diffDays < 0,
      isUrgent: diffDays <= 7 && diffDays >= 0,
      isWarning: diffDays <= 30 && diffDays > 7,
    };
  };

  // Group qualifications by urgency
  const groupedQualifications = expiringQualifications.reduce((acc: any, qual: QualificationReminder) => {
    const expiryInfo = getExpiryInfo(qual.reminder.expiryDate);
    
    if (expiryInfo.isExpired) {
      acc.expired = acc.expired || [];
      acc.expired.push({ ...qual, expiryInfo });
    } else if (expiryInfo.isUrgent) {
      acc.urgent = acc.urgent || [];
      acc.urgent.push({ ...qual, expiryInfo });
    } else if (expiryInfo.isWarning) {
      acc.warning = acc.warning || [];
      acc.warning.push({ ...qual, expiryInfo });
    } else {
      acc.normal = acc.normal || [];
      acc.normal.push({ ...qual, expiryInfo });
    }
    
    return acc;
  }, {});

  const getStatusBadge = (expiryInfo: any) => {
    if (expiryInfo.isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (expiryInfo.isUrgent) {
      return <Badge variant="destructive">Urgent - {expiryInfo.daysUntilExpiry} days</Badge>;
    }
    if (expiryInfo.isWarning) {
      return <Badge variant="outline" className="border-yellow-400 text-yellow-700">
        Warning - {expiryInfo.daysUntilExpiry} days
      </Badge>;
    }
    return <Badge variant="outline" className="border-green-400 text-green-700">
      {expiryInfo.daysUntilExpiry} days
    </Badge>;
  };

  const QualificationCard = ({ qualification }: { qualification: any }) => {
    const { reminder, teamMember, user, expiryInfo } = qualification;
    const IconComponent = QUALIFICATION_ICONS[reminder.qualificationType as keyof typeof QUALIFICATION_ICONS] || Shield;
    const color = QUALIFICATION_COLORS[reminder.qualificationType as keyof typeof QUALIFICATION_COLORS] || 'gray';

    return (
      <Card className={`border-l-4 ${
        expiryInfo.isExpired ? 'border-l-red-500 bg-red-50/50' :
        expiryInfo.isUrgent ? 'border-l-orange-500 bg-orange-50/50' :
        expiryInfo.isWarning ? 'border-l-yellow-500 bg-yellow-50/50' :
        'border-l-green-500 bg-green-50/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-${color}-100`}>
                <IconComponent className={`h-5 w-5 text-${color}-600`} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{reminder.qualificationName}</h3>
                <p className="text-sm text-gray-600">
                  {user.name} ({teamMember.employeeNumber})
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {reminder.qualificationType.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Expires: {new Date(reminder.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge(expiryInfo)}
              <div className="text-xs text-gray-500">
                Reminders sent: {reminder.remindersSent}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Qualification Expiry Reminders</h2>
        <div className="text-center py-8">Loading qualification data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Qualification Expiry Dashboard
        </h2>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Send All Reminders
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {groupedQualifications.expired?.length || 0}
            </div>
            <div className="text-sm text-red-700">Expired</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {groupedQualifications.urgent?.length || 0}
            </div>
            <div className="text-sm text-orange-700">Urgent (≤7 days)</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {groupedQualifications.warning?.length || 0}
            </div>
            <div className="text-sm text-yellow-700">Warning (≤30 days)</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {expiringQualifications.length}
            </div>
            <div className="text-sm text-green-700">Total Tracked</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Options */}
      <div className="flex space-x-2">
        {['all', 'expired', 'urgent', 'warning', 'normal'].map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter)}
            className="capitalize"
          >
            {filter}
          </Button>
        ))}
      </div>

      {/* Qualification Lists */}
      <div className="space-y-6">
        {/* Expired Qualifications */}
        {(activeFilter === 'all' || activeFilter === 'expired') && groupedQualifications.expired?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Expired Qualifications ({groupedQualifications.expired.length})
            </h3>
            <div className="space-y-3">
              {groupedQualifications.expired.map((qual: any) => (
                <QualificationCard key={qual.reminder.id} qualification={qual} />
              ))}
            </div>
          </div>
        )}

        {/* Urgent Qualifications */}
        {(activeFilter === 'all' || activeFilter === 'urgent') && groupedQualifications.urgent?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-orange-600 mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Urgent Renewals Required ({groupedQualifications.urgent.length})
            </h3>
            <div className="space-y-3">
              {groupedQualifications.urgent.map((qual: any) => (
                <QualificationCard key={qual.reminder.id} qualification={qual} />
              ))}
            </div>
          </div>
        )}

        {/* Warning Qualifications */}
        {(activeFilter === 'all' || activeFilter === 'warning') && groupedQualifications.warning?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-yellow-600 mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Renewal Reminders ({groupedQualifications.warning.length})
            </h3>
            <div className="space-y-3">
              {groupedQualifications.warning.map((qual: any) => (
                <QualificationCard key={qual.reminder.id} qualification={qual} />
              ))}
            </div>
          </div>
        )}

        {/* Normal Qualifications */}
        {(activeFilter === 'all' || activeFilter === 'normal') && groupedQualifications.normal?.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Future Renewals ({groupedQualifications.normal.length})
            </h3>
            <div className="space-y-3">
              {groupedQualifications.normal.map((qual: any) => (
                <QualificationCard key={qual.reminder.id} qualification={qual} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Qualifications Message */}
      {expiringQualifications.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            No qualification expiries found in the next 90 days. All certifications are current.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}