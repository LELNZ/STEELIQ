import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Printer, Settings, FileText, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfigurePODocumentDialog from "./ConfigurePODocumentDialog";

interface DocumentActionsProps {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  variant?: "menu" | "buttons" | "dropdown";
  onAfterAction?: () => void;
  className?: string;
}

export default function DocumentActions({
  purchaseOrderId,
  purchaseOrderNumber,
  variant = "menu",
  onAfterAction,
  className,
}: DocumentActionsProps) {
  const { toast } = useToast();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"download" | "print" | null>(null);

  // Fetch document configuration for this PO
  const { data: documentConfig, isLoading: configLoading, refetch } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrderId}/document-config`],
    enabled: !!purchaseOrderId,
  });

  const hasConfig = !!documentConfig;

  const buildPdfUrl = (forDownload: boolean = false) => {
    if (!documentConfig) return "";
    
    // Build query string with template and granular options
    const params = new URLSearchParams({
      templateCode: documentConfig.templateCode,
      ...(forDownload && { download: "true" }),
      ...Object.entries(documentConfig.granularOptions).reduce((acc, [key, value]) => {
        acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>),
    });

    return `/api/procurement/purchase-orders/${purchaseOrderId}/pdf?${params}`;
  };

  const handleDownload = () => {
    if (!hasConfig) {
      // Open config dialog and remember to download after
      setPendingAction("download");
      setConfigDialogOpen(true);
      return;
    }

    // Download with saved configuration
    const link = document.createElement("a");
    link.href = buildPdfUrl(true);
    link.download = `${purchaseOrderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloading PDF",
      description: `${purchaseOrderNumber} is being downloaded with your saved configuration.`,
    });

    onAfterAction?.();
  };

  const handlePrint = () => {
    if (!hasConfig) {
      // Open config dialog and remember to print after
      setPendingAction("print");
      setConfigDialogOpen(true);
      return;
    }

    // Print with saved configuration
    const printFrame = document.createElement("iframe");
    printFrame.style.display = "none";
    printFrame.src = buildPdfUrl();
    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      setTimeout(() => {
        if (printFrame.contentWindow) {
          try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
          } catch (error) {
            console.error("Error printing:", error);
            // Fallback to opening in new window
            window.open(printFrame.src, "_blank");
            toast({
              title: "Print Dialog",
              description: "Please use the browser's print function (Ctrl+P or Cmd+P)",
            });
          }
        }
        // Clean up iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    };

    toast({
      title: "Preparing Print",
      description: `${purchaseOrderNumber} is being prepared for printing.`,
    });

    onAfterAction?.();
  };

  const handleConfigSaved = () => {
    // Refetch the config
    refetch();

    // If there was a pending action, execute it now
    if (pendingAction === "download") {
      setTimeout(handleDownload, 500);
    } else if (pendingAction === "print") {
      setTimeout(handlePrint, 500);
    }
    setPendingAction(null);
  };

  const handleConfigure = () => {
    setPendingAction(null);
    setConfigDialogOpen(true);
  };

  // Render as dropdown menu (for table rows)
  if (variant === "menu") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={className}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
              {!hasConfig && (
                <span className="ml-auto text-xs text-muted-foreground">(Configure first)</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
              {!hasConfig && (
                <span className="ml-auto text-xs text-muted-foreground">(Configure first)</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleConfigure}>
              <Settings className="mr-2 h-4 w-4" />
              Configure PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfigurePODocumentDialog
          open={configDialogOpen}
          onClose={() => {
            setConfigDialogOpen(false);
            setPendingAction(null);
          }}
          purchaseOrderId={purchaseOrderId}
          purchaseOrderNumber={purchaseOrderNumber}
          onConfigSaved={handleConfigSaved}
        />
      </>
    );
  }

  // Render as individual buttons (for dialogs)
  if (variant === "buttons") {
    return (
      <>
        <div className={`flex gap-2 ${className}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={configLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </TooltipTrigger>
              {!hasConfig && (
                <TooltipContent>
                  <p>Configure PDF settings first</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={configLoading}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </TooltipTrigger>
              {!hasConfig && (
                <TooltipContent>
                  <p>Configure PDF settings first</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfigure}
                  disabled={configLoading}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure PDF settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ConfigurePODocumentDialog
          open={configDialogOpen}
          onClose={() => {
            setConfigDialogOpen(false);
            setPendingAction(null);
          }}
          purchaseOrderId={purchaseOrderId}
          purchaseOrderNumber={purchaseOrderNumber}
          onConfigSaved={handleConfigSaved}
        />
      </>
    );
  }

  // Render as a single dropdown button (alternative style)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <FileText className="mr-2 h-4 w-4" />
            Document Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
            {!hasConfig && (
              <span className="ml-auto text-xs text-muted-foreground">(Configure first)</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
            {!hasConfig && (
              <span className="ml-auto text-xs text-muted-foreground">(Configure first)</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleConfigure}>
            <Settings className="mr-2 h-4 w-4" />
            Configure PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfigurePODocumentDialog
        open={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setPendingAction(null);
        }}
        purchaseOrderId={purchaseOrderId}
        purchaseOrderNumber={purchaseOrderNumber}
        onConfigSaved={handleConfigSaved}
      />
    </>
  );
}