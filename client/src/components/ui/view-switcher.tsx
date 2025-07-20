import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table2, LayoutGrid, List } from "lucide-react";
import { useEffect } from "react";

interface ViewSwitcherProps {
  view: 'table' | 'card' | 'list';
  onViewChange: (view: 'table' | 'card' | 'list') => void;
  storageKey?: string;
}

export function ViewSwitcher({ view, onViewChange, storageKey }: ViewSwitcherProps) {
  // Load saved preference on mount
  useEffect(() => {
    if (storageKey) {
      const savedView = localStorage.getItem(storageKey) as 'table' | 'card' | 'list';
      if (savedView && ['table', 'card', 'list'].includes(savedView)) {
        onViewChange(savedView);
      }
    }
  }, [storageKey]);

  const handleViewChange = (newView: string) => {
    if (newView) {
      onViewChange(newView as 'table' | 'card' | 'list');
      if (storageKey) {
        localStorage.setItem(storageKey, newView);
      }
    }
  };

  return (
    <ToggleGroup 
      type="single" 
      value={view} 
      onValueChange={handleViewChange}
      className="justify-start"
    >
      <ToggleGroupItem value="table" aria-label="Table view" size="sm">
        <Table2 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="card" aria-label="Card view" size="sm">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view" size="sm">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}