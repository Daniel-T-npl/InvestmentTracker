import {
  Holding,
  Security,
  ProcessedHolding,
  Account,
  InvestmentTransaction,
  ChartDataPoint,
} from '../types'

export function processHoldings(
  holdings: Holding[],
  securities: Record<string, Security>,
  totalPortfolioValue: number
): ProcessedHolding[] {
  return holdings.map((h) => {
    const sec = securities[h.security_id]
    const ticker = sec?.ticker_symbol || sec?.name || 'N/A'
    const name = sec?.name || 'Unknown Asset'
    const type = sec?.type || 'equity'
    const shares = h.quantity || 0
    const price = h.institution_price || 0
    const currentValue =
      h.institution_value !== undefined && h.institution_value !== null
        ? h.institution_value
        : shares * price
    const costBasis =
      h.cost_basis !== null && h.cost_basis !== undefined ? h.cost_basis : null
    const costPerShare =
      costBasis !== null && shares > 0 ? costBasis / shares : null

    let gainLossAmount: number | null = null
    let gainLossPercent: number | null = null
    let status: ProcessedHolding['status'] = 'unknown'

    if (costBasis !== null) {
      gainLossAmount = currentValue - costBasis
      if (costBasis > 0) {
        gainLossPercent = ((currentValue - costBasis) / costBasis) * 100
      } else if (currentValue > 0) {
        gainLossPercent = 100
      } else {
        gainLossPercent = 0
      }

      if (gainLossAmount > 0.005) {
        status = 'gain'
      } else if (gainLossAmount < -0.005) {
        status = 'loss'
      } else {
        status = 'neutral'
      }
    }

    const portfolioShare =
      totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0

    return {
      holding: h,
      security: sec,
      securityId: h.security_id,
      ticker,
      name,
      type,
      shares,
      price,
      currentValue,
      costBasis,
      costPerShare,
      gainLossAmount,
      gainLossPercent,
      portfolioShare,
      status,
    }
  })
}

export function calculatePortfolioSummary(
  holdings: ProcessedHolding[],
  accounts: Account[]
) {
  const totalAccountBalance = accounts.reduce(
    (acc, a) => acc + (a.balances.current || 0),
    0
  )
  const totalHoldingsValue = holdings.reduce(
    (acc, h) => acc + h.currentValue,
    0
  )
  const displayTotalValue =
    totalHoldingsValue > 0 ? totalHoldingsValue : totalAccountBalance

  let totalCostBasis = 0
  let totalGainLoss = 0
  let hasCostBasis = false

  holdings.forEach((h) => {
    if (h.costBasis !== null) {
      totalCostBasis += h.costBasis
      totalGainLoss += h.gainLossAmount || 0
      hasCostBasis = true
    }
  })

  const totalGainLossPercent =
    hasCostBasis && totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : null

  // Sort gainers & losers
  const holdingsWithGain = holdings.filter((h) => h.gainLossPercent !== null)
  const sortedHoldings = [...holdingsWithGain].sort(
    (a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0)
  )

  const topGainer =
    sortedHoldings.length > 0 && (sortedHoldings[0].gainLossPercent || 0) > 0
      ? sortedHoldings[0]
      : null
  const topLoser =
    sortedHoldings.length > 0 &&
    (sortedHoldings[sortedHoldings.length - 1].gainLossPercent || 0) < 0
      ? sortedHoldings[sortedHoldings.length - 1]
      : null

  return {
    totalValue: displayTotalValue,
    totalCostBasis: hasCostBasis ? totalCostBasis : null,
    totalGainLoss: hasCostBasis ? totalGainLoss : null,
    totalGainLossPercent,
    topGainer,
    topLoser,
    holdingsCount: holdings.length,
    accountsCount: accounts.length,
  }
}

/**
 * Accurately reconstructs historical time series portfolio/ticker valuation
 * by combining current holdings snapshot with historical investment transactions
 * and real traded prices.
 */
/**
 * Accurately reconstructs historical time series portfolio and ticker valuation
 * with Time 0 starting at initial deposit/investment, accounting for all buys, sells,
 * dividends, cash, stock splits, and price movements like Robinhood's portfolio graph.
 */
