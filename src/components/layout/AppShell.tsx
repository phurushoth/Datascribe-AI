import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Download, FileText, Files, LayoutDashboard, LogOut, Menu, Settings, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/extract', label: 'Extract', icon: Sparkles },
  { to: '/form-fill', label: 'Form Fill', icon: ClipboardCheck },
  { to: '/documents', label: 'Documents', icon: Files },
  { to: '/exports', label: 'Exports', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAuth();
  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white"><FileText size={16} strokeWidth={2.2} /></div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-950">DataScribe</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
        <div className="space-y-0.5">
          {links.slice(0, 3).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon size={16} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </div>
        <p className="px-3 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Library</p>
        <div className="space-y-0.5">
          {links.slice(3, 5).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon size={16} strokeWidth={1.8} />{label}
            </NavLink>
          ))}
        </div>
        <p className="px-3 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Account</p>
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
          <Settings size={16} strokeWidth={1.8} />Settings
        </NavLink>
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
          <LogOut size={16} strokeWidth={1.8} />Sign out
        </button>
      </div>
    </aside>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900">
      <div className="fixed inset-y-0 left-0 hidden lg:block"><Sidebar /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/20" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-60 shadow-xl"><Sidebar onNavigate={() => setMobileOpen(false)} /><button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={19}/></button>
          <div className="hidden text-xs font-medium text-slate-400 lg:block">Workspace</div>
          <button onClick={() => navigate('/settings')} className="ml-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50">
            {user?.avatarUrl ? <img src={user.avatarUrl} className="h-7 w-7 rounded-full" alt="" /> : <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>}
            <span className="hidden max-w-40 truncate text-xs font-medium text-slate-700 sm:inline">{user?.name || user?.email}</span>
          </button>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}
