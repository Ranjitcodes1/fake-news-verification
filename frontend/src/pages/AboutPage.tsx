import { ShieldCheck, Cpu, Database, AlertCircle, FileText, Lock } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">About Veritas</h1>
        <p className="mt-1 text-xs text-slate-400">
          An AI-powered, transparent news verification and decision-support platform designed to analyze digital media veracity while highlighting empirical uncertainty.
        </p>
      </div>

      {/* Core Principles */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white">Core Architectural Principles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Cpu,
              title: "Hybrid NLP Modeling",
              body: "Combines ultra-fast TF-IDF linear baselines (Logistic Regression, Linear SVC, Naive Bayes) with fine-tuned DistilBERT sequence transformers.",
            },
            {
              icon: FileText,
              title: "Transparent Explainability",
              body: "Interactive word-level attribution heatmaps show precisely which lexical tokens influenced the model's score, preventing 'black-box' decisions.",
            },
            {
              icon: Database,
              title: "Live Evidence Corroboration",
              body: "Gathers external ClaimReviews from Google Fact Check Tools API and public news indices to evaluate claim support or contradiction.",
            },
            {
              icon: Lock,
              title: "Security & Privacy",
              body: "SSRF-protected public URL fetchers, rate limiting with SlowAPI, and secure JWT-based user authentication.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-sm space-y-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <item.icon className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Epistemic Boundaries */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-sm space-y-2 text-xs text-slate-300">
        <h2 className="text-sm font-bold text-white">Epistemic Limitations in Fake News Detection</h2>
        <p className="leading-relaxed">
          Misinformation classification is inherently complex. Writing style is not identical to truth. Legitimate breaking news can lack immediate external corroboration, while calculated disinformation can mimic sober institutional prose.
        </p>
        <p className="leading-relaxed text-slate-400">
          Veritas outputs are calibrated probabilistic assessments, not definitive verdicts. Users should always review primary citations, inspect individual propositions, and exercise critical judgment.
        </p>
      </section>

      {/* Synthetic Corpus Notice */}
      <section className="rounded-3xl border border-emerald-800/60 bg-emerald-950/30 p-6 text-xs text-emerald-200 space-y-1">
        <h3 className="font-bold flex items-center gap-1.5 text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Benchmark & Training Corpus Notice
        </h3>
        <p className="leading-relaxed opacity-90 text-slate-300">
          The default offline training corpus is designed for modular demonstration and testing. When utilizing Veritas for production intelligence or journalistic tasks, plug in domain-specific benchmark datasets as documented in <code className="rounded bg-emerald-950 px-1 py-0.5 font-mono text-emerald-300 border border-emerald-800/60">ml/data/DATASETS.md</code>.
        </p>
      </section>
    </div>
  );
}
