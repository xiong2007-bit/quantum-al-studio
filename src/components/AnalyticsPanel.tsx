import { TradeHistoryItem } from '../types';

interface AnalyticsPanelProps {
  tradeHistory: TradeHistoryItem[];
  profile: any;
}

export default function AnalyticsPanel({ tradeHistory, profile }: AnalyticsPanelProps) {
  if (tradeHistory.length === 0) {
    return (
      <div className="bg-glass rounded-xl p-8 border border-gray-800 text-center font-mono text-sm text-gray-500" id="analytics-empty">
        Complete options execution in current session to unlock detailed performance analytics.
      </div>
    );
  }

  // Mathematics: Calculate advanced ratios
  const total = tradeHistory.length;
  const wins = tradeHistory.filter(t => t.pnl > 0);
  const losses = tradeHistory.filter(t => t.pnl < 0);
  
  const sumWins = wins.reduce((acc, curr) => acc + curr.pnl, 0);
  const sumLosses = Math.abs(losses.reduce((acc, curr) => acc + curr.pnl, 0));
  
  const profitFactor = sumLosses === 0 ? sumWins : Math.round((sumWins / sumLosses) * 100) / 100;
  
  // Accumulated Equity curve coordinates
  let baseEquity = 10000;
  const reversedHistory = [...tradeHistory].reverse();
  const equityPoints: number[] = [baseEquity];
  
  reversedHistory.forEach((item) => {
    baseEquity += item.pnl;
    equityPoints.push(Math.round(baseEquity * 100) / 100);
  });

  // Calculate Sharpe Ratio (simplified approximation using average returns over trade deviation)
  const returnsFraction = tradeHistory.map(t => t.pnl / t.stake);
  const meanReturn = returnsFraction.reduce((a, b) => a + b, 0) / total;
  const varianceReturn = returnsFraction.reduce((sum, val) => sum + Math.pow(val - meanReturn, 2), 0) / total || 0.01;
  const stdDevReturn = Math.sqrt(varianceReturn);
  const sharpeRatio = stdDevReturn === 0 ? 0 : Math.round((meanReturn / stdDevReturn) * 10) / 10;

  // Maximum Drawdown ratio metric
  let peak = 10000;
  let maxDrawdown = 0;
  let activeEq = 10000;
  reversedHistory.forEach(item => {
    activeEq += item.pnl;
    if (activeEq > peak) {
      peak = activeEq;
    }
    const dd = ((peak - activeEq) / peak) * 100;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  });
  maxDrawdown = Math.round(maxDrawdown * 10) / 10;

  // Dynamic Charting: Equity expansion plot
  const svgWidth = 500;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 20;

  const maxEquity = Math.max(...equityPoints, 10000);
  const minEquity = Math.min(...equityPoints, 9000);
  const eqRange = maxEquity - minEquity || 1000;

  const getEqX = (idx: number) => {
    return paddingX + (idx / (equityPoints.length - 1)) * (svgWidth - paddingX - 20);
  };

  const getEqY = (val: number) => {
    return svgHeight - paddingY - ((val - minEquity) / eqRange) * (svgHeight - 2 * paddingY);
  };

  const equityPathStr = equityPoints.reduce((acc, val, idx) => {
    const x = getEqX(idx);
    const y = getEqY(val);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPathStr = equityPoints.length > 0
    ? `${equityPathStr} L ${getEqX(equityPoints.length - 1)} ${svgHeight - paddingY} L ${getEqX(0)} ${svgHeight - paddingY} Z`
    : '';

  // Asset Distribution Counter
  const symbolCounter: { [key: string]: number } = {};
  tradeHistory.forEach(t => {
    symbolCounter[t.symbol] = (symbolCounter[t.symbol] || 0) + 1;
  });

  return (
    <div className="space-y-6" id="analytics-panel-room">
      {/* Performance Bento Scoreboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sharpe */}
        <div className="bg-glass rounded-xl p-4 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">Sharpe Ratio</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-display font-semibold tracking-tight text-white">
              {sharpeRatio > 0 ? `+${sharpeRatio}` : sharpeRatio}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Institutional</span>
          </div>
          <p className="text-[9px] font-mono text-gray-400 leading-normal mt-1.5 border-t border-gray-800/60 pt-1.5">
            Vol-adjusted risk index. Range &gt; 1.0 is supreme.
          </p>
        </div>

        {/* Profit factor */}
        <div className="bg-glass rounded-xl p-4 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">Profit Factor</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-display font-semibold tracking-tight text-white">
              {profitFactor}
            </span>
            <span className={`text-[10px] font-mono ${profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {profitFactor >= 1.5 ? 'Elite' : 'Moderate'}
            </span>
          </div>
          <p className="text-[9px] font-mono text-gray-400 leading-normal mt-1.5 border-t border-gray-800/60 pt-1.5">
            Gross gains divided by total losses absolute pool.
          </p>
        </div>

        {/* Drawdown */}
        <div className="bg-glass rounded-xl p-4 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">Max Drawdown</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-display font-semibold tracking-tight text-brand-red">
              {maxDrawdown}%
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Guarded</span>
          </div>
          <p className="text-[9px] font-mono text-gray-400 leading-normal mt-1.5 border-t border-gray-800/60 pt-1.5">
            Peak-to-trough capital decline. Risk locks guard here.
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-glass rounded-xl p-4 border border-gray-800 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">Terminal Win Rate</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-display font-semibold tracking-tight text-brand-green">
              {profile.winRate}%
            </span>
            <span className="text-[10px] font-mono text-gray-400">{profile.winningTrades} of {profile.totalTrades}</span>
          </div>
          <p className="text-[9px] font-mono text-gray-400 leading-normal mt-1.5 border-t border-gray-800/60 pt-1.5">
            Percentage of winning resolved option payouts.
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Portfolio growth line SVG chart */}
        <div className="lg:col-span-8 bg-glass rounded-xl p-5 border border-gray-800 flex flex-col justify-between" id="chart-growth-box">
          <div className="border-b border-gray-800/50 pb-3 mb-3">
            <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">Dynamic Equity Curve Expansion</h3>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">Chronological progress of wallet holdings starting at $10,000 USD</p>
          </div>

          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto bg-gray-950/20 rounded-lg">
              <defs>
                <linearGradient id="eqGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Y Guidelines */}
              {[0.25, 0.5, 0.75].map((yFrac, i) => {
                const yPos = paddingY + yFrac * (svgHeight - 2 * paddingY);
                const targetVal = maxEquity - yFrac * eqRange;
                return (
                  <g key={`eqGrid-${i}`}>
                    <line
                      x1={paddingX}
                      y1={yPos}
                      x2={svgWidth - 20}
                      y2={yPos}
                      stroke="#111827"
                      strokeWidth="1"
                    />
                    <text x={paddingX - 6} y={yPos + 3} fill="#4b5563" fontSize="8" fontFamily="monospace" textAnchor="end">
                      ${Math.round(targetVal)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              {areaPathStr && (
                <path d={areaPathStr} fill="url(#eqGlow)" />
              )}

              {/* Line path */}
              {equityPathStr && (
                <path d={equityPathStr} fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Dots on coordinate indices */}
              {equityPoints.map((pt, index) => {
                const cx = getEqX(index);
                const cy = getEqY(pt);
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r="2.5"
                    fill="#030712"
                    stroke="#00f0ff"
                    strokeWidth="1.5"
                    className="hover:r-4 transition-all hover:fill-white cursor-pointer"
                  >
                    <title>Trade index {index}: ${pt}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Win/Loss distribution and symbols allocation bento */}
        <div className="lg:col-span-4 bg-glass rounded-xl p-5 border border-gray-800 flex flex-col justify-between" id="chart-allocation-box">
          <div className="border-b border-gray-800/50 pb-3 mb-4">
            <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">Asset volume distribution</h3>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">Execution density mapped directly by asset class category</p>
          </div>

          {/* Allocation bars list */}
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {Object.keys(symbolCounter).length > 0 ? (
              Object.entries(symbolCounter).map(([sym, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={sym} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-semibold text-gray-200">{sym}</span>
                      <span className="text-gray-400">{count} orders ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
                      <div
                        className="h-full bg-brand-cyan rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center font-mono text-xs text-gray-500">No asset data available.</div>
            )}
          </div>

          <div className="bg-gray-950/40 p-2.5 rounded border border-gray-800/40 mt-4">
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-gray-500">Total Profit:</span>
              <span className="text-brand-green font-bold">+${sumWins.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Total Loss:</span>
              <span className="text-brand-red font-bold">-${sumLosses.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
