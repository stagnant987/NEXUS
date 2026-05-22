import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { User } from '../types';

interface TrendingItem { tag: string; count: number; }

export default function RightSidebar() {
  const { data: trending = [] } = useQuery<TrendingItem[]>({
    queryKey: ['trending'],
    queryFn: () => api.get('/posts/trending').then(r => r.data),
    refetchInterval: 60000
  });

  const { data: suggestions = [] } = useQuery<User[]>({
    queryKey: ['suggestions'],
    queryFn: () => api.get('/users/search?q=a').then(r => r.data),
    staleTime: 300000
  });

  return (
    <aside className="w-80 flex-shrink-0 space-y-4">
      {/* Trending */}
      <div className="card p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>🔥</span> Tendances
        </h3>
        {trending.length === 0 ? (
          <p className="text-gray-500 text-sm">Publiez avec des #hashtags pour créer des tendances</p>
        ) : (
          <div className="space-y-2">
            {trending.map((t, i) => (
              <Link
                key={t.tag}
                to={`/explore?hashtag=${t.tag}`}
                className="flex items-center gap-3 hover:bg-gray-800 rounded-xl px-2 py-1.5 transition-colors group"
              >
                <span className="text-nexus-400 font-bold text-sm w-5">{i + 1}</span>
                <div>
                  <p className="font-semibold text-sm group-hover:text-nexus-400 transition-colors">#{t.tag}</p>
                  <p className="text-xs text-gray-500">{t.count} post{t.count > 1 ? 's' : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Suggested users */}
      {suggestions.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span>👤</span> Suggestions
          </h3>
          <div className="space-y-3">
            {suggestions.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <Link to={`/profile/${u.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-nexus-600 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.displayName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold truncate">{u.displayName}</p>
                      {u.verified && <span className="text-nexus-400 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                  </div>
                </Link>
                <Link to={`/profile/${u.username}`} className="text-nexus-400 text-xs font-semibold hover:text-nexus-300 flex-shrink-0">
                  Voir
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      <div className="px-2">
        <p className="text-xs text-gray-600 leading-relaxed">
          ⚡ <span className="font-semibold text-gray-500">NEXUS</span> — La plateforme souveraine.
          Vos données vous appartiennent. Toujours.
        </p>
      </div>
    </aside>
  );
}
