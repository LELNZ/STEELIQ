import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TabHelpNoteProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function TabHelpNote({ title, children, defaultOpen = true }: TabHelpNoteProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-blue-50/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          <h3 className="font-medium text-blue-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-600" />
        )}
      </button>
      {isOpen && (
        <CardContent className="pt-0 pb-4">
          <div className="text-sm text-blue-800 space-y-2">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  );
}