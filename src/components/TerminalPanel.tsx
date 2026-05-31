import { useState } from 'react';
import { ChevronRight, AlertTriangle, Coins, TrendingUp, TrendingDown, Clock, Shield, Trash2 } from 'lucide-react';
import { MarketSymbol, TradePosition, AccountBalance, RiskSettings } from '../types';

interface TerminalPanelProps {
  symbols: MarketSymbol[];
  activeSymbol: MarketSymbol;
  onSelectSymbol: (symbol: string) => void;
  balance: AccountBalance;
  positions: TradePosition[];
  onExecuteTrade: (action: 'BUY' | 'SELL', stake: number, duration: number, stopLoss?: number, takeProfit?: number) => Promise<void>;
  onClosePosition: (id: string, exitPrice: number) => Promise<void>;
  riskSettings: RiskSettings;
}

export default function TerminalPanel({
  symbols,
  activeSymbol,
  onSelectSymbol,
  balance,
  positions,
  onExecuteTrade,
  onClosePosition,
  riskSettings,
}: TerminalPanelProps) {
  // Input parameters state variables
  const [stake, setStake] = useState<number>(100);
  const [duration, setDuration] = useState<number>(30); // Default to turbo expiry
  const [stopLossPercent, setStopLossPercent] = useState<string>('');
  const [takeProfitPercent, setTakeProfitPercent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const calculateTargetFromPercent = (percentStr: string, isStop: boolean, action: 'BUY' | 'SELL') => {
    const val = parseFloat(percentStr);
    if (isNaN(val) || val <= 0) return undefined;
    const offset = (activeSymbol.price * val) / 100;
    
    if (action === 'BUY') {
      return isStop ? activeSymbol.price - offset : activeSymbol.price + offset;
    } else {
      return isStop ? activeSymbol.price + offset : activeSymbol.price - offset;
    }
  };

  const handleActionClick = async (action: 'BUY' | 'SELL') => {
    setErrorNotice(null);
    setIsSubmitting(true);
    
    try {
      // Inputs verification
      if (stake <= 0) {
        throw new Error('Stake amount must be a positive limit.');
      }
      if (stake > balance.freeMargin) {
        throw new Error('Insufficient free margin available in account portfolio.');
      }

      // Check risk settings duplication bounds
      const isDuplicated = positions.some(p => p.symbol === activeSymbol.symbol && p.action === action);
      if (riskSettings.duplicatePreventionActive && isDuplicated) {
        throw new Error(`Duplicate trade block. You already have an active ${action} position on ${activeSymbol.displayName}.`);
      }

      const slValue = calculateTargetFromPercent(stopLossPercent, true, action);
      const tpValue = calculateTargetFromPercent(takeProfitPercent, false, action);

      await onExecuteTrade(action, stake, duration, slValue, tpValue);
      // Clean target logs on successful launch
      setStopLossPercent('');
      setTakeProfitPercent('');
    } catch (err: any) {
      setErrorNotice(err.message || 'Execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-glass rounded-xl p-5 border border-gray-800 flex flex-col justify-between h-full" id="trading-terminal-panel">
      <div>
        {/* Module Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">Active Execution Desk</h2>
          </div>
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest bg-gray-900 px-2 py-0.5 rounded">
            Option Contracts
          </span>
        </div>

        {/* Terminal Inputs Form Frame */}
        <div className="space-y-4" id="terminal-trading-parameters-form">
          {/* Symbol Select list */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase">Asset Selector</label>
            <select
              id="terminal-symbol-select"
              value={activeSymbol.symbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan transition-colors"
            >
              {symbols.map((sym) => (
                <option key={sym.symbol} value={sym.symbol}>
                  {sym.displayName} (${sym.price.toLocaleString(undefined, { maximumFractionDigits: 5 })})
                </option>
              ))}
            </select>
          </div>

          {/* Quick variables: Stake and Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase">Stake (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-brand-cyan font-mono">$</span>
                <input
                  id="terminal-stake-input"
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 pl-7 pr-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase">Contract (Sec)</label>
              <select
                id="terminal-duration-select"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-colors"
              >
                <option value={15}>15s Expiry</option>
                <option value={30}>30s Expiry</option>
                <option value={60}>60s Expiry</option>
                <option value={120}>2 mins</option>
                <option value={300}>5 mins</option>
              </select>
            </div>
          </div>

          {/* S/L and T/P offsets thresholds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase">
                Take Profit (%)
              </label>
              <input
                id="terminal-tp-input"
                type="number"
                placeholder="Optional (e.g., 2%)"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1.5 uppercase">
                Stop Loss (%)
              </label>
              <input
                id="terminal-sl-input"
                type="number"
                placeholder="Optional (e.g., 1%)"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan"
              />
            </div>
          </div>

          {/* Quick-select Stakes Chips */}
          <div className="flex gap-1.5 pt-1">
            {[25, 50, 100, 250, 500].map((chip) => (
              <button
                id={`stake-chip-${chip}`}
                key={chip}
                onClick={() => setStake(chip)}
                className={`flex-1 py-1 text-[10px] font-mono rounded ${
                  stake === chip 
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40' 
                    : 'bg-gray-900 hover:bg-gray-800 text-gray-400'
                }`}
              >
                ${chip}
              </button>
            ))}
          </div>

          {/* Warnings Panel */}
          {errorNotice && (
            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-red-400 font-mono">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Capital Allocation Safety Warning */}
          {stake > (balance.freeMargin * 0.1) && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2 text-[10px] text-amber-400 font-mono">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Allocation warning: Order size exceeds 10% of standard capital allocation. Verify risk parameters.</span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatches Buttons footer */}
      <div className="mt-6 pt-4 border-t border-gray-800/60 spacing-y-3" id="terminal-contract-triggers">
        <div className="grid grid-cols-2 gap-3.5">
          <button
            id="execute-buy-order"
            onClick={() => handleActionClick('BUY')}
            disabled={isSubmitting || riskSettings.emergencyStopActive}
            className="py-3 px-4 rounded-xl font-display font-bold text-xs uppercase cursor-pointer transition-all bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg hover:brightness-110 active:scale-98 disabled:opacity-40 flex flex-col items-center gap-1"
          >
            <TrendingUp className="w-4 h-4 text-white" />
            <span>BUY / RISE OPTION</span>
          </button>

          <button
            id="execute-sell-order"
            onClick={() => handleActionClick('SELL')}
            disabled={isSubmitting || riskSettings.emergencyStopActive}
            className="py-3 px-4 rounded-xl font-display font-bold text-xs uppercase cursor-pointer transition-all bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg hover:brightness-110 active:scale-98 disabled:opacity-40 flex flex-col items-center gap-1"
          >
            <TrendingDown className="w-4 h-4 text-white" />
            <span>SELL / FALL OPTION</span>
          </button>
        </div>

        <div className="text-[10px] font-mono text-center text-gray-500 mt-3 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-brand-cyan" />
          <span>Capital covered under Quantum Smart Contract bounds.</span>
        </div>
      </div>
    </div>
  );
}
