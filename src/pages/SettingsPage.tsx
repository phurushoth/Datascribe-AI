import { useAuth } from '../context/AuthContext';
import { Check, ExternalLink, HardDrive, LockKeyhole, LogOut, Sparkles, UserRound } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your account and workspace preferences.</p>
      </div>

      <div className="space-y-5">
        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><UserRound size={17} className="text-slate-600"/><h2 className="text-sm font-semibold">Profile</h2></div>
          <div className="flex items-center gap-4 px-5 py-5">
            {user?.avatarUrl ? <img src={user.avatarUrl} className="h-12 w-12 rounded-full" alt=""/> : <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>}
            <div><p className="text-sm font-medium text-slate-900">{user?.name || 'Google account'}</p><p className="mt-1 text-xs text-slate-500">{user?.email}</p></div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><Sparkles size={17} className="text-slate-600"/><h2 className="text-sm font-semibold">AI processing</h2></div>
          <div className="flex items-center justify-between gap-4 px-5 py-5"><div><p className="text-sm font-medium text-slate-800">Gemini</p><p className="mt-1 text-xs text-slate-500">Used for extraction and form understanding.</p></div><span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Check size={14}/> Available</span></div>
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><HardDrive size={17} className="text-slate-600"/><h2 className="text-sm font-semibold">Google Drive</h2></div>
          <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-800">File storage</p><p className="mt-1 text-xs text-slate-500">Use your Google Drive for files created by DataScribe.</p></div><a href="/connect-drive" className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-950">Manage connection <ExternalLink size={13}/></a></div>
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><LockKeyhole size={17} className="text-slate-600"/><h2 className="text-sm font-semibold">Privacy & security</h2></div>
          <div className="space-y-4 px-5 py-5 text-xs leading-5 text-slate-500"><p>Google is used to authenticate your account. Document content may be sent to the configured AI provider when you request AI processing.</p><p>DataScribe keeps account and document metadata in its database and can store generated files in your connected Google Drive.</p></div>
        </section>

        <section className="border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><LogOut size={17} className="text-slate-600"/><h2 className="text-sm font-semibold">Session</h2></div>
          <div className="flex items-center justify-between gap-4 px-5 py-5"><div><p className="text-sm font-medium text-slate-800">Sign out of DataScribe</p><p className="mt-1 text-xs text-slate-500">You can sign in again with Google at any time.</p></div><button onClick={logout} className="border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">Sign out</button></div>
        </section>
      </div>
    </div>
  );
}
