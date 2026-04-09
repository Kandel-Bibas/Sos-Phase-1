import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ArrowUp,
  Terminal,
  Command,
  Maximize2,
  Copy,
  Check,
  Disc,
  Scale,
  Cpu,
  Filter,
} from 'lucide-react';
import type { Citation, Message, ResearchFilters, ResponseMetadata } from './types';
import { useChat } from './hooks/useChat';
import { useFilters } from './hooks/useFilters';
import { usePDF } from './hooks/usePDF';
import { FilterPanel } from './components/FilterPanel';
import { ComparisonTable } from './components/research/ComparisonTable';
import { FeeTable } from './components/research/FeeTable';
import { TermFrequencyChart } from './components/research/TermFrequencyChart';
import { AuthorityChain } from './components/research/AuthorityChain';

// --- Configuration ---
const RESEARCH_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:8000/api/research';
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || 'http://localhost:8000/api/chat';
const DOCS_ENDPOINT_CONFIG = import.meta.env.VITE_DOCS_ENDPOINT || '';
const DOCS_API_KEY = import.meta.env.VITE_DOCS_API_KEY || '';

type AppMode = 'chat' | 'research';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// --- Visual Components ---

const GridBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
  </div>
);

const IntentBadge = ({ intent }: { intent?: string }) => {
  if (!intent || intent === 'general_research') return null;
  const labels: Record<string, string> = {
    fee_comparison: 'Fee Analysis',
    term_frequency: 'Term Frequency',
    licensing_reciprocity: 'Reciprocity',
    fee_benchmarking: 'Fee Benchmarking',
    amendment_history: 'Amendment History',
    statutory_authority: 'Authority Check',
    license_category_compare: 'License Comparison',
    testing_requirements: 'Testing Reqs',
  };
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-900">
      {labels[intent] || intent}
    </span>
  );
};

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
          {citation.state && (
            <span className="text-[10px] font-mono text-zinc-500">{citation.state}</span>
          )}
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

