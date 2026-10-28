import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Cpu,
  Globe,
  ArrowRight,
  AlertCircle,
  Sparkles,
  RotateCcw,
  ExternalLink,
  BookOpen,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { analyzeUrl, verifyArticle } from "../services/api";
import type { VerifyResult } from "../types/analysis";
import { percent, predictionLabel } from "../utils/format";

const QUICK_PRESETS = [
  {
    label: "Official Economic Statement (English Real)",
    headline: "Central bank holds interest rates steady after inflation cools across consumer goods",
    content:
      "The central bank left its benchmark interest rate unchanged on Wednesday, citing slower consumer-price growth over the past two quarters. Officials said they would continue to monitor labor-market data before considering further rate cuts in the upcoming fiscal cycle.",
  },
  {
    label: "Secret Bank Freeze (English Fake)",
    headline: "SHOCKING: Secret government executive order will confiscate all savings at midnight",
    content:
      "An emergency leak from elite insiders revealed that all personal bank accounts are scheduled for automatic seizure tonight. They don't want you to know this secret emergency decree that freezes your funds immediately! Share before this is deleted by censors!!!",
  },
  {
    label: "ଓଡ଼ିଶା ଶିଳ୍ପ ନୀତି ପ୍ରକଳ୍ପ (Odia Real)",
    headline: "ଓଡ଼ିଶା ସରକାର ନୂତନ ଶିଳ୍ପ ନୀତି ଅଧୀନରେ ୫୦୦ କୋଟି ଟଙ୍କାର ପ୍ରକଳ୍ପ ମଞ୍ଜୁର କଲେ",
    content:
      "ରାଜ୍ୟ କ୍ୟାବିନେଟ୍ ବୈଠକରେ ଶିଳ୍ପାୟନ ଏବଂ ରୋଜଗାର ସୃଷ୍ଟି ପାଇଁ ୫୦୦ କୋଟି ଟଙ୍କାର ନୂତନ ପ୍ରକଳ୍ପ ଅନୁମୋଦନ କରାଯାଇଛି। ଶିଳ୍ପ ବିଭାଗ ପକ୍ଷରୁ ସୂଚନା ଦିଆଯାଇଛି ଯେ ଏହା ଦ୍ୱାରା ୧୦ ହଜାରରୁ ଊର୍ଦ୍ଧ୍ୱ ଯୁବକଯୁବତୀଙ୍କୁ ନିଯୁକ୍ତି ମିଳିବ। ସରକାରୀ ତଥ୍ୟ ଆଧାରରେ ତଦାରଖ ପ୍ରକ୍ରିୟା କଡ଼ାକଡ଼ି କରାଯିବ।",
  },
  {
    label: "ୟୁପିଆଇ ବ୍ୟାଙ୍କ ଖାତା ବନ୍ଦ ଗୁଜବ (Odia Fake)",
    headline: "ଚାଞ୍ଚଲ୍ୟକର ଖବର: ରାତି ୧୦ଟା ପରେ ସବୁ ବ୍ୟାଙ୍କ ଖାତା ବନ୍ଦ ଏବଂ ଟଙ୍କା ଜବତ ହେବ",
    content:
      "ସୋସିଆଲ ମିଡିଆରେ ଭାଇରାଲ ହେଉଛି ଯେ ଆଜି ମଧ୍ୟରାତ୍ରିରୁ ସମସ୍ତ ବ୍ୟାଙ୍କ ଖାତା ସ୍ଥଗିତ ରହିବ ଏବଂ ସରକାର ସବୁ ଟଙ୍କା ନେଇଯିବେ। ଏହି ଗୁପ୍ତ ଆଦେଶ ତୁରନ୍ତ ସମସ୍ତଙ୍କୁ ସେୟାର କରନ୍ତୁ ନଚେତ୍ ସବୁ ନଷ୍ଟ ହୋଇଯିବ। କୌଣସି ସରକାରୀ ପ୍ରମାଣ ନଥାଇ ଏହି ଗୁଜବ ପ୍ରଚାର କରାଯାଉଛି।",
  },
  {
    label: "आरबीआई मौद्रिक नीति (Hindi Real)",
    headline: "भारतीय रिजर्व बैंक ने मौद्रिक नीति समीक्षा में ब्याज दरों को स्थिर रखा",
    content:
      "केंद्रीय बैंक ने मुद्रास्फीति के आंकड़ों और वैश्विक आर्थिक रुझानों की समीक्षा के बाद प्रमुख नीतिगत ब्याज दरों में कोई बदलाव नहीं किया है। अधिकारियों ने आधिकारिक प्रेस विज्ञप्ति में पुष्टि की है कि वे मूल्य स्थिरता बनाए रखने के लिए प्रतिबद्ध हैं।",
  },
  {
    label: "रात 10 बजे यूपीआई बैन अफवाह (Hindi Fake)",
    headline: "चौंकाने वाला खुलासा: रात 10 बजे के बाद सभी यूपीआई लेनदेन पूरी तरह बंद",
    content:
      "सोशल मीडिया पर तेजी से दावा किया जा रहा है कि सरकार ने आज रात से सभी डिजिटल भुगतान और यूपीआई सेवाओं पर प्रतिबंध लगा दिया है। जल्दी से अपना पैसा निकाल लें वरना बैंक खाता फ्रीज हो जाएगा। तुरंत सभी ग्रुपों में शेयर करें।",
  },
];

