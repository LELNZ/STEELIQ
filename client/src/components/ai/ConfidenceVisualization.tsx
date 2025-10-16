import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfidenceVisualizationProps {
  confidence: number;
  source?: 'AI' | 'OCR' | 'DXF' | 'MANUAL' | 'PATTERN';
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Fortune 50-level confidence visualization component
 * Displays AI extraction confidence with color-coded indicators
 */
export function ConfidenceVisualization({
  confidence,
  source = 'AI',
  showDetails = true,
  size = 'md',
  className
}: ConfidenceVisualizationProps) {
  // Normalize confidence to 0-100 range
  const normalizedConfidence = Math.min(100, Math.max(0, confidence * 100));
  
  // Determine confidence level and styling
  const getConfidenceLevel = () => {
    if (normalizedConfidence >= 90) return { level: 'HIGH', color: 'green', icon: CheckCircle };
    if (normalizedConfidence >= 70) return { level: 'GOOD', color: 'blue', icon: CheckCircle };
    if (normalizedConfidence >= 50) return { level: 'MEDIUM', color: 'yellow', icon: Info };
    if (normalizedConfidence >= 30) return { level: 'LOW', color: 'orange', icon: AlertTriangle };
    return { level: 'VERY LOW', color: 'red', icon: XCircle };
  };
  
  const { level, color, icon: Icon } = getConfidenceLevel();
  
  // Size configurations
  const sizeConfig = {
    sm: { bar: 'h-1', text: 'text-xs', icon: 'h-3 w-3', badge: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm', icon: 'h-4 w-4', badge: 'text-sm' },
    lg: { bar: 'h-3', text: 'text-base', icon: 'h-5 w-5', badge: 'text-base' }
  };
  
  const sizes = sizeConfig[size];
  
  // Color configurations for progress bar
  const progressColors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };
  
  // Badge variants
  const badgeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    green: 'default',
    blue: 'secondary',
    yellow: 'outline',
    orange: 'outline',
    red: 'destructive'
  };
  
  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        {/* Confidence Bar */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Icon className={cn(sizes.icon, `text-${color}-500`)} />
                <span className={cn(sizes.text, "font-medium")}>
                  {normalizedConfidence.toFixed(0)}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Confidence Level: {level}</p>
                <p className="text-xs">Source: {source}</p>
                {normalizedConfidence < 70 && (
                  <p className="text-xs text-yellow-400">
                    Manual verification recommended
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          
          <div className="flex-1">
            <Progress 
              value={normalizedConfidence} 
              className={cn("w-full", sizes.bar)}
              indicatorClassName={progressColors[color]}
            />
          </div>
          
          {showDetails && (
            <Badge 
              variant={badgeVariants[color]}
              className={cn(sizes.badge)}
            >
              {source}
            </Badge>
          )}
        </div>
        
        {/* Detailed breakdown for low confidence */}
        {showDetails && normalizedConfidence < 70 && (
          <div className={cn("p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20", sizes.text)}>
            <div className="flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Low Confidence Detection
                </p>
                <ul className="text-yellow-700 dark:text-yellow-300 space-y-0.5">
                  {normalizedConfidence < 30 && (
                    <li className="text-xs">• High uncertainty in extraction</li>
                  )}
                  {normalizedConfidence < 50 && (
                    <li className="text-xs">• Multiple interpretations possible</li>
                  )}
                  {source === 'OCR' && (
                    <li className="text-xs">• OCR quality may affect accuracy</li>
                  )}
                  {source === 'PATTERN' && (
                    <li className="text-xs">• Based on historical patterns only</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact confidence indicator for table cells
 */
export function ConfidenceBadge({ 
  confidence,
  className 
}: { 
  confidence: number;
  className?: string;
}) {
  const normalizedConfidence = Math.min(100, Math.max(0, confidence * 100));
  
  const getVariant = (): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (normalizedConfidence >= 90) return 'default';
    if (normalizedConfidence >= 70) return 'secondary';
    if (normalizedConfidence >= 50) return 'outline';
    return 'destructive';
  };
  
  return (
    <Badge variant={getVariant()} className={cn("text-xs", className)}>
      {normalizedConfidence.toFixed(0)}%
    </Badge>
  );
}

/**
 * Confidence distribution chart for multiple items
 */
export function ConfidenceDistribution({ 
  items,
  className 
}: { 
  items: Array<{ id: string | number; confidence: number }>;
  className?: string;
}) {
  // Calculate distribution
  const distribution = {
    high: items.filter(i => i.confidence >= 0.9).length,
    good: items.filter(i => i.confidence >= 0.7 && i.confidence < 0.9).length,
    medium: items.filter(i => i.confidence >= 0.5 && i.confidence < 0.7).length,
    low: items.filter(i => i.confidence >= 0.3 && i.confidence < 0.5).length,
    veryLow: items.filter(i => i.confidence < 0.3).length
  };
  
  const total = items.length;
  const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / total;
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Confidence Distribution</span>
        <span className="text-sm text-muted-foreground">
          Avg: {(avgConfidence * 100).toFixed(1)}%
        </span>
      </div>
      
      <div className="space-y-2">
        {Object.entries(distribution).map(([level, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          const labels = {
            high: 'High (90-100%)',
            good: 'Good (70-90%)',
            medium: 'Medium (50-70%)',
            low: 'Low (30-50%)',
            veryLow: 'Very Low (0-30%)'
          };
          const colors = {
            high: 'bg-green-500',
            good: 'bg-blue-500',
            medium: 'bg-yellow-500',
            low: 'bg-orange-500',
            veryLow: 'bg-red-500'
          };
          
          return (
            <div key={level} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{labels[level as keyof typeof labels]}</span>
                <span className="font-medium">{count} items</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", colors[level as keyof typeof colors])}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Warning for low average confidence */}
      {avgConfidence < 0.7 && (
        <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Overall confidence is below 70%. Manual review recommended for critical items.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Real-time confidence indicator with animation
 */
export function LiveConfidenceIndicator({ 
  isProcessing,
  currentConfidence,
  className 
}: { 
  isProcessing: boolean;
  currentConfidence?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isProcessing ? (
        <>
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Processing...</span>
        </>
      ) : currentConfidence !== undefined ? (
        <>
          <div className="h-2 w-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium">
            Confidence: {(currentConfidence * 100).toFixed(1)}%
          </span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 bg-gray-400 rounded-full" />
          <span className="text-sm text-muted-foreground">Ready</span>
        </>
      )}
    </div>
  );
}