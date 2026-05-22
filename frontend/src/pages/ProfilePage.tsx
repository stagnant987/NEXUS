import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { User, Post } from '../types';
import { useAuthStore } from '../store/auth';
import PostCard from '../components/PostCard';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then(r => r.data)
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['userPosts', username],
    queryFn: () => api.get(`/users/${username}/posts`).then(r => r.data),
    enabled: !!profile
  });

  const handleFollow = async () => {
    await api.post(`/users/${profile!.id}/follow`);
    qc.invalidateQueries({ queryKey: ['profile', username] });
  };

  const handleSaveProfile = async () => {
    await api.put('/users/me/profile', editForm);
    qc.invalidateQueries({ queryKey: ['profile', username] });
    setEditMode(false);
  };

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse">
      <div className="card p-6 mb-4">
        <div className="h-24 bg-gray-800 rounded-xl mb-4" />
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
      </div>
    </div>
  );

  if (!profile) return <div className="p-6 text-gray-500">Utilisateur non trouvé</div>;

  const isMe = me?.id === profile.id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-nexus-600 flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : profile.displayName[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{profile.displayName}</h2>
              {profile.verified && <span className="text-nexus-400">✓</span>}
            </div>
            <p className="text-gray-500 text-sm mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-gray-300 text-sm mb-3">{profile.bio}</p>}
            <p className="text-gray-600 text-xs">
              Membre depuis {format(new Date(profile.createdAt), 'MMMM yyyy', { locale: fr })}
            </p>

            <div className="flex gap-6 mt-3">
              <div className="text-center">
                <p className="font-bold">{profile._count?.posts ?? 0}</p>
                <p className="text-xs text-gray-500">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{profile._count?.followers ?? 0}</p>
                <p className="text-xs text-gray-500">Abonnés</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{profile._count?.following ?? 0}</p>
                <p className="text-xs text-gray-500">Abonnements</p>
              </div>
            </div>
          </div>
          <div>
            {isMe ? (
              <button onClick={() => { setEditForm({ displayName: profile.displayName, bio: profile.bio }); setEditMode(true); }} className="btn-secondary text-sm">
                Modifier
              </button>
            ) : (
              <button onClick={handleFollow} className={profile.isFollowing ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
                {profile.isFollowing ? 'Se désabonner' : 'Suivre'}
              </button>
            )}
          </div>
        </div>

        {editMode && isMe && (
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
            <input
              className="input"
              placeholder="Nom affiché"
              value={editForm.displayName}
              onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
            />
            <textarea
              className="input resize-none"
              placeholder="Biographie"
              rows={3}
              value={editForm.bio}
              onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} className="btn-primary text-sm">Sauvegarder</button>
              <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">Annuler</button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
        {posts.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-500">Aucun post pour l'instant</p>
          </div>
        )}
      </div>
    </div>
  );
}
