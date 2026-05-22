/**
 * NEXUS RIFT — La feature unique.
 *
 * Concept : Du contenu qui RÉAGIT à sa communauté en temps réel.
 * - Pas un algo qui décide ce que tu vois.
 * - La communauté vote, pulse, réagit — et le contenu évolue.
 * - Chaque post a une "énergie" collective : plus de gens regardent, plus c'est visible.
 * - Les créateurs voient leur audience réagir en direct sous leur contenu.
 * - Le mode "Rift" : contenu qui existe 24h max, amplifié ou enterré par la communauté.
 *
 * Ce que aucune autre plateforme n'offre :
 * → Tu n'es pas spectateur. Tu es acteur de ce qui monte.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { Post } from '../types';

interface RiftPost extends Post {
  energy: number;
  viewers: number;
  momentum: 'rising' | 'peak' | 'fading';
  pulses: number;
}

function generateEnergy(post: Post): RiftPost {
  const age = Date.now() - new Date(post.createdAt).getTime();
  const ageHours = age / (1000 * 60 * 60);
  const base = post._count.likes * 3 + post._count.comments * 5 + (post._count.reposts ?? 0) * 7;
  const energy = Math.max(0, Math.min(100, base - ageHours * 2));
  const momentum: RiftPost['momentum'] = energy > 70 ? 'rising' : energy > 30 ? 'peak' : 'fading';
  return {
    ...post,
    energy,
    viewers: Math.floor(Math.random() * 80 + post._count.likes),
    momentum,
    pulses: Math.floor(Math.random() * 200)
  };
}

const MOMENTUM_CONFIG = {
  rising: { label: '⚡ En hausse', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', bar: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
  peak: { label: '🔥 Au sommet', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', bar: 'bg-gradient-to-r from-orange-500 to-red-500' },
  fading: { label: '🌙 Retombe', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', bar: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
};

export default function RiftPage() {
  const [pulsed, setPulsed] = useState<Record<string, number>>({});
  const [activePost, setActivePost] = useState<string | null>(null);
  const [liveReactions, setLiveReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data } = useQuery<{ posts: Post[] }>({
    queryKey: ['explore'],
    queryFn: () => api.get('/posts/explore?page=1').then(r => r.data)
  });

  const riftPosts = (data?.posts ?? [])
    .map(generateEnergy)
    .sort((a, b) => b.energy - a.energy);

  // Simulate live reactions on active post
  useEffect(() => {
    if (!activePost) return;
    intervalRef.current = setInterval(() => {
      const emojis = ['❤️', '🔥', '💥', '⚡', '😱', '👏'];
      const newReaction = {
        id: Math.random().toString(),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * 80 + 10
      };
      setLiveReactions(r => [...r.slice(-15), newReaction]);
    }, 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activePost]);

  const handlePulse = async (postId: string) => {
    setPulsed(p => ({ ...p, [postId]: (p[postId] || 0) + 1 }));
    await api.post(`/posts/${postId}/like`);
    // Add burst of live reactions
    setLiveReactions(r => [...r.slice(-10), ...Array(3).fill(null).map(() => ({
      id: Math.random().toString(),
      emoji: ['⚡', '🔥', '💥'][Math.floor(Math.random() * 3)],
      x: Math.random() * 80 + 10
    }))]);
  };

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-black">
            <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
              ⚡ RIFT
            </span>
          </h2>
          <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-800/40 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-wide">Live</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          Le contenu monte ou tombe selon <span className="text-white font-semibold">l'énergie collective</span>. Toi et la communauté décidez.
        </p>
      </div>

      {/* Energy legend */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {Object.entries(MOMENTUM_CONFIG).map(([key, cfg]) => (
          <div key={key} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </div>
        ))}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-700 text-gray-500 text-xs font-bold bg-gray-800/50">
          💛 Pulse = énergie collective
        </div>
      </div>

      {/* Rift posts */}
      <div className="space-y-4">
        {riftPosts.map((post) => {
          const cfg = MOMENTUM_CONFIG[post.momentum];
          const totalPulses = post.pulses + (pulsed[post.id] || 0);
          const isActive = activePost === post.id;

          return (
            <article
              key={post.id}
              className={`relative bg-[#0f0f1a] border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${isActive ? `${cfg.bg} border-opacity-100` : 'border-gray-800/80 hover:border-gray-700'}`}
              onClick={() => setActivePost(isActive ? null : post.id)}
            >
              {/* Energy bar */}
              <div className="h-0.5 w-full bg-gray-800">
                <div
                  className={`h-full transition-all duration-1000 ${cfg.bar}`}
                  style={{ width: `${post.energy}%` }}
                />
              </div>

              <div className="p-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${post.author.username}`} onClick={e => e.stopPropagation()}>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {post.author.avatar ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover" /> : post.author.displayName[0]}
                      </div>
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{post.author.displayName}</span>
                        {post.author.verified && <span className="text-violet-400 text-xs">✓</span>}
                      </div>
                      <span className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Momentum badge */}
                  <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                    <span>{cfg.label}</span>
                    <span className="text-gray-500 font-normal">·</span>
                    <span>{Math.round(post.energy)}%</span>
                  </div>
                </div>

                {/* Content */}
                {post.content && <p className="text-gray-200 mb-3 leading-relaxed">{post.content}</p>}

                {post.mediaType === 'image' && post.mediaUrl && (
                  <img src={post.mediaUrl} alt="" className="rounded-xl max-h-80 w-full object-cover mb-3" />
                )}
                {post.mediaType === 'video' && post.mediaUrl && (
                  <video src={post.mediaUrl} controls className="rounded-xl max-h-80 w-full mb-3" onClick={e => e.stopPropagation()} />
                )}

                {/* Live reactions overlay on expanded */}
                {isActive && (
                  <div className="relative h-12 mb-3 overflow-hidden">
                    {liveReactions.map(r => (
                      <span
                        key={r.id}
                        className="absolute text-2xl animate-bounce pointer-events-none"
                        style={{ left: `${r.x}%`, bottom: 0, animation: 'floatUp 2s ease-out forwards' }}
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats & Pulse */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-800/50">
                  {/* Viewers */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span>{post.viewers} live</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span>❤️</span> {post._count.likes}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span>💬</span> {post._count.comments}
                  </div>

                  {/* PULSE BUTTON — la feature unique */}
                  <button
                    onClick={e => { e.stopPropagation(); handlePulse(post.id); }}
                    className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all active:scale-95 ${
                      (pulsed[post.id] ?? 0) > 0
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-900/40'
                        : 'bg-gray-800 hover:bg-orange-950/50 hover:border-orange-700 border border-gray-700 text-gray-300 hover:text-orange-400'
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <span>PULSE</span>
                    <span className="text-xs opacity-70 font-normal">{totalPulses}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {riftPosts.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-5xl mb-4">⚡</p>
            <p className="text-gray-400 font-bold">Le Rift est silencieux</p>
            <p className="text-gray-600 text-sm mt-1">Publie du contenu pour alimenter l'énergie collective</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
