import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 to-black text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex flex-col space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 text-center">
          Async Document Processor
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl text-center">
          An advanced, multimodally powered document analysis workflow featuring KIE metrics, human-in-the-loop fallback, and real-time SSE progress updates.
        </p>
        <div className="flex space-x-6 mt-8">
          <Link href="/upload" className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition-all font-semibold shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            Upload Document
          </Link>
          <Link href="/dashboard" className="px-8 py-3 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all font-semibold">
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
