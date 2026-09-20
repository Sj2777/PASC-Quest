import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import StudentAuth from './pages/StudentAuth';
import QuestionPage from './pages/QuestionPage';
import ResultPage from './pages/ResultPage';
import Leaderboard from './pages/Leaderboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuestion from './pages/admin/AdminQuestion';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Student flow */}
        <Route path="/auth" element={<StudentAuth />} />
        <Route path="/" element={<Landing />} />
        <Route path="/play" element={<QuestionPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/leaderboard/:pollLaunchId" element={<Leaderboard />} />
        <Route path="/leaderboard/q/:questionId" element={<Leaderboard />} />

        {/* Admin flow */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/questions/new" element={<AdminQuestion />} />
        <Route path="/admin/questions/:id/edit" element={<AdminQuestion />} />
      </Routes>
    </BrowserRouter>
  );
}
