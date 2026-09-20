import Link from 'next/link';
import { 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Cpu, 
  Layers, 
  Lock,
  FileCheck
} from 'lucide-react';

export default function LandingPage() {
  const steps = [
    {
      num: '01',
      title: 'Upload Document',
      desc: 'Securely upload PDFs, Markdown, or text files directly into private storage.',
      icon: FileText,
    },
    {
      num: '02',
      title: 'Extract & Clean',
      desc: 'Page-aware parsing extracts raw text while preserving headers and structure.',
      icon: Layers,
    },
    {
      num: '03',
      title: 'Semantic Chunking',
      desc: 'Text is split into contextual chunks with sliding overlap and page markers.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Vector Embeddings',
      desc: 'Dense mathematical vectors are generated and indexed inside PostgreSQL pgvector.',
      icon: Database,
    },
    {
      num: '05',
      title: 'Semantic Search',
      desc: 'Your questions are embedded to retrieve the top-K most relevant passages in milliseconds.',
      icon: Search,
    },
    {
      num: '06',
      title: 'Grounded Answer',
      desc: 'LLMs synthesize answers strictly from retrieved evidence with verifiable page citations.',
      icon: Sparkles,
    },
  ];

  const features = [
    {
      title: 'Zero Hallucination Guardrails',
      desc: 'Answers are strictly bound to retrieved context. If an answer cannot be found in your documents, the system honestly admits it.',
      icon: ShieldCheck,
    },
    {
      title: 'Precise Source Citations',
      desc: 'Every answer provides clickable source cards with exact document filenames, page numbers, and similarity scores.',
      icon: FileCheck,
    },
    {
      title: 'Complete User Isolation (RLS)',
      desc: 'PostgreSQL Row-Level Security ensures no user can ever query or access another user’s files, chunks, or conversations.',
      icon: Lock,
    },
    {
      title: 'pgvector & High-Performance RAG',
      desc: 'Built on native HNSW vector indexes in PostgreSQL for sub-second retrieval accuracy and scalability.',
      icon: Database,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 border border-indigo-200 dark:border-indigo-800/60 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>End-to-End Production RAG Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Chat with your documents with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500">verifiable truth</span>.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Upload PDFs, handbooks, contracts, and research papers. Ask any question and receive real-time answers grounded exclusively in your documents with exact page citations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Social Proof / Tech Badges */}
          <div className="mt-14 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> PostgreSQL + pgvector</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Google Gemini & OpenAI</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Supabase Row-Level Security</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Page-Aware Text Extraction</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              The Architecture
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              How Retrieval-Augmented Generation Works
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-base sm:text-lg">
              Every query executes a real-time semantic retrieval pipeline from vector search to grounded answer synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-indigo-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-slate-300 dark:text-slate-700">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-28 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Enterprise Grade Security
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Engineered for Accuracy and Privacy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {feat.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 bg-gradient-to-tr from-indigo-900 to-indigo-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Start Conversing with Your Documents Today
          </h2>
          <p className="mt-4 text-indigo-200 text-lg">
            Create an account in seconds. Upload your first PDF and see true RAG in action.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-3.5 rounded-xl bg-white text-indigo-900 font-bold hover:bg-indigo-50 shadow-lg shadow-black/20 transition-all"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Chat With Your Docs. Production-quality AI Document RAG Platform.</p>
      </footer>
    </div>
  );
}
