import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityPage from './pages/CommunityPage';
import ReelsPage from './pages/ReelsPage';
import RiftPage from './pages/RiftPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/auth" replace />;
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      <Route path="/auth" element={token ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<FeedPage />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="rift" element={<RiftPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:userId" element={<MessagesPage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="communities/:id" element={<CommunityPage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
