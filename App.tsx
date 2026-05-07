import { useState, useRef, useCallback, useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    puter: any;
  }
}

/* ─────────────────────────── Types ─────────────────────────── */
interface CarStats {
  make: string;
  model: string;
  year: string;
  trim: string;
  horsepower: string;
  torque: string;
  zeroToSixty: string;
  topSpeed: string;
  engine: string;
  drivetrain: string;
  msrp: string;
  bodyStyle: string;
  description: string;
  funFact: string;
  rarity: "common" | "uncommon" | "rare" | "ultra-rare" | "one-of-a-kind";
  productionUnits: string; // e.g. "499 units" or "" if not rare/unknown
  confidence: number; // 0–100
  logoQuery: string;
}

interface HistoryEntry {
  id: number;
  imagePreview: string;
  stats: CarStats;
  timestamp: Date;
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) return text.slice(braceStart, braceEnd + 1);
  return text.trim();
}

function getBrandDomain(make: string): string {
  const map: Record<string, string> = {
    ferrari: "ferrari.com", lamborghini: "lamborghini.com", porsche: "porsche.com",
    mclaren: "mclaren.com", bugatti: "bugatti.com", koenigsegg: "koenigsegg.com",
    pagani: "pagani.com", "aston martin": "astonmartin.com", aston: "astonmartin.com",
    bentley: "bentley.com", "rolls-royce": "rolls-royce.com", rolls: "rolls-royce.com",
    maserati: "maserati.com", "alfa romeo": "alfaromeo.com", alfa: "alfaromeo.com",
    bmw: "bmw.com", mercedes: "mercedes-benz.com", "mercedes-benz": "mercedes-benz.com",
    audi: "audi.com", volkswagen: "vw.com", vw: "vw.com", toyota: "toyota.com",
    honda: "honda.com", nissan: "nissan.com", mazda: "mazda.com", subaru: "subaru.com",
    mitsubishi: "mitsubishi.com", lexus: "lexus.com", infiniti: "infiniti.com",
    acura: "acura.com", ford: "ford.com", chevrolet: "chevrolet.com", chevy: "chevrolet.com",
    dodge: "dodge.com", jeep: "jeep.com", ram: "ramtrucks.com", cadillac: "cadillac.com",
    lincoln: "lincolnvehicles.com", buick: "buick.com", gmc: "gmc.com", tesla: "tesla.com",
    rivian: "rivian.com", lucid: "lucidmotors.com", polestar: "polestar.com",
    volvo: "volvocars.com", "land rover": "landrover.com", land: "landrover.com",
    jaguar: "jaguar.com", mini: "mini.com", fiat: "fiat.com", kia: "kia.com",
    hyundai: "hyundai.com", genesis: "genesis.com", seat: "seat.com", skoda: "skoda.com",
    peugeot: "peugeot.com", renault: "renault.com", citroen: "citroen.com", opel: "opel.com",
    vauxhall: "vauxhall.co.uk", chrysler: "chrysler.com", pontiac: "pontiac.com",
    hummer: "hummer.com", scion: "scion.com", mercury: "ford.com", smart: "smart.com",
    lotus: "lotuscars.com", noble: "noblem600.com", spyker: "spykercars.com",
    zenvo: "zenvoautomotive.com", dacia: "dacia.com", lancia: "lancia.com",
    saab: "saab.com", suzuki: "suzuki.com", isuzu: "isuzu.com", daihatsu: "daihatsu.com",
  };
  return map[make?.toLowerCase()?.trim()] || "";
}

const RARITY_CONFIG = {
  "common":       { label: "Common",       color: "text-slate-400",  bg: "bg-slate-700/60",  border: "border-slate-600", dot: "bg-slate-400" },
  "uncommon":     { label: "Uncommon",     color: "text-green-400",  bg: "bg-green-900/30",  border: "border-green-700", dot: "bg-green-400" },
  "rare":         { label: "Rare",         color: "text-blue-400",   bg: "bg-blue-900/30",   border: "border-blue-700",  dot: "bg-blue-400" },
  "ultra-rare":   { label: "Ultra Rare",   color: "text-purple-400", bg: "bg-purple-900/30", border: "border-purple-700",dot: "bg-purple-400" },
  "one-of-a-kind":{ label: "One of a Kind",color: "text-amber-400",  bg: "bg-amber-900/30",  border: "border-amber-600", dot: "bg-amber-400" },
};

