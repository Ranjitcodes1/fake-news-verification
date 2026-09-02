import axios from "axios";
import type {
  AuthResponse,
  BatchVerifyResult,
  DashboardStats,
  HealthStatus,
  HistoryItem,
  User,
  VerifyResult,
} from "../types/analysis";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 45000,
});

// Attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("veritas_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication endpoints
export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

// Verification endpoints
export async function verifyArticle(payload: {
  headline: string;
  content: string;
  model_type?: string;
}): Promise<VerifyResult> {
  const { data } = await api.post<VerifyResult>("/verify", payload);
  return data;
}

export async function analyzeUrl(url: string, headline?: string, model_type?: string): Promise<VerifyResult> {
  const { data } = await api.post<VerifyResult>("/analyze-url", { url, headline, model_type });
  return data;
}

export async function verifyBatch(
  items: { headline: string; content: string; source_url?: string }[],
  model_type?: string,
): Promise<BatchVerifyResult> {
  const { data } = await api.post<BatchVerifyResult>("/verify-batch", { items, model_type });
  return data;
}

export async function getAnalysis(id: string): Promise<VerifyResult> {
  const { data } = await api.get<VerifyResult>(`/analysis/${id}`);
  return data;
}

export async function getHistory(params?: {
  q?: string;
  prediction?: string;
  only_mine?: boolean;
}): Promise<HistoryItem[]> {
  const { data } = await api.get<HistoryItem[]>("/history", { params });
  return data;
}

export async function deleteAnalysis(id: number): Promise<void> {
  await api.delete(`/analysis/${id}`);
}

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard");
  return data;
}

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>("/health");
  return data;
}
