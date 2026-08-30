import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Building2,
  Wallet,
  Coins,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  AlertCircle,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { PlaidLinkButton } from './components/PlaidLinkButton'

interface PlaidItemRecord {
  item_id: string
  institution_id: string | null
  institution_name: string | null
  created_at: string
  updated_at: string
}

interface Account {
  account_id: string
  item_id?: string
  institution_name?: string
  name: string
  mask?: string
  type: string
  subtype: string
  balances: {
    current: number | null
    available: number | null
    iso_currency_code: string | null
  }
}

interface Holding {
  account_id: string
  security_id: string
  institution_price: number
  institution_value: number
  cost_basis: number | null
  quantity: number
}

interface Security {
  security_id: string
  name: string | null
  ticker_symbol: string | null
  type: string | null
  close_price: number | null
}

interface InvestmentTransaction {
  investment_transaction_id: string
  account_id: string
  security_id: string | null
  date: string
  name: string
  quantity: number
  amount: number
  price: number
  type: string
  subtype: string
}

export default function App() {
  const [items, setItems] = useState<PlaidItemRecord[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [securities, setSecurities] = useState<Record<string, Security>>({})
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showRawJson, setShowRawJson] = useState<boolean>(false)
  const [rawPayload, setRawPayload] = useState<any>(null)

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

        if (holdingsRes.ok) {
          setAccounts(holdingsData.accounts || [])
          setHoldings(holdingsData.holdings || [])

          // Index securities by security_id
          const secMap: Record<string, Security> = {}
          for (const s of holdingsData.securities || []) {
            secMap[s.security_id] = s
          }
          setSecurities(secMap)
        }

        // 3. Fetch Investment Transactions
        const txRes = await fetch('/api/plaid/investment_transactions/')
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
  const totalBalance = accounts.reduce((acc, a) => acc + (a.balances.current || 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">InvestmentTracker</h1>
            <p className="text-xs text-slate-400">Plaid Integration Testing</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-medium text-slate-200 transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Link Account Banner */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-2xl font-bold text-white tracking-tight">Link Your Accounts</h2>
            <p className="text-sm text-slate-400">
              Connect a bank or investment brokerage using Plaid Link (Sandbox credentials supported: e.g. <span className="text-emerald-400 font-mono text-xs">user_good / pass_good</span>).
            </p>
          </div>
          <PlaidLinkButton onSuccess={fetchData} />
        </section>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Current Balance</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-white">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500">{accounts.length} active account{accounts.length === 1 ? '' : 's'}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Connected Institutions</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-extrabold text-white">{items.length}</p>
            <p className="text-[11px] text-slate-500">Plaid Items linked</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Holdings</span>
              <Coins className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-extrabold text-white">{holdings.length}</p>
            <p className="text-[11px] text-slate-500">Securities / assets</p>
          </div>
        </section>

        {/* Connected Institutions List */}
        {items.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Connected Institutions
            </h3>
            <div className="divide-y divide-slate-800">
              {items.map((item) => (
                <div key={item.item_id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {item.institution_name || 'Financial Institution'}
                    </p>
                    <p className="text-xs font-mono text-slate-500">Item ID: {item.item_id}</p>
                  </div>
                  <button
                    onClick={() => handleUnlink(item.item_id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-xs text-rose-300 transition"
                    title="Unlink institution"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Accounts List */}
        {accounts.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.account_id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-100">{acc.name}</h4>
                      <p className="text-xs text-slate-500 capitalize">
                        {acc.subtype || acc.type} {acc.mask ? `(•••• ${acc.mask})` : ''}
                      </p>
                    </div>
                    {acc.institution_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {acc.institution_name}
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Balance</span>
                    <span className="font-mono font-bold text-white text-base">
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

        {/* Holdings Table */}
        {holdings.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-400" />
              Investment Holdings
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-4">Ticker</th>
                    <th className="py-3 px-4 text-right">Shares</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-right">Cost Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {holdings.map((h, idx) => {
                    const sec = securities[h.security_id]
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-sans font-medium text-slate-200">
                          {sec?.name || 'Unknown Security'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                            {sec?.ticker_symbol || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{h.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          ${(h.institution_price || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          ${(h.institution_value || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {h.cost_basis ? `$${h.cost_basis.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Investment Transactions Table */}
        {transactions.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-amber-400" />
              Recent Investment Transactions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Shares</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {transactions.slice(0, 15).map((tx) => (
                    <tr key={tx.investment_transaction_id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400">{tx.date}</td>
                      <td className="py-3 px-4 font-sans text-slate-200 font-medium">{tx.name}</td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tx.subtype || tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{tx.quantity || '—'}</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {tx.price ? `$${tx.price.toFixed(2)}` : '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          tx.amount < 0 ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        ${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No Linked Accounts Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Click the <span className="text-emerald-400 font-medium">Connect Account with Plaid</span> button above to test linking a sandbox brokerage or bank account.
            </p>
          </div>
        )}

        {/* Raw JSON Debugger Accordion */}
        <section className="border border-slate-800/80 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full bg-slate-900/80 hover:bg-slate-900 px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-400 transition"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-slate-500" />
              Raw API Payload Inspector (Debug)
            </span>
            {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showRawJson && (
            <div className="bg-slate-950 p-4 border-t border-slate-800">
              <pre className="text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96">
                {JSON.stringify(rawPayload, null, 2) || 'No data loaded yet'}
              </pre>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        InvestmentTracker &bull; Plaid Test View
      </footer>
    </div>
  )
}
