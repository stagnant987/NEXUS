import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Post, User } from '../types';
import PostCard from '../components/PostCard';

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'posts' | 'users'>('posts');

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['explore'],
    queryFn: () => api.get('/posts/explore').then(r => r.data)
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['search', search],
    queryFn: () => search.length >= 2 ? api.get(`/users/search?q=${search}`).then(r => r.data) : Promise.resolve([]),
    enabled: search.length >= 2
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold mb-6">Explorer</h2>

      <div className="mb-4">
        <input
          className="input text-base"
          placeholder="🔍 Rechercher des personnes ou des sujets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {search.length >= 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{users.length} utilisateur(s) trouvé(s)</p>
          {users.map(u => (
            <Link key={u.id} to={`/profile/${u.username}`} className="card p-4 flex items-center gap-3 hover:border-gray-700 transition-colors block">
              <div className="w-12 h-12 rounded-full bg-nexus-600 flex items-center justify-center font-bold overflow-hidden">
                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.displayName[0]}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{u.displayName}</span>
                  {u.verified && <span className="text-nexus-400 text-sm">✓</span>}
                </div>
                <span className="text-gray-500 text-sm">@{u.username}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-xl">
            <button onClick={() => setTab('posts')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'posts' ? 'bg-nexus-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Posts
            </button>
            <button onClick={() => setTab('users')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'users' ? 'bg-nexus-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Tendances
            </button>
          </div>

          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}
    </div>
  );
}
