import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentAuth from './pages/StudentAuth';
import Developers from './pages/Developers';
import QuestionPage from './pages/QuestionPage';
import ResultPage from './pages/ResultPage';
import Leaderboard from './pages/Leaderboard';
import PersonalStats from './pages/PersonalStats';
import SocialHub from './pages/SocialHub';
import OverallLeaderboard from './pages/OverallLeaderboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuestion from './pages/admin/AdminQuestion';
import AdminManagement from './pages/admin/AdminManagement';
import { ADMIN_SECRET_KEY, ADMIN_BASE_PATH } from './config';

function AdminSecretRoute({ children }: { children: React.ReactElement }) {
  const { secretKey } = useParams<{ secretKey: string }>();
  if (secretKey !== ADMIN_SECRET_KEY) {
    return <Navigate to="/" replace />;
  }
  sessionStorage.setItem('pasc_admin_secret_verified', 'true');
  return children;
}

function AdminDirectRedirect() {
  const isVerified = sessionStorage.getItem('pasc_admin_secret_verified') === 'true';
  if (isVerified) {
    return <Navigate to={ADMIN_BASE_PATH} replace />;
  }
  return <Navigate to="/" replace />;
}

function SecretKeyRedirect() {
  const { secretKey } = useParams<{ secretKey: string }>();
  if (secretKey === ADMIN_SECRET_KEY) {
    return <Navigate to={ADMIN_BASE_PATH} replace />;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentAuth />} />
        <Route path="/auth" element={<StudentAuth />} />
        <Route path="/developers" element={<Developers />} />
        
        {/* Student flow */}
        <Route path="/student" element={<Landing />} />
        <Route path="/play" element={<QuestionPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/stats" element={<PersonalStats />} />
        <Route path="/social" element={<SocialHub />} />
        <Route path="/student/leaderboard" element={<OverallLeaderboard />} />
        <Route path="/leaderboard/:pollLaunchId" element={<Leaderboard />} />
        <Route path="/leaderboard/q/:questionId" element={<Leaderboard />} />

        {/* Direct /admin blocked from public discovery */}
        <Route path="/admin" element={<AdminDirectRedirect />} />
        <Route path="/admin/*" element={<AdminDirectRedirect />} />

        {/* Protected Secret Key Admin Portal */}
        <Route path="/:secretKey/admin" element={<AdminSecretRoute><AdminLogin /></AdminSecretRoute>} />
        <Route path="/:secretKey/admin/dashboard" element={<AdminSecretRoute><AdminDashboard /></AdminSecretRoute>} />
        <Route path="/:secretKey/admin/questions/new" element={<AdminSecretRoute><AdminQuestion /></AdminSecretRoute>} />
        <Route path="/:secretKey/admin/questions/:id/edit" element={<AdminSecretRoute><AdminQuestion /></AdminSecretRoute>} />
        <Route path="/:secretKey/admin/admins" element={<AdminSecretRoute><AdminManagement /></AdminSecretRoute>} />

        {/* If user navigates to /:secretKey directly, redirect to /:secretKey/admin */}
        <Route path="/:secretKey" element={<SecretKeyRedirect />} />

        {/* Wildcard fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
