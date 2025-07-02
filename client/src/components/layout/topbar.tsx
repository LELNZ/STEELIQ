import { Bell, User, Clock, LogOut, Shield, Timer } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

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
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, logout, clockIn, clockOut, currentClockStatus } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  const handleClockAction = async () => {
    try {
      if (currentClockStatus === "clocked-in") {
        await clockOut();
        toast({
          title: "Clocked Out",
          description: "Your time has been recorded",
        });
      } else {
        await clockIn();
        toast({
          title: "Clocked In",
          description: "Time tracking started",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update clock status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Signed Out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getClockStatusColor = () => {
    switch (currentClockStatus) {
      case "clocked-in":
        return "text-green-600";
      case "break":
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  };

  const getClockStatusText = () => {
    switch (currentClockStatus) {
      case "clocked-in":
        return "Clocked In";
      case "break":
        return "On Break";
      default:
        return "Clocked Out";
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Clock Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1 ${getClockStatusColor()}`}>
          <Timer className="h-4 w-4" />
          <span className="text-xs font-medium">{getClockStatusText()}</span>
        </div>
      </div>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-3 hover:bg-accent">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImageUrl} alt={user.name} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {user.department}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ${user.hourlyRate}/hr
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Clock In/Out */}
          <DropdownMenuItem onClick={handleClockAction}>
            <Clock className="mr-2 h-4 w-4" />
            {currentClockStatus === "clocked-in" ? "Clock Out" : "Clock In"}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Security Settings */}
          <DropdownMenuItem>
            <Shield className="mr-2 h-4 w-4" />
            Security Settings
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Logout */}
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
