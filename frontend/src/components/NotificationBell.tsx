import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { Notification } from '../types';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 15000
  });

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const icons: Record<string, string> = {
    like: '❤️', comment: '💬', follow: '👤', mention: '📢', default: '🔔'
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        className="nav-link relative"
      >
        <span className="text-xl">🔔</span>
        <span>Notifications</span>
        {unread > 0 && (
          <span className="absolute top-1.5 left-7 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full ml-2 top-0 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="font-bold">Notifications</h3>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-sm">✕</button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">Aucune notification</div>
            )}
            {notifs.map(n => (
              <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!n.read ? 'bg-nexus-600/5' : ''}`}>
                <span className="text-xl flex-shrink-0">{icons[n.type] || icons.default}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-nexus-500 rounded-full mt-1.5 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
