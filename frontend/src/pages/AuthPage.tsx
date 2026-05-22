import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, form);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810] px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-black tracking-tighter mb-2">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent logo-glitch">
              ⚡ NEXUS
            </span>
          </h1>
          <p className="text-gray-500 text-sm font-medium tracking-wide uppercase">La plateforme où tu es souverain</p>
        </div>

        <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-8 shadow-2xl shadow-violet-950/50">
          {/* Tabs */}
          <div className="flex gap-1 mb-7 bg-[#080810] p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Nom affiché</label>
                  <input className="input" placeholder="Votre nom" value={form.displayName}
                    onChange={e => setForm({ ...form, displayName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">@</span>
                    <input className="input pl-8" placeholder="username" value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Email</label>
              <input className="input" type="email" placeholder="vous@exemple.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Mot de passe</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3.5 text-base font-black tracking-wide mt-2" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Chargement...</span>
                : mode === 'login' ? 'Entrer dans NEXUS →' : 'Rejoindre NEXUS →'
              }
            </button>
          </form>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-700 font-medium">VOS DONNÉES VOUS APPARTIENNENT</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
