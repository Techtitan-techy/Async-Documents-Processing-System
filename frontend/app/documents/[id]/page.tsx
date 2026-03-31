"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument, updateResult, finalizeDocument, retryDocument, deleteDocument } from '@/lib/api';
import { Document, ProcessingResult } from '@/types';
import { CheckCircle, AlertCircle, PlayCircle, Download, Check, Save, Trash2 } from 'lucide-react';

export default function DocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const [doc, setDoc] = useState<Document | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [progressMsg, setProgressMsg] = useState<{ step: string, status: string }>({ step: 'Initializing', status: 'pending' });
  const [editableResult, setEditableResult] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    fetchData();
    
    // Setup SSE connection
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/${id}/progress`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgressMsg({ step: data.step, status: data.status });
      if (data.status === 'completed' || data.status === 'failed') {
        fetchData();
        eventSource.close();
      }
    };
    return () => eventSource.close();
  }, [id]);

  const fetchData = async () => {
    try {
      const data = await getDocument(id);
      setDoc(data.document);
      setResult(data.result);
      if (data.result) {
        setEditableResult({
          title: data.result.title || '',
          category: data.result.category || '',
          summary: data.result.summary || '',
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateResult(id, editableResult);
      await fetchData();
      alert('Changes saved!');
    } catch (e) {
      alert('Failed to save changes');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(id);
        router.push('/dashboard');
      } catch (e) {
        alert('Failed to delete document');
      }
    }
  };

  const PipelineSteps = ['job_started', 'ocr_completed', 'field_extracted', 'schema_validated', 'confidence_scored', 'consistency_checked', 'metrics_computed', 'result_stored', 'job_completed'];

  if (!doc) return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-12 text-slate-400">Loading document...</div>;

  const isProcessing = ['pending', 'processing'].includes(doc.status);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 grid grid-cols-12 gap-8">
      {/* LEFT COLUMN: Editor and Meta */}
      <div className="col-span-8 flex flex-col space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{doc.filename}</h1>
              <p className="text-slate-400 text-sm">Document ID: {doc.id}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => finalizeDocument(id).then(() => {router.push('/dashboard')})}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium flex items-center shadow-[0_0_15px_rgba(5,150,105,0.4)]"
              >
                <Check className="w-4 h-4 mr-2" /> Finalize
              </button>
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/${id}/export`}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium flex items-center border border-slate-700"
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </a>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 rounded-lg text-slate-400 font-medium flex items-center border border-slate-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
            </div>
          </div>

          {result && (
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Extracted Title</label>
                <div className="flex relative items-center group">
                  <input 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={editableResult.title}
                    onChange={(e) => setEditableResult({...editableResult, title: e.target.value})}
                  />
                  {result.confidence_scores?.title && (
                    <span className={`absolute right-4 text-xs px-2 py-1 rounded-full ${Number(result.confidence_scores.title) > 0.85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {(Number(result.confidence_scores.title) * 100).toFixed(1)}% Conf
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Category</label>
                <div className="flex relative items-center">
                  <input 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    value={editableResult.category}
                    onChange={(e) => setEditableResult({...editableResult, category: e.target.value})}
                  />
                  {result.confidence_scores?.category && (
                    <span className={`absolute right-4 text-xs px-2 py-1 rounded-full ${Number(result.confidence_scores.category) > 0.85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {(Number(result.confidence_scores.category) * 100).toFixed(1)}% Conf
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 block">Summary</label>
                <textarea 
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  value={editableResult.summary}
                  onChange={(e) => setEditableResult({...editableResult, summary: e.target.value})}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleUpdate}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium shadow-lg transition-colors flex items-center text-sm"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Corrections
                </button>
              </div>
            </div>
          )}

          {!result && !isProcessing && (
            <div className="py-12 text-center border-t border-slate-800 mt-6">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No processing result available.</p>
              <button onClick={() => retryDocument(id)} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm rounded-lg border border-slate-700">
                Retry Processing
              </button>
            </div>
          )}
        </div>

        {/* Validation Errors Box */}
        {result?.validation_errors && result.validation_errors.length > 0 && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 pb-2">
            <h3 className="text-red-400 font-semibold uppercase text-xs tracking-wider mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Human In The Loop (HITL) Triggers
            </h3>
            <ul className="list-disc text-sm text-red-200/80 mb-4 px-4 space-y-2">
              {result.validation_errors.map((err: any, idx: number) => (
                <li key={idx}>{typeof err === 'string' ? err : `${err.loc.join('.')}: ${err.msg}`}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Pipeline and Metrics */}
      <div className="col-span-4 flex flex-col space-y-6">
        
        {/* Progress Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            {isProcessing && <div className="h-full bg-blue-500 w-1/3 animate-pulse"></div>}
          </div>
          <h3 className="text-slate-100 font-semibold mb-6 flex items-center">
             Pipeline Status 
             <span className={`ml-auto text-xs px-2 py-1 rounded-full ${isProcessing ? 'bg-blue-950 text-blue-400' : 'bg-emerald-950 text-emerald-400'}`}>
                {isProcessing ? 'Running' : 'Halted'}
             </span>
          </h3>
          
          <div className="space-y-4">
            {PipelineSteps.map((step, idx) => {
              const isActive = progressMsg.step === step;
              const isPast = PipelineSteps.indexOf(progressMsg.step) > idx && !isProcessing;
              
              return (
                <div key={step} className={`flex items-center text-sm ${isActive ? 'text-blue-400 font-semibold' : isPast ? 'text-emerald-500' : 'text-slate-600'}`}>
                   {isActive ? <PlayCircle className="w-5 h-5 mr-3 animate-pulse" /> : isPast ? <CheckCircle className="w-5 h-5 mr-3" /> : <div className="w-5 h-5 rounded-full border border-slate-700 mr-3"></div>}
                   <span className="capitalize">{step.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KIEval Metrics Panel */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-slate-100 font-semibold mb-6">KIE Metrics Dashboard</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Baseline F1</span>
                <span className="text-2xl font-mono text-white">{result.entity_f1?.toFixed(3) || '---'}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Group F1</span>
                <span className="text-2xl font-mono text-white">{result.group_f1?.toFixed(3) || '---'}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-1">KIEval F1</span>
                <span className="text-2xl font-mono min-h-8 text-blue-400">{result.kieval_entity_f1?.toFixed(3) || '---'}</span>
              </div>
              <div className="bg-slate-950 border border-emerald-900/50 p-4 rounded-lg text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/0 to-emerald-900/20"></div>
                <span className="text-xs text-emerald-500 uppercase tracking-widest block mb-1 relative z-10">Aligned F1</span>
                <span className="text-2xl font-mono text-emerald-400 font-bold relative z-10">{result.kieval_aligned?.toFixed(3) || '---'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              * The <strong className="text-slate-300">Aligned F1</strong> metric simulates recalculation based on explicit human edits from the correction_events log.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
