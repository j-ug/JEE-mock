import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Sparkles, 
  FileText, 
  ArrowUpRight, 
  Globe, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageItem {
  id: string;
  fileData: string; // Base64 string without data:image prefix
  fullBase64: string; // Complete data URI for previews
  mimeType: string;
  name: string;
}

// Simple and highly robust custom renderer for markdown-like formats
const parseSolutionToReact = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('###')) {
      return (
        <h4 key={idx} className="text-sm font-black text-slate-800 uppercase tracking-wider mt-4 mb-2 border-l-2 border-indigo-500 pl-2">
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
    }
    if (trimmed.startsWith('##')) {
      return (
        <h3 key={idx} className="text-base font-black text-indigo-900 mt-6 mb-3 flex items-center gap-2">
          <Sparkles className="text-indigo-500 shrink-0" size={16} />
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
    }
    if (trimmed.startsWith('#')) {
      return (
        <h2 key={idx} className="text-lg font-black text-slate-900 border-b border-indigo-100 pb-1.5 mt-8 mb-4">
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
    }

    // Bold lines or lists
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const content = trimmed.replace(/^[\*\-]\s*/, '');
      return (
        <div key={idx} className="flex gap-2.5 items-start my-1.5 text-xs text-slate-600 font-bold leading-relaxed">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
          <span>{parseInlineStyles(content)}</span>
        </div>
      );
    }

    // Highlight notes/tips
    if (trimmed.startsWith('>')) {
      const content = trimmed.replace(/^>\s*/, '');
      return (
        <blockquote key={idx} className="p-4 my-4 bg-indigo-50/40 border-l-4 border-indigo-500 text-xs italic font-bold text-indigo-950 rounded-r-2xl">
          {parseInlineStyles(content)}
        </blockquote>
      );
    }

    // Standard paragraph lines with inline styling support
    if (trimmed === '') {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="text-xs text-slate-600 font-bold leading-relaxed mb-1.5 my-1">
        {parseInlineStyles(trimmed)}
      </p>
    );
  });
};

function parseInlineStyles(text: string) {
  // Regex to look for **bold** text and `code-like` text
  const parts = [];
  let currentWord = '';
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const nextDouble = text.indexOf('**', i + 2);
      if (nextDouble !== -1) {
        parts.push(<span key={i} className="text-slate-950 font-black">{text.substring(i + 2, nextDouble)}</span>);
        i = nextDouble + 2;
        continue;
      }
    }
    
    if (text.startsWith('`', i)) {
      const nextSingle = text.indexOf('`', i + 1);
      if (nextSingle !== -1) {
        parts.push(
          <code key={i} className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 font-mono text-[10px] rounded border border-slate-200">
            {text.substring(i + 1, nextSingle)}
          </code>
        );
        i = nextSingle + 1;
        continue;
      }
    }

    parts.push(text[i]);
    i++;
  }

  return parts;
}

const LOADING_STEPS = [
  "Initializing Google Lens query channels...",
  "Running optical symbol recognition algorithms...",
  "Grounding queries on academic global databases...",
  "Extracting equations and verifying with step formulas...",
  "Assembling final interactive step-by-step masterclass..."
];

