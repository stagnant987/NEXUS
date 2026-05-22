import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Story } from '../types';
import { useAuthStore } from '../store/auth';

export default function Stories() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<Story | null>(null);
  const [idx, setIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: stories = [] } = useQuery<Story[]>({
    queryKey: ['stories'],
    queryFn: () => api.get('/stories').then(r => r.data)
  });

  // Group stories by author
  const grouped = stories.reduce<Record<string, Story[]>>((acc, s) => {
    const key = s.author.id;
    acc[key] = [...(acc[key] || []), s];
    return acc;
  }, {});
  const authorIds = Object.keys(grouped);

  const uploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('media', file);
    await api.post('/stories', fd);
    qc.invalidateQueries({ queryKey: ['stories'] });
    e.target.value = '';
  };

  const openStory = (authorId: string) => {
    const authorStories = grouped[authorId];
    setViewing(authorStories[0]);
    setIdx(0);
  };

  const nextStory = () => {
    if (!viewing) return;
    const authorId = viewing.author.id;
    const authorStories = grouped[authorId];
    if (idx + 1 < authorStories.length) {
      setIdx(idx + 1);
      setViewing(authorStories[idx + 1]);
    } else {
      // Next author
      const authorIdx = authorIds.indexOf(authorId);
      if (authorIdx + 1 < authorIds.length) {
        const nextAuthorId = authorIds[authorIdx + 1];
        setViewing(grouped[nextAuthorId][0]);
        setIdx(0);
      } else {
        setViewing(null);
      }
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
        >
          <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center text-2xl hover:border-nexus-500 transition-colors">
            +
          </div>
          <span className="text-xs text-gray-500 w-14 text-center truncate">Ma story</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={uploadStory} />

        {/* Stories list */}
        {authorIds.map(authorId => {
          const authorStories = grouped[authorId];
          const author = authorStories[0].author;
          const isMe = author.id === user?.id;
          return (
            <button
              key={authorId}
              onClick={() => openStory(authorId)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-nexus-500 to-purple-500">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                  {author.avatar
                    ? <img src={author.avatar} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-nexus-600">{author.displayName[0]}</div>
                  }
                </div>
              </div>
              <span className="text-xs text-gray-400 w-14 text-center truncate">
                {isMe ? 'Vous' : author.displayName.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={nextStory}
        >
          <button
            onClick={e => { e.stopPropagation(); setViewing(null); }}
            className="absolute top-4 right-4 text-white text-2xl z-10 w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full"
          >
            ✕
          </button>

          {/* Author */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-nexus-600">
              {viewing.author.avatar
                ? <img src={viewing.author.avatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{viewing.author.displayName[0]}</div>
              }
            </div>
            <span className="text-white font-semibold text-sm">{viewing.author.displayName}</span>
          </div>

          {/* Progress bars */}
          <div className="absolute top-2 left-4 right-4 flex gap-1 z-10">
            {grouped[viewing.author.id].map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded">
                <div className={`h-full bg-white rounded transition-all ${i < idx ? 'w-full' : i === idx ? 'w-1/2' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {viewing.mediaType === 'video'
            ? <video src={viewing.mediaUrl} autoPlay loop className="max-h-screen max-w-full" onClick={e => e.stopPropagation()} />
            : <img src={viewing.mediaUrl} alt="" className="max-h-screen max-w-full object-contain" />
          }

          <div className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm">
            Appuyez pour continuer
          </div>
        </div>
      )}
    </>
  );
}
