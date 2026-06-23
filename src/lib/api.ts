const BASE = '/api';

function getToken(): string {
  return localStorage.getItem('fb_token') || '';
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // Протухшая/невалидная сессия (кроме самого входа) → выход на экран логина,
    // чтобы пользователь не застревал с пустыми данными.
    if (res.status === 401 && path !== '/auth/login' && getToken()) {
      localStorage.removeItem('fb_token');
      localStorage.removeItem('fb_session');
      location.reload();
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Ошибка запроса');
  }
  return res.json();
}

const get = <T>(path: string) => req<T>('GET', path);
const post = <T>(path: string, body: unknown) => req<T>('POST', path, body);
const put = <T>(path: string, body: unknown) => req<T>('PUT', path, body);
const del = <T>(path: string) => req<T>('DELETE', path);

// ── Auth ─────────────────────────────────────────────────────────
export const api = {
  diag: () => get<{ hasDatabaseUrl: boolean; host: string | null; transactions: number | null; goals: number | null; error: string | null }>('/diag'),
  auth: {
    login: (name: string, password: string) =>
      post<{ token: string; user: AppUser }>('/auth/login', { name, password }),
    me: () => get<AppUser>('/auth/me'),
    familyMembers: () => get<AppUser[]>('/auth/family-members'),
  },

  // ── Transactions ──────────────────────────────────────────────
  transactions: {
    list: () => get<Transaction[]>('/transactions'),
    create: (t: TxPayload) => post<Transaction>('/transactions', t),
    update: (id: string, t: TxPayload) => put<Transaction>(`/transactions/${id}`, t),
    delete: (id: string) => del<{ ok: boolean }>(`/transactions/${id}`),
  },

  // ── Categories ────────────────────────────────────────────────
  categories: {
    list: () => get<Category[]>('/categories'),
    create: (name: string, type: TxType) => post<Category>('/categories', { name, type }),
    delete: (id: string) => del<{ ok: boolean }>(`/categories/${id}`),
  },

  // ── Goals ─────────────────────────────────────────────────────
  goals: {
    list: () => get<Goal[]>('/goals'),
    create: (g: GoalPayload) => post<Goal>('/goals', g),
    update: (id: string, g: GoalPayload) => put<Goal>(`/goals/${id}`, g),
    delete: (id: string) => del<{ ok: boolean }>(`/goals/${id}`),
    updateAllocation: (goalId: string, amount: number) =>
      put<{ ok: boolean; amount: number }>(`/goals/allocations/${goalId}`, { amount }),
  },

  // ── Budgets ───────────────────────────────────────────────────
  budgets: {
    list: () => get<Budget[]>('/budgets'),
    create: (b: BudgetPayload) => post<Budget>('/budgets', b),
    delete: (id: string) => del<{ ok: boolean }>(`/budgets/${id}`),
  },

  // ── Recurring ─────────────────────────────────────────────────
  recurring: {
    list: () => get<RecurringPayment[]>('/recurring'),
    create: (p: RecurringPayload) => post<RecurringPayment>('/recurring', p),
    delete: (id: string) => del<{ ok: boolean }>(`/recurring/${id}`),
    markPaid: (id: string, next_date: string) =>
      post<RecurringPayment>(`/recurring/${id}/mark-paid`, { next_date }),
  },

  // ── Settings ──────────────────────────────────────────────────
  settings: {
    get: () => get<AppSettings>('/settings'),
    update: (s: Partial<AppSettings>) => put<AppSettings>('/settings', s),
  },

  // ── Notifications ─────────────────────────────────────────────
  notifications: {
    list: () => get<Notification[]>('/notifications'),
    create: (title: string, body: string, type: string) =>
      post<Notification>('/notifications', { title, body, type }),
    markRead: (id: string) => put<{ ok: boolean }>(`/notifications/${id}/read`, {}),
    markAllRead: () => put<{ ok: boolean }>('/notifications/read-all', {}),
  },

  // ── Comments ──────────────────────────────────────────────────
  comments: {
    list: (entityId: string) => get<Comment[]>(`/comments/${entityId}`),
    create: (entity_id: string, body: string) =>
      post<Comment>('/comments', { entity_id, body }),
  },

  push: {
    getVapidKey: () => get<{ key: string }>('/push/vapid-public-key'),
    subscribe: (subscription: PushSubscriptionJSON) =>
      post<{ ok: boolean }>('/push/subscribe', { subscription }),
    unsubscribe: (endpoint: string) =>
      post<{ ok: boolean }>('/push/unsubscribe', { endpoint }),
  },
};

// ── Types ─────────────────────────────────────────────────────────
export type TxType = 'income' | 'expense';
export type UserRole = 'owner' | 'member';
export type Priority = 'high' | 'medium' | 'low';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Currency = 'UZS' | 'USD';

export interface AppUser {
  id: string; name: string; phone: string | null;
  family_id: string | null; role: UserRole;
  avatar: string; color: string; created_at: string;
}
export interface Transaction {
  id: string; family_id: string; user_id: string; date: string;
  type: TxType; category: string; amount: number; currency: Currency;
  description: string; receipt_url: string | null;
  created_by: string; created_by_name: string; created_at: string;
  updated_by: string | null; updated_by_name: string | null; updated_at: string | null;
}
export interface Category {
  id: string; family_id: string; name: string; type: TxType; is_default: boolean;
}
export interface Goal {
  id: string; family_id: string; name: string; target_amount: number;
  target_currency: Currency; deadline: string | null; note: string | null;
  priority: Priority; allocated: number; created_by_name: string;
}
export interface Budget {
  id: string; family_id: string; category: string; month_limit: number; month: string;
}
export interface RecurringPayment {
  id: string; family_id: string; name: string; category: string;
  amount: number; frequency: Frequency; next_date: string;
  active: boolean; created_by_name: string;
}
export interface AppSettings {
  id: string; family_id: string; usd_rate: number;
  dark_mode: boolean; quick_actions: string;
}
export interface Notification {
  id: string; family_id: string; title: string; body: string;
  type: string; read: boolean; created_at: string;
}
export interface Comment {
  id: string; family_id: string; entity_type: string; entity_id: string;
  user_name: string; body: string; created_at: string;
}

interface TxPayload {
  date: string; type: TxType; category: string; amount: number;
  currency: Currency; description: string; receipt_url: string | null;
}
interface GoalPayload {
  name: string; target_amount: number; target_currency?: Currency;
  deadline?: string; note?: string; priority?: Priority;
}
interface BudgetPayload { category: string; month_limit: number; month: string; }
interface RecurringPayload {
  name: string; category: string; amount: number;
  frequency: Frequency; next_date: string;
}