export default function SurfWithAI() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [textQuery, setTextQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading step rotator effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle document paste event globally
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const results: Promise<ImageItem>[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            results.push(new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                const match = base64String.match(/^data:([^;]+);base64,(.*)$/);
                resolve({
                  id: Math.random().toString(),
                  fileData: match ? match[2] : '',
                  fullBase64: base64String,
                  mimeType: file.type || 'image/png',
                  name: `Screenshot_Pasted_${new Date().toLocaleTimeString()}.png`
                });
              };
              reader.readAsDataURL(file);
            }));
          }
        }
      }

      if (results.length > 0) {
        Promise.all(results).then((newImages) => {
          setImages((prev) => {
            const combined = [...prev, ...newImages];
            return combined.slice(0, 3); // cap at 3
          });
        });
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const loaders = files.slice(0, 3 - images.length).map((file: File) => {
      return new Promise<ImageItem>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const match = base64String.match(/^data:([^;]+);base64,(.*)$/);
          resolve({
            id: Math.random().toString(),
            fileData: match ? match[2] : '',
            fullBase64: base64String,
            mimeType: file.type || 'image/png',
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(loaders).then((loaded) => {
      setImages((prev) => [...prev, ...loaded].slice(0, 3));
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const triggerSolve = async () => {
    if (!textQuery.trim() && images.length === 0) {
      setErrorStatus("Please write some text or insert at least 1 image first.");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setErrorStatus(null);
    setSolution(null);
    setSources([]);

    try {
      const response = await fetch('/api/ai/solve-doubt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textQuery,
          images: images.map(img => ({
            fileData: img.fileData,
            mimeType: img.mimeType
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to secure solution from AI solver nodes.");
      }

      const result = await response.json();
      setSolution(result.solution);
      setSources(result.sources || []);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copySolution = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearSession = () => {
    setImages([]);
    setTextQuery('');
    setSolution(null);
    setSources([]);
    setErrorStatus(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 pb-24 text-slate-800">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">Conqueror Lens Solvers</h2>
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
            Surf with AI
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-3 max-w-lg leading-relaxed uppercase tracking-wider">
            Paste, drag, or upload up to 3 question snapshots to fetch immediate step-by-step academic solutions powered by real-time Google Lens tools.
          </p>
        </div>

        {solution && (
          <button
            onClick={clearSession}
            className="flex items-center gap-2.5 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all hover:bg-indigo-600 cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            <RefreshCw size={14} /> Clear / Ask Another
          </button>
        )}
      </div>

      {!solution ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main workspace */}
          <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <span className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xs font-black">1</span>
              Define Your Doubt
            </h3>

            {/* Input text for coordinates */}
            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Describe or paste your question text</label>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Paste the plain text of your question here, or add clarifying questions (e.g., 'Show how we derived the derivative in step 3...')"
                className="w-full h-36 p-5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-3xl text-sm font-bold text-slate-800 placeholder-slate-300 outline-none transition-all resize-none"
              />
            </div>

            {/* Image Selector & Paste Box */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attach Question Snapshots (Max 3)</span>
                <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
                  Try pasting Ctrl+V anywhere
                </span>
              </div>

              {images.length < 3 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-indigo-50/20 rounded-[30px] p-10 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm">
                    <Camera size={26} />
                  </div>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    Click to browse your images
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest text-center">
                    Supports Copy-Paste (Ctrl+V) directly on this page
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  You have attached the maximum 3 snapshots of your question layout.
                </div>
              )}

              {/* Thumbnails of uploaded images */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {images.map((img) => (
                    <div 
                      key={img.id} 
                      className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-[4/3] group shadow-inner"
                    >
                      <img 
                        src={img.fullBase64} 
                        alt={img.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end justify-between opacity-90">
                        <span className="text-[9px] font-mono text-white truncate max-w-[80px] font-bold">{img.name}</span>
                        <button
                          onClick={() => removeImage(img.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorStatus && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold uppercase tracking-wide">
                ⚠️ {errorStatus}
              </div>
            )}

            {/* Launch Query button */}
            <button
              disabled={loading}
              onClick={triggerSolve}
              className="w-full py-5 bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-3xl transition-all hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:translate-y-0.5 pointer-events-auto cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Lens Solution...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Surf & Solve Doubt with AI
                </>
              )}
            </button>
          </div>

          {/* Quick instructions panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[38px] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Globe size={18} />
              </div>

              <div>
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 leading-none">Google Lens Core</h4>
                <h3 className="text-xl font-black italic uppercase leading-none tracking-tight">How it works</h3>
              </div>

              <div className="space-y-4 text-[11px] font-semibold text-slate-400 tracking-wide leading-relaxed">
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-slate-800 text-indigo-400 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                  <p>Our solver parses text as well as chemical formulas, geometric outlines, and graphs inside your uploaded snapshots.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-slate-800 text-indigo-400 rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                  <p>Using Google Search grounding, it crawls web assessment vaults to check for exact matched questions, guaranteeing official correct formulas.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-slate-800 text-indigo-400 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                  <p>You receive deep conceptual breakdowns, helping you understand *how* to approach similar problems in future actual examinations.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions tips */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-[30px] p-6 text-indigo-950">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-2">Pro Clipboard Tip</p>
              <p className="text-xs font-bold leading-relaxed">
                Take a snippet using your keyboard (e.g., Win+Shift+S or Cmd+Shift+4) and simply paste (Ctrl+V) directly on this page to load screenshots immediately!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Results Mode */
        <div className="space-y-8">
          {/* Animated Loader step */}
          {loading && (
            <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center py-24 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-6" />
              <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-2 animate-pulse">Running analysis matrix</p>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{LOADING_STEPS[loadingStep]}</h3>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* The Solution Panel */}
            <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-tight">Step-by-Step Solver Tutorial</h3>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copySolution}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Parsed Output */}
              <div className="solution-content text-left space-y-1">
                {parseSolutionToReact(solution)}
              </div>
            </div>

            {/* Sources & Inputs Analyzed */}
            <div className="lg:col-span-4 space-y-6">
              {/* Captured inputs preview */}
              <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm space-y-4 text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapshots Analyzed</h4>
                {images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border border-slate-150 aspect-[4/3]">
                        <img 
                          src={img.fullBase64} 
                          alt="Analyzed snapshot" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl italic text-center">Plain-text query only</p>
                )}
                {textQuery && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Accompanying Prompt Text</p>
                    <p className="text-xs font-bold text-slate-600 line-clamp-3">{textQuery}</p>
                  </div>
                )}
              </div>

              {/* Grounding Sources */}
              <div className="bg-slate-950 rounded-[38px] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Globe size={18} />
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 leading-none">Google Lens Core Reference Hub</h4>
                  <h3 className="text-lg font-black italic uppercase leading-none tracking-tight">Active References Found</h3>
                </div>

                {sources.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {sources.map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-4 p-3 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 transition-colors group cursor-pointer"
                      >
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-black truncate text-slate-200 group-hover:text-indigo-400 transition-colors leading-snug">{src.title || "Academic Verification Resource"}</p>
                          <p className="text-[9px] font-mono text-indigo-500 font-bold truncate mt-1 leading-none">{src.url}</p>
                        </div>
                        <ArrowUpRight size={14} className="text-indigo-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Grounding Index Active</p>
                    <p className="text-xs text-slate-400 italic">No direct webpage dependencies reported. The solution is derived from base academic knowledge bases.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
