const BASE = 'http://localhost:3001';

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
  // Poll (student)
  getCurrent: () => req<PollCurrent>('/api/poll/current'),
  startPoll: (questionId: string, nickname: string) =>
    req<{ token: string; timerSeconds: number }>(`/api/poll/${questionId}/start`, {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  submitAttempt: (token: string, nickname: string, selectedOption: number | null) =>
    req<{ result: 'correct' | 'wrong' | 'timeout'; correctIndex: number }>('/api/poll/attempts', {
      method: 'POST',
      body: JSON.stringify({ token, nickname, selectedOption }),
    }),

  // Admin
  adminLogin: (email: string, password: string) =>
    req<{ message: string; email: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminLogout: () => req('/api/admin/logout', { method: 'POST' }),
  getQuestions: (status?: string) =>
    req<Question[]>(`/api/admin/questions${status ? `?status=${status}` : ''}`),
  createQuestion: (body: QuestionInput) =>
    req<Question>('/api/admin/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: Partial<QuestionInput>) =>
    req<Question>(`/api/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  launchQuestion: (id: string) =>
    req<Question>(`/api/admin/questions/${id}/launch`, { method: 'POST' }),
  getStats: () => req<Stat[]>('/api/admin/stats'),
  getStatDetail: (id: string) => req<StatDetail>(`/api/admin/stats/${id}`),
  getLeaderboard: (questionId: string) =>
    req<LeaderboardResponse>(`/api/poll/${questionId}/leaderboard`),
};

// Types
export interface PollCurrent {
  status: 'live' | 'none';
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
  status: 'DRAFT' | 'LIVE' | 'CLOSED';
  liveDate: string | null;
  createdAt: string;
  _count?: { attempts: number };
}

export interface QuestionInput {
  text: string;
  options: string[];
  correctIndex: number;
  timerSeconds: number;
}

export interface Stat {
  questionId: string;
  date: string | null;
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
  questionId: string;
  questionText: string;
  questionStatus: 'live' | 'closed' | 'draft';
  total: number;
  top10: LeaderboardEntry[];
  myRank: number | null;
  myEntry: LeaderboardEntry | null;
}

