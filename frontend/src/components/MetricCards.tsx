import React from 'react'
import {
  Wallet,
  Building2,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { ProcessedHolding, Account, PlaidItemRecord } from '../types'
import { calculatePortfolioSummary, formatCurrency, formatPercent } from '../utils/calculations'

interface MetricCardsProps {
  holdings: ProcessedHolding[]
  accounts: Account[]
  items: PlaidItemRecord[]
  onSelectTicker: (ticker: string) => void
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  holdings,
  accounts,
  items,
  onSelectTicker,
}) => {
  const summary = calculatePortfolioSummary(holdings, accounts)
  const isOverallGain = (summary.totalGainLoss || 0) >= 0

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Portfolio Value */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Total Portfolio Value</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(summary.totalValue)}
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs">
            {summary.totalGainLossPercent !== null && (
              <span
                className={`inline-flex items-center gap-0.5 font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                  isOverallGain
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {isOverallGain ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {formatPercent(summary.totalGainLossPercent)}
              </span>
            )}
            <span className="text-slate-500">{accounts.length} active account{accounts.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      {/* 2. Total Unrealized Profit / Loss */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Unrealized Profit / Loss</span>
          <div
            className={`p-2 rounded-xl border ${
              isOverallGain
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            {isOverallGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div className="space-y-0.5">
          <p
            className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
              summary.totalGainLoss === null
                ? 'text-slate-400'
                : isOverallGain
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {formatCurrency(summary.totalGainLoss, true)}
          </p>
          <div className="pt-1 text-xs text-slate-500">
            {summary.totalCostBasis !== null ? (
              <span>
                Cost Basis: <strong className="text-slate-300 font-mono">{formatCurrency(summary.totalCostBasis)}</strong>
              </span>
            ) : (
              <span>Basis data calculating...</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Top Performer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Top Asset Performer</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        {summary.topGainer ? (
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <button
                onClick={() => onSelectTicker(summary.topGainer!.ticker)}
                className="text-lg font-bold text-white hover:text-emerald-400 transition font-mono flex items-center gap-1.5"
              >
                <span>{summary.topGainer.ticker}</span>
                <span className="text-xs font-normal text-slate-400 truncate max-w-[80px]">
                  {summary.topGainer.name}
                </span>
              </button>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                {formatPercent(summary.topGainer.gainLossPercent)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Value: {formatCurrency(summary.topGainer.currentValue)} (
              {formatCurrency(summary.topGainer.gainLossAmount, true)})
            </p>
          </div>
        ) : (
          <div className="pt-2 text-xs text-slate-500">
            {holdings.length > 0 ? `${holdings.length} securities tracked` : 'No holdings loaded'}
          </div>
        )}
      </div>

      {/* 4. Connected Institutions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Connected Institutions</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {items.length}
          </p>
          <div className="pt-1 text-xs text-slate-500">
            <span>{holdings.length} unique assets in portfolio</span>
          </div>
        </div>
      </div>
    </section>
  )
}
