import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cl_token');
      localStorage.removeItem('cl_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/auth/me', data),
};

// ── Resources ────────────────────────────────────────────────────
export const resourceApi = {
  list: (params?: Record<string, string>) => api.get('/resources', { params }),
  /** Returns only the currently-authenticated user's own resources */
  listMine: (params?: Record<string, string>) => api.get('/resources/mine', { params }),
  get: (id: string) => api.get(`/resources/${id}`),
  create: (data: FormData | Record<string, unknown>) => api.post('/resources', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/resources/${id}`, data),
  /** Soft-deletes (retires) a resource. Only owner or admin can do this. */
  delete: (id: string) => api.delete(`/resources/${id}`),
  request: (id: string, data: Record<string, unknown>) => api.post(`/resources/${id}/request`, data),
  getQR: (id: string) => api.get(`/resources/${id}/qr`),
  /** Returns all resource categories from the database */
  categories: () => api.get('/resources/categories'),
};

// ── Requirements ─────────────────────────────────────────────────
export const requirementApi = {
  create: (data: Record<string, unknown>) => api.post('/requirements', data),
  list: () => api.get('/requirements'),
  getMatches: (id: string, refresh?: boolean) => api.get(`/requirements/${id}/matches`, { params: { refresh } }),
};

// ── Search ───────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, filters?: Record<string, string>) =>
    api.get('/search', { params: { q, ...filters } }),
  semantic: (q: string, filters?: Record<string, unknown>) =>
    api.post('/search/semantic', { q, ...filters }),
};

// ── Loans ────────────────────────────────────────────────────────
export const loanApi = {
  list: (type?: string, status?: string) => api.get('/loans', { params: { type, status } }),
  get: (id: string) => api.get(`/loans/${id}`),
  update: (id: string, action: string, notes?: string) => api.patch(`/loans/${id}`, { action, notes }),
  handover: (id: string, qrCode: string) => api.post(`/loans/${id}/handover`, { qr_code: qrCode }),
  return: (id: string, qrCode: string, note?: string) => api.post(`/loans/${id}/return`, { qr_code: qrCode, condition_note: note }),
};

// ── AI ───────────────────────────────────────────────────────────
export const aiApi = {
  extractRequirement: (query: string) => api.post('/ai/extract-requirement', { query }),
  classifyResource: (data: FormData | Record<string, unknown>) => api.post('/ai/classify-resource', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  }),
  projectPlan: (projectDescription: string) => api.post('/ai/project-plan', { project_description: projectDescription }),
  match: (requirementText: string, resourceId: string) => api.post('/ai/match', { requirement_text: requirementText, resource_id: resourceId }),
};

// ── RAG ──────────────────────────────────────────────────────────
export const ragApi = {
  query: (question: string) => api.post('/rag/query', { question }),
};

// ── Notifications ────────────────────────────────────────────────
export const notificationApi = {
  list: (unreadOnly?: boolean) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ── Impact ───────────────────────────────────────────────────────
export const impactApi = {
  campus: () => api.get('/impact'),
  personal: () => api.get('/impact/my'),
  trend: () => api.get('/impact/trend'),
};

// ── Admin ────────────────────────────────────────────────────────
export const adminApi = {
  analytics: () => api.get('/admin/analytics'),
  underutilized: () => api.get('/admin/underutilized'),
  users: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  circularityScore: () => api.get('/admin/circularity-score'),
  knowledgeBase: () => api.get('/admin/knowledge-base'),
  addDocument: (data: Record<string, unknown>) => api.post('/admin/knowledge-base', data),
};

// ── Purchases ────────────────────────────────────────────────────
export const purchaseApi = {
  check: (data: Record<string, unknown>) => api.post('/purchases/check', data),
  list: () => api.get('/purchases'),
};

// ── Stats (real platform-wide stats for landing page) ────────────
export const statsApi = {
  /** Returns REAL counts from the database. Never hardcoded. Returns 0 when empty. */
  platform: () => api.get('/stats'),
};

// ── Users (public profiles + reviews) ───────────────────────────
export const userApi = {
  getProfile: (id: string) => api.get(`/users/${id}`),
  submitReview: (data: Record<string, unknown>) => api.post('/users/reviews', data),
};
