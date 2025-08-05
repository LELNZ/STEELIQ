import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface StandardTooltipProps {
  content: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function StandardTooltip({ 
  content, 
  children, 
  side = "top",
  className = ""
}: StandardTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || <Info className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help ${className}`} />}
      </TooltipTrigger>
      <TooltipContent 
        side={side} 
        sideOffset={5} 
        className="max-w-[300px] p-3 bg-popover text-popover-foreground border shadow-md"
      >
        <p className="text-sm leading-relaxed">
          {content}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}