import { useState } from 'react';
import { Sparkles, ArrowUpRight, ArrowDownRight, Compass, ShieldCheck, Activity, Eye, RefreshCw, Zap, Flame } from 'lucide-react';
import { AISignal, TechnicalIndicatorValues } from '../types';

interface SignalCardProps {
  currentSignal: AISignal | null;
  signalHistory: AISignal[];
  onTriggerAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
  activeSymbol: string;
}

export default function SignalCard({
  currentSignal,
  signalHistory,
  onTriggerAnalysis,
  isAnalyzing,
  activeSymbol,
}: SignalCardProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const getActionColor = (action?: 'BUY' | 'SELL' | 'HOLD') => {
    if (action === 'BUY') return 'text-brand-green border-brand-green/30 bg-brand-green/10';
    if (action === 'SELL') return 'text-brand-red border-brand-red/30 bg-brand-red/10';
    return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
  };

  const getSentimentLabelColor = (sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    if (sentiment === 'BULLISH') return 'text-brand-green bg-brand-green/10';
    if (sentiment === 'BEARISH') return 'text-brand-red bg-brand-red/10';
    return 'text-gray-400 bg-gray-400/10';
  };

  return (
    <div className="bg-glass rounded-xl p-5 border border-gray-800" id="quantum-signal-panel">
      {/* Header and trigger buttons */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 rounded-md bg-brand-cyan/10 border border-brand-cyan/25 glow-neon">
            <Sparkles className="w-4 h-4 text-brand-cyan inline mr-1" />
            <span className="text-xs font-mono font-bold text-white uppercase">Quantum AI Advisor</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="trigger-ai-analysis"
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 text-xs font-mono font-bold bg-brand-cyan text-gray-950 rounded-lg hover:bg-cyan-400 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-gray-950" />
            )}
            {isAnalyzing ? 'Calculating...' : 'Query Quantum AI Engine'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
            activeTab === 'current' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Active Signal Detail
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
            activeTab === 'history' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Chronological Logs ({signalHistory.length})
        </button>
      </div>

      {activeTab === 'current' ? (
        <div>
          {currentSignal ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="signal-current-wrapper">
              {/* Gauges indicators left */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center bg-gray-950/40 border border-gray-800/80 rounded-xl p-4">
                <span className="text-xs font-mono text-gray-400 tracking-wider mb-3">AI Conviction Meter</span>
                
                {/* SVG Radial Gauge */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-95">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke="#1f2937"
                      strokeWidth="7"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke="url(#cyanBlueGlow)"
                      strokeWidth="8"
                      strokeDasharray={288}
                      strokeDashoffset={288 - (288 * currentSignal.confidence) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient id="cyanBlueGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f0ff" />
                        <stop offset="100%" stopColor="#0066ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center mt-1">
                    <span className="text-3xl font-display font-semibold tracking-tight text-white">{currentSignal.confidence}%</span>
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest leading-none">Confidence</span>
                  </div>
                </div>

                {/* Recommendation Target */}
                <div className={`mt-4 w-full border text-center py-2 rounded-lg font-display font-bold text-sm tracking-wide ${getActionColor(currentSignal.action)}`}>
                  RECOMMENDED ACTION: {currentSignal.action}
                </div>
              </div>

              {/* Rationale and metrics details */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-sm font-display font-semibold text-white tracking-tight">
                      Structural Target for {activeSymbol}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 font-mono rounded font-medium ${getSentimentLabelColor(currentSignal.sentiment)}`}>
                      {currentSignal.sentiment} SENTIMENT
                    </span>
                  </div>

                  {/* Pricing guidelines */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-900/20 border border-gray-800/40 p-2.5 rounded-lg mb-3">
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-gray-400">Entry Spot</div>
                      <div className="text-xs font-mono font-medium text-white">${currentSignal.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-gray-400">Target (TP)</div>
                      <div className="text-xs font-mono font-medium text-brand-green">${currentSignal.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-gray-400">Stop (SL)</div>
                      <div className="text-xs font-mono font-medium text-brand-red">${currentSignal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 5 })}</div>
                    </div>
                  </div>

                  {/* AI Explanation of the pattern */}
                  <div className="bg-gray-950/40 border-l-2 border-brand-cyan p-3 rounded mr-1">
                    <div className="text-xs font-semibold font-mono text-brand-cyan mb-1 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      SYSTEM REASONING ANALYSIS
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-300 font-sans">
                      {currentSignal.explanation}
                    </p>
                  </div>
                </div>

                {/* Lower grid metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-800/50">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase leading-none">Trend Velocity</div>
                      <div className="text-xs font-mono font-medium text-white mt-0.5">{currentSignal.trendStrength}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase leading-none">Volatility Index</div>
                      <div className="text-xs font-mono font-medium text-white mt-0.5">{currentSignal.volatility}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-cyan" />
                    <div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase leading-none">Risk Coefficient</div>
                      <div className="text-xs font-mono font-medium text-white mt-0.5">Scale: {currentSignal.riskScore} / 10</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase leading-none">Market Structure</div>
                      <div className="text-xs font-mono font-medium text-white mt-0.5 truncate max-w-28" title={currentSignal.marketStructure}>
                        {currentSignal.marketStructure}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-mono text-gray-400 mb-2">No Signal loaded on active terminal.</span>
              <p className="text-xs text-gray-500 max-w-sm">
                Connect the live feed or click &apos;Query Quantum AI Engine&apos; above to compile instant candlestick summaries.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto" id="signal-logs-table-view">
          {signalHistory.length > 0 ? (
            <table className="w-full text-left font-mono text-xs text-gray-300">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-[10px] uppercase">
                  <th className="py-2">Timestamp</th>
                  <th>Symbol</th>
                  <th>Recommended</th>
                  <th>Conviction</th>
                  <th>Spot Limit</th>
                  <th>TP / SL Targets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {signalHistory.map((sig) => (
                  <tr key={sig.id} className="hover:bg-gray-900/20 transition-colors">
                    <td className="py-2.5 text-gray-400">
                      {new Date(sig.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="font-semibold text-gray-200">{sig.symbol}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sig.action === 'BUY' ? 'text-brand-green bg-brand-green/10' :
                        sig.action === 'SELL' ? 'text-brand-red bg-brand-red/10' :
                        'text-amber-400 bg-amber-400/10'
                      }`}>
                        {sig.action}
                      </span>
                    </td>
                    <td className="font-bold text-white">{sig.confidence}%</td>
                    <td>${sig.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                    <td className="text-[10px]">
                      <span className="text-brand-green">TP: ${sig.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="mx-1.5 text-gray-600">/</span>
                      <span className="text-brand-red">SL: ${sig.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 font-mono text-xs">
              No previous AI signal logs stored.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
