export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const BASE = API_BASE;

export function getExportCsvUrl(questionId: string): string {
  return `${API_BASE}/api/admin/questions/${questionId}/export.csv`;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data as T;
}

export const api = {
  // Student Auth
  registerStudent: (nickname: string, password: string, branch: string) =>
    req<{ id: string; nickname: string }>('/api/student/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, password, branch }),
    }),
  loginStudent: (nickname: string, password: string) =>
    req<{ id: string; nickname: string }>('/api/student/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    }),
  logoutStudent: () => req<{ message: string }>('/api/student/logout', { method: 'POST' }),
  getMe: () => req<Student>('/api/student/me'),
  getStreakStatus: () => req<StreakStatus>('/api/student/streak-status'),
  getStudentStats: () => req<StudentStats>('/api/student/stats'),
  renewStreak: () =>
    req<{
      message: string;
      currentStreak: number;
      bestStreak: number;
      totalPoints: number;
      comebackActive: boolean;
    }>('/api/student/renew-streak', { method: 'POST' }),

  // Social & Competitive
  follow: (nickname: string) => req<{ message: string }>(`/api/social/follow/${nickname}`, { method: 'POST' }),
  unfollow: (nickname: string) => req<{ message: string }>(`/api/social/unfollow/${nickname}`, { method: 'POST' }),
  getFriends: () => req<{ friends: Friend[] }>('/api/social/friends'),
  getFollowSummary: () => req<FollowSummary>('/api/social/follow-summary'),
  getBranchBattle: () => req<{ leaderboard: BranchBattleEntry[] }>('/api/leaderboards/branch-battle'),
  getHallOfFame: () => req<{ hallOfFame: HallOfFameEntry[] }>('/api/leaderboards/hall-of-fame'),
  getSpeedKing: (pollLaunchId: string) => req<{ speedKing: SpeedKing | null }>(`/api/leaderboards/${pollLaunchId}/speed-king`),
  getOverallLeaderboard: (period: OverallLeaderboardPeriod) => req<OverallLeaderboardResponse>(`/api/leaderboards/overall?period=${period}`),

  // Poll (student)
  // Phase 7C-A: returns ALL available launches as an array (empty = none available).
  getCurrent: () => req<PollLaunchItem[]>('/api/poll/current'),
  startPoll: (pollLaunchId: string, nickname: string) =>
    req<{ token: string; timerSeconds: number }>(`/api/poll/${pollLaunchId}/start`, {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  submitAttempt: (token: string, selectedOption: number | null) =>
    req<{ result: string; correctIndex: number; awardedPoints: number }>('/api/poll/attempts', {
      method: 'POST',
      body: JSON.stringify({ token, selectedOption }),
    }),
  getGhostMode: (pollLaunchId: string) => req<GhostMode>(`/api/poll/${pollLaunchId}/ghost`),

  // Admin
  adminLogin: (email: string, password: string) =>
    req<{ message: string; email: string; role?: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminLogout: () => req('/api/admin/logout', { method: 'POST' }),
  // Phase 7B: close a specific PollLaunch by its launch ID.
  // Only closes the specified launch; all other launches are unaffected.
  closeLaunch: (launchId: string) =>
    req<{ message: string; launch: { id: string; questionId: string; launchedAt: string; closedAt: string | null } }>(
      `/api/admin/launches/${launchId}/close`,
      { method: 'POST' }
    ),
  getQuestions: (status?: string) =>
    req<Question[]>(`/api/admin/questions${status ? `?status=${status}` : ''}`),
  createQuestion: (body: QuestionInput) =>
    req<Question>('/api/admin/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: Partial<QuestionInput>) =>
    req<Question>(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  launchQuestion: (id: string) =>
    req<Question>(`/api/admin/questions/${id}/launch`, { method: 'POST' }),
  getStats: () => req<Stat[]>('/api/admin/stats'),
  getStatDetail: (pollLaunchId: string) => req<StatDetail>(`/api/admin/stats/${pollLaunchId}`),
  getLeaderboard: (pollLaunchId: string) =>
    req<LeaderboardResponse>(`/api/poll/${pollLaunchId}/leaderboard`),
  
  getAdminMe: () => req<{ id: string; email: string; role: string }>('/api/admin/me'),
  getAdmins: () => req<Admin[]>('/api/admin/admins'),
  createAdmin: (body: Omit<Admin, 'id' | 'createdAt'> & { password: string }) => 
    req<Admin>('/api/admin/admins', { method: 'POST', body: JSON.stringify(body) }),
  deleteAdmin: (id: string) => 
    req<{ message: string }>(`/api/admin/admins/${id}`, { method: 'DELETE' }),
  updateAdminRole: (id: string, role: string) => 
    req<Admin>(`/api/admin/admins/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
};

// Types
export interface Admin {
  id: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
}

export interface Student {
  id: string;
  nickname: string;
  branch: string | null;
  currentStreak: number;
  bestStreak: number;
  totalPoints?: number;
}

export interface StreakStatus {
  currentStreak: number;
  bestStreak: number;
  comebackActive: boolean;
  comebackProgress: number;
  preBreakStreak: number;
  daysRemainingToRecover: number | null;
}

export interface StudentStats {
  accuracy: number;
  avgTimeMs: number | null;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  rankHistory: Array<{
    date: string;
    rank: number;
    totalStudents: number;
  }>;
  questionArchive: ArchiveQuestion[];
}

export interface ArchiveQuestion {
  questionId: string;
  pollLaunchId: string;
  text: string;
  points: number;
  correctAnswer: string;
  launchedAt: string;
}

export interface Friend {
  id: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  branch: string | null;
}

export interface FollowSummary {
  followingCount: number;
  followersCount: number;
  following: Friend[];
  followers: Friend[];
}

export interface BranchBattleEntry {
  branch: string;
  accuracy: number;
  totalAttempts: number;
}

export interface HallOfFameEntry {
  id: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  branch: string | null;
}

export interface SpeedKing {
  nickname: string;
  timeTakenMs: number;
  submittedAt: string;
}

export interface GhostMode {
  total: number;
  correct: number;
  wrong: number;
  timeout: number;
  correctPercent: number;
  wrongPercent: number;
  timeoutPercent: number;
}

// Phase 7C-A: Item in the array returned by GET /api/poll/current.
// Each element is a single available PollLaunch + its parent Question fields.
// Also used as the poll object passed to QuestionPage via navigation state
// (it is a superset of the fields QuestionPage reads: text, options, pollLaunchId, questionId).
export interface PollLaunchItem {
  pollLaunchId: string;
  questionId: string;
  text: string;
  options: string[];
  timerSeconds: number;
  points: number;
  launchedAt: string;    // ISO-8601
  expiresAt: string;     // ISO-8601 = launchedAt + 24h
  completed: boolean;    // Phase 7C-B
}

// PollCurrent — kept for QuestionPage navigation state compatibility.
// QuestionPage reads: poll.text, poll.options, poll.pollLaunchId, poll.questionId.
// A PollLaunchItem satisfies all of these fields.
export interface PollCurrent {
  status: 'live' | 'none';
  pollLaunchId?: string;
  questionId?: string;
  text?: string;
  options?: string[];
  timerSeconds?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timerSeconds: number;
  points: number;
  status: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'CLOSED';
  scheduledAt?: string | null;
  createdAt: string;
  _count?: { launches: number };
  launches?: Array<{ id: string; launchedAt: string; closedAt: string | null }>;
}

export interface QuestionInput {
  text: string;
  options: string[];
  correctIndex: number;
  timerSeconds: number;
  points: number;
  scheduledAt?: string | null;
}

export interface Stat {
  pollLaunchId: string;
  questionId: string;
  date: string | null;
  launchedAt?: string;
  closedAt?: string | null;
  questionText: string;
  status: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  avgTimeTakenMs: number | null;
}

export interface StatDetail extends Stat {
  options: string[];
  correctIndex: number;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  result: 'correct' | 'wrong' | 'timeout';
  timeTakenMs: number | null;
  isMe: boolean;
}

export interface LeaderboardResponse {
  pollLaunchId: string;
  questionId: string;
  questionText: string;
  questionStatus: 'live' | 'closed' | 'draft';
  total: number;
  top10: LeaderboardEntry[];
  myRank: number | null;
  myEntry: LeaderboardEntry | null;
}

export type OverallLeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface OverallLeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  currentStreak: number;
  averageTimeMs: number;
}

export interface OverallLeaderboardResponse {
  period: OverallLeaderboardPeriod;
  entries: OverallLeaderboardEntry[];
}
