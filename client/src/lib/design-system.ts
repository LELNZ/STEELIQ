// Lateral Engineering Design System Configuration
// This file defines consistent UI patterns across the application

import { type ClassValue } from "clsx";

// Status configuration with consistent colors and labels
export const statusConfig = {
  // General statuses
  draft: { 
    label: 'Draft', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-500'
  },
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    dotColor: 'bg-yellow-500'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    dotColor: 'bg-blue-500'
  },
  active: { 
    label: 'Active', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dotColor: 'bg-green-500'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    dotColor: 'bg-purple-500'
  },
  sent: { 
    label: 'Sent', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    dotColor: 'bg-orange-500'
  },
  accepted: { 
    label: 'Accepted', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dotColor: 'bg-green-500'
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500'
  },
  expired: { 
    label: 'Expired', 
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    dotColor: 'bg-gray-400'
  },
  converted: { 
    label: 'Converted', 
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    dotColor: 'bg-indigo-500'
  },
  // Special statuses
  simulation: { 
    label: 'Simulation', 
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    dotColor: 'bg-cyan-500'
  },
  viewed: { 
    label: 'Viewed', 
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dotColor: 'bg-amber-500'
  }
} as const;

// Priority configuration
export const priorityConfig = {
  low: { 
    label: 'Low', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-500'
  },
  medium: { 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    dotColor: 'bg-yellow-500'
  },
  high: { 
    label: 'High', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    dotColor: 'bg-orange-500'
  },
  urgent: { 
    label: 'Urgent', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500'
  }
} as const;

// Common badge styles
export const badgeStyles = {
  base: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
  withDot: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
  dot: "w-1.5 h-1.5 rounded-full"
};

// Table styles matching Team Management design
export const tableStyles = {
  wrapper: "rounded-lg border bg-card",
  header: "border-b bg-muted/50",
  headerRow: "border-b transition-colors hover:bg-muted/50",
  headerCell: "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
  body: "divide-y divide-border",
  row: "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  cell: "p-4 align-middle",
  // Special cells
  avatarCell: "flex items-center gap-3",
  actionsCell: "text-right"
};

// Card styles with metrics (Dashboard style)
export const cardStyles = {
  base: "rounded-lg border bg-card transition-all hover:shadow-md",
  header: "flex flex-row items-center justify-between space-y-0 pb-2",
  title: "text-sm font-medium",
  metric: "text-2xl font-bold",
  subtitle: "text-xs text-muted-foreground",
  icon: "h-4 w-4 text-muted-foreground"
};

// Action menu styles
export const actionMenuStyles = {
  trigger: "h-8 w-8 p-0 hover:bg-muted rounded-md transition-colors",
  content: "w-56",
  item: "cursor-pointer",
  icon: "mr-2 h-4 w-4"
};

// Common metric card component props
export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// Helper function to get status style
export function getStatusStyle(status: string): { label: string; color: string; dotColor?: string } {
  return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
}

// Helper function to get priority style
export function getPriorityStyle(priority: string): { label: string; color: string; dotColor?: string } {
  return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
}