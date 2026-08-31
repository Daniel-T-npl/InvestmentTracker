import React, { useState, useMemo } from 'react'
import { ArrowUpDown, Search, Filter, HelpCircle } from 'lucide-react'
import { InvestmentTransaction, Security } from '../types'
import { formatCurrency, formatNumber } from '../utils/calculations'

interface TransactionsTableProps {
  transactions: InvestmentTransaction[]
  securities: Record<string, Security>
  selectedTicker: string
  onSelectTicker: (ticker: string) => void
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  securities,
  selectedTicker,
  onSelectTicker,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const sec = tx.security_id ? securities[tx.security_id] : null
      const ticker = sec?.ticker_symbol || sec?.name || ''
      const matchesSearch =
        tx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      if (typeFilter !== 'all' && tx.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false
      }

      if (selectedTicker !== 'ALL' && ticker !== selectedTicker) {
        return false
      }

      return true
    })
  }, [transactions, securities, searchTerm, typeFilter, selectedTicker])

  const uniqueTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => t.type.toLowerCase()))
    return Array.from(types).filter(Boolean)
  }, [transactions])

  if (transactions.length === 0) {
    return null
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-7 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ArrowUpDown className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Investment Transactions
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            History of trades, purchases, sales, and dividends
            {selectedTicker !== 'ALL' && (
              <span className="ml-1 text-emerald-400 font-semibold">
                (Filtered to {selectedTicker})
              </span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          {uniqueTypes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <Filter className="w-3 h-3 text-slate-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t} className="bg-slate-900 text-slate-200">
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition w-40 md:w-52"
            />
          </div>

          {selectedTicker !== 'ALL' && (
            <button
              onClick={() => onSelectTicker('ALL')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
            >
              Show All Tickers
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Asset / Ticker</th>
              <th className="py-3.5 px-4">Description</th>
              <th className="py-3.5 px-4 text-center">Type</th>
              <th className="py-3.5 px-4 text-right">Shares</th>
              <th className="py-3.5 px-4 text-right">Price</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredTransactions.slice(0, 20).map((tx) => {
              const sec = tx.security_id ? securities[tx.security_id] : null
              const ticker = sec?.ticker_symbol || sec?.name || null
              const isBuy = tx.type.toLowerCase() === 'buy' || tx.amount > 0
              const isSellOrDiv =
                tx.type.toLowerCase() === 'sell' ||
                tx.type.toLowerCase() === 'dividend' ||
                tx.amount < 0

              return (
                <tr key={tx.investment_transaction_id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 text-slate-400 font-sans">{tx.date}</td>
                  <td className="py-3 px-4 font-sans">
                    {ticker ? (
                      <button
                        onClick={() => onSelectTicker(ticker)}
                        className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                        title="Filter graph to this ticker"
                      >
                        {ticker}
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-200 font-medium">{tx.name}</td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                        tx.type.toLowerCase() === 'buy'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          : tx.type.toLowerCase() === 'sell'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : tx.type.toLowerCase() === 'dividend'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tx.subtype || tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {tx.quantity ? formatNumber(tx.quantity) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {tx.price ? formatCurrency(tx.price) : '—'}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-bold ${
                      isSellOrDiv
                        ? 'text-emerald-400'
                        : isBuy
                        ? 'text-slate-200'
                        : 'text-slate-300'
                    }`}
                  >
                    {formatCurrency(Math.abs(tx.amount))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-8 text-slate-500 space-y-1">
          <HelpCircle className="w-6 h-6 mx-auto text-slate-600" />
          <p className="text-xs">No transactions match your search or filter.</p>
        </div>
      )}
    </section>
  )
}
