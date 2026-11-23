import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { NotificationItem } from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function StudentNotificationsPage() {
  const { user, isDemoMode, demoNotifications } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoNotice, setDemoNotice] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setNotifications(demoNotifications.filter((n) => n.userId === user?.id));
      setLoading(false);
      return;
    }
    apiFetch<{ notifications: NotificationItem[] }>('/api/notifications')
      .then((res) => setNotifications(res.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoNotifications, user?.id]);

  const handleToggleRead = async (id: string, nextIsRead: boolean) => {
    if (isDemoMode) {
      setDemoNotice(
        'Notification state updates are disabled in Demo Preview Mode. Configure PostgreSQL and sign in to persist read status.'
      );
      return;
    }
    await apiFetch(`/api/notifications/${id}/${nextIsRead ? 'read' : 'unread'}`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: nextIsRead } : n)));
    window.dispatchEvent(new Event('baust-sams-notifications-updated'));
  };

  const handleMarkAllRead = async () => {
    if (isDemoMode) {
      setDemoNotice(
        'Notification state updates are disabled in Demo Preview Mode. Configure PostgreSQL and sign in to persist read status.'
      );
      return;
    }
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(new Event('baust-sams-notifications-updated'));
  };

  return (
    <PortalLayout title="Notifications" breadcrumb="Student Portal / Notifications">
      <div className="space-y-4">
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
          >
            Mark All as Read
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {loading ? (
            <p className="p-8 text-sm text-slate-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  n.isRead ? 'bg-white' : 'bg-blue-50/40'
                }`}
              >
                <div>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    {formatDateTime(n.createdAt)} · {n.isRead ? 'Read' : 'Unread'}
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
