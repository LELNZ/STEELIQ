import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoIcon from "@assets/LEL Symbol black only.png";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TopBar() {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src={logoIcon} 
                alt="Lateral Engineering Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Lateral Engineering</h1>
              <p className="text-muted-foreground text-sm">Steel Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-accent/10 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-accent text-sm font-medium">Real-time Sync</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search and filters */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search jobs, materials..."
                className="w-80"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center p-0">
                2
              </Badge>
            </Button>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">John Smith</p>
              <p className="text-xs text-muted-foreground">Workshop Manager</p>
            </div>
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
