import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, Star } from "lucide-react";
import { Material } from "@shared/schema";

interface InstantMaterialSearchProps {
  value?: string;
  onSelect: (materialCode: string) => void;
  placeholder?: string;
  className?: string;
  showFavorites?: boolean;
}

export default function InstantMaterialSearch({
  value,
  onSelect,
  placeholder = "Type to search materials...",
  className = "",
  showFavorites = true
}: InstantMaterialSearchProps) {
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [favoriteMaterials, setFavoriteMaterials] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorite-materials');
    return saved ? JSON.parse(saved) : [];
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Functions for managing favorites
  const toggleFavorite = (materialValue: string) => {
    const newFavorites = favoriteMaterials.includes(materialValue)
      ? favoriteMaterials.filter(fav => fav !== materialValue)
      : [...favoriteMaterials, materialValue];
    
    setFavoriteMaterials(newFavorites);
    localStorage.setItem('favorite-materials', JSON.stringify(newFavorites));
  };

  // Create searchable material list
  const allSearchableMaterials = materials.map(material => ({
    value: material.code || material.name,
    label: `${material.code} - ${material.name}`,
    category: material.category || "Other",
    material,
    isFavorite: favoriteMaterials.includes(material.code || material.name)
  })).sort((a, b) => {
    // Sort favorites first, then alphabetically
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.label.localeCompare(b.label);
  });

  // Filter materials based on search text
  const filteredMaterials = allSearchableMaterials.filter(material => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      material.material.code?.toLowerCase().includes(searchLower) ||
      material.material.name?.toLowerCase().includes(searchLower) ||
      material.category.toLowerCase().includes(searchLower)
    );
  });

  // Get display value
  const displayValue = searchText || (value ? allSearchableMaterials.find(m => m.value === value)?.label || "" : "");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
            if (!e.target.value && value) {
              onSelect("");
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronsUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
      </div>
      
      {isOpen && (searchText || !value) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredMaterials.slice(0, 10).map((material) => (
            <div
              key={material.value}
              className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 border-b last:border-b-0"
              onClick={() => {
                onSelect(material.value);
                setSearchText("");
                setIsOpen(false);
              }}
            >
              <div className="flex items-center min-w-0 flex-1">
                <Check
                  className={`mr-2 h-4 w-4 flex-shrink-0 ${
                    value === material.value ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{material.material.code}</div>
                    {showFavorites && material.isFavorite && (
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{material.material.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{material.category}</div>
                </div>
              </div>
              {showFavorites && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto flex-shrink-0 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFavorite(material.value);
                  }}
                >
                  <Star
                    className={`h-4 w-4 ${
                      material.isFavorite 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "text-muted-foreground hover:text-yellow-400"
                    }`}
                  />
                </Button>
              )}
            </div>
          ))}
          {filteredMaterials.length === 0 && (
            <div className="p-2 text-center text-muted-foreground">No materials found</div>
          )}
        </div>
      )}
    </div>
  );
}