import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Cpu,
  Globe,
  ExternalLink,
  ShieldCheck,
  Filter,
  Sparkles,
  Search,
  BookOpen,
} from "lucide-react";
import { getAnalysis } from "../services/api";
import type { VerifyResult } from "../types/analysis";
import { percent, predictionLabel } from "../utils/format";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [attrFilter, setAttrFilter] = useState<"all" | "fake" | "real">("all");

  useEffect(() => {
    if (!id) return;
    getAnalysis(id)
      .then(setResult)
      .catch(() => setError("Analysis not found or could not be retrieved."));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-sm font-semibold text-rose-400">{error}</p>
        <Link to="/analyze" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Console
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
        <p className="font-mono text-xs text-slate-400">Loading intelligence dossier…</p>
      </div>
    );
  }

  const isFake = result.prediction === "LIKELY_FAKE";
  const isReal = result.prediction === "LIKELY_REAL";
  const isUncertain = result.prediction === "UNCERTAIN";

  const rawAttributions = Array.isArray(result.explanation)
    ? result.explanation
    : ((result.explanation as unknown as { word_attributions?: unknown[] })?.word_attributions || []);

  const allAttributions = rawAttributions
    .map((item: any) => ({
      token: item.token || item.word || "",
      score: typeof item.score === "number" ? item.score : typeof item.weight === "number" ? item.weight : 0,
      direction: item.direction || (item.score > 0 || item.weight > 0 ? "fake" : "real"),
      influence: item.influence || "medium",
    }))
    .filter((item) => Boolean(item.token));

  const filteredAttributions = allAttributions.filter((w) => {
    if (attrFilter === "fake") return w.direction === "fake" || w.score > 0;
    if (attrFilter === "real") return w.direction === "real" || w.score < 0;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Back Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          to="/analyze"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>New Analysis</span>
        </Link>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>DOSSIER REF: #{result.id}</span>
          <span>·</span>
          <span>{new Date(result.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Primary Decision Banner */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide ${
                  isFake
                    ? "bg-rose-950/70 text-rose-300 border border-rose-800/60"
                    : isReal
                    ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                    : "bg-amber-950/70 text-amber-300 border border-amber-800/60"
                }`}
              >
                {isFake ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : isReal ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <HelpCircle className="h-3.5 w-3.5" />
                )}
                <span>{predictionLabel(result.prediction)}</span>
              </span>

              <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
                <Cpu className="h-3 w-3 text-emerald-400" />
                <span>{result.model_version}</span>
              </span>

              {result.language_name && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-300">
                  <Globe className="h-3 w-3 text-indigo-400" />
                  <span>{result.language_name}</span>
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {result.headline}
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {result.narrative}
            </p>
          </div>

          {/* Confidence Gauge Box */}
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center min-w-[160px]">
            <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase">
              Class Certainty
            </span>
            <span className="mt-1 font-mono text-4xl font-black tracking-tight text-white">
              {percent(result.confidence)}
            </span>
            <div className="mt-2 h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isFake ? "bg-rose-500" : isReal ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Source Article & Domain Forensics (when verified by URL) */}
      {result.source_url && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Source Article & Domain Forensics</span>
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 uppercase">
                    Extracted
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Publisher origin, canonical domain verification, and trustworthiness index.
                </p>
              </div>
            </div>

            <a
              href={result.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 font-mono text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition"
            >
              <span>Visit Original Source</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Publisher */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase">Publisher / Outlet</span>
              <p className="mt-1 font-semibold text-white text-xs truncate">
                {result.source_analysis?.publisher || result.source_analysis?.domain || "Web Source"}
              </p>
            </div>

            {/* Domain Category */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase">Domain Category</span>
              <p className="mt-1 font-mono font-semibold text-emerald-400 text-xs">
                {result.source_analysis?.category || "UNKNOWN"}
              </p>
            </div>

            {/* Trust Score */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase">Source Trust Score</span>
              <p className="mt-1 font-mono font-semibold text-white text-xs">
                {percent(result.source_analysis?.trust_score ?? 0.50)}
              </p>
            </div>

            {/* Published Date */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <span className="font-mono text-[10px] text-slate-400 uppercase">Published Date</span>
              <p className="mt-1 font-mono text-slate-300 text-xs truncate">
                {result.source_analysis?.published_date || "Not specified in meta"}
              </p>
            </div>
          </div>

          {/* Hero image preview if available */}
          {result.source_analysis?.image_url && (
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <img
                src={result.source_analysis.image_url}
                alt="Article Hero"
                className="h-16 w-24 object-cover rounded-lg border border-slate-800 shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="text-xs text-slate-300 space-y-1 overflow-hidden">
                <p className="font-semibold text-white truncate">{result.headline}</p>
                <p className="font-mono text-[10px] text-slate-400 truncate">{result.source_url}</p>
              </div>
            </div>
          )}

          {/* Typosquat warning if any */}
          {result.source_analysis?.typosquat_warning && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{result.source_analysis.typosquat_warning}</span>
            </div>
          )}
        </section>
      )}

      {/* Interactive Token Attribution Heatmap */}
      {allAttributions.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Stylistic Token Attribution Heatmap</h2>
              <p className="text-xs text-slate-400">
                Word-level tokens weighted by model directional linear influence.
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
              <button
                onClick={() => setAttrFilter("all")}
                className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                  attrFilter === "all"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({allAttributions.length})
              </button>
              <button
                onClick={() => setAttrFilter("fake")}
                className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                  attrFilter === "fake"
                    ? "bg-rose-950/80 text-rose-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sensational Cue
              </button>
              <button
                onClick={() => setAttrFilter("real")}
                className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                  attrFilter === "real"
                    ? "bg-emerald-950/80 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Straight News Cue
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {filteredAttributions.map((token, i) => {
              const isSensational = token.direction === "fake" || token.score > 0;
              return (
                <span
                  key={i}
                  title={`Influence Score: ${token.score.toFixed(4)} (${token.influence})`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs transition ${
                    isSensational
                      ? "bg-rose-950/40 text-rose-300 border border-rose-800/60"
                      : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                  }`}
                >
                  <span className="font-semibold">{token.token}</span>
                  <span className="text-[10px] opacity-70">
                    {token.score > 0 ? `+${token.score.toFixed(2)}` : token.score.toFixed(2)}
                  </span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Extracted Claims & External Evidence Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Extracted Propositional Claims */}
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-sm font-bold text-white">Extracted Propositional Claims</h2>
          <p className="text-xs text-slate-400">
            Atomic empirical assertions parsed from article text.
          </p>

          <div className="mt-3 space-y-2.5">
            {result.claims && result.claims.length > 0 ? (
              result.claims.map((claim, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>ASSERTION #{idx + 1}</span>
                    <span className="text-emerald-400 font-bold">SCORE: {percent(claim.importance)}</span>
                  </div>
                  <p className="font-medium text-slate-200">{claim.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No discrete empirical claims parsed.</p>
            )}
          </div>
        </section>

        {/* Live Corroborated Evidence */}
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-sm font-bold text-white">Live Corroborated Evidence</h2>
          <p className="text-xs text-slate-400">
            Fact-check records & news index corroborations.
          </p>

          <div className="mt-3 space-y-2.5">
            {result.evidence && result.evidence.length > 0 ? (
              result.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase">{ev.source}</span>
                    {ev.stance && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          ev.stance === "contradicts"
                            ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                            : ev.stance === "supports"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {ev.stance}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-200">{ev.title || ev.snippet}</p>
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:underline transition"
                    >
                      <span>Inspect Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No external fact-check entries currently indexed.</p>
            )}
          </div>
        </section>
      </div>

      {/* Limitations Disclaimer */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-xs text-slate-400">
        <h3 className="font-semibold text-white mb-1 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
          <span>Epistemic Limitations Checklist</span>
        </h3>
        <p className="leading-relaxed">
          {result.disclaimer ||
            "This probabilistic score represents linguistic and stylistic classifier outputs. It does not replace journalistic due diligence, authoritative fact-checking, or corroboration against primary historical records."}
        </p>
      </section>
    </div>
  );
}
