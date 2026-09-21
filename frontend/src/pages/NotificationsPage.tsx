import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api';
import { useNotificationStore } from '../store';
import { Bell, CheckCheck } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, string> = {
  new_match: '🎯',
  request_received: '📥',
  request_approved: '✅',
  request_rejected: '❌',
  resource_returned: '📦',
  duplicate_purchase_alert: '⚠️',
  underutilized_resource: '💤',
  overdue_resource: '⏰',
  default: '🔔'
};

export default function NotificationsPage() {
  const { setUnreadCount } = useNotificationStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then(r => r.data)
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      setUnreadCount(0);
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success('All marked as read');
    }
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    }
  });

  const notifications = data?.notifications || [];
  const unread = notifications.filter((n: any) => !n.is_read);

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page font-bold text-brand mb-1">Notifications</h1>
          <p className="text-ink-muted text-sm">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => markAllMut.mutate()} className="btn btn-ghost text-sm">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="empty-state">
          <Bell size={40} className="text-ink-subtle mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-brand mb-2">No notifications yet</h3>
          <p className="text-ink-muted text-sm">You'll be notified about matches, requests, and updates.</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n: any) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markReadMut.mutate(n.id)}
            className={clsx(
              'card p-4 cursor-pointer transition-all',
              !n.is_read && 'ring-1 ring-accent/30 bg-accent/5'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">
                {TYPE_ICONS[n.type] || TYPE_ICONS.default}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-medium text-brand text-sm">{n.title}</span>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className="text-ink-muted text-sm">{n.message}</p>
                <div className="text-ink-subtle text-xs mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
