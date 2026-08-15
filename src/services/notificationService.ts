import { supabase } from "../supabase/config";
import { NotificationItem } from "../types";

export function mapNotificationRow(row: any): NotificationItem {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    type: row.type || "info",
    title: row.title || "",
    message: row.message || "",
    link: row.link || "",
    isRead: !!row.is_read,
    createdAt: row.created_at ? new Date(row.created_at) : new Date()
  };
}

export const notificationService = {
  subscribeToNotifications(
    ownerUid: string,
    onNext: (notifications: NotificationItem[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('owner_uid', ownerUid)
          .order('created_at', { ascending: false });

        if (error) {
          if (onError) onError(error);
          else console.error("Error fetching notifications:", error);
          return;
        }

        const list = (data || []).map(mapNotificationRow);
        onNext(list);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    fetchNotifications();

    const channelName = `notifications-${ownerUid}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `owner_uid=eq.${ownerUid}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async addNotification(
    ownerUid: string,
    notification: Omit<NotificationItem, "id" | "createdAt" | "isRead" | "ownerUid">
  ): Promise<string> {
    const payload = {
      owner_uid: ownerUid,
      type: notification.type,
      title: notification.title,
      message: notification.message || "",
      link: notification.link || "",
      is_read: false
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error("Error adding notification:", error);
      throw error;
    }

    return data.id;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  async markAllAsRead(ownerUid: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('owner_uid', ownerUid)
      .eq('is_read', false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  },

  async clearAllNotifications(ownerUid: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('owner_uid', ownerUid);

    if (error) {
      console.error("Error clearing notifications:", error);
      throw error;
    }
  }
};
