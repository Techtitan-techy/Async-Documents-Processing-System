"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadDocument } from '@/lib/api';
import { UploadCloud, File as FileIcon, Loader2 } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await uploadDocument(file);
      router.push(`/documents/${res.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-12 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Upload Document</h1>
      
      <div 
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 bg-slate-900'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {file ? (
          <>
            <FileIcon className="w-16 h-16 text-blue-400 mb-4" />
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-slate-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button onClick={() => setFile(null)} className="mt-4 text-red-400 text-sm hover:underline">Remove</button>
          </>
        ) : (
          <>
            <UploadCloud className="w-16 h-16 text-slate-500 mb-4" />
            <p className="text-lg text-slate-300">Drag and drop your file here</p>
            <p className="text-slate-500 text-sm mt-2">or</p>
            <label className="mt-4 cursor-pointer bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-full transition-colors border border-slate-700">
              Browse Files
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </>
        )}
      </div>

      <button 
        onClick={handleUpload}
        disabled={!file || isUploading}
        className={`mt-8 px-10 py-3 rounded-full font-bold flex items-center justify-center transition-all ${file && !isUploading ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(5,150,105,0.4)] text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
      >
        {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
        {isUploading ? 'Uploading...' : 'Process Document'}
      </button>
    </div>
  );
}
