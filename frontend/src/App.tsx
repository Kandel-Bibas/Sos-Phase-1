import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ArrowUp,
  Plus,
  Terminal,
  Command,
  ArrowRight,
  Maximize2,
  Copy,
  Check,
  Disc,
  Link,
  Cpu,
  Scale
} from 'lucide-react';


// --- Configuration ---
const API_ENDPOINT_CONFIG = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:8000/api/chat';
const DOCS_ENDPOINT_CONFIG = import.meta.env.VITE_DOCS_ENDPOINT || '';
const DOCS_API_KEY = import.meta.env.VITE_DOCS_API_KEY || '';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// --- Types ---
interface Citation {
  document: string;
  pages: number[];
  relevance: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  citations?: Citation[];
}

interface ApiResponse {
  answer?: string;
  response?: string;
  message?: string;
  citations?: Citation[];
  error?: string;
}

// --- API Service ---
class ChatService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async sendMessage(message: string): Promise<{ answer: string; citations?: Citation[] }> {
    const sanitizedMessage = message.trim();
    if (!sanitizedMessage) throw new Error('Message cannot be empty');

    try {
      if (!this.apiEndpoint) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          answer: "## Regulation Analysis Complete\n\nI have cross-referenced the submitted regulation against **Mississippi State Statute 25-43**. \n\n### Findings:\n- **Section 4.2** appears to conflict with the definition of 'agency' in the 2024 Amendment.\n- **Formatting** adheres to the Administrative Procedures Act requirements.\n\nTo connect to the live legal database:\n1. Open `App.tsx`\n2. Configure `API_ENDPOINT_CONFIG` with your backend URL.",
          citations: [
            { document: "MS_Code_Title_25.pdf", pages: [42, 43], relevance: 0.99 },
            { document: "Proposed_Reg_Draft_v4.docx", pages: [12], relevance: 0.95 }
          ]
        };
      }

      const response = await axios.post<ApiResponse>(
        this.apiEndpoint,
        { query: sanitizedMessage },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );

      const data = response.data;
      const answerText = data.answer || data.response || data.message;
      if (!answerText) throw new Error('Invalid response format');

      return {
        answer: answerText,
        citations: data.citations || [],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
      }
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  }

  isConfigured(): boolean { return true; }
}

// --- Visual Components ---

// 1. Grid Background
const GridBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
    {/* Major Grid */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    {/* Subtle Noise */}
    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
  </div>
);

// 2. Modern Citation Card
const CitationCard = ({
  citation,
  onOpenPage
}: {
  citation: Citation;
  onOpenPage?: (document: string, page: number) => void;
}) => (
  <div className="group flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all duration-300 rounded-lg">
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
        <Scale size={14} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-zinc-300 truncate font-mono tracking-tight group-hover:text-white transition-colors">
          {citation.document}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
            Relevance {Math.round(citation.relevance * 100)}%
          </span>
        </div>
      </div>
    </div>
    <div className="flex gap-1 pl-2">
      {citation.pages.slice(0, 2).map((page, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpenPage?.(citation.document, page)}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors cursor-pointer pointer-events-auto"
        >
          p.{page}
        </button>
      ))}
    </div>
  </div>
);

