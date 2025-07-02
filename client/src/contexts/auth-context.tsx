import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  department: string;
  hourlyRate: string;
  permissions: any;
  profileImageUrl?: string;
  isActive: boolean;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
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

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  }, []);

  // Get current user data if authenticated
  const { data: currentUser, isLoading, refetch: refreshUser } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Get current clock status
  const { data: clockStatus } = useQuery({
    queryKey: ["/api/time/clock-status"],
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (clockStatus) {
      setCurrentClockStatus(clockStatus.status);
    }
  }, [clockStatus]);

  const loginMutation = useMutation({
    mutationFn: async ({ username, password, twoFactorCode }: { 
      username: string; 
      password: string; 
      twoFactorCode?: string; 
    }) => {
      return await apiRequest("/api/auth/login", "POST", {
        username,
        password,
        twoFactorCode
      });
    },
    onSuccess: (data) => {
      if (!data.requires2FA) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });
      }
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      setUser(null);
      setCurrentClockStatus(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      queryClient.clear();
    }
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/time/clock-in", "POST", {
        userId: user?.id,
        location: "Office", // Could be enhanced with GPS
        notes: ""
      });
    },
    onSuccess: () => {
      setCurrentClockStatus("clocked-in");
      queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] });
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/time/clock-out", "POST", {
        userId: user?.id,
        notes: ""
      });
    },
    onSuccess: () => {
      setCurrentClockStatus("clocked-out");
      queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] });
    }
  });

  const login = async (username: string, password: string, twoFactorCode?: string) => {
    return loginMutation.mutateAsync({ username, password, twoFactorCode });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  const clockIn = async () => {
    return clockInMutation.mutateAsync();
  };

  const clockOut = async () => {
    return clockOutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      clockIn,
      clockOut,
      currentClockStatus,
      refreshUser: () => refreshUser()
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}