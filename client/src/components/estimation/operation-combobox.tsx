import { useState, useEffect, useRef } from 'react';
import { Check, AlertTriangle, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  placeholder = 'Search operations...',
  disabled = false,
  showAllOptions = false,
  onCreateNew,
}: OperationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when operations change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [operations]);

  const handleSelect = (itemId: string) => {
    const item = operations?.find((op) => op.id === itemId);
    onSelect(item || null);
    setOpen(false);
    setSearch('');
    setHighlightedIndex(0);
    
    // Update input to show selected item name
    if (inputRef.current && item) {
      inputRef.current.value = item.name;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (!open || !operations || operations.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < operations.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (operations[highlightedIndex]) {
          handleSelect(operations[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOpen(true);
    
    // Clear selection if user starts typing
    if (selectedItem && e.target.value !== selectedItem.name) {
      onSelect(null);
    }
  };

  const handleFocus = () => {
    setOpen(true);
    // Select all text on focus for easy replacement
    inputRef.current?.select();
  };

  const renderItem = (item: OperationItem, index: number) => {
    const isAssembly = item.appliesTo === 'composite';
    const hasWarning = !item.compatibility.isCompatible;
    const isSelected = value === item.id;
    const isHighlighted = highlightedIndex === index;

    return (
      <div
        key={item.id}
        onClick={() => handleSelect(item.id)}
        onMouseEnter={() => setHighlightedIndex(index)}
        className={cn(
          "flex flex-col gap-1 px-3 py-2 cursor-pointer transition-colors",
          isHighlighted && "bg-accent",
          isSelected && "bg-accent/50"
        )}
        data-testid={`operation-item-${item.id}`}
      >
        <div className="flex items-center gap-2">
          <Check
            className={cn(
              'h-4 w-4 shrink-0',
              isSelected ? 'opacity-100' : 'opacity-0'
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
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="operation-listbox"
          aria-activedescendant={operations?.[highlightedIndex]?.id}
          className="pl-9 pr-3"
          placeholder={placeholder}
          disabled={disabled}
          value={search || (selectedItem?.name && !open ? selectedItem.name : '')}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          data-testid="input-operation-search"
        />
      </div>

      {open && !disabled && (
        <div 
          id="operation-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
          style={{ maxHeight: '300px' }}
        >
          <div 
            ref={listRef}
            className="max-h-[300px] overflow-y-auto overscroll-contain"
            onWheel={(e) => {
              // Stop propagation to prevent parent scrolling
              e.stopPropagation();
            }}
            onWheelCapture={(e) => {
              // Also stop during capture phase to ensure it doesn't bubble
              e.stopPropagation();
            }}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading operations...
              </div>
            ) : operations?.length === 0 ? (
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
            ) : (
              operations?.map((item, index) => renderItem(item, index))
            )}
          </div>
        </div>
      )}
    </div>
  );
}