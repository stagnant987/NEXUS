import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Community } from '../types';

export default function CommunitiesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: communities = [], isLoading } = useQuery<Community[]>({
    queryKey: ['communities'],
    queryFn: () => api.get('/communities').then(r => r.data)
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/communities', form);
    qc.invalidateQueries({ queryKey: ['communities'] });
    setForm({ name: '', description: '' });
    setShowCreate(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Communautés</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          + Créer
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-4 mb-6 space-y-3">
          <h3 className="font-semibold">Nouvelle communauté</h3>
          <input
            className="input"
            placeholder="Nom de la communauté"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <textarea
            className="input resize-none"
            placeholder="Description (optionnel)"
            rows={3}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm">Créer</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Annuler</button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-gray-500">Chargement...</p>}

      <div className="space-y-3">
        {communities.map(c => (
          <Link key={c.id} to={`/communities/${c.id}`} className="card p-4 flex items-center gap-4 hover:border-gray-700 transition-colors block">
            <div className="w-14 h-14 rounded-2xl bg-nexus-600/20 border border-nexus-600/30 flex items-center justify-center text-2xl flex-shrink-0">
              👥
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{c.name}</h3>
              {c.description && <p className="text-gray-400 text-sm truncate">{c.description}</p>}
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-gray-500">{c._count.members} membres</span>
                <span className="text-xs text-gray-500">{c._count.posts} posts</span>
              </div>
            </div>
            <span className="text-nexus-400 text-sm font-medium">Voir →</span>
          </Link>
        ))}

        {communities.length === 0 && !isLoading && (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-4">🌍</p>
            <p className="text-gray-400 font-medium">Aucune communauté pour l'instant</p>
            <p className="text-gray-600 text-sm mt-1">Soyez le premier à en créer une !</p>
          </div>
        )}
      </div>
    </div>
  );
}
