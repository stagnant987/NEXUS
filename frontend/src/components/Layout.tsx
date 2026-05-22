import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import NotificationBell from './NotificationBell';
import RightSidebar from './RightSidebar';

const navItems = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/rift', label: 'RIFT ⚡', icon: '🔥' },
  { to: '/reels', label: 'Reels', icon: '🎬' },
  { to: '/explore', label: 'Explorer', icon: '🔍' },
  { to: '/messages', label: 'Messages', icon: '💬' },
  { to: '/communities', label: 'Communautés', icon: '👥' },
];

const noSidebarRoutes = ['/reels', '/messages', '/rift'];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const showRightSidebar = !noSidebarRoutes.some(r => location.pathname.startsWith(r));

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex bg-[#080810]">
      {/* Left Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-full flex flex-col p-4 z-10 border-r border-gray-800/50">
        {/* Logo */}
        <div className="mb-8 px-4 pt-2">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="logo-glitch bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">⚡ NEXUS</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-gray-600 font-medium">Plateforme souveraine</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Notifications */}
          <NotificationBell />

          {user && (
            <NavLink
              to={`/profile/${user.username}`}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="text-xl">👤</span>
              <span>Profil</span>
            </NavLink>
          )}

          {user?.username === 'stagnant987' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="text-xl">🛡️</span>
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Post button */}
        <button
          onClick={() => navigate('/')}
          className="btn-primary w-full py-3 mb-4 text-center font-black text-base glow-violet"
        >
          + Publier
        </button>

        {user && (
          <div className="border-t border-gray-800/50 pt-4">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
              <div className="w-9 h-9 rounded-full ring-2 ring-violet-500/50 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                {user.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">{user.displayName[0].toUpperCase()}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.displayName}</p>
                <p className="text-xs text-gray-500 truncate">@{user.username}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); handleLogout(); }} className="text-gray-600 hover:text-red-400 transition-colors text-sm">
                🚪
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className={`ml-64 flex-1 min-h-screen ${showRightSidebar ? 'mr-0' : ''}`}>
        {showRightSidebar ? (
          <div className="max-w-5xl mx-auto flex gap-6 px-4">
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
            <div className="w-80 flex-shrink-0 py-6">
              <RightSidebar />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
