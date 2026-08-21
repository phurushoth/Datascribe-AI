import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  Mic,
  Sparkles,
  Upload,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSignIn = (event: FormEvent) => {
    event.preventDefault();
    loginWithGoogle();
  };

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1500px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] lg:min-h-[calc(100vh-48px)] lg:grid-cols-[1.08fr_.92fr]">
        {/* Product side */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
          <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-10 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-200">
                <Sparkles size={21} strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[22px] font-extrabold tracking-tight text-slate-950">
                  DataScribe <span className="text-indigo-600">AI</span>
                </div>
                <div className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">
                  Document intelligence
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-[590px] sm:mt-16">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                AI-powered document workspace
              </div>

              <h1 className="max-w-[620px] text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl xl:text-[56px]">
                Turn information
                <br />
                into <span className="text-indigo-600">intelligence.</span>
              </h1>

              <p className="mt-6 max-w-[520px] text-base leading-7 text-slate-600 sm:text-lg">
                Transform voice, text and documents into structured, actionable information with AI.
              </p>
            </div>

            {/* Product preview */}
            <div className="relative mt-10 max-w-[650px] sm:mt-12">
              <div className="absolute -inset-4 rounded-[30px] bg-indigo-200/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[24px] border border-white/90 bg-white/80 p-4 shadow-[0_24px_50px_rgba(79,70,229,0.12)] backdrop-blur sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">AI extracted report</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Equipment Maintenance Report</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    Needs attention
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
                  <div className="space-y-2">
                    {[
                      ['Equipment', 'AC-204'],
                      ['Technician', 'Arun Kumar'],
                      ['Location', 'Server Room · Block A'],
                      ['Status', 'Needs Maintenance'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                        <span className="text-[11px] font-medium text-slate-500">{label}</span>
                        <span className={`text-[11px] font-semibold ${label === 'Status' ? 'text-amber-700' : 'text-slate-800'}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
                    <div className="flex h-full min-h-[150px] flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                          <Sparkles size={17} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">AI Summary</p>
                          <p className="text-[10px] text-slate-500">Structured in seconds</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 rounded-full bg-white/80" />
                        <div className="h-2 w-4/5 rounded-full bg-white/80" />
                        <div className="h-2 w-3/5 rounded-full bg-white/80" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-indigo-700">
                        <CheckCircle2 size={13} />
                        Ready to review
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700">
                    <Mic size={12} /> Voice
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] font-semibold text-sky-700">
                    <FileText size={12} /> Structured data
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700">
                    <FileSpreadsheet size={12} /> PDF / Excel
                  </span>
                </div>
              </div>
            </div>

            {/* Value props */}
            <div className="mt-auto hidden grid-cols-3 gap-5 pt-10 lg:grid">
              {[
                { icon: Mic, title: 'Voice-first', text: 'Speak naturally and let AI structure the details.' },
                { icon: Upload, title: 'Smart forms', text: 'Upload a form and map information semantically.' },
                { icon: ShieldCheck, title: 'Your workspace', text: 'Built for secure, organized document workflows.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-l border-indigo-100 pl-4">
                  <Icon size={17} className="text-indigo-600" />
                  <p className="mt-2 text-xs font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Login side */}
        <section className="relative flex items-center justify-center bg-white px-6 py-10 sm:px-12 lg:px-14 xl:px-20">
          <div className="absolute right-7 top-7 hidden items-center gap-2 text-xs font-semibold text-slate-400 sm:flex">
            <LockKeyhole size={14} />
            Secure workspace access
          </div>

          <div className="w-full max-w-[440px]">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 lg:hidden">
                <Sparkles size={22} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-[38px]">
                Welcome back <span aria-hidden="true">👋</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Sign in once and get straight back to your workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="group flex w-full items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-sm font-bold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-extrabold shadow-sm ring-1 ring-slate-100">
                <span className="bg-gradient-to-r from-blue-500 via-red-500 to-amber-500 bg-clip-text text-transparent">G</span>
              </span>
              <span className="flex-1 text-center pr-12 text-[15px]">Continue with Google</span>
              <ArrowRight size={18} className="mr-3 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </button>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">or use email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Password</span>
                  <button type="button" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                Sign in
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Your documents, your workspace</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    DataScribe is designed to keep your workspace organized and connect with your own storage.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
              By continuing, you agree to our{' '}
              <button type="button" className="font-semibold text-slate-600 hover:text-indigo-600">Terms of Service</button>
              {' '}and{' '}
              <button type="button" className="font-semibold text-slate-600 hover:text-indigo-600">Privacy Policy</button>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
