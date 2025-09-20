import { Bell, User, Clock, LogOut, Shield, Timer, Menu } from "lucide-react";
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

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="bg-card border-b border-border px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Mobile menu button and logo */}
        <div className="flex items-center min-w-0 flex-1 gap-2">
          {/* Hamburger menu button - controls sidebar collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMenuClick}
            title="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
              <img 
                src={logoIcon} 
                alt="LEL" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base lg:text-xl font-bold text-foreground truncate">
                <span className="sm:hidden">LEL</span>
                <span className="hidden sm:inline">Lateral Engineering Limited</span>
              </h1>
              <p className="text-muted-foreground text-xs hidden lg:block">STEELIQ</p>
            </div>
          </div>
          {/* Real-time sync badge - only on large screens */}
          <div className="hidden xl:flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full ml-4">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-accent text-sm font-medium">Real-time Sync</span>
          </div>
        </div>

        {/* Right side actions - compact on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
          {/* Search and filters - only on desktop */}
          <div className="hidden xl:flex items-center gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search jobs, materials..."
                className="w-64 lg:w-80"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-36 lg:w-40">
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

          {/* Notifications - smaller on mobile */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center p-0">
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
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Clock Status Indicator - hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:flex items-center gap-1">
        <div className={`flex items-center gap-1 ${getClockStatusColor()}`}>
          <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-[10px] sm:text-xs font-medium">{getClockStatusText()}</span>
        </div>
      </div>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 hover:bg-accent">
            <div className="text-right hidden sm:block">
              <p className="text-xs sm:text-sm font-medium text-foreground leading-tight">{user.name || user.username}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{user.role || 'User'}</p>
            </div>
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
              <AvatarImage src={user.profileImageUrl} alt={user.name} />
              <AvatarFallback className="text-xs sm:text-sm">
                {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : user.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="font-medium">{user.name || user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {user.department || user.role || 'User'}
                </Badge>
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
