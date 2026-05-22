import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Community, Post } from '../types';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: community, isLoading } = useQuery<Community>({
    queryKey: ['community', id],
    queryFn: () => api.get(`/communities/${id}`).then(r => r.data)
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['communityPosts', id],
    queryFn: () => api.get(`/communities/${id}/posts`).then(r => r.data),
    enabled: !!community
  });

  const handleJoin = async () => {
    await api.post(`/communities/${id}/join`);
    qc.invalidateQueries({ queryKey: ['community', id] });
  };

  const handlePost = (post: Post) => {
    qc.setQueryData<Post[]>(['communityPosts', id], old => [post, ...(old ?? [])]);
  };

  if (isLoading) return <div className="p-6 text-gray-500">Chargement...</div>;
  if (!community) return <div className="p-6 text-gray-500">Communauté non trouvée</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-nexus-600/20 border border-nexus-600/30 flex items-center justify-center text-3xl">
            👥
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{community.name}</h2>
            {community.description && <p className="text-gray-400 text-sm mt-1">{community.description}</p>}
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-500">{community._count.members} membres</span>
              <span className="text-sm text-gray-500">{community._count.posts} posts</span>
            </div>
          </div>
          <button
            onClick={handleJoin}
            className={community.isMember ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
          >
            {community.isMember ? 'Quitter' : 'Rejoindre'}
          </button>
        </div>
      </div>

      {community.isMember && <CreatePost onPost={handlePost} communityId={id} />}

      <div className="space-y-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
        {posts.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-500">Aucun post dans cette communauté</p>
          </div>
        )}
      </div>
    </div>
  );
}
