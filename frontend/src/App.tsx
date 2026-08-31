import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  Building2,
  Wallet,
  RefreshCw,
  Trash2,
  AlertCircle,
  Code,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  Users,
} from 'lucide-react'
import { PlaidLinkButton } from './components/PlaidLinkButton'
import { PortfolioChart } from './components/PortfolioChart'
import { HoldingsTable } from './components/HoldingsTable'
import { MetricCards } from './components/MetricCards'
import { TransactionsTable } from './components/TransactionsTable'
import {
  PlaidItemRecord,
  Account,
  Holding,
  Security,
  InvestmentTransaction,
} from './types'
import { processHoldings } from './utils/calculations'

export default function App() {
  const [items, setItems] = useState<PlaidItemRecord[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [securities, setSecurities] = useState<Record<string, Security>>({})
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL')
  const [showRawJson, setShowRawJson] = useState<boolean>(false)
  const [rawPayload, setRawPayload] = useState<any>(null)

  // Admin vs Public / Family View Mode
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === 'true' || window.location.hash === '#admin') {
      return true
    }
    return localStorage.getItem('it_admin_mode') === 'true'
  })

  const toggleAdmin = () => {
    const nextState = !isAdmin
    setIsAdmin(nextState)
    localStorage.setItem('it_admin_mode', String(nextState))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch connected items
      const itemsRes = await fetch('/api/plaid/items/')
      const itemsData = await itemsRes.json()
      const connectedItems: PlaidItemRecord[] = itemsData.items || []
      setItems(connectedItems)

      if (connectedItems.length > 0) {
        // 2. Fetch Holdings & Accounts
        const holdingsRes = await fetch('/api/plaid/holdings/')
        const holdingsData = await holdingsRes.json()

        let fetchedHoldings: Holding[] = []
        let secMap: Record<string, Security> = {}

        if (holdingsRes.ok) {
          setAccounts(holdingsData.accounts || [])
          fetchedHoldings = holdingsData.holdings || []
          setHoldings(fetchedHoldings)

          // Index securities by security_id
          for (const s of holdingsData.securities || []) {
            secMap[s.security_id] = s
          }
          setSecurities(secMap)
        }

        // 3. Fetch Investment Transactions (fetch all available history from inception)
        const txRes = await fetch('/api/plaid/investment_transactions/?start_date=2020-01-01')
        const txData = await txRes.json()
        if (txRes.ok) {
          setTransactions(txData.investment_transactions || [])
        }

        setRawPayload({ items: itemsData, holdings: holdingsData, transactions: txData })
      } else {
        setAccounts([])
        setHoldings([])
        setSecurities({})
        setTransactions([])
        setRawPayload({ items: itemsData })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Plaid data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUnlink = async (itemId: string) => {
    if (!confirm('Are you sure you want to unlink this institution?')) return
    try {
      const res = await fetch(`/api/plaid/items/?item_id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSelectedTicker('ALL')
        fetchData()
      } else {
        const d = await res.json()
        alert(d.error_message || 'Failed to unlink item')
      }
    } catch (err: any) {
      alert(err.message || 'Error unlinking item')
    }
  }

  // Calculate total portfolio balance
  const totalAccountBalance = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.balances.current || 0), 0),
    [accounts]
  )

  // Calculate total holdings value
  const totalHoldingsValue = useMemo(
    () => holdings.reduce((acc, h) => acc + (h.institution_value || h.quantity * h.institution_price), 0),
    [holdings]
  )

  const effectiveTotalValue = totalHoldingsValue > 0 ? totalHoldingsValue : totalAccountBalance

  // Process holdings with gains, percentage return, portfolio allocation
  const processedHoldings = useMemo(() => {
    return processHoldings(holdings, securities, effectiveTotalValue)
  }, [holdings, securities, effectiveTotalValue])

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker)
    // Scroll to chart smoothly if user clicked on table
    window.scrollTo({ top: 180, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">InvestmentTracker</h1>
              {isAdmin ? (
                <button
                  onClick={toggleAdmin}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold cursor-pointer hover:bg-emerald-500/20 transition"
                  title="Click to switch to Family View"
                >
                  <Unlock className="w-3 h-3" />
                  Admin Mode
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
                  <Users className="w-3 h-3" />
                  Family View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Live Portfolio & Securities Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-medium text-slate-200 transition disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh Portfolio Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        {/* Plaid Link Connect Banner (Admin Only) */}
        {isAdmin && (
          <section className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Connect & Track Investment Portfolios</span>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Admin Active
                </span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Link brokerage and bank accounts via Plaid Link to analyze holdings, asset allocation, realized/unrealized profit & loss, and historical performance curves.
                <span className="block mt-1 text-xs text-slate-500">
                  Sandbox Demo Login: <code className="text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">user_good / pass_good</code>
                </span>
              </p>
            </div>
            <div className="shrink-0">
              <PlaidLinkButton onSuccess={fetchData} />
            </div>
          </section>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-sm shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchData}
              className="text-xs font-semibold underline hover:text-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Summary Metric Cards */}
        <MetricCards
          holdings={processedHoldings}
          accounts={accounts}
          items={items}
          onSelectTicker={handleSelectTicker}
        />

        {/* Interactive Portfolio & Ticker Graph */}
        {processedHoldings.length > 0 && (
          <PortfolioChart
            holdings={processedHoldings}
            transactions={transactions}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
          />
        )}

        {/* Holdings Table with Profit/Loss & % Return */}
        {processedHoldings.length > 0 && (
          <HoldingsTable
            holdings={processedHoldings}
            selectedTicker={selectedTicker}
            onSelectTicker={handleSelectTicker}
          />
        )}

        {/* Connected Institutions and Accounts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connected Institutions */}
          {items.length > 0 && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Connected Institutions ({items.length})
              </h3>
              <div className="divide-y divide-slate-800/70">
                {items.map((item) => (
                  <div
                    key={item.item_id}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {item.institution_name || 'Financial Institution'}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected & Synchronized
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleUnlink(item.item_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-xs text-rose-300 transition cursor-pointer"
                        title="Unlink institution"
                      >
                        <Trash2 className="w-3 h-3" />
                        Unlink
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Accounts Breakdown */}
          {accounts.length > 0 && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Linked Accounts ({accounts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.account_id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-xs text-slate-200">{acc.name}</h4>
                        <p className="text-[11px] text-slate-500 capitalize">
                          {acc.subtype || acc.type} {acc.mask ? `(•••• ${acc.mask})` : ''}
                        </p>
                      </div>
                      {acc.institution_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          {acc.institution_name}
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-800/60 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-400">Balance</span>
                      <span className="font-mono font-bold text-white text-sm">
                        ${(acc.balances.current ?? 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Investment Transactions Table */}
        <TransactionsTable
          transactions={transactions}
          securities={securities}
          selectedTicker={selectedTicker}
          onSelectTicker={handleSelectTicker}
        />

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4 bg-slate-900/30">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">No Linked Accounts Yet</h3>
              <p className="text-sm text-slate-400">
                {isAdmin
                  ? 'Click the Connect Account with Plaid button above to test linking an account.'
                  : 'Portfolio data will appear here once connected.'}
              </p>
            </div>
          </div>
        )}

        {/* Raw JSON Debugger Accordion (Admin Only) */}
        {isAdmin && (
          <section className="border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full bg-slate-900 hover:bg-slate-850 px-6 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-400 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-500" />
                Raw API Payload Inspector (Debug / Admin)
              </span>
              {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawJson && (
              <div className="bg-slate-950 p-4 border-t border-slate-800">
                <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96 leading-relaxed">
                  {JSON.stringify(rawPayload, null, 2) || 'No data loaded yet'}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 mt-auto gap-3">
        <div>InvestmentTracker &bull; Real-time Plaid Integration & Analytics</div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAdmin}
            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition cursor-pointer"
            title={isAdmin ? 'Switch to Family View' : 'Switch to Admin Mode'}
          >
            {isAdmin ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3" />}
            <span>{isAdmin ? 'Admin Mode Active' : 'Family View'}</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
