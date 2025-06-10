import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Copy, Download, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ActionIconsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  editTitle?: string;
  deleteTitle?: string;
  viewTitle?: string;
  copyTitle?: string;
  downloadTitle?: string;
  compact?: boolean;
  showDropdown?: boolean;
}

export function ActionIcons({
  onEdit,
  onDelete,
  onView,
  onCopy,
  onDownload,
  editTitle = "Edit",
  deleteTitle = "Delete",
  viewTitle = "View",
  copyTitle = "Copy",
  downloadTitle = "Download",
  compact = true,
  showDropdown = false
}: ActionIconsProps) {
  const iconSize = compact ? "w-3 h-3" : "w-4 h-4";
  const buttonSize = compact ? "h-6 w-8 p-0" : "h-8 w-8";

  const primaryActions = [];
  const secondaryActions = [];

  // Primary actions (always visible)
  if (onEdit) {
    primaryActions.push(
      <Button
        key="edit"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        title={editTitle}
        className={`${buttonSize} text-muted-foreground hover:text-foreground`}
      >
        <Edit className={iconSize} />
      </Button>
    );
  }

  if (onDelete) {
    primaryActions.push(
      <Button
        key="delete"
        variant="ghost"
        size="sm"
        className={`${buttonSize} text-red-500 hover:text-red-700`}
        onClick={onDelete}
        title={deleteTitle}
      >
        <Trash2 className={iconSize} />
      </Button>
    );
  }

  // Secondary actions (can go in dropdown if showDropdown is true)
  if (onView) {
    const viewButton = (
      <Button
        key="view"
        variant="ghost"
        size="sm"
        onClick={onView}
        title={viewTitle}
        className={`${buttonSize} text-muted-foreground hover:text-foreground`}
      >
        <Eye className={iconSize} />
      </Button>
    );
    
    if (showDropdown) {
      secondaryActions.push(viewButton);
    } else {
      primaryActions.push(viewButton);
    }
  }

  if (onCopy) {
    const copyButton = (
      <Button
        key="copy"
        variant="ghost"
        size="sm"
        onClick={onCopy}
        title={copyTitle}
        className={`${buttonSize} text-muted-foreground hover:text-foreground`}
      >
        <Copy className={iconSize} />
      </Button>
    );
    
    if (showDropdown) {
      secondaryActions.push(copyButton);
    } else {
      primaryActions.push(copyButton);
    }
  }

  if (onDownload) {
    const downloadButton = (
      <Button
        key="download"
        variant="ghost"
        size="sm"
        onClick={onDownload}
        title={downloadTitle}
        className={`${buttonSize} text-muted-foreground hover:text-foreground`}
      >
        <Download className={iconSize} />
      </Button>
    );
    
    if (showDropdown) {
      secondaryActions.push(downloadButton);
    } else {
      primaryActions.push(downloadButton);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {primaryActions}
      
      {showDropdown && secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${buttonSize} text-muted-foreground hover:text-foreground`}
            >
              <MoreHorizontal className={iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <Eye className="mr-2 h-4 w-4" />
                {viewTitle}
              </DropdownMenuItem>
            )}
            {onCopy && (
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {copyTitle}
              </DropdownMenuItem>
            )}
            {onDownload && (
              <DropdownMenuItem onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                {downloadTitle}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}