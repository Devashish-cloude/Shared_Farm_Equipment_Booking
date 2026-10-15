import { apiClient } from './api';
import { mockStore } from './mockStore';
import { User } from '../types';

const DEMO_MODE_KEY = 'sf_is_demo_mode';

export const isDemoModeActive = (): boolean => {
  const saved = localStorage.getItem(DEMO_MODE_KEY);
  return saved === null ? true : saved === 'true'; // Defaults to demo mode for seamless frontend testing
};

export const setDemoModeActive = (active: boolean): void => {
  localStorage.setItem(DEMO_MODE_KEY, String(active));
};

export const authService = {
  isDemoMode: isDemoModeActive,
  setDemoMode: setDemoModeActive,

  async getCurrentUser(): Promise<User | null> {
    if (isDemoModeActive()) {
      return mockStore.getUser();
    }
    const token = localStorage.getItem('shared_farm_token');
    if (!token) return null;
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  async login(email: string, _password: string): Promise<User> {
    if (isDemoModeActive()) {
      // In demo mode, accept any password and return mock user
      const user = mockStore.getUser();
      localStorage.setItem('shared_farm_token', 'demo-jwt-token-ramesh-patel');
      return user;
    }
    const res = await apiClient.post<{ token: string; user: User }>('/auth/login', {
      email,
      password: _password,
    });
    localStorage.setItem('shared_farm_token', res.data.token);
    return res.data.user;
  },

  async register(userData: Partial<User> & { password?: string }): Promise<User> {
    if (isDemoModeActive()) {
      const newUser = mockStore.updateUser({
        name: userData.name || 'New Farmer',
        email: userData.email || 'farmer@sharedfarm.demo',
        phone: userData.phone || '+91 98000 00000',
        location: userData.location || { village: 'Mogri', district: 'Anand', state: 'Gujarat' },
        verificationStatus: 'pending',
      });
      localStorage.setItem('shared_farm_token', 'demo-jwt-token-new-farmer');
      return newUser;
    }
    const res = await apiClient.post<{ token: string; user: User }>('/auth/register', userData);
    localStorage.setItem('shared_farm_token', res.data.token);
    return res.data.user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('shared_farm_token');
  },
};
