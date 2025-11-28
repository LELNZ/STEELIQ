import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserRole, UserPermissions, getDefaultPermissions } from "../lib/auth";

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  roleName?: string;  // Database role name (e.g., "Business Owner")
  roleId?: number;    // Database role ID for future use
  permissions: UserPermissions;
  department?: string;
  isActive: boolean;
  profileImageUrl?: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  organizationId?: number;
  dataScope?: 'personal' | 'department' | 'organization';
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for existing token on mount
  const hasToken = !!localStorage.getItem('auth_token');

  // Query to check authentication status
  const { data: authData, isLoading: queryLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: hasToken, // Only run if we have a token
  });
  
  // If no token, we're not loading - we're just not authenticated
  const isLoading = hasToken ? queryLoading : false;

  // Single source of truth for clock status
  const { data: clockStatus, refetch: refetchClockStatus } = useQuery({
    queryKey: ["/api/time/clock-status"],
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  // Derive clock status from query data - no local state!
  const currentClockStatus = clockStatus?.isClockedIn ? "clocked-in" : "clocked-out";

  useEffect(() => {
    if (authData) {
      const userData = authData as any;
      // Ensure permissions are properly set - if not provided by backend, use defaults
      const permissions = userData.permissions || getDefaultPermissions(userData.role);
      setUser({
        ...userData,
        permissions,
        role: userData.role as UserRole,
        roleName: userData.roleName, // Preserve database role name
        roleId: userData.roleId,     // Preserve database role ID
      });
    } else {
      setUser(null);
    }
  }, [authData]);

  // Removed redundant useEffect - clock status is now derived directly from query

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
        const userData = data.user;
        // Ensure permissions are properly set - if not provided by backend, use defaults
        const permissions = userData.permissions || getDefaultPermissions(userData.role);
        setUser({
          ...userData,
          permissions,
          role: userData.role as UserRole,
          roleName: userData.roleName, // Preserve database role name
          roleId: userData.roleId,     // Preserve database role ID
        });
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
      queryClient.clear();
    }
  };

  const clockIn = async () => {
    if (!user) return;
    
    try {
      // Default location data
      let locationData = { location: 'Remote', geolocation: null };
      
      // Try to get actual location
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { 
                enableHighAccuracy: true,
                timeout: 3000,
                maximumAge: 0 
              }
            );
          });
          
          locationData = {
            location: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            geolocation: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
          };
        } catch (error) {
          console.log('Geolocation failed, using Remote as fallback');
        }
      }
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/time/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          clockType: 'clock_in',
          timestamp: new Date().toISOString(),
          location: locationData.location,
          jobId: null,
          taskId: null,
          geolocation: locationData.geolocation,
          notes: null
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clock in');
      }
      
      // Immediate invalidation - await to ensure updates complete
      await Promise.all([
        refetchClockStatus(),
        queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time/summary"] })
      ]);

      toast({
        title: "Clocked In",
        description: "Time tracking started successfully",
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
      // Default location data
      let locationData = { location: 'Remote', geolocation: null };
      
      // Try to get actual location
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { 
                enableHighAccuracy: true,
                timeout: 3000,
                maximumAge: 0 
              }
            );
          });
          
          locationData = {
            location: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            geolocation: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
          };
        } catch (error) {
          console.log('Geolocation failed, using Remote as fallback');
        }
      }
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/time/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          clockType: 'clock_out',
          timestamp: new Date().toISOString(),
          location: locationData.location,
          jobId: null,
          taskId: null,
          geolocation: locationData.geolocation,
          notes: null
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to clock out');
      }
      
      // Immediate invalidation - await to ensure updates complete
      await Promise.all([
        refetchClockStatus(),
        queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/time/summary"] })
      ]);

      toast({
        title: "Clocked Out",
        description: "Time tracking stopped successfully",
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