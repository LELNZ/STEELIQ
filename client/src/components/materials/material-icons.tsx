import { 
  Square, 
  Circle, 
  Minus, 
  Box, 
  Hexagon,
  Triangle,
  RectangleHorizontal,
  Diamond,
  Grid3X3,
  Zap,
  Layers,
  ArrowUpDown
} from "lucide-react";

export interface MaterialIconProps {
  category?: string;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function getMaterialIcon(category: string = "", name: string = ""): React.ComponentType {
  const categoryLower = category.toLowerCase();
  const nameLower = name.toLowerCase();

  // Square Hollow Section (SHS)
  if (categoryLower.includes('shs') || nameLower.includes('square hollow')) {
    return Square;
  }
  
  // Rectangular Hollow Section (RHS)  
  if (categoryLower.includes('rhs') || nameLower.includes('rectangular hollow')) {
    return RectangleHorizontal;
  }
  
  // Pipes and Circular Hollow Section (CHS)
  if (categoryLower.includes('pipe') || categoryLower.includes('chs') || 
      nameLower.includes('pipe') || nameLower.includes('circular hollow')) {
    return Circle;
  }
  
  // Reinforcing bars (round)
  if (categoryLower.includes('reinforcing') || categoryLower.includes('reid') ||
      nameLower.includes('reinforcing') || nameLower.includes('reid') ||
      nameLower.includes('grade 300') || nameLower.includes('grade 500')) {
    return Circle;
  }
  
  // Reinforcing mesh
  if (categoryLower.includes('mesh') || nameLower.includes('mesh')) {
    return Grid3X3;
  }
  
  // Universal beams (I-beam shape)
  if (categoryLower.includes('beam') || categoryLower.includes('universal beam') ||
      nameLower.includes('universal beam')) {
    return Zap;
  }
  
  // Universal columns
  if (categoryLower.includes('column') || categoryLower.includes('universal column') ||
      nameLower.includes('universal column')) {
    return ArrowUpDown;
  }
  
  // Channels
  if (categoryLower.includes('channel') || nameLower.includes('channel')) {
    return Box;
  }
  
  // Angles (Duragal and structural)
  if (categoryLower.includes('angle') || nameLower.includes('angle')) {
    return Triangle;
  }
  
  // Flats and plates
  if (categoryLower.includes('flat') || categoryLower.includes('plate') ||
      nameLower.includes('flat') || nameLower.includes('plate')) {
    return Minus;
  }
  
  // Sheet metal
  if (categoryLower.includes('sheet') || nameLower.includes('sheet')) {
    return Layers;
  }
  
  // Merchant bar and general structural
  if (categoryLower.includes('merchant') || categoryLower.includes('structural')) {
    return Hexagon;
  }
  
  // Default fallback
  return Box;
}

export function MaterialIcon({ category, name, className = "", size = "md" }: MaterialIconProps) {
  const IconComponent = getMaterialIcon(category || "", name || "");
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };
  
  return <IconComponent className={`${sizeClasses[size]} ${className}`} />;
}

export function getMaterialColor(category: string = "", name: string = ""): string {
  const categoryLower = category.toLowerCase();
  const nameLower = name.toLowerCase();
  
  // Color coding based on material type
  if (categoryLower.includes('shs') || nameLower.includes('square hollow')) {
    return "text-blue-600 bg-blue-100";
  }
  
  if (categoryLower.includes('rhs') || nameLower.includes('rectangular hollow')) {
    return "text-purple-600 bg-purple-100";
  }
  
  if (categoryLower.includes('pipe') || categoryLower.includes('chs')) {
    return "text-green-600 bg-green-100";
  }
  
  if (categoryLower.includes('reinforcing') || categoryLower.includes('reid')) {
    return "text-orange-600 bg-orange-100";
  }
  
  if (categoryLower.includes('mesh')) {
    return "text-yellow-600 bg-yellow-100";
  }
  
  if (categoryLower.includes('beam')) {
    return "text-red-600 bg-red-100";
  }
  
  if (categoryLower.includes('column')) {
    return "text-indigo-600 bg-indigo-100";
  }
  
  if (categoryLower.includes('channel')) {
    return "text-cyan-600 bg-cyan-100";
  }
  
  if (categoryLower.includes('angle')) {
    return "text-pink-600 bg-pink-100";
  }
  
  if (categoryLower.includes('flat') || categoryLower.includes('plate')) {
    return "text-gray-600 bg-gray-100";
  }
  
  if (categoryLower.includes('sheet')) {
    return "text-teal-600 bg-teal-100";
  }
  
  // Default
  return "text-slate-600 bg-slate-100";
}

export function MaterialTypeIndicator({ category, name, className = "", size = "md" }: MaterialIconProps) {
  const colorClasses = getMaterialColor(category || "", name || "");
  
  return (
    <div className={`rounded-full p-2 ${colorClasses} ${className}`}>
      <MaterialIcon category={category} name={name} size={size} className="text-current" />
    </div>
  );
}