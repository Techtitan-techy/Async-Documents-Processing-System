"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDocuments, deleteDocument } from '@/lib/api';
import { Search, Filter, AlertTriangle, CheckCircle, Clock, File as FileIcon, Trash2 } from 'lucide-react';
import { Document } from '@/types';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document and all its results?')) {
      try {
        await deleteDocument(id);
        fetchDocs();
      } catch (e) {
        alert('Failed to delete document');
      }
    }
  };

  const filteredDocs = documents.filter(doc => doc.filename.toLowerCase().includes(searchTerm.toLowerCase()));

  const StatusBadge = ({ status }: { status: string }) => {
    const map: any = {
      pending: <span className="flex items-center text-slate-400 bg-slate-800 px-3 py-1 rounded-full text-xs">Waiting</span>,
      processing: <span className="flex items-center text-blue-400 bg-blue-900/50 px-3 py-1 rounded-full text-xs animate-pulse"><Clock className="w-3 h-3 mr-1" />Processing</span>,
      completed: <span className="flex items-center text-emerald-400 bg-emerald-900/50 px-3 py-1 rounded-full text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</span>,
      failed: <span className="flex items-center text-red-400 bg-red-900/50 px-3 py-1 rounded-full text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Failed (HITL)</span>,
      finalized: <span className="flex items-center text-purple-400 bg-purple-900/50 px-3 py-1 rounded-full text-xs"><CheckCircle className="w-3 h-3 mr-1" />Finalized</span>,
    };
    return map[status] || <span>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Jobs Dashboard</h1>
          <Link href="/upload" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 rounded-full font-medium transition-all">
            + New Document
          </Link>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search filenames..." 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center text-slate-400 hover:text-white transition-colors">
              <Filter className="w-5 h-5 mr-2" /> Filter
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-widest">
                <th className="p-4 pl-6 font-medium">Filename</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 pl-6 font-medium text-slate-200">
                    <span className="flex items-center">
                      <FileIcon className="w-4 h-4 mr-3 text-slate-500" />
                      {doc.filename}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-400">{new Date(doc.created_at).toLocaleString()}</td>
                  <td className="p-4"><StatusBadge status={doc.status} /></td>
                  <td className="p-4">
                    <div className="flex items-center space-x-4">
                      <Link href={`/documents/${doc.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                        View details &rarr;
                      </Link>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
