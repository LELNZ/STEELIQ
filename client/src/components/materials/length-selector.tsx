import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";

interface LengthSelectorProps {
  lengthOptions: string | null;
  selectedLength?: string;
  onLengthSelect: (length: string) => void;
  materialName: string;
}

export default function LengthSelector({
  lengthOptions,
  selectedLength,
  onLengthSelect,
  materialName
}: LengthSelectorProps) {
  if (!lengthOptions) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Available Lengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No standard lengths specified for this material</p>
        </CardContent>
      </Card>
    );
  }

  // Parse length options - handle both semicolon-separated and dimension formats
  const parseAvailableLengths = (options: string): string[] => {
    if (options.includes('x')) {
      // Sheet/mesh format like "2.4x1.2" or "4.65x1.97"
      return [options];
    } else if (options.includes(';')) {
      // Standard lengths like "6.0;9.0;12.0"
      return options.split(';').map(length => length.trim()).filter(length => length);
    } else {
      // Single length
      return [options.trim()];
    }
  };

  const availableLengths = parseAvailableLengths(lengthOptions);

  const formatLengthDisplay = (length: string): string => {
    if (length.includes('x')) {
      return `${length}m`; // Sheet dimensions
    } else {
      return `${length}m`; // Standard lengths
    }
  };

  const getLengthType = (length: string): string => {
    if (length.includes('x')) {
      return 'sheet';
    } else {
      return 'standard';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          Available Lengths for {materialName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableLengths.map((length, index) => {
            const isSelected = selectedLength === length;
            const lengthType = getLengthType(length);
            
            return (
              <Button
                key={index}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onLengthSelect(length)}
                className={`justify-center text-center ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">
                    {formatLengthDisplay(length)}
                  </span>
                  <Badge 
                    variant={lengthType === 'sheet' ? 'secondary' : 'outline'} 
                    className="text-xs px-1"
                  >
                    {lengthType === 'sheet' ? 'Sheet' : 'Standard'}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>
        
        {selectedLength && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Selected Length:</p>
            <p className="text-lg font-bold text-primary">
              {formatLengthDisplay(selectedLength)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}