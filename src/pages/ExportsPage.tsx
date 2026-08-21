import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportRecord {
  id: string;
  documentId?: string | null;
  documentTitle?: string | null;
  fileName: string;
  format: string;
  driveFileId?: string | null;
  createdAt: string;
}

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/exports', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || 'Unable to load exports');
        return response.json();
      })
      .then((data) => setExports(data.exports || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-indigo-600">Library</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Exports</h1>
        <p className="mt-2 text-slate-500">Every generated PDF and Excel file saved from your workspace.</p>
      </div>
      {error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1fr_180px_120px_180px] border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid">
          <span>File</span><span>Document</span><span>Format</span><span>Date</span>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-400">Loading export history...</div> : exports.length ? exports.map(item => (
          <div key={item.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[1fr_180px_120px_180px] sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{item.format.toLowerCase() === 'excel' ? <FileSpreadsheet size={18}/> : <FileText size={18}/>}</div>
              <div><p className="font-semibold text-slate-800">{item.fileName}</p><p className="text-xs text-slate-400">{item.driveFileId ? 'Saved to Google Drive' : 'Generated locally'}</p></div>
            </div>
            <span className="text-sm text-slate-500">{item.documentTitle || 'DataScribe document'}</span>
            <span className="text-xs font-semibold text-slate-600">{item.format}</span>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>{new Date(item.createdAt).toLocaleString()}</span>
              {item.driveFileId && <a href={`https://drive.google.com/open?id=${item.driveFileId}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800"><ExternalLink size={16}/></a>}
            </div>
          </div>
        )) : <div className="p-12 text-center text-sm text-slate-400"><Download className="mx-auto mb-2" size={22}/>No exports yet. Generate a PDF or Excel report to see it here.</div>}
      </div>
    </div>
  );
}
