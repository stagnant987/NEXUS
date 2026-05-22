import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import Stories from '../components/Stories';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (p: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ posts: Post[]; hasMore: boolean }>(`/posts/feed?page=${p}`);
      setPosts(prev => p === 1 ? data.posts : [...prev, ...data.posts]);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => { loadPosts(1); }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        loadPosts(next);
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  const handlePost = (post: Post) => setPosts(p => [post, ...p]);

  const handleDelete = async (id: string) => {
    await api.delete(`/posts/${id}`);
    setPosts(p => p.filter(p => p.id !== id));
  };

  return (
    <div className="py-6">
      {/* Stories */}
      <Stories />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-white">Pour toi</h2>
        <span className="text-xs text-gray-600 bg-gray-800/50 border border-gray-700/50 px-3 py-1 rounded-full font-medium">
          Chronologique · sans algo
        </span>
      </div>

      {/* Create post */}
      <CreatePost onPost={handlePost} />

      {/* Skeleton loader */}
      {loading && posts.length === 0 && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                  <div className="h-4 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🌱</p>
          <p className="text-gray-400 font-bold">Ton fil est vide</p>
          <p className="text-gray-600 text-sm mt-1">Suis des personnes ou rejoins des communautés</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))}
      </div>

      {/* Infinite scroll loader */}
      <div ref={loaderRef} className="py-4 text-center">
        {loading && posts.length > 0 && (
          <div className="flex justify-center gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-gray-700 text-sm">Tu as tout vu ✓</p>
        )}
      </div>
    </div>
  );
}
