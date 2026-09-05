// frontend/src/components/NotificationBell.jsx
// Header notification bell — unread count, dropdown list, mark read/all read,
// and instant updates via the real-time "notification:created" event.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import { formatNotificationDate } from '../utils/incident';

const MAX_LISTED = 12;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const containerRef = useRef(null);
  const toastTimerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const result = await api.notifications({ limit: MAX_LISTED });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch {
      // Bell remains usable even if the initial fetch fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: new persistent notification arrives immediately.
  useSocketEvent('notification:created', (notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, MAX_LISTED));
    setUnreadCount((count) => count + 1);
    setToast(notification);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [open]);

  async function handleRead(notification) {
    if (notification.isRead) {
      return;
    }
    try {
      await api.markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Ignore transient failures; the row will refresh on next open.
    }
  }

  async function handleReadAll() {
    try {
      await api.markNotificationsReadAll();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore transient failures.
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {toast && (
        <div className="fixed right-4 top-16 z-50 max-w-sm rounded-md border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-xs font-medium text-slate-800">{toast.title}</p>
          <p className="mt-0.5 text-sm text-slate-600">{toast.message}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) {
            load();
          }
        }}
        className="relative rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        aria-label={`Notifications, ${unreadCount} unread`}
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">Notifications</span>
            <div className="flex items-center gap-3 text-xs">
              {unreadCount > 0 && (
                <button type="button" onClick={handleReadAll} className="text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">
                Close
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">You have no notifications.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleRead(notification)}
                      className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                        notification.isRead ? 'opacity-70' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">{notification.title}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatNotificationDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{notification.message}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}