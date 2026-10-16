import { apiClient } from './api';
import { mockStore } from './mockStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

const DEMO_MODE_KEY = 'sf_is_demo_mode';

export const isDemoModeActive = (): boolean => {
  const saved = localStorage.getItem(DEMO_MODE_KEY);
  // Default to false: new visitors must see the public homepage, NOT a demo session!
  return saved === 'true';
};

export const setDemoModeActive = (active: boolean): void => {
  localStorage.setItem(DEMO_MODE_KEY, String(active));
};

export function mapProfileToUser(authUser: any, profile?: any): User {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    name: profile?.full_name || meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Farmer',
    email: authUser.email || profile?.email || '',
    phone: profile?.phone || meta.phone || '',
    avatar: profile?.avatar_url || meta.avatar_url || undefined,
    location: {
      village: profile?.village || meta.village || '',
      district: profile?.district || meta.district || '',
      state: profile?.state || meta.state || '',
    },
    verificationStatus: profile?.verification_status || 'unverified',
    memberSince: profile?.created_at ? new Date(profile.created_at).getFullYear().toString() : '2026',
    farmDetails: {
      farmSizeAcres: profile?.farm_size_acres ? Number(profile.farm_size_acres) : undefined,
      primaryCrops: profile?.primary_crops || [],
    },
    preferredLanguage: profile?.preferred_language || 'English',
    rating: profile?.rating ? Number(profile.rating) : 5.0,
    reviewCount: profile?.review_count ? Number(profile.review_count) : 0,
    role: profile?.role === 'administrator' ? 'admin' : 'user',
  };
}

export const authService = {
  isDemoMode: isDemoModeActive,
  setDemoMode: setDemoModeActive,

  async getCurrentUser(): Promise<User | null> {
    // 1. Supabase Auth Session
    if (isSupabaseConfigured()) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      return mapProfileToUser(session.user, profile);
    }

    // 2. Token-gated session: If user has not signed in, ALWAYS return null (visitor state)
    const token = localStorage.getItem('shared_farm_token');
    if (!token) return null;

    if (isDemoModeActive()) {
      const activeUser = mockStore.getActiveUser();
      if (activeUser) return activeUser;
      // If a legacy demo token is present, resolve corresponding demo user
      if (token.includes('ramesh')) {
        return mockStore.getUser();
      }
      return null;
    }

    try {
      const res = await apiClient.get<User>('/auth/me');
      return res.data;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<User> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Login failed: user not returned.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      return mapProfileToUser(data.user, profile);
    }

    if (isDemoModeActive() || !isSupabaseConfigured()) {
      // Check if logging into preloaded demo account
      if (email.toLowerCase().includes('ramesh')) {
        const user = mockStore.getUser();
        mockStore.setActiveUser(user);
        localStorage.setItem('shared_farm_token', 'demo-jwt-token-ramesh-patel');
        return user;
      }

      // Check for previously registered active user in session
      const existing = mockStore.getActiveUser();
      if (existing && existing.email.toLowerCase() === email.toLowerCase()) {
        localStorage.setItem('shared_farm_token', `demo-jwt-token-${existing.id}`);
        return existing;
      }

      // Default demo login for custom credentials
      const cleanName = email.split('@')[0] || 'Farmer';
      const user: User = {
        id: `usr-${Date.now()}`,
        name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        email,
        phone: '+91 98000 00000',
        location: { village: 'Farm Village', district: 'District', state: 'State' },
        verificationStatus: 'verified',
        memberSince: '2026',
        preferredLanguage: 'English',
        rating: 5.0,
        reviewCount: 0,
        role: 'user',
      };
      mockStore.setActiveUser(user);
      localStorage.setItem('shared_farm_token', `demo-jwt-token-${user.id}`);
      return user;
    }

    const res = await apiClient.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem('shared_farm_token', res.data.token);
    return res.data.user;
  },

  async register(userData: Partial<User> & { password?: string }): Promise<User> {
    if (isSupabaseConfigured()) {
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required for registration.');
      }

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name || 'New Farmer',
            phone: userData.phone || '',
            village: userData.location?.village || '',
            district: userData.location?.district || '',
            state: userData.location?.state || '',
            role: 'farmer', // strictly enforce non-admin role on signup
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed: no user returned.');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      return mapProfileToUser(data.user, profile || {
        full_name: userData.name,
        phone: userData.phone,
        village: userData.location?.village,
        district: userData.location?.district,
        state: userData.location?.state,
      });
    }

    if (isDemoModeActive() || !isSupabaseConfigured()) {
      // Create fresh isolated user with brand new ID — NEVER reuses Ramesh or old records!
      const newUser = mockStore.registerNewUser({
        name: userData.name || 'New Farmer',
        email: userData.email || 'farmer@sharedfarm.local',
        phone: userData.phone || '+91 98000 00000',
        location: userData.location || { village: '', district: '', state: '' },
        preferredLanguage: userData.preferredLanguage || 'English',
        avatar: undefined,
      });
      localStorage.setItem('shared_farm_token', `demo-jwt-token-${newUser.id}`);
      return newUser;
    }

    const res = await apiClient.post<{ token: string; user: User }>('/auth/register', userData);
    localStorage.setItem('shared_farm_token', res.data.token);
    return res.data.user;
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('shared_farm_token');
    mockStore.setActiveUser(null);
    sessionStorage.removeItem('sf_active_user');
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    if (isSupabaseConfigured()) {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.full_name = updates.name;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.avatar !== undefined) payload.avatar_url = updates.avatar;
      if (updates.preferredLanguage !== undefined) payload.preferred_language = updates.preferredLanguage;
      if (updates.location?.village !== undefined) payload.village = updates.location.village;
      if (updates.location?.district !== undefined) payload.district = updates.location.district;
      if (updates.location?.state !== undefined) payload.state = updates.location.state;
      if (updates.farmDetails?.farmSizeAcres !== undefined) payload.farm_size_acres = updates.farmDetails.farmSizeAcres;

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }
      const authUser = (await supabase.auth.getUser()).data.user;
      return mapProfileToUser(data, authUser?.email || '');
    }
    return mockStore.updateUser(updates);
  },
};
