import { useState } from 'react';
import { CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DriveConnectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const connectDrive = async () => {
    setLoading(true);
    setError('');
    try {
      const statusResponse = await fetch('/api/drive/status', { credentials: 'include' });
      const status = await statusResponse.json();
      if (!status.connected) {
        window.location.href = '/auth/google/drive';
        return;
      }
      const response = await fetch('/api/drive/setup', { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to connect Google Drive');
      setConnected(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm border border-slate-200">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">{connected ? <CheckCircle2 size={28}/> : <Cloud size={28}/>}</div>
    <h1 className="mt-5 text-3xl font-extrabold">{connected ? 'Google Drive connected' : 'Connect Google Drive'}</h1>
    <p className="mt-3 text-slate-500">{connected ? 'Your DataScribe folders are ready in your Drive.' : 'DataScribe can store your documents and exports in your own Google Drive.'}</p>
    {error && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">{error}</div>}
    {!connected ? <button onClick={connectDrive} disabled={loading} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-60">{loading && <Loader2 className="animate-spin" size={18}/>} Connect Google Drive</button> : <Link to="/setup-complete" className="mt-7 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white">Continue to workspace</Link>}
  </div></div>;
}
