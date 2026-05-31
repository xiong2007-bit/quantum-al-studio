import { useState, FormEvent } from 'react';
import { BookOpen, Calendar, HelpCircle, Save, Award, ChevronRight } from 'lucide-react';
import { JournalEntry, MarketSymbol, AISignal } from '../types';

interface JournalPanelProps {
  journals: JournalEntry[];
  onAddJournal: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => Promise<void>;
  symbols: MarketSymbol[];
  activeSignal: AISignal | null;
}

export default function JournalPanel({
  journals,
  onAddJournal,
  symbols,
  activeSignal,
}: JournalPanelProps) {
  const [title, setTitle] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]?.symbol || 'R_100');
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [entryReason, setEntryReason] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pnl, setPnl] = useState<number>(0);
  const [review, setReview] = useState<'excellent' | 'good' | 'poor' | 'room-to-improve'>('good');
  const [isSaving, setIsSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Auto populate notes trigger from Active AI Engine recommendations if available
  const handleAutoPopulate = () => {
    if (activeSignal) {
      setTitle(`Strategic ${activeSignal.action} Option Setup on ${activeSignal.symbol}`);
      setSelectedSymbol(activeSignal.symbol);
      setAction(activeSignal.action === 'SELL' ? 'SELL' : 'BUY');
      setEntryReason(`Quantum AI suggested a ${activeSignal.action} setup. Sentiment: ${activeSignal.sentiment}. Volatility context: ${activeSignal.volatility}. Pattern: ${activeSignal.marketStructure}`);
      setNotes(`Reflective Notes: Setup aligns with RSI coordinate ${activeSignal.indicators?.rsi.toFixed(1)} and SMA overlay triggers.`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setIsSaving(true);

    try {
      if (!title || !entryReason) {
        throw new Error('Title and Entry rationale notes are required to commit journal files.');
      }

      const freshJournal: Omit<JournalEntry, 'id' | 'timestamp'> = {
        title,
        symbol: selectedSymbol,
        action,
        entryReason,
        exitReason: exitReason || 'Option contract resolved automatically.',
        aiRecommendation: activeSignal ? activeSignal.explanation : 'No active real-time AI signal overlay during entry.',
        notes: notes || 'No additional notes captured.',
        performanceReview: review,
        pnl: Number(pnl) || 0
      };

      await onAddJournal(freshJournal);

      // Clean fields
      setTitle('');
      setEntryReason('');
      setExitReason('');
      setNotes('');
      setPnl(0);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failure writing journal record.');
    } finally {
      setIsSaving(false);
    }
  };

  const getReviewColor = (rev: string) => {
    if (rev === 'excellent') return 'text-brand-green border-brand-green/30 bg-brand-green/10';
    if (rev === 'good') return 'text-brand-cyan border-brand-cyan/30 bg-brand-cyan/10';
    if (rev === 'room-to-improve') return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    return 'text-brand-red border-brand-red/30 bg-brand-red/10';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="journal-room-wrapper">
      
      {/* Logger entry editor form */}
      <div className="lg:col-span-5 bg-glass rounded-xl p-5 border border-gray-800 h-fit">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-sm font-display font-bold text-white uppercase tracking-tight">Write Journal Log</h2>
          </div>
          {activeSignal && (
            <button
              onClick={handleAutoPopulate}
              className="text-[10px] font-mono text-brand-cyan border border-brand-cyan/20 hover:border-brand-cyan/40 px-2 py-0.5 rounded transition-all cursor-pointer bg-brand-cyan/5"
            >
              Populate from AI Signal
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" id="journal-editor-form">
          <div>
            <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Log Heading</label>
            <input
              type="text"
              placeholder="e.g., Rising Wedge breakout failure"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Symbol</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
              >
                {symbols.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as 'BUY' | 'SELL')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
              >
                <option value="BUY">BUY / CALL</option>
                <option value="SELL">SELL / PUT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">PnL Return (USD)</label>
              <input
                type="number"
                value={pnl}
                onChange={(e) => setPnl(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Execution Quality</label>
              <select
                value={review}
                onChange={(e) => setReview(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
              >
                <option value="excellent">Excellent Execution</option>
                <option value="good">Good Discipline</option>
                <option value="room-to-improve">Room to Improve</option>
                <option value="poor">Poor / Rule Breaker</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Entry Triggers / Reasons</label>
            <textarea
              rows={2}
              placeholder="Why did you execute this trade? Note technical details (e.g. SMA Bounce, RSI oversold...)"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">Reflective Notes & Lesson learnt</label>
            <textarea
              rows={2}
              placeholder="Keep records of emotional states, leverage sizes, or patterns discipline guidelines."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          {errorNotice && (
            <div className="bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-mono p-2.5 rounded">
              {errorNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-brand-cyan text-gray-950 font-mono font-bold text-xs rounded-lg hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving Record...' : 'Archive Journal Entry'}
          </button>
        </form>
      </div>

      {/* Historical list viewer */}
      <div className="lg:col-span-7 bg-glass rounded-xl p-5 border border-gray-800 h-[520px] overflow-y-auto" id="journal-history-list">
        <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">
          Historic Journal Logs
        </h3>

        {journals.length > 0 ? (
          <div className="space-y-4">
            {journals.map((item) => (
              <div
                key={item.id}
                className="bg-gray-950/40 rounded-lg p-4 border border-gray-800/80 hover:border-gray-700/60 transition-all font-mono"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-900 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-200">{item.title}</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 border rounded font-bold uppercase ${getReviewColor(item.performanceReview)}`}>
                    {item.performanceReview}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-3.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    Asset: <span className="font-bold text-gray-200">{item.symbol}</span>
                  </span>
                  <span>
                    Action:{' '}
                    <span className={`font-bold ${item.action === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>
                      {item.action === 'BUY' ? 'CALL/BUY' : 'PUT/SELL'}
                    </span>
                  </span>
                  <span>
                    Settle PnL:{' '}
                    <span className={`font-bold ${item.pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                      {item.pnl >= 0 ? `+$${item.pnl.toFixed(2)}` : `-$${Math.abs(item.pnl).toFixed(2)}`}
                    </span>
                  </span>
                </div>

                <div className="space-y-2.5 text-[11px] leading-relaxed select-text">
                  <div>
                    <span className="text-brand-cyan font-bold block mb-0.5">● Entry Setup Reason</span>
                    <p className="text-gray-300 font-sans px-2 border-l border-brand-cyan/25">{item.entryReason}</p>
                  </div>
                  
                  {item.notes && (
                    <div>
                      <span className="text-gray-400 font-bold block mb-0.5">● Analysis Journal Notes</span>
                      <p className="text-gray-400 font-sans px-2 border-l border-gray-800">{item.notes}</p>
                    </div>
                  )}

                  {item.aiRecommendation && (
                    <div className="bg-brand-cyan/5 p-2 rounded border border-brand-cyan/10">
                      <span className="text-[10px] text-brand-cyan font-bold block mb-0.5">Quantum AI Reference Guidelines</span>
                      <p className="text-gray-300 font-sans text-[10px]">{item.aiRecommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-gray-500 text-xs font-mono">
            No journal notes logged. Complete trading logs first.
          </div>
        )}
      </div>

    </div>
  );
}
