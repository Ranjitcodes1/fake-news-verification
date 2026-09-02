import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Trash2, ArrowRight, ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deleteAnalysis, getHistory } from "../services/api";
import type { HistoryItem } from "../types/analysis";
import { percent, predictionLabel } from "../utils/format";

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");
  const [prediction, setPrediction] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sort, setSort] = useState<"newest" | "confidence">("newest");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const rows = await getHistory({
        q: q || undefined,
        prediction: prediction || undefined,
        only_mine: onlyMine || undefined,
      });
      setItems(rows);
    } catch {
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [onlyMine]);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "confidence") copy.sort((a, b) => b.confidence - a.confidence);
    return copy;
  }, [items, sort]);

  async function onDelete(id: number) {
    try {
      await deleteAnalysis(id);
      setItems((current) => current.filter((row) => row.id !== id));
    } catch {
      setError("Failed to delete record.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Analysis History</h1>
        <p className="mt-1 text-xs text-slate-400">
          Review previous article assessments, filter by category, or export records.
        </p>
      </div>

      <form
        onSubmit={load}
        className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl"
      >
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headline keywords..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <select
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Predictions</option>
          <option value="LIKELY_REAL">Likely Real</option>
          <option value="LIKELY_FAKE">Likely Fake</option>
          <option value="UNCERTAIN">Uncertain</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "confidence")}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="confidence">Highest Confidence</option>
        </select>

        {user && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
            />
            <span>My Analyses Only</span>
          </label>
        )}

        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Apply Filter</span>
        </button>
      </form>

      {error ? <p className="text-xs font-medium text-rose-400">{error}</p> : null}

      <div className="space-y-3">
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-500">Loading history…</p>
        ) : sorted.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 py-12 text-center text-slate-400">
            <p className="text-sm">No analyses match your criteria.</p>
            <Link to="/analyze" className="mt-2 inline-block text-xs font-semibold text-emerald-400 underline">
              Run your first verification
            </Link>
          </div>
        ) : (
          sorted.map((row) => {
            const isFake = row.prediction === "LIKELY_FAKE";
            const isReal = row.prediction === "LIKELY_REAL";

            return (
              <div
                key={row.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-sm transition hover:border-slate-700 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        isFake
                          ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                          : isReal
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                      }`}
                    >
                      {isFake ? (
                        <ShieldAlert className="h-3 w-3" />
                      ) : isReal ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <HelpCircle className="h-3 w-3" />
                      )}
                      {predictionLabel(row.prediction)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {percent(row.confidence)} confidence · {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Link
                    to={`/results/${row.id}`}
                    className="block font-semibold text-white transition hover:text-emerald-400"
                  >
                    {row.headline}
                  </Link>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Link
                    to={`/results/${row.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    title="Delete record"
                    onClick={() => void onDelete(row.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-950/50 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
