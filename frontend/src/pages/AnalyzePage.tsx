import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Globe,
  Upload,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  Clipboard,
} from "lucide-react";
import { analyzeUrl, verifyArticle, verifyBatch } from "../services/api";
import type { BatchVerifyResult } from "../types/analysis";
import { percent, predictionLabel } from "../utils/format";

const SAMPLE_URLS = [
  {
    title: "Reuters Financial Wire (Established News)",
    url: "https://www.reuters.com/markets/rates-monitor",
    badge: "Reuters · Established",
    badgeColor: "border-emerald-800/60 bg-emerald-950/60 text-emerald-300",
  },
  {
    title: "PIB India Fact Check: UPI Alert (Official)",
    url: "https://factcheck.pib.gov.in/hindi/upi-alert",
    badge: "Govt FactCheck · Official",
    badgeColor: "border-sky-800/60 bg-sky-950/60 text-sky-300",
  },
  {
    title: "NCI Cancer Clinical Trials (Debunked Rumor)",
    url: "https://www.cancer.gov/about-cancer/treatment/clinical-trials/debunked",
    badge: "Health Authority · Fact Check",
    badgeColor: "border-indigo-800/60 bg-indigo-950/60 text-indigo-300",
  },
  {
    title: "Suspicious Miracle Root Rumor (Unverified Blog)",
    url: "https://unverified-miracle-news.org/cancer-cure-ancient-root",
    badge: "Unverified · Suspicious",
    badgeColor: "border-rose-800/60 bg-rose-950/60 text-rose-300",
  },
];

