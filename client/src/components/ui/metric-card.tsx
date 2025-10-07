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
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cardStyles.title}>{title}</p>
            <p className={cardStyles.metric}>{value}</p>
          </div>
          {icon && (
            <div className={cn(cardStyles.icon, "ml-2")}>
              {icon}
            </div>
          )}
        </div>
        {(subtitle || trend) && (
          <div className="mt-2 sm:mt-3 lg:mt-4">
            {trend ? (
              <div className="flex items-center">
                {trend.isPositive ? (
                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-accent mr-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  trend.isPositive ? "text-accent" : "text-red-500"
                )}>
                  {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground text-xs sm:text-sm ml-1 hidden sm:inline">change</span>
              </div>
            ) : subtitle && (
              <p className={cardStyles.subtitle}>{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}