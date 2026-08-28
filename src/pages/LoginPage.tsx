import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Mic,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { useState } from 'react';

function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.7-.06-1.37-.18-2H12v3.79h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.17Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.85A5.85 5.85 0 0 1 6.23 12c0-.64.11-1.27.31-1.85V7.63H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.37l3.24-2.52Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.12c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.12 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.7 5.38l3.24 2.52C7.31 7.84 9.46 6.12 12 6.12Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      await loginWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <FileText size={17} strokeWidth={2.2} />
            </div>

            <div>
              <div className="text-[16px] font-bold tracking-tight text-slate-950">
                DataScribe <span className="text-indigo-600">AI</span>
              </div>

              <div className="text-[8px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Document Intelligence
              </div>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="hidden text-sm font-medium text-slate-600 transition hover:text-indigo-600 sm:block disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Get started →'}
          </button>

        </div>
      </header>

      {/* Main */}
      <main>
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">

          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">

            {/* Product introduction */}
            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Document workspace
              </p>

              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-[56px]">
                Turn documents into
                <br />
                <span className="text-indigo-600">
                  structured data.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
                Extract information from documents, organize it,
                complete forms and export the results.
              </p>

              {/* Product preview */}
              <div className="mt-9 max-w-xl rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_-25px_rgba(15,23,42,0.35)]">

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <FileText size={16} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        Maintenance Report
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Extracted document
                      </p>
                    </div>
                  </div>

                  <CheckCircle2
                    size={16}
                    className="text-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 p-5">

                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      Equipment
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      AC-204
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      Location
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      Server Room
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Needs review
                    </p>
                  </div>

                </div>
              </div>

              {/* Small capabilities */}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">

                <div className="flex items-center gap-2">
                  <Mic size={14} className="text-indigo-600" />
                  <span className="text-xs text-slate-500">
                    Voice & text
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Upload size={14} className="text-indigo-600" />
                  <span className="text-xs text-slate-500">
                    Document extraction
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-indigo-600" />
                  <span className="text-xs text-slate-500">
                    PDF / Excel
                  </span>
                </div>

              </div>

            </div>

            {/* Authentication */}
            <div className="lg:pl-8">

              <div className="max-w-sm">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Get started
                </p>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Access your workspace
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sign in with Google to continue.
                </p>

                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="group mt-7 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleMark />

                  <span>
                    {isLoading
                      ? 'Connecting...'
                      : 'Continue with Google'}
                  </span>

                  {!isLoading && (
                    <ArrowRight
                      size={17}
                      className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600"
                    />
                  )}
                </button>

                <div className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-400">
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <span>
                    Secure authentication. Your documents remain
                    connected to your workspace.
                  </span>
                </div>

              </div>

            </div>

          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">

          <p className="text-[10px] text-slate-400">
            DataScribe AI
          </p>

          <p className="text-[10px] text-slate-400">
            Document Intelligence
          </p>

        </div>
      </footer>

    </div>
  );
}