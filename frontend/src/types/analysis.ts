export type Prediction = "LIKELY_REAL" | "LIKELY_FAKE" | "UNCERTAIN";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Attribution {
  token: string;
  score: number;
  direction: string;
  influence?: string;
}

export interface EvidenceItem {
  source_name: string;
  domain?: string | null;
  url: string;
  title?: string | null;
  publication_date?: string | null;
  snippet: string;
  source_type: string;
  relevance_score: number;
  supports_claim: boolean | null;
  stance: string;
}

export interface ClaimItem {
  text: string;
  importance: number;
  assessment: string;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface VerifyResult {
  id?: number | null;
  prediction: Prediction;
  confidence: number;
  model_version: string;
  backend?: string;
  language?: string;
  language_name?: string;
  headline: string;
  content: string;
  source_url?: string | null;
  claims: ClaimItem[];
  evidence: EvidenceItem[];
  source_analysis: {
    category?: string;
    domain?: string | null;
    notes?: string[];
    publisher?: string | null;
    published_date?: string | null;
    image_url?: string | null;
    author?: string | null;
    trust_score?: number;
    typosquat_warning?: string | null;
  };
  explanation: Attribution[];
  limitations: string[];
  narrative: string;
  created_at?: string | null;
  disclaimer: string;
}

export interface BatchVerifyResult {
  total_processed: number;
  results: VerifyResult[];
}

export interface HistoryItem {
  id: number;
  headline: string;
  prediction: Prediction;
  confidence: number;
  language?: string;
  language_name?: string;
  created_at: string;
}

export interface DashboardStats {
  total_analyses: number;
  prediction_distribution: Record<string, number>;
  recent: HistoryItem[];
  confidence_buckets: Record<string, number>;
  model_performance: {
    model?: string;
    version?: string;
    test?: Record<string, number>;
    caveat?: string;
  };
  daily_counts: { date: string; count: number }[];
}

export interface HealthStatus {
  status: string;
  app: string;
  model_loaded: boolean;
  transformer_available?: boolean;
  database: string;
}