export function generateChartTimeSeries(
  holdings: ProcessedHolding[],
  transactions: InvestmentTransaction[],
  selectedTicker: string,
  timeRangeDays: number = 3650
): ChartDataPoint[] {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  if (holdings.length === 0 && transactions.length === 0) {
    return []
  }

  const isAll = selectedTicker === 'ALL'
  const targetHoldings = isAll
    ? holdings
    : holdings.filter((h) => h.ticker === selectedTicker)

  // Map security_id to holding
  const holdingBySecId: Record<string, ProcessedHolding> = {}
  holdings.forEach((h) => {
    holdingBySecId[h.securityId] = h
  })

  // Map ticker to security_id and vice versa
  const secIdToTicker: Record<string, string> = {}
  holdings.forEach((h) => {
    secIdToTicker[h.securityId] = h.ticker
  })

  // Filter transactions
  let relevantTx = [...transactions]
  if (!isAll) {
    const targetSecIds = new Set(targetHoldings.map((h) => h.securityId))
    relevantTx = transactions.filter((t) => t.security_id && targetSecIds.has(t.security_id))
  }

  // Sort transactions chronologically
  relevantTx.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // If no transactions exist, synthesize current state points
  if (relevantTx.length === 0) {
    const totalVal = targetHoldings.reduce((sum, h) => sum + h.currentValue, 0)
    const totalBasis = targetHoldings.reduce((sum, h) => sum + (h.costBasis ?? h.currentValue), 0)
    const gainLoss = totalVal - totalBasis
    const gainLossPct = totalBasis > 0 ? (gainLoss / totalBasis) * 100 : 0

    return [
      {
        date: todayStr,
        displayDate: 'Today',
        value: Number(totalVal.toFixed(2)),
        costBasis: Number(totalBasis.toFixed(2)),
        gainLoss: Number(gainLoss.toFixed(2)),
        gainLossPercent: Number(gainLossPct.toFixed(2)),
        ticker: selectedTicker,
      },
    ]
  }

  // Find Time 0 (the date of the first deposit/transaction)
  const time0DateStr = relevantTx[0].date || todayStr

  // Determine chart start date based on timeRangeDays
  let startDateStr = time0DateStr
  if (timeRangeDays < 3650) {
    const rangeStartDate = new Date(today)
    rangeStartDate.setDate(rangeStartDate.getDate() - timeRangeDays)
    const rStartStr = rangeStartDate.toISOString().split('T')[0]
    // If range start is after Time 0, use range start; otherwise start from Time 0
    if (rStartStr > time0DateStr) {
      startDateStr = rStartStr
    }
  }

  // Collect all unique security IDs
  const allSecIds = new Set<string>()
  holdings.forEach((h) => allSecIds.add(h.securityId))
  transactions.forEach((t) => {
    if (t.security_id) allSecIds.add(t.security_id)
  })

  // 1. Build split-normalized price timeline for each security
  const priceTimelineBySec: Record<string, { date: string; price: number }[]> = {}

  allSecIds.forEach((sid) => {
    const h = holdingBySecId[sid]
    const currPrice = h ? h.price : null

    const rawPts: { date: string; price: number }[] = []
    transactions.forEach((t) => {
      if (t.security_id === sid && t.price && t.price > 0 && t.date) {
        rawPts.push({ date: t.date, price: Number(t.price) })
      }
    })

    if (currPrice && currPrice > 0) {
      rawPts.push({ date: todayStr, price: currPrice })
    }

    if (rawPts.length === 0) return

    rawPts.sort((a, b) => a.date.localeCompare(b.date))

    // Work backwards from today's price to detect splits and normalize historical prices
    const normPts = [rawPts[rawPts.length - 1]]
    let cumSplit = 1.0

    for (let i = rawPts.length - 2; i >= 0; i--) {
      const pCurr = rawPts[i].price
      const pNext = rawPts[i + 1].price
      const ratio = pCurr / pNext

      // Detect sudden split jump (e.g. 5:1, 10:1 or reverse split)
      if (ratio > 2.5 || ratio < 0.4) {
        cumSplit *= ratio
      }

      normPts.unshift({
        date: rawPts[i].date,
        price: pCurr / cumSplit,
      })
    }

    priceTimelineBySec[sid] = normPts
  })

  const getNormPrice = (sid: string, dateStr: string): number => {
    const pts = priceTimelineBySec[sid]
    if (!pts || pts.length === 0) return 1.0
    if (dateStr <= pts[0].date) return pts[0].price
    if (dateStr >= pts[pts.length - 1].date) return pts[pts.length - 1].price

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i]
      const p2 = pts[i + 1]
      if (dateStr >= p1.date && dateStr <= p2.date) {
        const t1 = new Date(p1.date + 'T12:00:00').getTime()
        const t2 = new Date(p2.date + 'T12:00:00').getTime()
        const tc = new Date(dateStr + 'T12:00:00').getTime()
        if (t2 === t1) return p1.price
        return p1.price + (p2.price - p1.price) * ((tc - t1) / (t2 - t1))
      }
    }
    return pts[pts.length - 1].price
  }

  // Define lot interface
  interface SimulatedLot {
    sid: string
    buyDate: string
    cost: number
    buyPrice: number
    shares: number
  }

  // 2. Pre-simulation pass to calculate calibration factors for terminal holding values
  const preLots: SimulatedLot[] = []
  relevantTx.forEach((t) => {
    const sid = t.security_id || ''
    const tType = (t.type || '').toLowerCase()
    const tSubtype = (t.subtype || '').toLowerCase()
    const amt = Math.abs(t.amount || 0)
    const tDate = t.date || todayStr

    if (tType === 'buy' || tSubtype === 'buy' || tSubtype === 'dividend reinvestment') {
      const pBuy = getNormPrice(sid, tDate)
      preLots.push({
        sid,
        buyDate: tDate,
        cost: amt,
        buyPrice: pBuy,
        shares: pBuy > 0 ? amt / pBuy : 0,
      })
    } else if (tType === 'sell' || tSubtype === 'sell') {
      const secLots = preLots.filter((l) => l.sid === sid)
      const currSecVal = secLots.reduce(
        (sum, l) => sum + l.shares * getNormPrice(sid, tDate),
        0
      )
      const fraction = currSecVal > 0 ? Math.min(1.0, amt / currSecVal) : 1.0
      secLots.forEach((l) => {
        l.cost *= 1.0 - fraction
        l.shares *= 1.0 - fraction
      })
    }
  })

  const calibValFactors: Record<string, number> = {}
  const calibBasisFactors: Record<string, number> = {}

  targetHoldings.forEach((h) => {
    const sid = h.securityId
    const secLots = preLots.filter((l) => l.sid === sid)
    const simVal = secLots.reduce(
      (sum, l) => sum + l.shares * getNormPrice(sid, todayStr),
      0
    )
    const simBasis = secLots.reduce((sum, l) => sum + l.cost, 0)
    const actVal = h.currentValue
    const actBasis = h.costBasis ?? h.currentValue

    calibValFactors[sid] = simVal > 0 ? actVal / simVal : 1.0
    calibBasisFactors[sid] = simBasis > 0 ? actBasis / simBasis : 1.0
  })

  // 3. Collect sample dates
  const dateSet = new Set<string>()
  dateSet.add(startDateStr)
  dateSet.add(todayStr)

  relevantTx.forEach((t) => {
    if (t.date && t.date >= startDateStr && t.date <= todayStr) {
      dateSet.add(t.date)
    }
  })

  // Sample intermediate dates for smooth curve (every 1-3 days)
  const startDt = new Date(startDateStr + 'T12:00:00')
  const endDt = new Date(todayStr + 'T12:00:00')
  const totalDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)))
  const step = Math.max(1, Math.floor(totalDays / 45))

  const iterDt = new Date(startDt)
  while (iterDt <= endDt) {
    dateSet.add(iterDt.toISOString().split('T')[0])
    iterDt.setDate(iterDt.getDate() + step)
  }

  const sampleDates = Array.from(dateSet).sort()

  // 4. Forward simulation along sample dates
  const activeLots: SimulatedLot[] = []
  let cashBalance = 0.0
  let txIdx = 0
  const totalTxCount = relevantTx.length
  const points: ChartDataPoint[] = []

  sampleDates.forEach((dStr) => {
    // Process all transactions occurring on or before date dStr
    while (txIdx < totalTxCount && (relevantTx[txIdx].date || '') <= dStr) {
      const t = relevantTx[txIdx]
      const sid = t.security_id || ''
      const tType = (t.type || '').toLowerCase()
      const tSubtype = (t.subtype || '').toLowerCase()
      const amt = Math.abs(t.amount || 0)
      const tDate = t.date || dStr

      if (tType === 'buy' || tSubtype === 'buy' || tSubtype === 'dividend reinvestment') {
        const pBuy = getNormPrice(sid, tDate)
        activeLots.push({
          sid,
          buyDate: tDate,
          cost: amt,
          buyPrice: pBuy,
          shares: pBuy > 0 ? amt / pBuy : 0,
        })
        if (isAll) {
          if (cashBalance >= amt) {
            cashBalance -= amt
          } else {
            cashBalance = 0.0
          }
        }
      } else if (tType === 'sell' || tSubtype === 'sell') {
        if (isAll) {
          cashBalance += amt
        }
        const secLots = activeLots.filter((l) => l.sid === sid)
        const currSecVal = secLots.reduce(
          (sum, l) => sum + l.shares * getNormPrice(sid, tDate),
          0
        )
        const fraction = currSecVal > 0 ? Math.min(1.0, amt / currSecVal) : 1.0
        secLots.forEach((l) => {
          l.cost *= 1.0 - fraction
          l.shares *= 1.0 - fraction
        })
      } else if (tType === 'cash' || tSubtype === 'dividend') {
        if (isAll) {
          cashBalance += amt
        }
      }

      txIdx++
    }

    // Calculate valuation on date dStr
    let pointHoldingsVal = 0.0
    let pointCostBasis = 0.0

    const tNowMs = endDt.getTime()
    const tCurrMs = new Date(dStr + 'T12:00:00').getTime()

    activeLots.forEach((l) => {
      if (l.shares > 0.000001) {
        const sid = l.sid
        const currP = getNormPrice(sid, dStr)
        const rawLotVal = l.shares * currP

        // Smooth calibration towards today
        const vFactor = calibValFactors[sid] || 1.0
        const bFactor = calibBasisFactors[sid] || 1.0

        const tBuyMs = new Date(l.buyDate + 'T12:00:00').getTime()
        const progress = tNowMs > tBuyMs ? Math.max(0, Math.min(1, (tCurrMs - tBuyMs) / (tNowMs - tBuyMs))) : 1.0

        const curVFactor = 1.0 + (vFactor - 1.0) * progress
        const curBFactor = 1.0 + (bFactor - 1.0) * progress

        pointHoldingsVal += rawLotVal * curVFactor
        pointCostBasis += l.cost * curBFactor
      }
    })

    const pointTotalValue = isAll ? pointHoldingsVal + cashBalance : pointHoldingsVal
    const pointTotalCost = isAll ? pointCostBasis + cashBalance : pointCostBasis
    const pointGainLoss = pointTotalValue - pointTotalCost
    const pointGainLossPct = pointTotalCost > 0 ? (pointGainLoss / pointTotalCost) * 100 : 0

    const isTodayPoint = dStr === todayStr
    const isTime0Point = dStr === time0DateStr && timeRangeDays >= 3650
    const dateObj = new Date(dStr + 'T12:00:00')
    const displayDate = isTodayPoint
      ? 'Today'
      : isTime0Point
      ? `Time 0 (${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })})`
      : dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: totalDays > 200 ? '2-digit' : undefined,
        })

    points.push({
      date: dStr,
      displayDate,
      value: Number(pointTotalValue.toFixed(2)),
      costBasis: Number(pointTotalCost.toFixed(2)),
      gainLoss: Number(pointGainLoss.toFixed(2)),
      gainLossPercent: Number(pointGainLossPct.toFixed(2)),
      ticker: selectedTicker,
    })
  })

  // Ensure last point matches today's exact totals
  if (points.length > 0) {
    const lastPoint = points[points.length - 1]
    if (lastPoint.date === todayStr) {
      if (isAll) {
        const totalVal = holdings.reduce((sum, h) => sum + h.currentValue, 0)
        let totalBasis = 0
        let hasBasis = false
        holdings.forEach((h) => {
          if (h.costBasis !== null) {
            totalBasis += h.costBasis
            hasBasis = true
          }
        })
        if (hasBasis) {
          lastPoint.value = Number(totalVal.toFixed(2))
          lastPoint.costBasis = Number(totalBasis.toFixed(2))
          lastPoint.gainLoss = Number((totalVal - totalBasis).toFixed(2))
          lastPoint.gainLossPercent = totalBasis > 0 ? Number((((totalVal - totalBasis) / totalBasis) * 100).toFixed(2)) : 0
        }
      } else {
        const h = targetHoldings[0]
        if (h && h.costBasis !== null) {
          lastPoint.value = Number(h.currentValue.toFixed(2))
          lastPoint.costBasis = Number(h.costBasis.toFixed(2))
          lastPoint.gainLoss = Number((h.gainLossAmount ?? (h.currentValue - h.costBasis)).toFixed(2))
          lastPoint.gainLossPercent = Number((h.gainLossPercent ?? 0).toFixed(2))
        }
      }
    }
  }

  return points
}

export function formatCurrency(
  val: number | null | undefined,
  showSign: boolean = false,
  fractionDigits: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  const isNegative = val < 0
  const absVal = Math.abs(val)
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  if (isNegative) {
    return `-$${formatted}`
  }
  if (showSign && val > 0) {
    return `+$${formatted}`
  }
  return `$${formatted}`
}

export function formatPercent(
  val: number | null | undefined,
  showSign: boolean = true,
  fractionDigits: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  const formatted = Math.abs(val).toFixed(fractionDigits)
  if (val < 0) {
    return `-${formatted}%`
  }
  if (showSign && val > 0) {
    return `+${formatted}%`
  }
  return `${formatted}%`
}

export function formatNumber(
  val: number | null | undefined,
  fractionDigits: number = 4
): string {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}
