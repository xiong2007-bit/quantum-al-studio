import { useState, FormEvent } from 'react';
import { ShieldCheck, Sliders, AlertTriangle, Play, Pause, ToggleLeft, ToggleRight, HelpCircle } from 'lucide-react';
import { RiskSettings, AutoTraderConfig } from '../types';

interface RiskPanelProps {
  riskSettings: RiskSettings;
  autoTraderConfig: AutoTraderConfig;
  onUpdateRisk: (settings: Partial<RiskSettings>) => Promise<void>;
  onUpdateAutotrader: (config: Partial<AutoTraderConfig>) => Promise<void>;
}

export default function RiskPanel({
  riskSettings,
  autoTraderConfig,
  onUpdateRisk,
  onUpdateAutotrader,
}: RiskPanelProps) {
  // Local form parameters
  const [maxRisk, setMaxRisk] = useState(riskSettings.maxRiskPerTrade);
  const [dailyLoss, setDailyLoss] = useState(riskSettings.dailyLossLimit);
  const [dailyProfit, setDailyProfit] = useState(riskSettings.dailyProfitTarget);
  const [duplicateBlock, setDuplicateBlock] = useState(riskSettings.duplicatePreventionActive);
  const [isUpdatingRisk, setIsUpdatingRisk] = useState(false);

  const [autoEnabled, setAutoEnabled] = useState(autoTraderConfig.enabled);
  const [confidenceTrigger, setConfidenceTrigger] = useState(autoTraderConfig.confidenceThreshold);
  const [maxDailyTrades, setMaxDailyTrades] = useState(autoTraderConfig.maxTradesPerDay);
  const [isUpdatingAuto, setIsUpdatingAuto] = useState(false);

  const handleSaveRisk = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdatingRisk(true);
    try {
      await onUpdateRisk({
        maxRiskPerTrade: Number(maxRisk),
        dailyLossLimit: Number(dailyLoss),
        dailyProfitTarget: Number(dailyProfit),
        duplicatePreventionActive: duplicateBlock,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRisk(false);
    }
  };

  const handleToggleAutoPilot = async () => {
    const nextVal = !autoEnabled;
    setAutoEnabled(nextVal);
    await onUpdateAutotrader({ enabled: nextVal });
  };

  const handleSaveAutotrader = async (e: FormEvent) => {
    e.preventDefault();
    setIsUpdatingAuto(true);
    try {
      await onUpdateAutotrader({
        confidenceThreshold: Number(confidenceTrigger),
        maxTradesPerDay: Number(maxDailyTrades),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingAuto(false);
    }
  };

  const handleEmergencyStop = async () => {
    const nextStop = !riskSettings.emergencyStopActive;
    await onUpdateRisk({ emergencyStopActive: nextStop });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="risk-parameter-panel-room">
      
      {/* 1. Standard Risk safeguards limit form */}
      <div className="bg-glass rounded-xl p-5 border border-gray-800">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-brand-green" />
          <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">Institutional Risk Safeguards</h2>
        </div>

        <form onSubmit={handleSaveRisk} className="space-y-4">
          <div>
            <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
              <span className="uppercase">Max Risk Per Order</span>
              <span className="text-brand-green font-bold">{maxRisk}% of Account</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={maxRisk}
              onChange={(e) => setMaxRisk(Number(e.target.value))}
              className="w-full accent-brand-green bg-gray-950 h-2 rounded-lg cursor-pointer border border-gray-800"
            />
            <p className="text-[9px] font-mono text-gray-500 mt-1">Stops custom option stake orders exceeding this threshold size relative to total wallet balance.</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Daily Drawdown Circuit Line</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-brand-red">$</span>
                <input
                  type="number"
                  value={dailyLoss}
                  onChange={(e) => setDailyLoss(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 pl-6 pr-3 text-xs font-mono text-white focus:outline-none focus:border-brand-red"
                />
              </div>
              <p className="text-[9px] font-mono text-gray-500 mt-1">Instantly suspends options trade dispatches if aggregate daily loss reaches limit.</p>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Daily Profit Ceiling Goal</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono text-brand-green">$</span>
                <input
                  type="number"
                  value={dailyProfit}
                  onChange={(e) => setDailyProfit(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 pl-6 pr-3 text-xs font-mono text-white focus:outline-none focus:border-brand-green"
                />
              </div>
              <p className="text-[9px] font-mono text-gray-500 mt-1">Locks session capital once target gains have been secured.</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-950/40 p-3 rounded-lg border border-gray-800/60">
            <div>
              <span className="text-[11px] font-semibold font-mono text-gray-200 block">Prevent Duplicate Orders</span>
              <p className="text-[9px] font-mono text-gray-500">Blocks concurrent same-direction contract orders on identical symbols.</p>
            </div>
            <button
              type="button"
              id="toggle-duplicate-block"
              onClick={() => setDuplicateBlock(!duplicateBlock)}
              className={`text-sm focus:outline-none transition-all ${duplicateBlock ? 'text-brand-green' : 'text-gray-600'}`}
            >
              {duplicateBlock ? (
                <ToggleRight className="w-9 h-9" />
              ) : (
                <ToggleLeft className="w-9 h-9" />
              )}
            </button>
          </div>

          <button
            type="submit"
            id="save-risk-settings"
            disabled={isUpdatingRisk}
            className="w-full py-2 bg-brand-green text-black font-mono font-bold text-xs rounded-lg hover:bg-green-400 transition-colors cursor-pointer"
          >
            {isUpdatingRisk ? 'Committing Rules...' : 'Save Guard Parameters'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-800/80">
          <button
            id="emergency-system-lock-btn"
            onClick={handleEmergencyStop}
            className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all text-white shadow-md cursor-pointer ${
              riskSettings.emergencyStopActive 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110' 
                : 'bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {riskSettings.emergencyStopActive ? '🔓 DEACTIVATE EMERGENCY CIRCUIT' : '🚨 ACTIVATE EMERGENCY TERMINAL LOCK'}
          </button>
        </div>
      </div>

      {/* 2. Automated AI Robot parameters form */}
      <div className="bg-glass rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-cyan animate-pulse" />
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">AI Autopilot Interceptor</h2>
          </div>
          <button
            id="autopilot-toggle"
            onClick={handleToggleAutoPilot}
            className={`flex items-center gap-1 text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border transition-all ${
              autoEnabled 
                ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40' 
                : 'bg-gray-800/50 text-gray-500 border-gray-800'
            }`}
          >
            {autoEnabled ? <Pause className="w-3 h-3 fill-brand-cyan" /> : <Play className="w-3 h-3 fill-gray-500" />}
            {autoEnabled ? 'Autopilot Active' : 'Autopilot Inactive'}
          </button>
        </div>

        <form onSubmit={handleSaveAutotrader} className="space-y-4">
          <div>
            <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
              <span className="uppercase">Confidence Target Trigger</span>
              <span className="text-brand-cyan font-bold">{confidenceTrigger}% Minimum</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={confidenceTrigger}
              onChange={(e) => setConfidenceTrigger(Number(e.target.value))}
              disabled={!autoEnabled}
              className="w-full accent-brand-cyan bg-gray-950 h-2 rounded-lg cursor-pointer border border-gray-800 disabled:opacity-30"
            />
            <p className="text-[9px] font-mono text-gray-500 mt-1">Intermediary AI signals with confidence scores beneath this percent are excluded.</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Daily Order Allocation Cap</label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxDailyTrades}
              onChange={(e) => setMaxDailyTrades(Math.max(1, Number(e.target.value)))}
              disabled={!autoEnabled}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan disabled:opacity-30"
            />
            <p className="text-[9px] font-mono text-gray-500 mt-1">Strict maximum counts of contracts the AI autopilot can open per single day.</p>
          </div>

          <div className="p-3 bg-gray-950/40 rounded-lg border border-gray-850 text-[10.5px] leading-relaxed font-sans text-gray-400 space-y-2">
            <span className="text-brand-cyan font-semibold block uppercase text-[10px] font-mono">🤖 Standard Operational Parameters</span>
            <p>
              When active, the autopilot listens to indicators oscillations. If our Quantum evaluation yields a BUY/SELL signal exceeding {confidenceTrigger}% confidence, a contract of exactly 2% total balance gets dispatched in the background.
            </p>
            <p className="font-mono text-[9.5px] text-brand-green">
              Active Autopilot orders are logged on trades list indicators identified with the 🤖 symbol.
            </p>
          </div>

          <button
            type="submit"
            id="save-autopilot-settings"
            disabled={isUpdatingAuto || !autoEnabled}
            className="w-full py-2 bg-brand-cyan text-gray-950 font-mono font-bold text-xs rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUpdatingAuto ? 'Saving Parameters...' : 'Apply Autopilot Parameters'}
          </button>
        </form>
      </div>

    </div>
  );
}
