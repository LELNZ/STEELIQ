import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import logoIcon from "@assets/LEL Symbol only.png";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Briefcase, 
  Package, 
  Warehouse, 
  Scissors,
  BarChart3,
  DollarSign,
  Settings,
  Users
} from "lucide-react";

const navigation = [
  {
    name: "MAIN MENU",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Cuts Manager", href: "/optimization", icon: Scissors },
      { name: "Materials", href: "/materials", icon: Package },
      { name: "Stock", href: "/inventory", icon: Warehouse },
      { name: "Jobs", href: "/jobs", icon: Briefcase },
    ],
  },
  {
    name: "ADMIN",
    items: [
      { name: "User Management", href: "/team", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    name: "SYSTEM",
    items: [
      { name: "Reports", href: "/analytics", icon: BarChart3, badge: "Online", badgeVariant: "success" },
      { name: "Cost Analysis", href: "/costs", icon: DollarSign },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src={logoIcon} 
              alt="Lateral Engineering Logo" 
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">LATERAL</h1>
            <p className="text-gray-500 text-xs font-medium">Steel Cut Optimizer</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="py-6">
        {navigation.map((section) => (
          <div key={section.name} className="mb-6">
            <div className="px-6 mb-3">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                {section.name}
              </h3>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between mx-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge 
                        variant={item.badgeVariant === "success" ? "default" : "secondary"}
                        className={cn(
                          "text-xs px-2 py-1",
                          item.badgeVariant === "success" ? "bg-green-500 text-white" : ""
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}