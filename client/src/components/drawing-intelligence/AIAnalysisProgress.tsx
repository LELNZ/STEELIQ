import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Brain } from "lucide-react";

interface AIAnalysisProgressProps {
  stage: string;
  progress: number;
  message?: string;
  elementsFound?: number;
  confidence?: number;
}

export default function AIAnalysisProgress({ 
  stage, 
  progress, 
  message,
  elementsFound,
  confidence 
}: AIAnalysisProgressProps) {
  const getStageIcon = () => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Brain className="h-5 w-5 text-blue-500 animate-pulse" />;
    }
  };

  const getStageLabel = () => {
    const stageLabels: Record<string, string> = {
      'initializing': 'Initializing AI engine...',
      'loading_patterns': 'Loading learned patterns...',
      'auto_config': 'Auto-detecting standards...',
      'quality_check': 'Assessing document quality...',
      'extracting': 'Extracting elements...',
      'validating': 'Cross-validating MTO...',
      'linting': 'Running compliance checks...',
      'learning': 'Updating pattern knowledge...',
      'completed': 'Analysis complete',
      'error': 'Analysis failed'
    };
    return stageLabels[stage] || message || 'Processing...';
  };

  return (
    <Card className="p-4 w-full max-w-md mx-auto">
      <div className="space-y-3">
        {/* Header with Icon and Stage */}
        <div className="flex items-center gap-2">
          {getStageIcon()}
          <span className="text-sm font-medium text-muted-foreground">
            {getStageLabel()}
          </span>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />
        
        {/* Progress Percentage */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          {stage === 'loading_patterns' && (
            <span className="text-blue-500">Pattern pack detected</span>
          )}
        </div>

        {/* Statistics (if available) */}
        {(elementsFound || confidence) && (
          <div className="flex justify-between text-xs">
            {elementsFound && (
              <span className="text-muted-foreground">
                Elements: <span className="font-medium text-foreground">{elementsFound}</span>
              </span>
            )}
            {confidence && (
              <span className="text-muted-foreground">
                Confidence: <span className="font-medium text-foreground">{confidence}%</span>
              </span>
            )}
          </div>
        )}

        {/* Loading Spinner for Active Processing */}
        {stage !== 'completed' && stage !== 'error' && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
}