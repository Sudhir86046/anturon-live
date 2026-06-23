const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://35.168.16.223:5000';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  region: string;
  plan: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  organization: Organization;
}

export class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  }

  private getHeaders(isFormData = false): Record<string, string> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('token');
      if (stored) this.token = stored;
    }

    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };

    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    return headers;
  }

  async rest(path: string, options: RequestInit = {}) {
    const isFormData = options.body instanceof FormData;

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.rest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(data.token);
    return data;
  }

  async register(data: {
    organizationName: string;
    industry: string;
    region: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const result = await this.rest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setToken(result.token);
    return result;
  }

  async getMe(): Promise<{ user: User; organization: Organization }> {
    return this.rest('/auth/me', { method: 'GET' });
  }

  async getAgents(): Promise<any[]> {
    const result = await this.rest('/agents');
    return result.agents || [];
  }

  async createAgent(data: any): Promise<any> {
    return this.rest('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgent(id: string): Promise<any> {
    const result = await this.rest(`/agents/${id}`);
    return result.agent;
  }

  async updateAgent(id: string, data: any): Promise<any> {
    const result = await this.rest(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.agent;
  }

  async deleteAgent(id: string): Promise<any> {
    return this.rest(`/agents/${id}`, { method: 'DELETE' });
  }

  async getCalls(): Promise<any[]> {
    const result = await this.rest('/calls');
    return result.calls || [];
  }

  async getDashboardStats(): Promise<any> {
    const result = await this.rest('/dashboard/stats');
    const stats = result.stats || {};
    return {
      month: { calls: stats.totalCalls || 0, minutes: 0 },
      week: { calls: stats.completedCalls || 0 },
      raw: stats,
    };
  }

  async getTimeSeries(days = 30): Promise<any[]> {
    const calls = await this.getCalls();
    const map: Record<string, number> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }

    calls.forEach((call: any) => {
      const date = call.startedAt ? new Date(call.startedAt).toISOString().slice(0, 10) : null;
      if (date && map[date] !== undefined) map[date] += 1;
    });

    return Object.entries(map).map(([date, calls]) => ({ date, calls }));
  }

  async initiateCall(): Promise<any> {
    throw new Error('Real outbound calling is disabled until telephony config is active.');
  }
}

export const api = new ApiClient();