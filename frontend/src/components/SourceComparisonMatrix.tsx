import { useState } from "react";
import { GitCompare, ShieldCheck, AlertTriangle, HelpCircle, BarChart3, Scale, Layers } from "lucide-react";

interface SourceProfile {
  sourceName: string;
  sourceType: "Wire Agency" | "Mainstream Press" | "Unverified Blog";
  headlineUsed: string;
  factualDensity: number; // 0 to 100
  sensationalismScore: number; // 0 to 100
  hedgingRate: number; // 0 to 100
  consensusMatch: number; // 0 to 100
  credibilityAssessment: "HIGH" | "MEDIUM" | "LOW_CREDIBILITY";
}

const COMPARISONS: SourceProfile[] = [
  {
    sourceName: "Global Wire Agency (Reuters / AP)",
    sourceType: "Wire Agency",
    headlineUsed: "Central bank holds interest rates steady after inflation cools",
    factualDensity: 94,
    sensationalismScore: 4,
    hedgingRate: 88,
    consensusMatch: 98,
    credibilityAssessment: "HIGH",
  },
  {
    sourceName: "Mainstream Financial Press (Bloomberg / FT)",
    sourceType: "Mainstream Press",
    headlineUsed: "Rate pause signals prolonged inflation fight as policymakers weigh labor strength",
    factualDensity: 88,
    sensationalismScore: 18,
    hedgingRate: 82,
    consensusMatch: 95,
    credibilityAssessment: "HIGH",
  },
  {
    sourceName: "Unverified Clickbait Portal (FinancialLeaks.xyz)",
    sourceType: "Unverified Blog",
    headlineUsed: "SHOCKING: Central bank secretly admits collapse is coming as rates frozen at emergency meeting",
    factualDensity: 12,
    sensationalismScore: 96,
    hedgingRate: 5,
    consensusMatch: 8,
    credibilityAssessment: "LOW_CREDIBILITY",
  },
];

export default function SourceComparisonMatrix() {
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Cross-Source Framing & Bias Detection Matrix
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Compare framing, factual density, emotional load, and consensus overlap across different reporting sources on the same story.
          </p>
        </div>
        <span className="font-mono text-[11px] text-zinc-400">3 COMPARATIVE ARCHETYPES</span>
      </div>

      {/* Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {COMPARISONS.map((src, i) => {
          const isSelected = selectedIdx === i;
          const isHigh = src.credibilityAssessment === "HIGH";
          const isLow = src.credibilityAssessment === "LOW_CREDIBILITY";

          return (
            <div
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`cursor-pointer rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-zinc-900 ring-2 ring-zinc-900/10 dark:border-zinc-200 dark:ring-zinc-200/20 shadow-md bg-zinc-50/50 dark:bg-zinc-800/60"
                  : "border-zinc-200/90 bg-white hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="font-semibold text-zinc-400 uppercase">{src.sourceType}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isHigh
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {isHigh ? "High Trust" : "Low Trust"}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{src.sourceName}</h4>
                <p className="mt-2 text-xs italic text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  "{src.headlineUsed}"
                </p>
              </div>

              {/* Metric Gauges */}
              <div className="mt-5 space-y-2.5 border-t border-zinc-200/60 pt-3 text-[11px] dark:border-zinc-700/60">
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-0.5">
                    <span>FACTUAL DENSITY</span>
                    <span className="font-bold">{src.factualDensity}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden dark:bg-zinc-700">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${src.factualDensity}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-0.5">
                    <span>SENSATIONALISM LOAD</span>
                    <span className="font-bold">{src.sensationalismScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden dark:bg-zinc-700">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${src.sensationalismScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-500 mb-0.5">
                    <span>WIRE CONSENSUS OVERLAP</span>
                    <span className="font-bold">{src.consensusMatch}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden dark:bg-zinc-700">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${src.consensusMatch}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
