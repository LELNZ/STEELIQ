import { cn } from "@/lib/utils";
import { badgeStyles, getStatusStyle, getPriorityStyle } from "@/lib/design-system";

interface StatusBadgeProps {
  status?: string;
  priority?: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, priority, showDot = true, className }: StatusBadgeProps) {
  if (!status && !priority) return null;

  const config = status ? getStatusStyle(status) : getPriorityStyle(priority!);

  return (
    <span className={cn(badgeStyles.base, config.color, className)}>
      {showDot && config.dotColor && (
        <span className={cn(badgeStyles.dot, config.dotColor)} />
      )}
      {config.label}
    </span>
  );
}