export default function HomePage() {
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [urlInput, setUrlInput] = useState("");
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [modelType, setModelType] = useState<"auto" | "distilbert" | "classical">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [attrFilter, setAttrFilter] = useState<"all" | "fake" | "real">("all");

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (headline.trim().length < 3) {
      setError("Please provide a news headline with at least 3 characters.");
      return;
    }
    if (content.trim().length < 40) {
      setError("Please provide an article body of at least 40 characters for reliable NLP verification.");
      return;
    }

    setLoading(true);
    try {
      const data = await verifyArticle({
        headline: headline.trim(),
        content: content.trim(),
        model_type: modelType,
      });
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Verification failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlVerify(e: FormEvent) {
    e.preventDefault();
    setError("");

    const targetUrl = urlInput.trim();
    if (!targetUrl) {
      setError("Please paste a valid public news article URL.");
      return;
    }
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      setError("Article URL must begin with http:// or https://");
      return;
    }

    setLoading(true);
    try {
      const data = await analyzeUrl(targetUrl, undefined, modelType);
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(
        e.response?.data?.detail ||
          "Could not fetch that URL. The site may be blocking automated readers or requires subscription. Paste the article text directly."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setHeadline("");
    setContent("");
    setUrlInput("");
    setResult(null);
    setError("");
  }

  // Normalize and filter attributions
  const rawAttributions = result
    ? Array.isArray(result.explanation)
      ? result.explanation
      : ((result.explanation as unknown as { word_attributions?: unknown[] })?.word_attributions || [])
    : [];

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
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      {/* Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>AI News & Claim Verification Assistant</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Veritas News Verifier
        </h1>

        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Enter a news headline and article text to analyze veracity, inspect word-level stylistic cues, and corroborate against evidence.
        </p>

        <div className="pt-2 flex justify-center">
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-1.5 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-500/50 transition shadow-sm"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Have a public news URL? Verify directly by link</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Input Verification Console */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-5">
        {/* Verification Mode Selector */}
        <div className="flex border-b border-slate-800 pb-3 gap-2">
          <button
            type="button"
            onClick={() => { setInputMode("text"); setError(""); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              inputMode === "text"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Direct Text Input</span>
          </button>
          <button
            type="button"
            onClick={() => { setInputMode("url"); setError(""); }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              inputMode === "url"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Verify by News Link</span>
          </button>
        </div>

        <form onSubmit={inputMode === "url" ? handleUrlVerify : handleVerify} className="space-y-4">
          {inputMode === "url" ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="urlInput" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Public Article or News URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="urlInput"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://timesofindia.indiatimes.com/... or https://www.reuters.com/..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Veritas will fetch the article text, extract publisher metadata, and run multi-signal corroboration.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Headline Input */}
              <div>
                <label htmlFor="headline" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  News Headline
                </label>
                <input
                  id="headline"
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Paste news headline statement..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Article Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="content" className="block text-xs font-semibold text-slate-300">
                    Article Text
                  </label>
                  <span className="font-mono text-[10px] text-slate-500">
                    {content.length} characters
                  </span>
                </div>
                <textarea
                  id="content"
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste the full article body or paragraph text here..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed transition-colors"
                />
              </div>

              {/* Sample Presets */}
              <div className="space-y-2 pt-1">
                <span className="font-mono text-[10px] text-slate-500 block">Quick Test Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setHeadline(p.headline);
                        setContent(p.content);
                        setError("");
                      }}
                      className="rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-1 font-mono text-[11px] text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer Controls & Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-xs text-slate-400">Model:</span>
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

            <div className="flex items-center gap-2">
              {(headline || content || urlInput || result) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || (inputMode === "url" ? !urlInput.trim() : (!headline.trim() || !content.trim()))}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{inputMode === "url" ? "Fetch & Verify Link" : "Verify Credibility"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </section>

      {/* Verification Results Dossier (Rendered in-place on the same page) */}
      {result && (
        <section className="space-y-6">
          {/* Decision Banner */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide ${
                      result.prediction === "LIKELY_FAKE"
                        ? "bg-rose-950/70 text-rose-300 border border-rose-800/60"
                        : result.prediction === "LIKELY_REAL"
                        ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                        : "bg-amber-950/70 text-amber-300 border border-amber-800/60"
                    }`}
                  >
                    {result.prediction === "LIKELY_FAKE" ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : result.prediction === "LIKELY_REAL" ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
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

                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {result.headline}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  {result.narrative}
                </p>
              </div>

              {/* Confidence Gauge */}
              <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center min-w-[160px]">
                <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase">
                  Certainty
                </span>
                <span className="mt-1 font-mono text-4xl font-black tracking-tight text-white">
                  {percent(result.confidence)}
                </span>
                <div className="mt-2 h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.prediction === "LIKELY_FAKE"
                        ? "bg-rose-500"
                        : result.prediction === "LIKELY_REAL"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lexical Token Attribution Heatmap */}
          {allAttributions.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Stylistic Token Attribution Heatmap</h3>
                  <p className="text-xs text-slate-400">
                    Word-level lexical cues weighted by directional model attribution.
                  </p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                  <button
                    type="button"
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
                    type="button"
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
                    type="button"
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

              <div className="flex flex-wrap gap-2 pt-1">
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
            </div>
          )}

          {/* Propositional Claims & Corroborated Evidence */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Extracted Claims */}
            <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white">Extracted Propositional Claims</h3>
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
            </div>

            {/* Live Corroborated Evidence */}
            <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white">Live Corroborated Evidence</h3>
              <p className="text-xs text-slate-400">
                Fact-check records & news index corroborations.
              </p>

              <div className="mt-3 space-y-2.5">
                {result.evidence &&
                result.evidence.filter(
                  (ev) => ev.title && !ev.title.includes("No mock evidence row") && (ev.url || ev.domain)
                ).length > 0 ? (
                  result.evidence
                    .filter(
                      (ev) => ev.title && !ev.title.includes("No mock evidence row") && (ev.url || ev.domain)
                    )
                    .map((ev, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="text-slate-400 uppercase">{ev.source_name}</span>
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
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      No external fact-check entries or news records matched these specific claims.
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">
                      Connect Google Fact Check or NewsAPI keys in .env for live web verification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Epistemic Limitation Notice */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-xs text-slate-400">
            <h4 className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <span>Epistemic Limitations Checklist</span>
            </h4>
            <p className="leading-relaxed">
              {result.disclaimer ||
                "This probabilistic score represents linguistic and stylistic classifier outputs. It does not replace journalistic due diligence, authoritative fact-checking, or corroboration against primary historical records."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
