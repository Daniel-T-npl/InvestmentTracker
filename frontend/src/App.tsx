import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Server,
  LayoutDashboard,
  Wallet,
  ArrowUpDown,
  LineChart,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

interface BackendStatus {
  message: string
  status: string
  version?: string
  timestamp?: string
}

export default function App() {
  const [backendData, setBackendData] = useState<BackendStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/hello/')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setBackendData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend')
      setBackendData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">InvestmentTracker</h1>
            <p className="text-xs text-slate-400">Barebones Monorepo Setup</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-900 border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                backendData ? 'bg-emerald-400 animate-pulse' : error ? 'bg-rose-500' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">
              Django Backend: {backendData ? 'Connected' : error ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-emerald-950/30 border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Monorepo Initialized
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Hello World, InvestmentTracker!
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your barebones fullstack environment is configured with <span className="text-emerald-400 font-medium">React + Vite + Tailwind CSS</span> on the frontend and <span className="text-emerald-400 font-medium">Python Django REST Framework</span> on the backend.
            </p>
          </div>
        </section>

        {/* Status & Connection Test Card */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Connection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Backend Health & API</h3>
                    <p className="text-xs text-slate-400">Endpoint: GET /api/hello/</p>
                  </div>
                </div>
                <button
                  onClick={fetchStatus}
                  disabled={loading}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                  title="Refresh API status"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  Connecting to Django server...
                </div>
              ) : error ? (
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-4 text-xs text-rose-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Unable to connect to Django backend</p>
                    <p className="text-rose-400/80 mt-1">{error}</p>
                    <p className="text-slate-400 mt-2 text-[11px]">
                      Make sure the Django server is running on port 8000 (<code className="text-slate-300">python manage.py runserver</code> in <code className="text-slate-300">backend/</code>).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 text-xs font-mono space-y-2 text-slate-300">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Status</span>
                    <span className="text-emerald-400 font-semibold">{backendData?.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Message</span>
                    <span className="text-slate-200">{backendData?.message}</span>
                  </div>
                  {backendData?.timestamp && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Server Time</span>
                      <span>{new Date(backendData.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span>Frontend Port: 5173</span>
              <span>Backend Port: 8000</span>
            </div>
          </div>

          {/* Quick Architecture / Starter Modules */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-1">Scaffolded Starter Structure</h3>
              <p className="text-xs text-slate-400 mb-4">Ready for your investment tracking modules</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center space-x-3">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-slate-200 truncate">Dashboard</p>
                    <p className="text-[10px] text-slate-500">Overview & KPIs</p>
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center space-x-3">
                  <Wallet className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-slate-200 truncate">Holdings</p>
                    <p className="text-[10px] text-slate-500">Stocks, ETFs, Crypto</p>
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center space-x-3">
                  <ArrowUpDown className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-slate-200 truncate">Transactions</p>
                    <p className="text-[10px] text-slate-500">Buy, Sell & Cash</p>
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center space-x-3">
                  <LineChart className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-slate-200 truncate">Analytics</p>
                    <p className="text-[10px] text-slate-500">Performance & P&L</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span>Stack: Vite + React 19 + Tailwind</span>
              <span className="text-emerald-400">Ready to build</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        InvestmentTracker &bull; Barebones Monorepo
      </footer>
    </div>
  )
}
