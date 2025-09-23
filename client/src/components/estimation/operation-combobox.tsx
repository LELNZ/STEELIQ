import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

interface OperationItem {
  id: string;
  source: { table: string; id: number };
  category: string;
  type: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  defaults: any;
  dimensions: any;
  compatibility: {
    sections: string[];
    isCompatible: boolean;
    warning?: string;
  };
  appliesTo: 'single' | 'composite';
  components?: any[];
}

interface OperationComboboxProps {
  category: string;
  type: string;
  parentSection?: string;
  value?: string;
  onSelect: (item: OperationItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showAllOptions?: boolean;
  onCreateNew?: () => void;
}

export function OperationCombobox({
  category,
  type,
  parentSection,
  value,
  onSelect,
  placeholder = 'Select operation...',
  disabled = false,
  showAllOptions = false,
  onCreateNew,
}: OperationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Fetch operations from unified library
  const { data: operations, isLoading } = useQuery({
    queryKey: ['/api/operation-library', category, type, debouncedSearch, parentSection, showAllOptions],
    queryFn: async () => {
      const params = new URLSearchParams({
        category,
        type,
        ...(debouncedSearch && { q: debouncedSearch }),
        ...(parentSection && { compatibility: parentSection }),
        ...(showAllOptions && { show_all: 'true' }),
        limit: '50',
      });

      const response = await fetch(`/api/operation-library?${params}`);
      if (!response.ok) throw new Error('Failed to fetch operations');
      
      const result = await response.json();
      return result.items as OperationItem[];
    },
    enabled: !disabled && !!category && !!type,
  });

  const selectedItem = operations?.find((item) => item.id === value);

  const handleSelect = (itemId: string) => {
    const item = operations?.find((op) => op.id === itemId);
    onSelect(item || null);
    setOpen(false);
    setSearch('');
  };

  const renderItem = (item: OperationItem) => {
    const isAssembly = item.appliesTo === 'composite';
    const hasWarning = !item.compatibility.isCompatible;

    return (
      <CommandItem
        key={item.id}
        value={item.id}
        className="flex flex-col gap-1 py-2 cursor-pointer"
        data-testid={`operation-item-${item.id}`}
      >
        <div className="flex items-center gap-2">
          <Check
            className={cn(
              'h-4 w-4 shrink-0',
              value === item.id ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.name}</span>
              {item.code && (
                <Badge variant="outline" className="text-xs">
                  {item.code}
                </Badge>
              )}
              {isAssembly && (
                <Badge variant="secondary" className="text-xs">
                  Assembly
                </Badge>
              )}
              {hasWarning && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
            </div>
            {item.description && (
              <div className="text-sm text-muted-foreground">
                {item.description}
              </div>
            )}
            {hasWarning && item.compatibility.warning && (
              <div className="text-xs text-yellow-600 mt-1">
                {item.compatibility.warning}
              </div>
            )}
          </div>
        </div>
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
          disabled={disabled}
        >
          {selectedItem ? (
            <span className="flex items-center gap-2">
              {selectedItem.name}
              {!selectedItem.compatibility.isCompatible && (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command 
          shouldFilter={false}
          onValueChange={handleSelect}
        >
          <CommandInput
            placeholder="Search operations..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading operations...
              </div>
            ) : operations?.length === 0 ? (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 p-4">
                  <div className="text-sm text-muted-foreground">
                    No operations found.
                  </div>
                  {onCreateNew && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        onCreateNew();
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create New
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {operations?.map(renderItem)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}