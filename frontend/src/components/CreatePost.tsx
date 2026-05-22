import { useState, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../api/client';
import { Post } from '../types';

interface Props {
  onPost: (post: Post) => void;
  communityId?: string;
}

export default function CreatePost({ onPost, communityId }: Props) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('content', content);
      if (file) fd.append('media', file);
      if (communityId) fd.append('communityId', communityId);
      const { data } = await api.post<Post>('/posts', fd);
      onPost(data);
      setContent('');
      setFile(null);
      setPreview('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-nexus-600 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : user?.displayName[0].toUpperCase()
          }
        </div>
        <div className="flex-1">
          <textarea
            className="input resize-none min-h-[80px] text-base"
            placeholder="Partagez quelque chose avec le monde..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          {preview && (
            <div className="mt-2 relative">
              {file?.type.startsWith('video')
                ? <video src={preview} className="rounded-xl max-h-64 w-full object-cover" />
                : <img src={preview} alt="" className="rounded-xl max-h-64 w-full object-cover" />
              }
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(''); }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-gray-400 hover:text-nexus-400 transition-colors text-xl"
                title="Ajouter une image/vidéo"
              >
                📎
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
            <button
              type="submit"
              className="btn-primary px-5"
              disabled={loading || (!content.trim() && !file)}
            >
              {loading ? '...' : 'Publier'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