/* ─────────────────────────── Sub-components ─────────────────────────── */

// App logo SVG
function CarIDLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
      <path
        d="M8 28l3-8h26l3 8"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <rect x="7" y="28" width="34" height="9" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
      <circle cx="15" cy="37" r="4" fill="#1e293b" stroke="white" strokeWidth="2"/>
      <circle cx="33" cy="37" r="4" fill="#1e293b" stroke="white" strokeWidth="2"/>
      <circle cx="15" cy="37" r="1.5" fill="white"/>
      <circle cx="33" cy="37" r="1.5" fill="white"/>
      <path d="M13 28l2-6h18l2 6" fill="white" fillOpacity="0.25"/>
      <rect x="28" y="21" width="6" height="7" rx="1" fill="#60a5fa" fillOpacity="0.7"/>
      <rect x="14" y="21" width="6" height="7" rx="1" fill="#60a5fa" fillOpacity="0.7"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb"/>
          <stop offset="1" stopColor="#1d4ed8"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function BrandLogo({ make, size = 64 }: { make: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const domain = getBrandDomain(make);

  useEffect(() => { setImgError(false); }, [make]);

  if (imgError || !domain) {
    return (
      <div
        className="rounded-full bg-white/10 backdrop-blur flex items-center justify-center font-black text-white border-2 border-white/20 shadow-lg"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {make?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${make} logo`}
      className="object-contain rounded-full bg-white border-2 border-white/20 shadow-lg p-1"
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

function StatCard({ label, value, icon, highlight = false }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3.5 flex flex-col gap-1 border transition-all duration-200 hover:scale-[1.02]
      ${highlight
        ? "bg-blue-900/30 border-blue-600/40 hover:border-blue-400/60"
        : "bg-slate-800/80 border-slate-700/60 hover:border-slate-500/60"}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-base">{icon}</span>
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-tight">{label}</span>
      </div>
      <span className={`font-bold text-base leading-tight ${highlight ? "text-blue-300" : "text-white"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const label = pct >= 80 ? "High confidence" : pct >= 50 ? "Moderate confidence" : "Low confidence";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-semibold shrink-0" style={{ color }}>{label} ({pct}%)</span>
    </div>
  );
}

function RarityBadge({ rarity, productionUnits }: { rarity: CarStats["rarity"]; productionUnits: string }) {
  const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG["common"];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
      {cfg.label}
      {productionUnits && productionUnits !== "N/A" && productionUnits !== "" && (
        <span className="opacity-70 font-medium">· {productionUnits}</span>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all border border-slate-600"
    >
      {copied ? "✓ Copied!" : "📋 Copy Stats"}
    </button>
  );
}

function buildShareText(stats: CarStats): string {
  return `🚗 ${stats.year} ${stats.make} ${stats.model}${stats.trim ? ` ${stats.trim}` : ""}
⚡ ${stats.horsepower} | 🏁 ${stats.zeroToSixty} | 💨 ${stats.topSpeed}
💰 ${stats.msrp} | 🔧 ${stats.engine}
Identified with CarID – AI Car Identifier`;
}

function CarInfographic({ stats, imagePreview }: { stats: CarStats; imagePreview: string }) {
  const primaryStats = [
    { key: "hp",     label: "Horsepower",   value: stats.horsepower,   icon: "⚡", highlight: true },
    { key: "tq",     label: "Torque",       value: stats.torque,       icon: "🔩" },
    { key: "060",    label: "0–60 mph",     value: stats.zeroToSixty,  icon: "🏁", highlight: true },
    { key: "top",    label: "Top Speed",    value: stats.topSpeed,     icon: "💨" },
    { key: "price",  label: "Est. MSRP",   value: stats.msrp,         icon: "💰", highlight: true },
    { key: "engine", label: "Engine",       value: stats.engine,       icon: "🔧" },
    { key: "drive",  label: "Drivetrain",   value: stats.drivetrain,   icon: "⚙️" },
    { key: "body",   label: "Body Style",   value: stats.bodyStyle,    icon: "🚘" },
  ];

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl animate-fadeIn">
      {/* ── Hero Banner ── */}
      <div className="relative h-56 overflow-hidden">
        <img src={imagePreview} alt="Car" className="w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent" />

        {/* Top-right rarity badge */}
        <div className="absolute top-4 right-4">
          <RarityBadge rarity={stats.rarity} productionUnits={stats.productionUnits} />
        </div>

        {/* Bottom info row */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">{stats.year}</p>
            <h2 className="text-white text-2xl font-extrabold leading-tight drop-shadow-xl">
              {stats.make} <span className="text-blue-300">{stats.model}</span>
            </h2>
            {stats.trim && stats.trim !== "—" && stats.trim !== "" && (
              <p className="text-slate-300 text-sm font-medium mt-0.5">{stats.trim}</p>
            )}
          </div>
          <BrandLogo make={stats.make} size={60} />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="bg-slate-900 p-5 flex flex-col gap-4">

        {/* Confidence + copy row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <ConfidenceMeter value={stats.confidence} />
          </div>
          <CopyButton text={buildShareText(stats)} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {primaryStats.map((s) => (
            <StatCard key={s.key} label={s.label} value={s.value} icon={s.icon} highlight={s.highlight} />
          ))}
        </div>

        {/* Description */}
        {stats.description && (
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">About this car</p>
            <p className="text-slate-200 text-sm leading-relaxed">{stats.description}</p>
          </div>
        )}

        {/* Fun Fact */}
        {stats.funFact && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-4 flex gap-3">
            <span className="text-xl shrink-0">💡</span>
            <div>
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">Fun Fact</p>
              <p className="text-slate-200 text-sm leading-relaxed">{stats.funFact}</p>
            </div>
          </div>
        )}

        {/* Production units callout for rare cars */}
        {stats.productionUnits && stats.productionUnits !== "N/A" && stats.productionUnits !== "" && (
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4 flex gap-3 items-center">
            <span className="text-2xl shrink-0">🏭</span>
            <div>
              <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-1">Production Run</p>
              <p className="text-white font-bold text-base">{stats.productionUnits}</p>
              <p className="text-slate-400 text-xs mt-0.5">total units ever built</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({
  entry,
  active,
  onSelect,
  onDelete,
}: {
  entry: HistoryEntry;
  active: boolean;
  onSelect: (e: HistoryEntry) => void;
  onDelete: (id: number) => void;
}) {
  const rCfg = RARITY_CONFIG[entry.stats.rarity] || RARITY_CONFIG["common"];
  return (
    <div className={`group flex items-center gap-3 w-full text-left rounded-2xl p-3 border transition-all duration-150 cursor-pointer
      ${active
        ? "bg-blue-900/30 border-blue-600/50"
        : "bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/60 hover:border-slate-600"}`}
      onClick={() => onSelect(entry)}
    >
      <div className="relative shrink-0">
        <img src={entry.imagePreview} alt="car" className="w-13 h-13 w-12 h-12 object-cover rounded-xl border border-slate-600" />
        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${rCfg.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">
          {entry.stats.year} {entry.stats.make} {entry.stats.model}
        </p>
        {entry.stats.horsepower && (
          <p className="text-slate-400 text-xs truncate">⚡ {entry.stats.horsepower}</p>
        )}
        <p className="text-slate-600 text-[11px] mt-0.5">
          {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <button
        onClick={(ev) => { ev.stopPropagation(); onDelete(entry.id); }}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-lg leading-none p-1 rounded-lg hover:bg-red-500/10"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

/* ─────────────────────────── Main App ─────────────────────────── */
export default function App() {
  const [view, setView] = useState<"home" | "result">("home");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState<CarStats | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const goHome = () => {
    setView("home");
    setCurrentStats(null);
    setCurrentPreview(null);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setActiveHistoryId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError(null);
    setCurrentStats(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const identifyCar = async () => {
    if (!imageFile || !imagePreview) return;
    setLoading(true);
    setError(null);
    setCurrentStats(null);
    setView("home");

    const stages = ["Uploading image…", "Analysing with AI…", "Extracting specs…", "Building infographic…"];
    let si = 0;
    setLoadingStage(stages[0]);
    const stageInterval = setInterval(() => {
      si = Math.min(si + 1, stages.length - 1);
      setLoadingStage(stages[si]);
    }, 1800);

    const prompt = `You are a world-class automotive expert and car identification AI.
Carefully analyze this image and identify the car.
Return ONLY a valid JSON object — no extra text, no markdown code fences.

Use this exact structure:
{
  "make": "Brand name (e.g. Ferrari)",
  "model": "Model name (e.g. 488 GTB)",
  "year": "Year or range (e.g. 2019)",
  "trim": "Specific trim/variant or empty string if unknown",
  "horsepower": "HP figure with unit (e.g. 660 hp)",
  "torque": "Torque with unit (e.g. 561 lb-ft)",
  "zeroToSixty": "0-60 time (e.g. 3.0 sec)",
  "topSpeed": "Top speed with unit (e.g. 205 mph)",
  "engine": "Engine description (e.g. 3.9L Twin-Turbo V8)",
  "drivetrain": "RWD, AWD, or FWD",
  "msrp": "Original MSRP when new (e.g. $252,000)",
  "bodyStyle": "e.g. Coupe, Sedan, SUV, Convertible, Hatchback, Wagon, Pickup, Van",
  "description": "2–3 sentences about this car's significance and character",
  "funFact": "One genuinely surprising or little-known fact about this specific model",
  "rarity": "one of: common, uncommon, rare, ultra-rare, one-of-a-kind",
  "productionUnits": "If rare/ultra-rare/one-of-a-kind: exact or approximate production number as a string e.g. '499 units'. If common/uncommon or unknown: empty string",
  "confidence": integer 0-100 representing how confident you are in this identification,
  "logoQuery": "brand name lowercase only (e.g. ferrari)"
}
If the image does not show a car, set make to "Unknown" and fill other fields with "N/A".`;

    try {
      const response = await window.puter.ai.chat(prompt, imageFile, {
        model: "gemini-2.5-flash",
      });

      let raw = "";
      if (typeof response === "string") {
        raw = response;
      } else if (response?.message?.content) {
        const content = response.message.content;
        if (typeof content === "string") raw = content;
        else if (Array.isArray(content))
          raw = content
            .filter((c: { type: string; text?: string }) => c.type === "text")
            .map((c: { type: string; text?: string }) => c.text)
            .join("\n");
      } else {
        raw = String(response);
      }

      const jsonStr = extractJson(raw);
      const stats: CarStats = JSON.parse(jsonStr);

      setCurrentStats(stats);
      setCurrentPreview(imagePreview);
      setView("result");

      const entry: HistoryEntry = {
        id: ++idCounter.current,
        imagePreview,
        stats,
        timestamp: new Date(),
      };
      setHistory((prev) => [entry, ...prev]);
      setActiveHistoryId(entry.id);
    } catch (err: unknown) {
      console.error(err);
      setError("Could not identify the car. Try a clearer, well-lit photo showing the whole car.");
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
      setLoadingStage("");
    }
  };

  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setCurrentStats(null);
    setCurrentPreview(null);
    setError(null);
    setView("home");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectHistory = (entry: HistoryEntry) => {
    setCurrentStats(entry.stats);
    setCurrentPreview(entry.imagePreview);
    setActiveHistoryId(entry.id);
    setView("result");
    setHistoryOpen(false);
  };

  const deleteHistory = (id: number) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
    if (activeHistoryId === id) {
      setCurrentStats(null);
      setCurrentPreview(null);
      setActiveHistoryId(null);
      setView("home");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
  };

  const filteredHistory = history.filter((e) => {
    const q = historySearch.toLowerCase();
    return (
      e.stats.make.toLowerCase().includes(q) ||
      e.stats.model.toLowerCase().includes(q) ||
      e.stats.year.includes(q) ||
      e.stats.trim?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-start pb-16">
      {/* ── Navbar ── */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo / Home button */}
          <button
            onClick={goHome}
            className="flex items-center gap-3 group transition-opacity hover:opacity-80 active:scale-95"
            title="Go to home"
          >
            <CarIDLogo size={36} />
            <div className="leading-none">
              <span className="text-xl font-extrabold text-white tracking-tight">Car</span>
              <span className="text-xl font-extrabold text-blue-400 tracking-tight">ID</span>
              <p className="text-slate-500 text-[10px] font-medium tracking-wide">AI Car Identifier</p>
            </div>
          </button>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            {view === "result" && (
              <button
                onClick={goHome}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                <span className="text-base">＋</span> New scan
              </button>
            )}
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border
                ${historyOpen
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"}`}
            >
              🕓 History
              {history.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {history.length > 99 ? "99+" : history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── History Drawer ── */}
      {historyOpen && (
        <div className="w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md z-30 animate-slideDown">
          <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-3">
            {/* Search + clear */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search by make, model or year…"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >×</button>
                )}
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 border border-red-800/40 transition-all"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* History items */}
            {filteredHistory.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                {historySearch ? "No results match your search." : "No cars identified yet. Upload a photo to get started!"}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredHistory.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    active={activeHistoryId === entry.id}
                    onSelect={selectHistory}
                    onDelete={deleteHistory}
                  />
                ))}
              </div>
            )}

            {/* Summary */}
            {history.length > 0 && (
              <p className="text-slate-600 text-xs text-right">
                {filteredHistory.length} of {history.length} car{history.length !== 1 ? "s" : ""} in history
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="w-full max-w-4xl mx-auto px-4 pt-8 flex flex-col gap-6">
        {view === "home" && (
          <>
            {/* Hero title (only on home) */}
            {!imageFile && (
              <div className="text-center mb-2 animate-fadeIn">
                <h2 className="text-3xl font-extrabold text-white">
                  What car is <span className="text-blue-400">that?</span>
                </h2>
                <p className="text-slate-400 mt-2 text-base max-w-md mx-auto">
                  Upload any photo and our AI instantly identifies the make, model, year — and full performance stats.
                </p>
              </div>
            )}

            {/* Upload Card */}
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
                  ${dragging
                    ? "border-blue-400 bg-blue-500/10 scale-[1.01]"
                    : imagePreview
                    ? "border-slate-700 bg-slate-950/40"
                    : "border-slate-700 hover:border-blue-500/60 hover:bg-slate-800/40 bg-slate-950/30"}`}
                style={{ minHeight: imagePreview ? 0 : 220 }}
              >
                {imagePreview ? (
                  <div className="relative group">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-contain rounded-xl" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="text-white text-sm font-semibold bg-white/20 px-4 py-2 rounded-full backdrop-blur">
                        📂 Click to change
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-14 select-none">
                    <div className="relative">
                      <div className="text-6xl animate-bounce">📸</div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-lg">Drop your car photo here</p>
                      <p className="text-slate-500 text-sm mt-1">JPG, PNG, WEBP · any angle works</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {["Front", "Side", "Rear", "Interior"].map((tip) => (
                        <span key={tip} className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">{tip}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    <span className="text-blue-300 text-sm font-medium animate-pulse">{loadingStage}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-loadBar" />
                  </div>
                </div>
              )}

              {/* Buttons */}
              {!loading && (
                <div className="flex gap-3">
                  <button
                    onClick={identifyCar}
                    disabled={!imageFile}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all duration-200
                      ${!imageFile
                        ? "bg-blue-500/15 text-blue-300/30 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-lg shadow-blue-900/50"}`}
                  >
                    🔍 Identify Car
                  </button>
                  {imageFile && (
                    <button
                      onClick={reset}
                      className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tips row */}
            {!imageFile && (
              <div className="grid grid-cols-3 gap-3 animate-fadeIn">
                {[
                  { icon: "🌅", title: "Good lighting", desc: "Natural daylight gives the best results" },
                  { icon: "🎯", title: "Full car in frame", desc: "Show the whole vehicle if possible" },
                  { icon: "🔍", title: "Any angle", desc: "Front, side, rear — AI handles them all" },
                ].map((tip) => (
                  <div key={tip.title} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 text-center">
                    <div className="text-2xl mb-1.5">{tip.icon}</div>
                    <p className="text-white text-xs font-semibold">{tip.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{tip.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Result View ── */}
        {view === "result" && currentStats && currentPreview && (
          <div className="animate-fadeIn">
            <CarInfographic stats={currentStats} imagePreview={currentPreview} />

            {/* Scan another */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={goHome}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                ＋ Scan Another Car
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-12 text-slate-700 text-xs text-center">
        Powered by{" "}
        <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 underline transition-colors">
          Puter AI
        </a>{" "}
        · Gemini 2.5 Flash · Stats are AI estimates and may vary
      </footer>
    </div>
  );
}