const PRESETS = [
  {
    title: "Official Central Bank Statement (English Real)",
    langTag: "EN",
    headline: "Central bank holds interest rates steady after inflation cools across consumer goods",
    content:
      "The central bank left its benchmark interest rate unchanged on Wednesday, citing slower consumer-price growth over the past two quarters. Officials said they would continue to monitor labor-market data before considering further rate cuts in the upcoming fiscal cycle.",
  },
  {
    title: "🇬🇧 Secret Bank Account Freeze (English Fake)",
    langTag: "EN",
    headline: "SHOCKING: Secret government executive order will confiscate all savings at midnight",
    content:
      "An emergency leak from elite insiders revealed that all personal bank accounts are scheduled for automatic seizure tonight. They don't want you to know this secret emergency decree that freezes your funds immediately! Share before this is deleted by censors!!!",
  },
  {
    title: "🇮🇳 ଓଡ଼ିଶା ଶିଳ୍ପ ନୀତି ପ୍ରକଳ୍ପ (Odia Real)",
    langTag: "OR",
    headline: "ଓଡ଼ିଶା ସରକାର ନୂତନ ଶିଳ୍ପ ନୀତି ଅଧୀନରେ ୫୦୦ କୋଟି ଟଙ୍କାର ପ୍ରକଳ୍ପ ମଞ୍ଜୁର କଲେ",
    content:
      "ରାଜ୍ୟ କ୍ୟାବିନେଟ୍ ବୈଠକରେ ଶିଳ୍ପାୟନ ଏବଂ ରୋଜଗାର ସୃଷ୍ଟି ପାଇଁ ୫୦୦ କୋଟି ଟଙ୍କାର ନୂତନ ପ୍ରକଳ୍ପ ଅନୁମୋଦନ କରାଯାଇଛି। ଶିଳ୍ପ ବିଭାଗ ପକ୍ଷରୁ ସୂଚନା ଦିଆଯାଇଛି ଯେ ଏହା ଦ୍ୱାରା ୧୦ ହଜାରରୁ ଊର୍ଦ୍ଧ୍ୱ ଯୁବକଯୁବତୀଙ୍କୁ ନିଯୁକ୍ତି ମିଳିବ। ସରକାରୀ ତଥ୍ୟ ଆଧାରରେ ତଦାରଖ ପ୍ରକ୍ରିୟା କଡ଼ାକଡ଼ି କରାଯିବ।",
  },
  {
    title: "🇮🇳 ୟୁପିଆଇ ବ୍ୟାଙ୍କ ଖାତା ବନ୍ଦ ଗୁଜବ (Odia Fake)",
    langTag: "OR",
    headline: "ଚାଞ୍ଚଲ୍ୟକର ଖବର: ରାତି ୧୦ଟା ପରେ ସବୁ ବ୍ୟାଙ୍କ ଖାତା ବନ୍ଦ ଏବଂ ଟଙ୍କା ଜବତ ହେବ",
    content:
      "ସୋସିଆଲ ମିଡିଆରେ ଭାଇରାଲ ହେଉଛି ଯେ ଆଜି ମଧ୍ୟରାତ୍ରିରୁ ସମସ୍ତ ବ୍ୟାଙ୍କ ଖାତା ସ୍ଥଗିତ ରହିବ ଏବଂ ସରକାର ସବୁ ଟଙ୍କା ନେଇଯିବେ। ଏହି ଗୁପ୍ତ ଆଦେଶ ତୁରନ୍ତ ସମସ୍ତଙ୍କୁ ସେୟାର କରନ୍ତୁ ନଚେତ୍ ସବୁ ନଷ୍ଟ ହୋଇଯିବ। କୌଣସି ସରକାରୀ ପ୍ରମାଣ ନଥାଇ ଏହି ଗୁଜବ ପ୍ରଚାର କରାଯାଉଛି।",
  },
  {
    title: "🇮🇳 आरबीआई मौद्रिक नीति समीक्षा (Hindi Real)",
    langTag: "HI",
    headline: "भारतीय रिजर्व बैंक ने मौद्रिक नीति समीक्षा में ब्याज दरों को स्थिर रखा",
    content:
      "केंद्रीय बैंक ने मुद्रास्फीति के आंकड़ों और वैश्विक आर्थिक रुझानों की समीक्षा के बाद प्रमुख नीतिगत ब्याज दरों में कोई बदलाव नहीं किया है। अधिकारियों ने आधिकारिक प्रेस विज्ञप्ति में पुष्टि की है कि वे मूल्य स्थिरता बनाए रखने के लिए प्रतिबद्ध हैं।",
  },
  {
    title: "🇮🇳 रात 10 बजे यूपीआई बैन अफवाह (Hindi Fake)",
    langTag: "HI",
    headline: "चौंकाने वाला खुलासा: रात 10 बजे के बाद सभी यूपीआई लेनदेन पूरी तरह बंद",
    content:
      "सोशल मीडिया पर तेजी से दावा किया जा रहा है कि सरकार ने आज रात से सभी डिजिटल भुगतान और यूपीआई सेवाओं पर प्रतिबंध लगा दिया है। जल्दी से अपना पैसा निकाल लें वरना बैंक खाता फ्रीज हो जाएगा। तुरंत सभी ग्रुपों में शेयर करें।",
  },
  {
    title: "🇪🇸 Banco Central Tipos de Interés (Spanish Real)",
    langTag: "ES",
    headline: "El Banco Central mantiene los tipos de interés tras moderarse la inflación",
    content:
      "La entidad bancaria central decidió mantener estables los tipos de interés de referencia durante su reunión de política monetaria. Las autoridades oficiales señalaron que seguirán evaluando los datos económicos antes de adoptar nuevas medidas.",
  },
  {
    title: "🇪🇸 Raíz Mágica Cura Cáncer (Spanish Fake)",
    langTag: "ES",
    headline: "¡Impactante secreto revelado! Una raíz mágica cura todo el cáncer en 24 horas",
    content:
      "Científicos anónimos descubren un remedio casero milagroso que elimina todos los tumores malignos al 100% de la noche a la mañana. Los grandes hospitales intentan censurar esta información urgente. Comparte antes de que lo borren.",
  },
];

