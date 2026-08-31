import React, { useState, useMemo, useRef } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ProcessedHolding, InvestmentTransaction } from '../types'
import {
  generateChartTimeSeries,
  formatCurrency,
  formatPercent,
  formatNumber,
} from '../utils/calculations'

interface PortfolioChartProps {
  holdings: ProcessedHolding[]
  transactions: InvestmentTransaction[]
  selectedTicker: string
  onSelectTicker: (ticker: string) => void
}

type ChartViewType = 'trend' | 'comparison' | 'allocation'

function getDaysSinceYTD(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.round((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)))
}

const TIME_RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: 'YTD', days: getDaysSinceYTD() },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 3650 }, // Full inception from Time 0
]

const ALLOCATION_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
]

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  holdings,
  transactions,
  selectedTicker,
  onSelectTicker,
}) => {
  const [viewType, setChartViewType] = useState<ChartViewType>('trend')
  const [timeRangeDays, setTimeRangeDays] = useState<number>(3650)
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 260
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  // Unique tickers list
  const tickersList = useMemo(() => {
    const unique = Array.from(new Set(holdings.map((h) => h.ticker)))
    return unique.sort()
  }, [holdings])

  // Filtered tickers for pills
  const visibleTickers = useMemo(() => {
    if (!searchFilter.trim()) return tickersList
    const q = searchFilter.toLowerCase()
    return tickersList.filter((t) => {
      const h = holdings.find((item) => item.ticker === t)
      return t.toLowerCase().includes(q) || h?.name.toLowerCase().includes(q)
    })
  }, [tickersList, searchFilter, holdings])

  // Current selected holding (if not ALL)
  const activeHolding = useMemo(() => {
    if (selectedTicker === 'ALL') return null
    return holdings.find((h) => h.ticker === selectedTicker) || null
  }, [selectedTicker, holdings])

  // Aggregate stats for current selection
  const currentSelectionStats = useMemo(() => {
    if (activeHolding) {
      return {
        title: `${activeHolding.ticker} · ${activeHolding.name}`,
        value: activeHolding.currentValue,
        costBasis: activeHolding.costBasis,
        gainLoss: activeHolding.gainLossAmount,
        gainLossPercent: activeHolding.gainLossPercent,
        shares: activeHolding.shares,
        price: activeHolding.price,
        costPerShare: activeHolding.costPerShare,
        isGain: (activeHolding.gainLossAmount || 0) >= 0,
      }
    }

    const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0)
    let totalCost: number | null = 0
    let hasCost = false

    holdings.forEach((h) => {
      if (h.costBasis !== null) {
        totalCost = (totalCost || 0) + h.costBasis
        hasCost = true
      }
    })

    if (!hasCost) totalCost = null

    const gainLoss = totalCost !== null ? totalVal - totalCost : null
    const gainLossPct =
      totalCost !== null && totalCost > 0 ? ((totalVal - totalCost) / totalCost) * 100 : null

    return {
      title: `All Holdings (${holdings.length} Assets)`,
      value: totalVal,
      costBasis: totalCost,
      gainLoss,
      gainLossPercent: gainLossPct,
      shares: null,
      price: null,
      costPerShare: null,
      isGain: (gainLoss || 0) >= 0,
    }
  }, [activeHolding, holdings])

  // Time series chart data
  const timeSeriesData = useMemo(() => {
    return generateChartTimeSeries(holdings, transactions, selectedTicker, timeRangeDays)
  }, [holdings, transactions, selectedTicker, timeRangeDays])

  // Dynamic Y-Axis Domain with padding above and below so peaks & bottoms are prominently visible
  const yDomain = useMemo(() => {
    if (timeSeriesData.length === 0) return ['auto', 'auto']
    const values = timeSeriesData
      .map((d) => d.value)
      .filter((v) => typeof v === 'number' && !isNaN(v))

    if (values.length === 0) return ['auto', 'auto']

    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const delta = maxVal - minVal

    // If delta is 0 or very small, give it 10% padding based on minVal
    const padding = delta === 0 ? Math.max(10, minVal * 0.08) : delta * 0.15

    const computedMin = Math.max(0, minVal - padding)
    const computedMax = maxVal + padding

    return [Math.floor(computedMin), Math.ceil(computedMax)]
  }, [timeSeriesData])

  // Comparison Bar Chart data
  const comparisonData = useMemo(() => {
    if (selectedTicker !== 'ALL') {
      const h = holdings.find((item) => item.ticker === selectedTicker)
      if (!h) return []
      return [
        {
          name: h.ticker,
          fullName: h.name,
          'Current Value': Number(h.currentValue.toFixed(2)),
          'Cost Basis': Number((h.costBasis ?? h.currentValue).toFixed(2)),
          gainLoss: h.gainLossAmount ?? 0,
        },
      ]
    }
    return holdings.map((h) => ({
      name: h.ticker,
      fullName: h.name,
      'Current Value': Number(h.currentValue.toFixed(2)),
      'Cost Basis': Number((h.costBasis ?? h.currentValue).toFixed(2)),
      gainLoss: h.gainLossAmount ?? 0,
    }))
  }, [holdings, selectedTicker])

  // Allocation Pie Chart data
  const allocationData = useMemo(() => {
    return holdings
      .map((h) => ({
        name: h.ticker,
        fullName: h.name,
        value: Number(h.currentValue.toFixed(2)),
        share: h.portfolioShare,
      }))
      .sort((a, b) => b.value - a.value)
  }, [holdings])

  const chartColor = currentSelectionStats.isGain ? '#10b981' : '#f43f5e'
  const gradientId = currentSelectionStats.isGain ? 'emeraldGradient' : 'roseGradient'

  if (holdings.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-7 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 ${
          currentSelectionStats.isGain ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Portfolio & Ticker Value Graph</h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive chart filtered dynamically by asset ticker or viewing aggregate portfolio value
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setChartViewType('trend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewType === 'trend'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Time series value trend"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Trend
            </button>
            <button
              onClick={() => setChartViewType('comparison')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewType === 'comparison'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Value vs Cost Basis Comparison"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Value vs Cost
            </button>
            <button
              onClick={() => setChartViewType('allocation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewType === 'allocation'
                  ? 'bg-slate-800 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Asset Allocation Share"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              Allocation
            </button>
          </div>
        </div>
      </div>

      {/* Ticker Filter Selector Bar with Nicer Horizontal Scroll */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter Chart by Ticker:</span>
          </div>

          <div className="flex items-center gap-2">
            {tickersList.length > 5 && (
              <input
                type="text"
                placeholder="Search ticker..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            )}
            {/* Scroll Navigation Chevrons */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => handleScroll('left')}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Ticker Filter Scrollable Container */}
        <div className="relative group/pills">
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-2.5 pt-1 px-1 custom-scrollbar scroll-smooth"
          >
            {/* ALL Tickers Button */}
            <button
              onClick={() => onSelectTicker('ALL')}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                selectedTicker === 'ALL'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/20 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>All Tickers</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300">
                {holdings.length}
              </span>
            </button>

            {/* Individual Ticker Pills */}
            {visibleTickers.map((ticker) => {
              const h = holdings.find((item) => item.ticker === ticker)
              const isSelected = selectedTicker === ticker
              const isGain = (h?.gainLossAmount ?? 0) >= 0
              const hasGain = h?.gainLossPercent !== null

              return (
                <button
                  key={ticker}
                  onClick={() => onSelectTicker(ticker)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition border cursor-pointer ${
                    isSelected
                      ? isGain
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30 shadow-sm shadow-emerald-500/20'
                        : 'bg-rose-500/25 border-rose-400 text-rose-200 ring-2 ring-rose-500/30 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-bold tracking-wide">{ticker}</span>
                  {h && (
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatCurrency(h.currentValue, false, 0)}
                    </span>
                  )}
                  {hasGain && (
                    <span
                      className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isGain
                          ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                          : 'bg-rose-500/20 text-rose-400 font-semibold'
                      }`}
                    >
                      {isGain ? '+' : ''}
                      {h?.gainLossPercent?.toFixed(1)}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active Selection Hero Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
        {/* Metric 1: Total/Selected Value */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{selectedTicker === 'ALL' ? 'Portfolio Value' : `${selectedTicker} Value`}</span>
            {hoveredPoint && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                {hoveredPoint.displayDate}
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
            {formatCurrency(hoveredPoint ? hoveredPoint.value : currentSelectionStats.value)}
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-full">
            {hoveredPoint ? `Date: ${hoveredPoint.date}` : currentSelectionStats.title}
          </div>
        </div>

        {/* Metric 2: Profit/Loss */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {hoveredPoint ? 'Return at Date' : 'Unrealized Gain / Loss'}
          </div>
          {(() => {
            const dispGain = hoveredPoint ? hoveredPoint.gainLoss : currentSelectionStats.gainLoss
            const dispGainPct = hoveredPoint ? hoveredPoint.gainLossPercent : currentSelectionStats.gainLossPercent
            const isPos = (dispGain ?? 0) >= 0

            return (
              <>
                <div
                  className={`text-xl sm:text-2xl font-extrabold font-mono flex items-center gap-1.5 ${
                    dispGain === null ? 'text-slate-400' : isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {dispGain !== null && (
                    isPos ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-rose-400 shrink-0" />
                    )
                  )}
                  <span>{formatCurrency(dispGain, true)}</span>
                </div>
                <div className="text-[11px] font-mono">
                  {dispGainPct !== null && dispGainPct !== undefined ? (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold ${
                        isPos
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {formatPercent(dispGainPct)} return
                    </span>
                  ) : (
                    <span className="text-slate-500">Cost basis unavailable</span>
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {/* Metric 3: Total Cost Basis / Invested Capital */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {hoveredPoint ? 'Invested at Date' : 'Total Cost Basis'}
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-200 font-mono">
            {formatCurrency(hoveredPoint ? hoveredPoint.costBasis : currentSelectionStats.costBasis)}
          </div>
          <div className="text-[11px] text-slate-500">
            {hoveredPoint && hoveredPoint.displayDate && hoveredPoint.displayDate.includes('Time 0')
              ? 'Initial Deposit'
              : activeHolding && activeHolding.costPerShare !== null
              ? `Avg Buy: ${formatCurrency(activeHolding.costPerShare)}/sh`
              : 'Invested Capital'}
          </div>
        </div>

        {/* Metric 4: Shares / Price or Asset Count */}
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {activeHolding ? 'Holdings Quantity' : 'Portfolio Diversity'}
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-200 font-mono">
            {activeHolding
              ? `${formatNumber(activeHolding.shares)} shares`
              : `${holdings.length} Assets`}
          </div>
          <div className="text-[11px] text-slate-500">
            {activeHolding
              ? `Price: ${formatCurrency(activeHolding.price)}`
              : `${tickersList.length} unique tickers`}
          </div>
        </div>
      </div>

      {/* Time Range Bar for Trend Chart */}
      {viewType === 'trend' && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {timeRangeDays >= 3650
                ? 'Displaying all-time portfolio history starting from Time 0 initial deposit'
                : `Displaying past ${TIME_RANGES.find((r) => r.days === timeRangeDays)?.label || timeRangeDays + ' days'} history`}
            </span>
          </span>
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.label}
                onClick={() => setTimeRangeDays(tr.days)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  timeRangeDays === tr.days
                    ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="h-72 sm:h-80 w-full pt-2">
        {viewType === 'trend' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setHoveredPoint(e.activePayload[0].payload)
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={yDomain}
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`
                  if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
                  return `$${Number(val).toFixed(0)}`
                }}
              />
              <Tooltip content={<CustomTrendTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Total Value"
                stroke={chartColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {viewType === 'comparison' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`
                  if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
                  return `$${Number(val).toFixed(0)}`
                }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Current Value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={45} />
              <Bar dataKey="Cost Basis" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewType === 'allocation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {allocationData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Portfolio Distribution
              </div>
              {allocationData.map((entry, idx) => (
                <div
                  key={entry.name}
                  onClick={() => onSelectTicker(entry.name)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                    selectedTicker === entry.name
                      ? 'bg-slate-800 border border-slate-700'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }}
                    />
                    <div>
                      <span className="text-xs font-bold text-white">{entry.name}</span>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {entry.fullName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-slate-200">
                      {formatCurrency(entry.value)}
                    </span>
                    <p className="text-[10px] text-emerald-400">{entry.share.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Tooltip for Trend Area Chart
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isGain = (data.gainLoss || 0) >= 0
    const isTime0 = (data.displayDate && data.displayDate.includes('Time 0'))
    return (
      <div className="bg-slate-950/95 border border-slate-800 backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-2 text-xs min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
          <span className="font-semibold text-slate-200">{data.displayDate || label}</span>
          <span className="font-mono text-[11px] text-slate-400">{data.date}</span>
        </div>
        {isTime0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded text-center">
            Portfolio Inception &bull; Initial Deposit
          </div>
        )}
        <div className="space-y-1 font-mono">
          <div className="flex justify-between items-baseline">
            <span className="text-slate-400">Total Value:</span>
            <span className="font-bold text-white text-sm">{formatCurrency(data.value)}</span>
          </div>
          {data.costBasis !== undefined && (
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Invested Capital:</span>
              <span className="text-slate-300">{formatCurrency(data.costBasis)}</span>
            </div>
          )}
          {data.gainLoss !== undefined && (
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Return ($):</span>
              <span
                className={`font-bold ${
                  isGain ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(data.gainLoss, true)}
              </span>
            </div>
          )}
          {data.gainLossPercent !== undefined && (
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Return (%):</span>
              <span
                className={`font-bold ${
                  isGain ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatPercent(data.gainLossPercent)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

// Tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const currentVal = data['Current Value']
    const costBasis = data['Cost Basis']
    const diff = currentVal - costBasis
    const diffPct = costBasis > 0 ? (diff / costBasis) * 100 : 0
    const isGain = diff >= 0

    return (
      <div className="bg-slate-950/95 border border-slate-800 backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-2 text-xs min-w-[200px]">
        <div className="border-b border-slate-800 pb-1">
          <span className="font-bold text-white text-sm">{data.name}</span>
          <p className="text-[11px] text-slate-400">{data.fullName}</p>
        </div>
        <div className="space-y-1 font-mono">
          <div className="flex justify-between items-baseline">
            <span className="text-emerald-400 font-medium">Current Value:</span>
            <span className="font-bold text-white">{formatCurrency(currentVal)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-slate-400 font-medium">Cost Basis:</span>
            <span className="text-slate-300">{formatCurrency(costBasis)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-800">
            <span className="text-slate-400">Profit/Loss:</span>
            <span className={`font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(diff, true)} ({formatPercent(diffPct)})
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

// Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-950/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl shadow-2xl space-y-1 text-xs">
        <div className="font-bold text-white">{data.name}</div>
        <div className="text-[11px] text-slate-400">{data.fullName}</div>
        <div className="font-mono pt-1 text-emerald-400 font-bold">
          {formatCurrency(data.value)} ({data.share?.toFixed(1)}%)
        </div>
      </div>
    )
  }
  return null
}