// 3. Brutalist Message Block
const MessageBlock = ({
  message,
  onOpenCitationPage
}: {
  message: Message;
  onOpenCitationPage?: (document: string, page: number) => void;
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Header / Meta */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            {isUser ? 'Query' : 'Response'}
          </span>
          <span className="w-px h-3 bg-zinc-700"></span>
          <span className="text-[10px] font-mono text-zinc-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Content Container */}
        <div className={`relative group w-full ${isUser ? 'pl-12' : 'pr-12'}`}>
          {isUser ? (
            <div className="text-right">
               <h3 className="text-xl md:text-2xl font-light leading-snug tracking-tight text-white whitespace-pre-wrap">
                 {message.content}
               </h3>
            </div>
          ) : (
            <div className="relative pl-6 border-l border-zinc-800">
              {/* Decorative accent line */}
              <div className="absolute left-[-1px] top-0 h-6 w-px bg-white/50"></div>

              <div className="prose prose-invert prose-p:text-zinc-300 prose-p:leading-7 prose-headings:font-light prose-headings:tracking-tight prose-headings:text-white prose-code:text-zinc-300 prose-code:bg-zinc-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 max-w-none">
                {message.isError ? (
                  <div className="p-4 border border-red-900/30 bg-red-900/10 text-red-200 text-sm font-mono">
                    ERROR: {message.content}
                  </div>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>

              {/* Action Strip */}
              <div className="flex items-center gap-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'COPIED' : 'COPY REPORT'}
                </button>
              </div>

              {/* Citations Grid */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-8 pt-6 border-t border-zinc-900">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">
                    Legal Statutes & References
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {message.citations.map((cit, idx) => (
                      <CitationCard key={idx} citation={cit} onOpenPage={onOpenCitationPage} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Loading Component (Technical)
const ProcessingState = () => (
  <div className="w-full max-w-4xl mx-auto mb-12 animate-in fade-in duration-500">
    <div className="flex items-start gap-4">
      <div className="relative pl-6 border-l border-zinc-800">
        <div className="absolute left-[-1px] top-0 h-full w-px bg-gradient-to-b from-zinc-600 to-transparent animate-pulse"></div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <Cpu size={14} className="text-zinc-400 animate-spin-slow" />
             <span className="text-xs font-mono text-zinc-300">Analyzing documents...</span>
          </div>
          <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-zinc-900 rounded animate-pulse delay-75"></div>
        </div>
      </div>
    </div>
  </div>
);

// --- Main App ---
function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfDocName, setPdfDocName] = useState<string>('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(900);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatService = useRef<ChatService | null>(null);

  useEffect(() => {
    chatService.current = new ChatService(API_ENDPOINT_CONFIG);
    const saved = localStorage.getItem('chat_history_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat_history_v4', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const response = await chatService.current!.sendMessage(userMsg.content);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Unknown error',
        isError: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('RESET SESSION?')) {
      setMessages([]);
      localStorage.removeItem('chat_history_v4');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenCitationPage = async (document: string, page: number) => {
    setIsPdfLoading(true);
    setPdfError(null);
    setPdfUrl(null);
    setPdfDocName(document);
    setPdfPage(page);

    if (!DOCS_ENDPOINT_CONFIG) {
      setPdfError('Docs endpoint not configured.');
      setIsPdfLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        DOCS_ENDPOINT_CONFIG,
        { filename: document },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(DOCS_API_KEY ? { 'x-api-key': DOCS_API_KEY } : {})
          },
          timeout: 30000
        }
      );

      const data = response.data;
      const url = typeof data?.body === 'string'
        ? JSON.parse(data.body).url
        : data?.url;
      if (!url) throw new Error('No URL returned from docs API');
      setPdfUrl(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to fetch PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden selection:bg-white selection:text-black">
      <GridBackground />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-zinc-900 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearChat}
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors tracking-wider"
          >
            RESET_CONTEXT
          </button>
          <a href="#" className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Disc size={18} className={isLoading ? "animate-spin" : ""} />
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full flex flex-col pt-14">

        {/* Scrollable Chat Stream */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          <div className="min-h-full flex flex-col justify-end pb-32 pt-12 px-4 md:px-8">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center space-y-8 max-w-2xl">
                   <h1 className="text-5xl md:text-7xl font-light tracking-tighter text-white">
                    SOS AI Innovation Hub <br/>
                    <span className="text-zinc-500">Project Phase 1</span>
                   </h1>
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBlock
                    key={msg.id}
                    message={msg}
                    onOpenCitationPage={handleOpenCitationPage}
                  />
                ))}
                {isLoading && <ProcessingState />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Fixed Command Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-12 pb-6 px-4">
          <div className={`max-w-3xl mx-auto transition-all duration-300 ${isFocused ? 'scale-[1.01]' : 'scale-100'}`}>
            <div className={`relative flex items-end gap-2 p-1.5 bg-[#0a0a0a] border rounded-lg transition-colors shadow-2xl ${isFocused ? 'border-zinc-600 shadow-zinc-900/20' : 'border-zinc-800'}`}>

              <div className="flex-shrink-0 p-3 text-zinc-500">
                <Terminal size={20} />
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter regulation ID or paste text for verification..."
                className="flex-1 max-h-[200px] py-3 bg-transparent border-none focus:ring-0 focus:outline-none text-base font-light text-white placeholder-zinc-500 resize-none scrollbar-hide leading-relaxed"
                rows={1}
                disabled={isLoading}
              />

              <div className="p-1">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 px-2">
               <div className="flex gap-4">
                 <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                   <Command size={10} /> RETURN to send
                 </span>
                 <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                   <Maximize2 size={10} /> SHIFT + RETURN for new line
                 </span>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* PDF Viewer Overlay */}
      {pdfDocName && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setPdfDocName('');
            setPdfUrl(null);
            setPdfError(null);
          }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-zinc-400">PDF</span>
                <span className="text-sm font-mono text-zinc-200 truncate">{pdfDocName}</span>
                <span className="text-xs font-mono text-zinc-500">p.{pdfPage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPdfDocName('');
                  setPdfUrl(null);
                  setPdfError(null);
                }}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                CLOSE
              </button>
            </div>

            <div
              className="flex-1 overflow-auto flex items-center justify-center bg-black"
              ref={(node) => {
                if (node) {
                  const nextWidth = Math.min(node.clientWidth - 32, 1100);
                  if (nextWidth > 0 && nextWidth !== pdfWidth) setPdfWidth(nextWidth);
                }
              }}
            >
              {isPdfLoading && (
                <span className="text-xs font-mono text-zinc-500">Loading PDF...</span>
              )}
              {pdfError && (
                <span className="text-xs font-mono text-red-400">{pdfError}</span>
              )}
              {pdfUrl && !pdfError && (
                <Document file={pdfUrl} loading="">
                  <Page pageNumber={pdfPage} width={pdfWidth} />
                </Document>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Utilities */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
