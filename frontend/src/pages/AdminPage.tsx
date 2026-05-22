import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ADMIN_USERNAME = 'stagnant987';

interface Stats {
  users: number;
  posts: number;
  communities: number;
  messages: number;
  recentUsers: { id: string; username: string; displayName: string; avatar: string; createdAt: string }[];
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  createdAt: string;
  _count: { posts: number; followers: number };
}

interface AdminPost {
  id: string;
  content: string;
  mediaType: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string };
  _count: { likes: number; comments: number };
}

type Tab = 'stats' | 'users' | 'posts';

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('stats');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  if (!user || user.username !== ADMIN_USERNAME) return <Navigate to="/" replace />;

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: tab === 'stats'
  });

  const { data: users } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: tab === 'users'
  });

  const { data: posts } = useQuery<AdminPost[]>({
    queryKey: ['admin-posts'],
    queryFn: () => api.get('/admin/posts').then(r => r.data),
    enabled: tab === 'posts'
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-posts'] })
  });

  const filteredUsers = users?.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPosts = posts?.filter(p =>
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    p.author.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-6 px-2">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="text-3xl">🛡️</div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Panel Admin</h1>
            <p className="text-xs text-gray-500">NEXUS — accès restreint</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['stats', 'users', 'posts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {t === 'stats' ? '📊 Stats' : t === 'users' ? '👥 Utilisateurs' : '📝 Posts'}
            </button>
          ))}
        </div>

        {/* STATS */}
        {tab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Utilisateurs', value: stats.users, icon: '👤', color: 'from-violet-600 to-purple-700' },
                { label: 'Posts', value: stats.posts, icon: '📝', color: 'from-pink-600 to-rose-700' },
                { label: 'Communautés', value: stats.communities, icon: '👥', color: 'from-blue-600 to-cyan-700' },
                { label: 'Messages', value: stats.messages, icon: '💬', color: 'from-green-600 to-emerald-700' },
              ].map(card => (
                <div key={card.label} className="card p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl`}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-black">{card.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h2 className="font-bold text-sm text-gray-400 mb-4">Derniers inscrits</h2>
              <div className="space-y-3">
                {stats.recentUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : u.displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{u.displayName}</p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
            />
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-500 text-xs">
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Posts</th>
                    <th className="px-4 py-3 text-center">Abonnés</th>
                    <th className="px-4 py-3 text-center">Certifié</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers?.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.displayName[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold">{u.displayName}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-center">{u._count.posts}</td>
                      <td className="px-4 py-3 text-center">{u._count.followers}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => verifyMutation.mutate(u.id)}
                          className={`text-lg transition-transform hover:scale-110 ${u.verified ? 'opacity-100' : 'opacity-30'}`}
                          title={u.verified ? 'Retirer la certification' : 'Certifier'}
                        >
                          ✅
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.username !== ADMIN_USERNAME && (
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer @${u.username} ?`)) deleteUserMutation.mutate(u.id);
                            }}
                            className="text-red-500 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-500/10"
                          >
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredUsers?.length && (
                <p className="text-center text-gray-600 py-8 text-sm">Aucun utilisateur trouvé</p>
              )}
            </div>
          </div>
        )}

        {/* POSTS */}
        {tab === 'posts' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Rechercher dans les posts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500"
            />
            <div className="space-y-2">
              {filteredPosts?.map(p => (
                <div key={p.id} className="card p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-violet-400">@{p.author.username}</span>
                      {p.mediaType !== 'none' && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{p.mediaType}</span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{p.content}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-600">
                      <span>❤️ {p._count.likes}</span>
                      <span>💬 {p._count.comments}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce post ?')) deletePostMutation.mutate(p.id);
                    }}
                    className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {!filteredPosts?.length && (
                <p className="text-center text-gray-600 py-8 text-sm">Aucun post trouvé</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
