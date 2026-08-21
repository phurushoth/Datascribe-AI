import { useEffect, useState } from 'react';
import { ArrowRight, AlertTriangle, ClipboardCheck, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { DashboardData } from '../types/app';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || 'Unable to load dashboard');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  const stats = [
    ['Documents', data?.documents ?? 0, FileText],
    ['Forms', data?.forms ?? 0, ClipboardCheck],
    ['Exports', data?.exports ?? 0, Download],
    ['Issues', data?.issues ?? 0, AlertTriangle],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Your document workspace.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/extract" className="group border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50">
          <div className="flex items-start justify-between"><FileText size={19} className="text-slate-700" strokeWidth={1.8}/><ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600"/></div>
          <h2 className="mt-8 text-sm font-semibold text-slate-950">New extraction</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Turn voice or text into structured data.</p>
        </Link>
        <Link to="/form-fill" className="group border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50">
          <div className="flex items-start justify-between"><ClipboardCheck size={19} className="text-slate-700" strokeWidth={1.8}/><ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600"/></div>
          <h2 className="mt-8 text-sm font-semibold text-slate-950">Fill a form</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Upload a form and map answers to its fields.</p>
        </Link>
      </section>

      <section className="grid grid-cols-2 border-y border-slate-200 bg-white sm:grid-cols-4">
        {stats.map(([label, value, Icon], index) => (
          <div key={label} className={`px-4 py-5 sm:px-5 ${index > 0 ? 'border-l border-slate-200' : ''}`}>
            <div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={14} strokeWidth={1.8}/>{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      {error && <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <section className="border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="text-sm font-semibold text-slate-950">Recent documents</h2><p className="mt-0.5 text-xs text-slate-400">From your workspace</p></div>
          <Link to="/documents" className="text-xs font-medium text-slate-600 hover:text-slate-950">View all</Link>
        </div>
        {data?.recentDocuments?.length ? data.recentDocuments.map(doc => (
          <Link key={doc.id} to={`/documents/${doc.id}`} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50">
            <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{doc.title}</p><p className="mt-1 text-xs text-slate-400">{doc.documentType} · {doc.workflow}</p></div>
            <span className="shrink-0 text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
          </Link>
        )) : <div className="px-5 py-12 text-center"><FileText className="mx-auto text-slate-300" size={22} strokeWidth={1.6}/><p className="mt-3 text-sm text-slate-500">No documents yet.</p><Link to="/extract" className="mt-2 inline-block text-xs font-medium text-slate-900 hover:underline">Create your first extraction</Link></div>}
      </section>
    </div>
  );
}
