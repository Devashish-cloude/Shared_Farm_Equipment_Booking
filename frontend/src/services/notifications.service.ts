import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from './mockStore';
import { NotificationItem } from '../types';

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return mockStore.getActiveUser() ? mockStore.getNotifications() : [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load notifications from Supabase:', error.message);
        return mockStore.getNotifications();
      }

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || 'system',
        read: Boolean(row.read),
        timestamp: row.created_at,
        link: row.link,
      }));
    }

    return mockStore.getNotifications();
  },

  async markAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
        return;
      }
    }
    mockStore.markNotificationAsRead(id);
  },

  async markAllAsRead(): Promise<void> {
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', session.user.id);
        return;
      }
    }
    mockStore.markAllNotificationsAsRead();
  },

  async getUnreadCount(): Promise<number> {
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return mockStore.getActiveUser() ? mockStore.getNotifications().filter((n) => !n.read).length : 0;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) return 0;
      return count || 0;
    }

    return mockStore.getNotifications().filter((n) => !n.read).length;
  },
};
