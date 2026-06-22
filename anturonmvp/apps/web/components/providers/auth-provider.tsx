'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User, Organization } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterData {
  organizationName: string;
  industry: string;
  region: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          setOrganization(data.organization);
        } catch (error) {
          // Token invalid, clear it
          api.clearToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setOrganization(data.organization);
    window.location.href = `/${data.organization.slug}/dashboard`;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await api.register(data);
    setUser(response.user);
    setOrganization(response.organization);
    window.location.href = `/${response.organization.slug}/dashboard`;
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  }, []);

  const loginWithGoogle = useCallback(async (token: string): Promise<string> => {
    api.setToken(token);
    const data = await api.getMe();
    setUser(data.user);
    setOrganization(data.organization);
    return data.organization.slug;
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.getMe();
    setUser(data.user);
    setOrganization(data.organization);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
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
