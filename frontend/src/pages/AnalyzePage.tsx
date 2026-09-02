import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Globe,
  Upload,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Layers,
} from "lucide-react";
import { analyzeUrl, verifyArticle, verifyBatch } from "../services/api";
import type { BatchVerifyResult } from "../types/analysis";
import { percent, predictionLabel } from "../utils/format";

const PRESETS = [
  {
    title: "Official Central Bank Statement (Real)",
    headline: "Central bank holds interest rates steady after inflation cools across consumer goods",
    content:
      "The central bank left its benchmark interest rate unchanged on Wednesday, citing slower consumer-price growth over the past two quarters. Officials said they would continue to monitor labor-market data before considering further rate cuts in the upcoming fiscal cycle.",
  },
  {
    title: "Fabricated Banking Rumor (Fake)",
    headline: "SHOCKING: Secret government executive order will confiscate all savings at midnight",
    content:
      "An emergency leak from elite insiders revealed that all personal bank accounts are scheduled for automatic seizure tonight. They don't want you to know this secret emergency decree that freezes your funds immediately! Share before this is deleted by censors!!!",
  },
  {
    title: "Astrophysics Exoplanet Research (Real)",
    headline: "Astrophysicists confirm presence of atmospheric water vapor on distant exoplanet",
    content:
      "Researchers utilizing infrared transmission spectroscopy published peer-reviewed findings in the Astrophysical Journal today confirming molecular water signatures in the outer atmosphere of a sub-Neptune exoplanet situated 120 light-years away.",
  },
];

export default function AnalyzePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Single article state
  const [headline, setHeadline] = useState(searchParams.get("headline") || "");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [modelType, setModelType] = useState<"auto" | "distilbert" | "classical">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const qUrl = searchParams.get("url");
    const qHeadline = searchParams.get("headline");
    if (qUrl) setUrl(qUrl);
    if (qHeadline) setHeadline(qHeadline);
  }, [searchParams]);

  // Batch state
  const [batchRawText, setBatchRawText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchResults, setBatchResults] = useState<BatchVerifyResult | null>(null);

  async function handleSingleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!url.trim() && !content.trim()) {
      setError("Please provide an article body or a valid public URL to analyze.");
      return;
    }
    if (!url.trim() && headline.trim().length < 3) {
      setError("Please provide a headline with at least 3 characters.");
      return;
    }
    if (!url.trim() && content.trim().length < 40) {
      setError("Article content must be at least 40 characters for reliable NLP analysis.");
      return;
    }

    setLoading(true);
    try {
      if (url.trim()) {
        const result = await analyzeUrl(url.trim(), headline.trim() || undefined, modelType);
        navigate(`/results/${result.id}`);
      } else {
        const result = await verifyArticle({
          headline: headline.trim(),
          content: content.trim(),
          model_type: modelType,
        });
        navigate(`/results/${result.id}`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Verification failed. Please check the inputs or backend service.");
    } finally {
      setLoading(false);
    }
  }

  function parseCsvContent(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const items: { headline: string; content: string }[] = [];

    let isHeader = true;
    for (const line of lines) {
      if (isHeader && (line.toLowerCase().includes("headline") || line.toLowerCase().includes("title"))) {
        isHeader = false;
        continue;
      }
      isHeader = false;

      let parts: string[] = [];
      if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes("|")) {
        parts = line.split("|");
      } else if (line.includes(",")) {
        parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      } else {
        parts = [line.slice(0, 60), line];
      }

      const h = parts[0]?.replace(/^["']|["']$/g, "").trim() || "Untitled Claim";
      const c = parts[1]?.replace(/^["']|["']$/g, "").trim() || parts[0]?.trim() || "";

      if (h || c) {
        items.push({ headline: h, content: c.length >= 20 ? c : h });
      }
    }
    return items;
  }

  async function handleBatchSubmit(event: FormEvent) {
    event.preventDefault();
    setBatchError("");
    setBatchResults(null);

    const items = parseCsvContent(batchRawText);
    if (items.length === 0) {
      setBatchError("Please enter or upload at least one headline and article.");
      return;
    }

    setBatchLoading(true);
    try {
      const result = await verifyBatch(items, modelType);
      setBatchResults(result);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setBatchError(e.response?.data?.detail || "Batch verification failed. Please try again.");
    } finally {
      setBatchLoading(false);
    }
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBatchRawText(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Verification Console</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit news copy, public article URLs, or multi-article batches for algorithmic evaluation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "single"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Single Article & URL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batch")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "batch"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Batch & CSV Verification</span>
          </button>
        </div>
      </div>

      {activeTab === "single" ? (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Input Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSingleSubmit}
              className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl"
            >
              {/* URL Option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Public Article URL (Optional)</span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">SSRF Protected</span>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.reuters.com/world/example-story"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative bg-slate-900 px-3 font-mono text-[10px] font-semibold text-slate-400 uppercase">
                  Or Direct Prose
                </span>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  News Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Paste news headline statement..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Article Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Article Text
                  </label>
                  <span className="font-mono text-[10px] text-slate-500">
                    {content.length} characters
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the full article body or paragraph excerpts here..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed transition-colors"
                />
              </div>

              {/* Model Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono text-xs text-slate-400">Model Engine:</span>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value as "auto" | "distilbert" | "classical")}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="auto">Auto (DistilBERT + Fallback)</option>
                    <option value="distilbert">DistilBERT Transformer</option>
                    <option value="classical">TF-IDF Linear Baseline</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze News</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>

          {/* Presets Sidebar */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              SAMPLE TEST BENCHMARKS
            </h2>
            <div className="space-y-3">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setHeadline(p.headline);
                    setContent(p.content);
                    setUrl("");
                  }}
                  className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <p className="text-xs font-bold text-white">{p.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{p.headline}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Batch Tab */
        <div className="space-y-6">
          <form
            onSubmit={handleBatchSubmit}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">Batch Processing Console</h2>
                <p className="text-xs text-slate-400">
                  Upload a CSV or paste TSV / CSV text (Header format: <code className="font-mono text-emerald-400">headline, content</code>)
                </p>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload CSV / TXT</span>
                <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={8}
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
              placeholder={`"Official science agency confirms lunar ice discovery","Detailed scientific findings released on Monday..."\n"Emergency decree freezes accounts overnight","Sensational rumors without citations..."`}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={batchLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {batchLoading ? "Processing Batch..." : "Run Batch Verification"}
              </button>
            </div>

            {batchError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}
          </form>

          {/* Batch Results Preview */}
          {batchResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
                  BATCH RESULTS ({batchResults.total_processed} PROCESSED)
                </h3>
                <span className="font-mono text-xs text-emerald-400">MODEL: {batchResults.model_type}</span>
              </div>

              <div className="grid gap-3">
                {batchResults.results.map((r) => {
                  const isFake = r.prediction === "LIKELY_FAKE";
                  const isReal = r.prediction === "LIKELY_REAL";
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                              isFake
                                ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                                : isReal
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                                : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                            }`}
                          >
                            {isFake ? <ShieldAlert className="h-3 w-3" /> : isReal ? <ShieldCheck className="h-3 w-3" /> : <HelpCircle className="h-3 w-3" />}
                            {predictionLabel(r.prediction)}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{percent(r.confidence)} certainty</span>
                        </div>
                        <p className="text-xs font-semibold text-white">{r.headline}</p>
                      </div>

                      <button
                        onClick={() => navigate(`/results/${r.id}`)}
                        className="inline-flex items-center gap-1 self-end sm:self-auto rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
                      >
                        <span>Full Dossier</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
