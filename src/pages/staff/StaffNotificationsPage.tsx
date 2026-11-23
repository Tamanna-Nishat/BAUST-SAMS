import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { NotificationItem } from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function StaffNotificationsPage() {
  const { user, isDemoMode, demoNotifications } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setNotifications(demoNotifications.filter((n) => n.userId === user?.id));
      setLoading(false);
      return;
    }

    apiFetch<{ notifications: NotificationItem[] }>('/api/notifications')
      .then((res) => setNotifications(res.notifications))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load notifications.'))
      .finally(() => setLoading(false));
  }, [isDemoMode, demoNotifications, user?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readCount = notifications.length - unreadCount;

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleToggleRead = async (id: string, nextIsRead: boolean) => {
    setError('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Notification read/unread updates are disabled in Demo Preview Mode. Configure PostgreSQL and sign in as staff to persist changes.'
      );
      return;
    }

    try {
      await apiFetch(`/api/notifications/${id}/${nextIsRead ? 'read' : 'unread'}`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: nextIsRead } : n)));
      window.dispatchEvent(new Event('baust-sams-notifications-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification.');
    }
  };

  const handleMarkAllRead = async () => {
    setError('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Notification state updates are disabled in Demo Preview Mode. Configure PostgreSQL and sign in as staff to persist changes.'
      );
      return;
    }

    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event('baust-sams-notifications-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read.');
    }
  };

  return (
    <PortalLayout
      title="Staff Notifications"
      breadcrumb={`Staff Portal / ${user?.officeName ?? 'Office'} / Notifications`}
    >
      <div className="space-y-5">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('read')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filter === 'read' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Read ({readCount})
            </button>
          </div>

          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => void handleMarkAllRead()}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700"
          >
            Mark All as Read
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {loading ? (
            <p className="p-8 text-sm text-slate-500">Loading staff notifications...</p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications found for this filter.'}
            </p>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  n.isRead ? 'bg-white' : 'bg-blue-50/40'
                }`}
              >
                <div>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    {formatDateTime(n.createdAt)} ·{' '}
                    <span className={n.isRead ? 'text-slate-500' : 'font-semibold text-[#1D4ED8]'}>
                      {n.isRead ? 'Read' : 'Unread'}
                    </span>
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleToggleRead(n.id, !n.isRead)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    {n.isRead ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <Link
                    to={n.linkPath}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