export default function AnalyzePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab: 'url' | 'text' | 'batch'
  const [activeTab, setActiveTab] = useState<"url" | "text" | "batch">(
    searchParams.get("headline") && !searchParams.get("url") ? "text" : "url"
  );

  // URL state
  const [urlInput, setUrlInput] = useState(searchParams.get("url") || "");

  // Text state
  const [headline, setHeadline] = useState(searchParams.get("headline") || "");
  const [content, setContent] = useState("");

  // Model & execution state
  const [modelType, setModelType] = useState<"auto" | "distilbert" | "classical">("auto");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const qUrl = searchParams.get("url");
    const qHeadline = searchParams.get("headline");
    if (qUrl) {
      setUrlInput(qUrl);
      setActiveTab("url");
    }
    if (qHeadline) setHeadline(qHeadline);
  }, [searchParams]);

  // Stepped progress animation during URL analysis
  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const t1 = setTimeout(() => setLoadingStep(1), 600);
    const t2 = setTimeout(() => setLoadingStep(2), 1500);
    const t3 = setTimeout(() => setLoadingStep(3), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading]);

  // Batch state
  const [batchRawText, setBatchRawText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchResults, setBatchResults] = useState<BatchVerifyResult | null>(null);

  async function handleUrlSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const targetUrl = urlInput.trim();
    if (!targetUrl) {
      setError("Please paste a valid public article URL to verify.");
      return;
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      setError("Article URL must begin with http:// or https://");
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeUrl(targetUrl, undefined, modelType);
      navigate(`/results/${result.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(
        e.response?.data?.detail ||
          "Could not verify this link. The site may be blocking automated readers. Try copying the article text and using the 'Direct Text Paste' tab."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTextSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (headline.trim().length < 3) {
      setError("Please provide a headline with at least 3 characters.");
      return;
    }
    if (content.trim().length < 40) {
      setError("Article content must be at least 40 characters for reliable NLP analysis.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyArticle({
        headline: headline.trim(),
        content: content.trim(),
        model_type: modelType,
      });
      navigate(`/results/${result.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Verification failed. Please check the inputs or backend service.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith("http://") || text.startsWith("https://")) {
        setUrlInput(text.trim());
      } else {
        setUrlInput(text.trim());
      }
    } catch {
      // Clipboard permission denied or unavailable
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
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Verification Console</span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400 uppercase">
              Live Pipeline
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify news articles instantly by link, paste raw text copy, or batch-audit CSV files.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("url");
              setError("");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "url"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Verify by Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setError("");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "text"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Direct Text Paste</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("batch");
              setError("");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "batch"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Batch CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: VERIFY BY LINK (URL)
      ======================================================== */}
      {activeTab === "url" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-emerald-400" />
                  <span>Paste Public News Article Link</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Veritas will scrape the article narrative, extract OpenGraph/JSON-LD metadata, check domain authority, and corroborate facts.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  <span>SSRF Protected</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                  <span>Standard News & Blogs</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Globe className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.reuters.com/world/example-news-story or https://thehindu.com/..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-28 py-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  title="Paste link from clipboard"
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste</span>
                </button>
              </div>

              {/* Model & Submit Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono text-xs text-slate-400">Model Engine:</span>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value as "auto" | "distilbert" | "classical")}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                    disabled={loading}
                  >
                    <option value="auto">Auto (DistilBERT + Fallback)</option>
                    <option value="distilbert">DistilBERT Transformer</option>
                    <option value="classical">TF-IDF Linear Baseline</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !urlInput.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Verifying Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Inspect & Verify Link</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Animated Progress Stepper while Loading */}
              {loading && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                      Veritas Verification Pipeline Active
                    </span>
                    <span className="font-mono text-xs text-slate-400">Step {loadingStep + 1} of 4</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center gap-2 ${loadingStep >= 0 ? "text-emerald-300" : "text-slate-500"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${loadingStep >= 0 ? "text-emerald-400" : "text-slate-600"}`} />
                      <span>Step 1: Connecting securely & enforcing SSRF network security rules...</span>
                    </div>
                    <div className={`flex items-center gap-2 ${loadingStep >= 1 ? "text-emerald-300" : "text-slate-500"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${loadingStep >= 1 ? "text-emerald-400" : "text-slate-600"}`} />
                      <span>Step 2: Parsing article narrative, publisher credentials & OpenGraph metadata...</span>
                    </div>
                    <div className={`flex items-center gap-2 ${loadingStep >= 2 ? "text-emerald-300" : "text-slate-500"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${loadingStep >= 2 ? "text-emerald-400" : "text-slate-600"}`} />
                      <span>Step 3: Executing ML stylometry & token-level sensationalism attribution...</span>
                    </div>
                    <div className={`flex items-center gap-2 ${loadingStep >= 3 ? "text-emerald-300" : "text-slate-500"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${loadingStep >= 3 ? "text-emerald-400" : "text-slate-600"}`} />
                      <span>Step 4: Cross-referencing empirical propositions with Google Fact Check registries...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>

          {/* Quick Benchmark News Links */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              One-Click Test Links (Real vs. Fake / Debunked)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SAMPLE_URLS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUrlInput(sample.url)}
                  className="flex flex-col text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700 hover:bg-slate-900 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${sample.badgeColor}`}>
                      {sample.badge}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">Click to fill</span>
                  </div>
                  <p className="text-xs font-semibold text-white">{sample.title}</p>
                  <p className="font-mono text-[11px] text-slate-400 truncate">{sample.url}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: DIRECT TEXT PASTE
      ======================================================== */}
      {activeTab === "text" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Input Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleTextSubmit}
              className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl"
            >
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
                      <span>Analyze News Text</span>
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
              MULTILINGUAL BENCHMARKS
            </h2>
            <div className="space-y-3">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setHeadline(p.headline);
                    setContent(p.content);
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
      )}

      {/* ========================================================
          TAB 3: BATCH & CSV VERIFICATION
      ======================================================== */}
      {activeTab === "batch" && (
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
