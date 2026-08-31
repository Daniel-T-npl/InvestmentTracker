import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Coins,
  LineChart as LineChartIcon,
  HelpCircle,
} from 'lucide-react'
import { ProcessedHolding } from '../types'
import { formatCurrency, formatPercent, formatNumber } from '../utils/calculations'

interface HoldingsTableProps {
  holdings: ProcessedHolding[]
  selectedTicker: string
  onSelectTicker: (ticker: string) => void
}

type SortField =
  | 'ticker'
  | 'name'
  | 'shares'
  | 'price'
  | 'currentValue'
  | 'costBasis'
  | 'gainLossAmount'
  | 'gainLossPercent'

type FilterTab = 'all' | 'gainers' | 'losers'

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  selectedTicker,
  onSelectTicker,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [sortField, setSortField] = useState<SortField>('currentValue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Filter holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      // Search filter
      const matchesSearch =
        h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.name.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      // Tab filter
      if (filterTab === 'gainers') {
        return (h.gainLossAmount ?? 0) > 0
      }
      if (filterTab === 'losers') {
        return (h.gainLossAmount ?? 0) < 0
      }
      return true
    })
  }, [holdings, searchTerm, filterTab])

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (aVal === null || aVal === undefined) aVal = -Infinity
      if (bVal === null || bVal === undefined) bVal = -Infinity

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const numA = Number(aVal)
      const numB = Number(bVal)
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
  }, [filteredHoldings, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Aggregate stats for currently filtered holdings
  const filteredTotalValue = filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0)
  const filteredTotalCost = filteredHoldings.reduce(
    (sum, h) => sum + (h.costBasis ?? 0),
    0
  )
  const hasCostData = filteredHoldings.some((h) => h.costBasis !== null)
  const filteredTotalGain = hasCostData ? filteredTotalValue - filteredTotalCost : null
  const filteredTotalGainPct =
    hasCostData && filteredTotalCost > 0
      ? ((filteredTotalValue - filteredTotalCost) / filteredTotalCost) * 100
      : null

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-7 space-y-5 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Coins className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">Investment Holdings</h3>
          </div>
          <p className="text-xs text-slate-400">
            Real-time positions with profit/loss, percentage return, and ticker graph inspector
          </p>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({holdings.length})
            </button>
            <button
              onClick={() => setFilterTab('gainers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                filterTab === 'gainers'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Gainers
            </button>
            <button
              onClick={() => setFilterTab('losers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                filterTab === 'losers'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-rose-400" />
              Losers
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition w-44 md:w-56"
            />
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider select-none font-semibold">
              <th
                onClick={() => handleSort('ticker')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Ticker / Asset</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('shares')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Shares</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('price')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('costBasis')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Cost Basis</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('currentValue')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Value</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('gainLossAmount')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Profit / Loss ($)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('gainLossPercent')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Return (%)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Graph Filter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {sortedHoldings.map((h) => {
              const isSelectedInChart = selectedTicker === h.ticker
              const isGain = (h.gainLossAmount ?? 0) >= 0
              const isLoss = (h.gainLossAmount ?? 0) < 0
              const hasGainLoss = h.gainLossAmount !== null

              return (
                <tr
                  key={h.securityId}
                  className={`transition duration-150 group ${
                    isSelectedInChart
                      ? 'bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/40'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Ticker & Name */}
                  <td className="py-3.5 px-4 font-sans">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onSelectTicker(h.ticker)}
                        className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border transition ${
                          isSelectedInChart
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-slate-800 border-slate-700 text-slate-200 group-hover:border-slate-600'
                        }`}
                        title="Click to filter graph by this ticker"
                      >
                        {h.ticker}
                      </button>
                      <div>
                        <p className="font-semibold text-slate-200 text-xs">{h.name}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{h.type}</p>
                      </div>
                    </div>
                  </td>

                  {/* Quantity / Shares */}
                  <td className="py-3.5 px-4 text-right text-slate-300 font-medium">
                    {formatNumber(h.shares)}
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right text-slate-200 font-medium">
                    {formatCurrency(h.price)}
                  </td>

                  {/* Cost Basis & Avg Price */}
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {h.costBasis !== null ? (
                      <div>
                        <p className="text-slate-300 font-medium">{formatCurrency(h.costBasis)}</p>
                        {h.costPerShare !== null && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            @{formatCurrency(h.costPerShare)}/sh
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Total Value */}
                  <td className="py-3.5 px-4 text-right font-bold text-white text-sm">
                    {formatCurrency(h.currentValue)}
                    <span className="block text-[10px] font-normal text-slate-500 font-sans">
                      {h.portfolioShare.toFixed(1)}% of total
                    </span>
                  </td>

                  {/* Profit / Loss ($) - GREEN / RED INDICATOR */}
                  <td className="py-3.5 px-4 text-right font-bold">
                    {hasGainLoss ? (
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono ${
                          isGain
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isGain ? (
                          <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        )}
                        <span>{formatCurrency(h.gainLossAmount, true)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Percentage Change (%) - GREEN / RED RETURN */}
                  <td className="py-3.5 px-4 text-right font-bold">
                    {h.gainLossPercent !== null ? (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            isGain
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isLoss
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {formatPercent(h.gainLossPercent)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Graph Filter Action Button */}
                  <td className="py-3.5 px-4 text-center font-sans">
                    <button
                      onClick={() => onSelectTicker(isSelectedInChart ? 'ALL' : h.ticker)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        isSelectedInChart
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                      title={
                        isSelectedInChart
                          ? 'Active in Graph (Click to view All)'
                          : 'Filter graph to this ticker'
                      }
                    >
                      {isSelectedInChart ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <LineChartIcon className="w-3 h-3 text-slate-400" />
                          <span>View</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Table Footer with Totals */}
          <tfoot>
            <tr className="bg-slate-950/90 border-t-2 border-slate-800 font-mono text-xs text-slate-300">
              <td className="py-3 px-4 font-sans font-bold text-slate-200">
                Total ({sortedHoldings.length} Positions)
              </td>
              <td colSpan={3} className="py-3 px-4 text-right text-slate-400 font-sans">
                {hasCostData && (
                  <span>
                    Cost Basis: <strong className="text-slate-200">{formatCurrency(filteredTotalCost)}</strong>
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                {formatCurrency(filteredTotalValue)}
              </td>
              <td className="py-3 px-4 text-right font-bold">
                {filteredTotalGain !== null ? (
                  <span
                    className={
                      filteredTotalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {formatCurrency(filteredTotalGain, true)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-3 px-4 text-right font-bold">
                {filteredTotalGainPct !== null ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-mono ${
                      filteredTotalGainPct >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {formatPercent(filteredTotalGainPct)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {selectedTicker !== 'ALL' && (
                  <button
                    onClick={() => onSelectTicker('ALL')}
                    className="text-[11px] text-emerald-400 underline hover:text-emerald-300"
                  >
                    Reset All
                  </button>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {sortedHoldings.length === 0 && (
        <div className="text-center py-10 text-slate-500 space-y-2">
          <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm">No holdings match your search or filter.</p>
        </div>
      )}
    </section>
  )
}
