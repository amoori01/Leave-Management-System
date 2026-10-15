export interface User {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'ADMIN';
}

export interface DynamicBalance {
  leave_type_id: string;
  leave_type_name: string;
  description: string | null;
  is_paid: boolean;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by: string | null;
  approved_at: string | null;
  admin_comment: string | null;
  created_at: string;
  leaveType: {
    id: string;
    name: string;
    is_paid: boolean;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  decider?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface LeaveRequestDetail extends LeaveRequest {
  requester_balances: DynamicBalance[];
  requester_history: LeaveRequest[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('leave_auth_token');
  },
  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leave_auth_token', token);
    }
  },
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('leave_auth_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leave_auth_user', JSON.stringify(user));
    }
  },
  clear() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leave_auth_token');
      localStorage.removeItem('leave_auth_user');
    }
  },
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message && Array.isArray(data.message)
        ? data.message.join(', ')
        : data?.message || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  async login(email: string, password: string) {
    const data = await apiFetch<{ access_token: string; user: User }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    authStorage.setToken(data.access_token);
    authStorage.setUser(data.user);
    return data;
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/auth/me');
  },

  async getMyBalances(year?: number): Promise<DynamicBalance[]> {
    const query = year ? `?year=${year}` : '';
    return apiFetch<DynamicBalance[]>(`/balances/me${query}`);
  },

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return apiFetch<LeaveRequest[]>('/leave-requests');
  },

  async getLeaveRequestDetails(id: string): Promise<LeaveRequestDetail> {
    return apiFetch<LeaveRequestDetail>(`/leave-requests/${id}`);
  },

  async createLeaveRequest(payload: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
  }): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveLeaveRequest(id: string): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>(`/leave-requests/${id}/approve`, {
      method: 'PATCH',
    });
  },

  async rejectLeaveRequest(
    id: string,
    admin_comment?: string,
  ): Promise<LeaveRequest> {
    return apiFetch<LeaveRequest>(`/leave-requests/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_comment }),
    });
  },

  async getUsers(): Promise<ManagedUser[]> {
    return apiFetch<ManagedUser[]>('/users');
  },

  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    role?: 'EMPLOYEE' | 'ADMIN';
    annual_days?: number;
    sick_days?: number;
  }): Promise<ManagedUser> {
    return apiFetch<ManagedUser>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}
