import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  isActive: boolean;
  profileImageUrl?: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, twoFactorCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  currentClockStatus: "clocked-in" | "clocked-out" | "break" | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentClockStatus, setCurrentClockStatus] = useState<"clocked-in" | "clocked-out" | "break" | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for existing token on mount
  const hasToken = !!localStorage.getItem('auth_token');

  // Query to check authentication status
  const { data: authData, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasToken, // Only run if we have a token
  });

  // Get current clock status
  const { data: clockStatus } = useQuery({
    queryKey: ["/api/time/clock-status"],
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (authData) {
      setUser(authData as User);
    } else {
      setUser(null);
    }
  }, [authData]);

  useEffect(() => {
    if (clockStatus && typeof clockStatus === 'object' && 'status' in clockStatus) {
      setCurrentClockStatus(clockStatus.status);
    }
  }, [clockStatus]);

  const login = async (username: string, password: string, twoFactorCode?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, twoFactorCode }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.requires2FA) {
        return { requires2FA: true };
      }

      // Store token in localStorage for subsequent requests
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Set user from the response (response contains user, token, expiresAt)
      if (data.user) {
        setUser(data.user);
      }
      
      // Refetch user data to ensure consistency
      await refetch();

      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user?.name || data.user?.username || 'User'}!`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Get token for logout request
      const token = localStorage.getItem('auth_token');
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
      });

      // Clear token from localStorage
      localStorage.removeItem('auth_token');

      // Clear local state
      setUser(null);
      setCurrentClockStatus(null);

      // Clear all cached data
      queryClient.clear();

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if logout request fails
      localStorage.removeItem('auth_token');
      setUser(null);
      setCurrentClockStatus(null);
      queryClient.clear();
    }
  };

  const clockIn = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/time/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clock in');
      }

      setCurrentClockStatus("clocked-in");
      
      // Refetch clock status
      queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });

      toast({
        title: "Clocked In",
        description: "You have successfully clocked in.",
      });
    } catch (error: any) {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    }
  };

  const clockOut = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/time/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clock out');
      }

      setCurrentClockStatus("clocked-out");
      
      // Refetch clock status
      queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });

      toast({
        title: "Clocked Out",
        description: "You have successfully clocked out.",
      });
    } catch (error: any) {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        clockIn,
        clockOut,
        currentClockStatus,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}