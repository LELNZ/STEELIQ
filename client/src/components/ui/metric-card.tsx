import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { cardStyles } from "@/lib/design-system";
import { ArrowUp, ArrowDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  className 
}: MetricCardProps) {
  return (
    <Card className={cn(cardStyles.base, className)}>
      <CardHeader className={cardStyles.header}>
        <CardTitle className={cardStyles.title}>{title}</CardTitle>
        {icon && <div className={cardStyles.icon}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={cardStyles.metric}>{value}</div>
        {subtitle && <p className={cardStyles.subtitle}>{subtitle}</p>}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {trend.isPositive ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}