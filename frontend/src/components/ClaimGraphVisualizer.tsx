import { useState } from "react";
import { GitCommit, ShieldAlert, ShieldCheck, HelpCircle, ArrowRight, Layers, Sparkles } from "lucide-react";

interface ClaimNode {
  id: string;
  type: "root" | "claim" | "evidence";
  title: string;
  detail: string;
  stance?: "supports" | "contradicts" | "neutral";
  confidence: number;
}

interface ClaimScenario {
  scenarioTitle: string;
  headline: string;
  overallVeracity: "LIKELY_REAL" | "LIKELY_FAKE" | "UNCERTAIN";
  overallScore: number;
  nodes: ClaimNode[];
}

const SCENARIOS: ClaimScenario[] = [
  {
    scenarioTitle: "Exoplanet Atmospheric Discovery",
    headline: "Astronomers detect methane and carbon dioxide in exoplanet atmosphere",
    overallVeracity: "LIKELY_REAL",
    overallScore: 94,
    nodes: [
      {
        id: "c1",
        type: "claim",
        title: "Proposition 1: Spectroscopic Methane Signatures",
        detail: "Transmission spectra analysis at 1.4-2.5μm revealed molecular absorption peaks.",
        confidence: 96,
      },
      {
        id: "e1",
        type: "evidence",
        title: "Corroboration: NASA/ESA Astrophysical Journal Paper",
        detail: "Published peer-reviewed spectroscopic dataset confirms carbon signatures.",
        stance: "supports",
        confidence: 98,
      },
      {
        id: "c2",
        type: "claim",
        title: "Proposition 2: Distance Benchmark (120 ly)",
        detail: "System located in Leo constellation at verified parallax distance.",
        confidence: 99,
      },
      {
        id: "e2",
        type: "evidence",
        title: "Corroboration: Gaia DR3 Astrometry Catalog",
        detail: "Exact distance matches international stellar registry within 0.2% error.",
        stance: "supports",
        confidence: 99,
      },
    ],
  },
  {
    scenarioTitle: "Emergency Bank Seizure Rumor",
    headline: "Secret executive decree will freeze all personal bank accounts overnight",
    overallVeracity: "LIKELY_FAKE",
    overallScore: 98,
    nodes: [
      {
        id: "c1",
        type: "claim",
        title: "Proposition 1: Midnight Confiscation Decree",
        detail: "Asserts immediate nationwide seizure without legislative enactment.",
        confidence: 98,
      },
      {
        id: "e1",
        type: "evidence",
        title: "Contradiction: Central Bank & Treasury Register",
        detail: "Zero emergency decrees filed; federal deposit insurance confirms standard operations.",
        stance: "contradicts",
        confidence: 99,
      },
      {
        id: "c2",
        type: "claim",
        title: "Proposition 2: Media Blackout Assertion",
        detail: "Claims mainstream press is under strict gag order.",
        confidence: 95,
      },
      {
        id: "e2",
        type: "evidence",
        title: "Contradiction: Reuters & AP Fact Check Consensuses",
        detail: "Flagged by 4 international news desks as recycled viral disinformation.",
        stance: "contradicts",
        confidence: 97,
      },
    ],
  },
];

export default function ClaimGraphVisualizer() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const scenario = SCENARIOS[selectedScenarioIndex];

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 space-y-6">
      {/* Header & Scenario Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Interactive Claim Relationship & Stance Graph
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Atomic propositions parsed from raw text and corroborated against external fact-check evidence.
          </p>
        </div>

        {/* Preset scenario toggle */}
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">
          {SCENARIOS.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                setActiveNodeId(null);
              }}
              className={`rounded-md px-3 py-1 font-mono text-[11px] font-semibold transition ${
                selectedScenarioIndex === idx
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {sc.scenarioTitle}
            </button>
          ))}
        </div>
      </div>

      {/* Target Article Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-4 dark:border-zinc-800/90 dark:bg-zinc-800/40">
        <div className="space-y-1 flex-1">
          <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase">SUBJECT ARTICLE HEADLINE</span>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">"{scenario.headline}"</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold uppercase ${
              scenario.overallVeracity === "LIKELY_REAL"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60"
                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60"
            }`}
          >
            {scenario.overallVeracity === "LIKELY_REAL" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            <span>{scenario.overallVeracity === "LIKELY_REAL" ? "Likely Real" : "Likely Fake"}</span>
          </span>
          <span className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-300">
            {scenario.overallScore}% Conf.
          </span>
        </div>
      </div>

      {/* Visualized Proposition Node Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>PARSED PROPOSITION CLAIMS</span>
          <span>CORROBORATING EVIDENCE NODES</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {scenario.nodes.map((node, i) => {
            const isClaim = node.type === "claim";
            const isSupports = node.stance === "supports";
            const isContradicts = node.stance === "contradicts";

            return (
              <div
                key={node.id}
                onClick={() => setActiveNodeId(node.id === activeNodeId ? null : node.id)}
                className={`relative cursor-pointer rounded-2xl border p-4 transition-all ${
                  activeNodeId === node.id
                    ? "border-zinc-900 ring-2 ring-zinc-900/10 dark:border-zinc-200 dark:ring-zinc-200/20 shadow-md"
                    : "border-zinc-200/90 bg-white hover:border-zinc-400 dark:border-zinc-800/90 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="font-bold text-zinc-500 uppercase">
                    {isClaim ? `CLAIM #${Math.floor(i / 2) + 1}` : "EVIDENCE NODE"}
                  </span>
                  {node.stance && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        isSupports
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isContradicts
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {node.stance}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{node.title}</h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{node.detail}</p>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 font-mono text-[10px] text-zinc-400 dark:border-zinc-800">
                  <span>CONFIDENCE WEIGHT:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{node.confidence}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
