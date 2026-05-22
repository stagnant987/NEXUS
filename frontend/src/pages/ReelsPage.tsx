import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Post } from '../types';
import { useAuthStore } from '../store/auth';

export default function ReelsPage() {
  const { user } = useAuthStore();
  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>({});
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ posts: Post[] }>({
    queryKey: ['explore'],
    queryFn: () => api.get('/posts/explore?page=1').then(r => r.data)
  });

  const reels = (data?.posts ?? []).filter(p => p.mediaType === 'video');

  useEffect(() => {
    reels.forEach((_, i) => {
      const vid = videoRefs.current[i];
      if (!vid) return;
      if (i === current) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, [current, reels.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const newIdx = Math.round(el.scrollTop / el.clientHeight);
    setCurrent(newIdx);
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    const wasLiked = liked[postId];
    setLiked(l => ({ ...l, [postId]: !wasLiked }));
    setLikes(l => ({ ...l, [postId]: (l[postId] ?? currentLikes) + (wasLiked ? -1 : 1) }));
    await api.post(`/posts/${postId}/like`);
  };

  if (reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-center">
        <div>
          <p className="text-5xl mb-4">🎬</p>
          <p className="text-white font-bold text-xl mb-2">Aucun Reel disponible</p>
          <p className="text-gray-400 text-sm">Publie une vidéo depuis le fil pour qu'elle apparaisse ici</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none' }}
      onScroll={handleScroll}
    >
      {reels.map((post, i) => {
        const isLiked = liked[post.id] ?? (post as any).liked ?? false;
        const likeCount = likes[post.id] ?? post._count.likes;

        return (
          <div
            key={post.id}
            className="relative h-screen w-full snap-start flex items-center justify-center bg-black overflow-hidden"
          >
            {/* Video */}
            <video
              ref={el => { videoRefs.current[i] = el; }}
              src={post.mediaUrl}
              loop
              playsInline
              muted={i !== current}
              className="absolute inset-0 w-full h-full object-cover"
              onClick={() => {
                const vid = videoRefs.current[i];
                if (!vid) return;
                vid.paused ? vid.play() : vid.pause();
              }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Right actions */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-10">
              {/* Avatar */}
              <Link to={`/profile/${post.author.username}`}>
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-nexus-600">
                  {post.author.avatar
                    ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-bold">{post.author.displayName[0]}</div>
                  }
                </div>
              </Link>

              {/* Like */}
              <button
                onClick={() => handleLike(post.id, post._count.likes)}
                className="flex flex-col items-center gap-1 group"
              >
                <span className={`text-3xl transition-transform group-active:scale-125 ${isLiked ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`}>
                  {isLiked ? '❤️' : '🤍'}
                </span>
                <span className="text-white text-xs font-semibold">{likeCount}</span>
              </button>

              {/* Comment */}
              <button className="flex flex-col items-center gap-1">
                <span className="text-3xl">💬</span>
                <span className="text-white text-xs font-semibold">{post._count.comments}</span>
              </button>

              {/* Repost */}
              <button
                onClick={() => api.post(`/posts/${post.id}/repost`)}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl">🔁</span>
                <span className="text-white text-xs font-semibold">{post._count.reposts ?? 0}</span>
              </button>

              {/* Share */}
              <button className="flex flex-col items-center gap-1">
                <span className="text-3xl">📤</span>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-8 left-4 right-20 z-10">
              <Link to={`/profile/${post.author.username}`} className="flex items-center gap-2 mb-2">
                <span className="text-white font-bold text-base">@{post.author.username}</span>
                {post.author.verified && <span className="text-nexus-400">✓</span>}
              </Link>
              {post.content && (
                <p className="text-white text-sm leading-relaxed line-clamp-3">{post.content}</p>
              )}
              {/* Animated music bar */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-white text-sm">🎵</span>
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4,5].map(k => (
                    <div
                      key={k}
                      className="w-0.5 bg-white rounded-full animate-bounce"
                      style={{ height: `${Math.random() * 12 + 4}px`, animationDelay: `${k * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-white/60 text-xs truncate">Son original · {post.author.displayName}</span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="absolute top-4 left-0 right-0 flex gap-1 px-4 z-10">
              {reels.map((_, j) => (
                <div
                  key={j}
                  className={`flex-1 h-0.5 rounded transition-all ${j === i ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
