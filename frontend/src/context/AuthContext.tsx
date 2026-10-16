import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, isDemoModeActive, setDemoModeActive } from '../services/auth.service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from '../services/mockStore';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  toggleDemoMode: (enabled?: boolean) => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (userData: Partial<User> & { password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isDemoModeActive());

  useEffect(() => {
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.warn('Could not restore auth session:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();

    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      });
      authListener = data;
    }

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const toggleDemoMode = (enabled?: boolean) => {
    const nextVal = enabled !== undefined ? enabled : !isDemoMode;
    setIsDemoMode(nextVal);
    setDemoModeActive(nextVal);
    if (nextVal) {
      toast.info('Switched to Demo Mode');
    } else {
      setUser(null);
      toast.info('Switched to Live Backend Mode');
    }
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.login(email, pass);
      setUser(loggedUser);
      toast.success(`Welcome back, ${loggedUser.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Partial<User> & { password?: string }) => {
    setIsLoading(true);
    try {
      const registeredUser = await authService.register(userData);
      setUser(registeredUser);
      toast.success(`Welcome to Shared Farm, ${registeredUser.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    toast.info('You have logged out.');
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    if (!user) return;
    if (isDemoMode) {
      const updated = mockStore.updateUser(updates);
      setUser(updated);
      toast.success('Profile updated successfully');
    } else {
      try {
        const updated = await authService.updateProfile(user.id, updates);
        setUser(updated);
        toast.success('Profile updated successfully');
      } catch (err: any) {
        setUser({ ...user, ...updates });
        toast.error(err.message || 'Failed to update profile in database');
      }
    }
  };

  const resetDemoData = () => {
    mockStore.resetToDefaults();
    setUser(mockStore.getUser());
    toast.success('Mock data reset to initial showcase state.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isDemoMode,
        toggleDemoMode,
        login,
        register,
        logout,
        updateUser,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