const MetadataDisplay = ({ metadata }: { metadata?: ResponseMetadata }) => {
  if (!metadata) return null;

  return (
    <>
      {metadata.comparison_table && metadata.comparison_table.length > 0 && (
        <ComparisonTable rows={metadata.comparison_table} statesCompared={metadata.states_compared} />
      )}
      {metadata.fee_table && metadata.fee_table.length > 0 && (
        <FeeTable fees={metadata.fee_table} statesAnalyzed={metadata.states_analyzed} />
      )}
      {metadata.frequency_data && metadata.frequency_data.length > 0 && (
        <TermFrequencyChart data={metadata.frequency_data} totalCount={metadata.total_count || 0} />
      )}
      {metadata.authority_chain && metadata.authority_chain.length > 0 && (
        <AuthorityChain chain={metadata.authority_chain} hasAuthority={metadata.has_authority} />
      )}
    </>
  );
};

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
    <div className="w-full max-w-4xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            {isUser ? 'Query' : 'Response'}
          </span>
          <span className="w-px h-3 bg-zinc-700"></span>
          <span className="text-[10px] font-mono text-zinc-500">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {!isUser && <IntentBadge intent={message.intent} />}
        </div>

        <div className={`relative group w-full ${isUser ? 'pl-12' : 'pr-12'}`}>
          {isUser ? (
            <div className="text-right">
              <h3 className="text-xl md:text-2xl font-light leading-snug tracking-tight text-white whitespace-pre-wrap">
                {message.content}
              </h3>
            </div>
          ) : (
            <div className="relative pl-6 border-l border-zinc-800">
              <div className="absolute left-[-1px] top-0 h-6 w-px bg-white/50"></div>

              <div className="markdown-content prose prose-invert prose-p:text-zinc-300 prose-p:leading-7 prose-headings:font-light prose-headings:tracking-tight prose-headings:text-white prose-code:text-zinc-300 prose-code:bg-zinc-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-table:text-sm max-w-none overflow-x-auto">
                {message.isError ? (
                  <div className="p-4 border border-red-900/30 bg-red-900/10 text-red-200 text-sm font-mono">
                    ERROR: {message.content}
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                )}
              </div>

              {/* Phase 2: Structured metadata display */}
              <MetadataDisplay metadata={message.metadata} />

              <div className="flex items-center gap-4 mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'COPIED' : 'COPY REPORT'}
                </button>
              </div>

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
  const [mode, setMode] = useState<AppMode>('research');
  const apiEndpoint = mode === 'research' ? RESEARCH_ENDPOINT : CHAT_ENDPOINT;

  const { messages, isLoading, sendMessage, clearChat } = useChat(apiEndpoint);
  const { filters, showFilters, hasActiveFilters, updateFilters, toggleFilters } = useFilters();
  const pdf = usePDF(DOCS_ENDPOINT_CONFIG, DOCS_API_KEY);

  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleModeSwitch = (newMode: AppMode) => {
    if (newMode !== mode) {
      clearChat();
      setMode(newMode);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const content = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(content, mode === 'research' ? { filters } : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm('RESET SESSION?')) {
      clearChat();
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden selection:bg-white selection:text-black">
      <GridBackground />

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-zinc-900 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="text-xs font-mono text-zinc-500 hidden md:block">SOS AI Innovation Hub</span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={() => handleModeSwitch('chat')}
            className={`px-3 py-1.5 text-xs font-mono tracking-wider rounded transition-all ${
              mode === 'chat'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            CHAT
          </button>
          <button
            onClick={() => handleModeSwitch('research')}
            className={`px-3 py-1.5 text-xs font-mono tracking-wider rounded transition-all ${
              mode === 'research'
                ? 'bg-white text-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            RESEARCH
          </button>
        </div>

        <div className="flex items-center gap-4">
          {mode === 'research' && (
            <button
              onClick={toggleFilters}
              className={`flex items-center gap-1.5 text-xs font-mono transition-colors tracking-wider ${
                hasActiveFilters ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Filter size={12} />
              FILTERS
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              )}
            </button>
          )}
          <button
            onClick={handleClearChat}
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors tracking-wider"
          >
            RESET_CONTEXT
          </button>
          <a href="#" className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Disc size={18} className={isLoading ? "animate-spin" : ""} />
          </a>
        </div>
      </nav>

      {/* Filter Panel (Research mode only) */}
      {showFilters && mode === 'research' && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-800">
          <div className="max-w-3xl mx-auto">
            <FilterPanel filters={filters} onChange={updateFilters} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full flex flex-col pt-14">
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          <div className="min-h-full flex flex-col justify-end pb-32 pt-12 px-4 md:px-8">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center space-y-8 max-w-2xl">
                  {mode === 'chat' ? (
                    <>
                      <h1 className="text-5xl md:text-7xl font-light tracking-tighter text-white">
                        SoS <br/>
                        <span className="text-zinc-500">Legal Assistant</span>
                      </h1>
                      <p className="text-sm font-mono text-zinc-500 max-w-lg mx-auto">
                        Ask questions about Mississippi Secretary of State regulations.
                        Get answers with statutory citations.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-5xl md:text-7xl font-light tracking-tighter text-white">
                        Regulatory <br/>
                        <span className="text-zinc-500">Research Assistant</span>
                      </h1>
                      <p className="text-sm font-mono text-zinc-500 max-w-lg mx-auto">
                        Compare regulations, fees, and licensing requirements across
                        7 states and 3 agency types. Use filters to narrow your search.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBlock
                    key={msg.id}
                    message={msg}
                    onOpenCitationPage={pdf.openPage}
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
                placeholder={mode === 'chat'
                  ? "Ask about Mississippi SoS regulations..."
                  : "Compare regulations across states, analyze fees, check reciprocity..."
                }
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
              {hasActiveFilters && (
                <span className="text-[10px] font-mono text-zinc-500">
                  Filtering: {filters.states?.join(', ') || 'All states'}
                  {filters.agency_type ? ` / ${filters.agency_type}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* PDF Viewer Overlay */}
      {pdf.docName && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={pdf.close}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-zinc-400">PDF</span>
                <span className="text-sm font-mono text-zinc-200 truncate">{pdf.docName}</span>
                <span className="text-xs font-mono text-zinc-500">p.{pdf.page}</span>
              </div>
              <button
                type="button"
                onClick={pdf.close}
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
                  pdf.setWidth(nextWidth);
                }
              }}
            >
              {pdf.isLoading && (
                <span className="text-xs font-mono text-zinc-500">Loading PDF...</span>
              )}
              {pdf.error && (
                <span className="text-xs font-mono text-red-400">{pdf.error}</span>
              )}
              {pdf.url && !pdf.error && (
                <Document file={pdf.url} loading="">
                  <Page pageNumber={pdf.page} width={pdf.width} />
                </Document>
              )}
            </div>
          </div>
        </div>
      )}

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
