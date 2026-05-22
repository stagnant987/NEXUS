import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client';
import { Post, Comment } from '../types';
import { useAuthStore } from '../store/auth';

interface Props {
  post: Post;
  onDelete?: (id: string) => void;
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

function renderContent(content: string) {
  if (!content) return null;
  const parts = content.split(/(#[\wÀ-ſ]+)/g);
  return (
    <p className="text-gray-200 mb-3 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith('#')
          ? <Link key={i} to={`/explore?hashtag=${part.slice(1).toLowerCase()}`} className="text-nexus-400 hover:text-nexus-300 font-medium">{part}</Link>
          : part
      )}
    </p>
  );
}

export default function PostCard({ post, onDelete }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [liked, setLiked] = useState((post as any).liked ?? false);
  const [reposted, setReposted] = useState((post as any).reposted ?? false);
  const [reaction, setReaction] = useState<string | null>((post as any).reaction ?? null);
  const [likesCount, setLikesCount] = useState(post._count.likes);
  const [repostsCount, setRepostsCount] = useState(post._count.reposts ?? 0);
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    setLiked(!liked);
    setLikesCount(c => liked ? c - 1 : c + 1);
    await api.post(`/posts/${post.id}/like`);
  };

  const handleReact = async (emoji: string) => {
    setShowReactions(false);
    const prev = reaction;
    setReaction(reaction === emoji ? null : emoji);
    await api.post(`/posts/${post.id}/react`, { emoji });
    if (prev === null) setLikesCount(c => c + 1);
    else if (reaction === emoji) setLikesCount(c => c - 1);
  };

  const handleRepost = async () => {
    setReposted(!reposted);
    setRepostsCount(c => reposted ? c - 1 : c + 1);
    await api.post(`/posts/${post.id}/repost`);
  };

  const loadComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      const { data } = await api.get<Comment[]>(`/posts/${post.id}/comments`);
      setComments(data);
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const { data } = await api.post<Comment>(`/posts/${post.id}/comments`, { content: newComment });
    setComments(c => [...c, data]);
    setNewComment('');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Post de ${post.author.displayName}`, text: post.content, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Repost card
  if (post.repostOfId && (post as any).repostOf) {
    const original = (post as any).repostOf;
    return (
      <article className="card p-4 hover:border-gray-700 transition-colors">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span className="text-green-400">🔁</span>
          <Link to={`/profile/${post.author.username}`} className="hover:text-white font-medium">
            {post.author.displayName}
          </Link>
          a reposté
        </div>
        <div className="border border-gray-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-nexus-600 flex items-center justify-center text-xs font-bold overflow-hidden">
              {original.author.avatar ? <img src={original.author.avatar} alt="" className="w-full h-full object-cover" /> : original.author.displayName[0]}
            </div>
            <span className="text-sm font-semibold">{original.author.displayName}</span>
            <span className="text-xs text-gray-500">@{original.author.username}</span>
          </div>
          {renderContent(original.content)}
          {original.mediaType === 'image' && original.mediaUrl && (
            <img src={original.mediaUrl} alt="" className="rounded-xl max-h-64 w-full object-cover" />
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="card p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author.username}`}>
          <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
            {post.author.avatar
              ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
              : post.author.displayName[0].toUpperCase()
            }
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link to={`/profile/${post.author.username}`} className="font-semibold hover:underline">
              {post.author.displayName}
            </Link>
            {post.author.verified && <span className="text-nexus-400 text-sm">✓</span>}
            <span className="text-gray-500 text-sm">@{post.author.username}</span>
            <span className="text-gray-600 text-xs ml-auto">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })}
            </span>
          </div>

          {renderContent(post.content)}

          {post.mediaType === 'image' && post.mediaUrl && (
            <img src={post.mediaUrl} alt="" className="rounded-xl max-h-96 w-full object-cover mb-3" />
          )}
          {post.mediaType === 'video' && post.mediaUrl && (
            <video src={post.mediaUrl} controls className="rounded-xl max-h-96 w-full mb-3" />
          )}

          {post.community && (
            <Link to={`/communities/${post.community.id}`} className="inline-flex items-center gap-1 text-xs text-nexus-400 hover:text-nexus-300 mb-3">
              👥 {post.community.name}
            </Link>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-gray-800">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${liked ? 'text-red-400 bg-red-900/20' : 'text-gray-500 hover:text-red-400 hover:bg-red-900/10'}`}
            >
              {liked ? '❤️' : '🤍'} <span>{likesCount}</span>
            </button>

            {/* Reactions */}
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={`flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-xl transition-colors ${reaction ? 'text-yellow-400 bg-yellow-900/20' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/10'}`}
              >
                {reaction || '😊'}
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-2xl p-2 flex gap-1 shadow-xl z-10">
                  {REACTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => handleReact(e)}
                      className={`text-xl hover:scale-125 transition-transform p-1 rounded-lg ${reaction === e ? 'bg-nexus-600/30' : 'hover:bg-gray-700'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <button
              onClick={loadComments}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl text-gray-500 hover:text-blue-400 hover:bg-blue-900/10 transition-colors"
            >
              💬 <span>{post._count.comments}</span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${reposted ? 'text-green-400 bg-green-900/20' : 'text-gray-500 hover:text-green-400 hover:bg-green-900/10'}`}
            >
              🔁 <span>{repostsCount}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl text-gray-500 hover:text-nexus-400 hover:bg-nexus-900/10 transition-colors ml-auto"
            >
              📤
            </button>

            {user?.id === post.author.id && onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="text-sm px-2 py-1.5 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-900/10 transition-colors"
              >
                🗑️
              </button>
            )}
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="mt-3 space-y-3">
              {loadingComments && <p className="text-gray-500 text-sm">Chargement...</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Link to={`/profile/${c.author.username}`}>
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                      {c.author.avatar ? <img src={c.author.avatar} alt="" className="w-full h-full object-cover" /> : c.author.displayName[0]}
                    </div>
                  </Link>
                  <div className="bg-gray-800 rounded-xl px-3 py-2 flex-1">
                    <span className="text-sm font-semibold text-nexus-400">{c.author.displayName} </span>
                    <span className="text-sm text-gray-300">{c.content}</span>
                  </div>
                </div>
              ))}
              <form onSubmit={submitComment} className="flex gap-2 mt-2">
                <input
                  className="input text-sm py-2"
                  placeholder="Écrire un commentaire..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn-primary px-3 py-2 text-sm">→</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
