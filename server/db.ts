import fs from 'fs';
import path from 'path';
import { 
  UserProfile, 
  AccountBalance, 
  AISignal, 
  TradePosition, 
  TradeHistoryItem, 
  JournalEntry, 
  RiskSettings, 
  AutoTraderConfig, 
  SystemNotification, 
  WebSocketLogEntry 
} from '../src/types';

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

// Memory cache state initialized with beautiful, high-fidelity mock data for instant out-of-the-box system exploration
interface DatabaseSchema {
  profile: UserProfile;
  balance: AccountBalance;
  positions: TradePosition[];
  tradeHistory: TradeHistoryItem[];
  journals: JournalEntry[];
  riskSettings: RiskSettings;
  autoTraderConfig: AutoTraderConfig;
  notifications: SystemNotification[];
  logs: WebSocketLogEntry[];
  signalHistory: AISignal[];
}

const initialProfile: UserProfile = {
  id: 'usr_q1024_deriv',
  name: 'Tanatswan Rufasha',
  email: 'tanatswanrufasha@gmail.com',
  derivAccountId: 'CR4829103',
  currency: 'USD',
  accountType: 'demo',
  country: 'United Kingdom',
  joinDate: '2026-01-15T09:00:00Z',
  lastLogin: new Date().toISOString(),
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  winRate: 64.2,
  totalTrades: 120,
  winningTrades: 77,
  losingTrades: 43,
  averageProfit: 142.50,
  averageLoss: -85.20,
  totalProfitLoss: 7308.90,
  riskScore: 4.2
};

const initialBalance: AccountBalance = {
  balance: 10000.00,
  equity: 10000.00,
  margin: 0.00,
  freeMargin: 10000.00,
  dailyPnL: 345.80,
  weeklyPnL: 1240.50,
  monthlyPnL: 4890.20
};

// Seed outstanding institutional trade history
const seedTradeHistory: TradeHistoryItem[] = [
  { id: 'tx_998273', symbol: 'R_100', displayName: 'Volatility 100 Index', action: 'BUY', entryPrice: 10245.8, exitPrice: 10292.4, stake: 100, pnl: 46.60, result: 'win', timestamp: '2026-05-29T14:30:22Z', isAutoTraded: false },
  { id: 'tx_998274', symbol: 'frxEURUSD', displayName: 'EUR/USD Forex Spot', action: 'SELL', entryPrice: 1.08453, exitPrice: 1.08320, stake: 200, pnl: 123.00, result: 'win', timestamp: '2026-05-29T16:15:00Z', isAutoTraded: true },
  { id: 'tx_998275', symbol: 'cryBTCUSD', displayName: 'BTC/USD Bitcoin Spot', action: 'BUY', entryPrice: 68420.50, exitPrice: 68150.00, stake: 150, pnl: -270.50, result: 'loss', timestamp: '2026-05-29T19:40:11Z', isAutoTraded: false },
  { id: 'tx_998276', symbol: 'R_50', displayName: 'Volatility 50 Index', action: 'BUY', entryPrice: 342.15, exitPrice: 346.85, stake: 100, pnl: 4.70, result: 'win', timestamp: '2026-05-30T01:10:00Z', isAutoTraded: false },
  { id: 'tx_998277', symbol: 'cryETHUSD', displayName: 'ETH/USD Ethereum Spot', action: 'SELL', entryPrice: 3745.20, exitPrice: 3721.50, stake: 100, pnl: 23.70, result: 'win', timestamp: '2026-05-30T04:22:15Z', isAutoTraded: true },
  { id: 'tx_998278', symbol: 'R_10', displayName: 'Volatility 10 Index', action: 'BUY', entryPrice: 9140.20, exitPrice: 9110.10, stake: 200, pnl: -30.10, result: 'loss', timestamp: '2026-05-30T06:50:00Z', isAutoTraded: false },
  { id: 'tx_998279', symbol: 'frxGBPUSD', displayName: 'GBP/USD Forex Spot', action: 'BUY', entryPrice: 1.27210, exitPrice: 1.27490, stake: 150, pnl: 42.00, result: 'win', timestamp: '2026-05-30T08:15:30Z', isAutoTraded: false }
];

const seedJournals: JournalEntry[] = [
  {
    id: 'jr_1',
    timestamp: '2026-05-29T14:35:00Z',
    title: 'Breakout alignment on Volatility 100 Index',
    symbol: 'R_100',
    action: 'BUY',
    entryReason: 'Price made a clean break above daily psychological resistance at 10,240, accompanied by elevated volume and RSI signaling bullish momentum above 60.',
    exitReason: 'Locked profit automatically at the designated 1.5 ATR target zone.',
    aiRecommendation: 'High confidence confirmation from Quantum AI Engine suggesting bullish structure trend alignment.',
    notes: 'Flawless execution. No emotional hesitation. Risk ratios respected exactly.',
    performanceReview: 'excellent',
    pnl: 46.60
  },
  {
    id: 'jr_2',
    timestamp: '2026-05-29T16:20:00Z',
    title: 'Automated EUR/USD Trend Retracement Sell',
    symbol: 'frxEURUSD',
    action: 'SELL',
    entryReason: 'The Quantum Auto-Trader triggered a positions dispatch on a 78% confidence bear signal. Entry aligned with EMA20 overlay on the 15m structural chart.',
    exitReason: 'Option reached positive contract closure criteria.',
    aiRecommendation: 'EUR structural charts show high-liquidity sell pressure near key resistance ceiling.',
    notes: 'The automated mode successfully executed. Followed daily risk lock parameters.',
    performanceReview: 'excellent',
    pnl: 123.00
  },
  {
    id: 'jr_3',
    timestamp: '2026-05-29T19:50:00Z',
    title: 'Crypto correction error near psychological block',
    symbol: 'cryBTCUSD',
    action: 'BUY',
    entryReason: 'Speculative rebound trade on a sudden crypto liquidity dip.',
    exitReason: 'Sudden high volatility breach stopped the option out.',
    aiRecommendation: 'Engine warned with high-intensity volatility indices, advising a strict HOLD or reduced stake scaling.',
    notes: 'Over-leveraged on a high-risk position. Must stick key safety rules to avoid sudden drawdown.',
    performanceReview: 'poor',
    pnl: -270.50
  }
];

const seedSignals: AISignal[] = [
  {
    id: 'sig_11',
    symbol: 'R_100',
    timestamp: '2026-05-30T09:12:00Z',
    action: 'BUY',
    confidence: 84,
    entryPrice: 10245.5,
    stopLoss: 10180.0,
    takeProfit: 10320.0,
    riskScore: 3,
    trendStrength: 'STRONG',
    volatility: 'LOW',
    sentiment: 'BULLISH',
    indicators: { rsi: 62.4, macd: { macdLine: 12.4, signalLine: 8.2, histogram: 4.2 }, ema20: 10210.0, sma50: 10150.0, bollingerBands: { upper: 10260, middle: 10200, lower: 10140 }, atr: 65, vwap: 10205.0 },
    explanation: 'Volatility 100 has formed a robust ascending triangle pattern on the 15-minute timeframe. Standard EMA and SMA curves show steady bullish alignment. Confirmed with strong support at 10,200 with minimal resistance above.',
    marketStructure: 'Break of Structure (BOS) detected at the 10,230 local supply zone.'
  },
  {
    id: 'sig_12',
    symbol: 'cryBTCUSD',
    timestamp: '2026-05-30T10:05:00Z',
    action: 'HOLD',
    confidence: 52,
    entryPrice: 68350.0,
    stopLoss: 67100.0,
    takeProfit: 69800.0,
    riskScore: 8,
    trendStrength: 'WEAK',
    volatility: 'HIGH',
    sentiment: 'NEUTRAL',
    indicators: { rsi: 49.1, macd: { macdLine: -5.1, signalLine: 1.2, histogram: -6.3 }, ema20: 68410.0, sma50: 68290.0, bollingerBands: { upper: 69100, middle: 68350, lower: 67600 }, atr: 480, vwap: 68380.0 },
    explanation: 'Bitcoin is currently contracting within an extremely tight consolidation band between 68,100 and 68,600. Bollinger Bands are highly pinched, indicating an imminent high-volatility breakout. Risk parameters favor holding until trend confirmation is established.',
    marketStructure: 'Ranging within a narrow liquidity compression block. No structural breaks identified yet.'
  },
  {
    id: 'sig_13',
    symbol: 'frxEURUSD',
    timestamp: '2026-05-30T10:48:00Z',
    action: 'SELL',
    confidence: 76,
    entryPrice: 1.08412,
    stopLoss: 1.08580,
    takeProfit: 1.08120,
    riskScore: 2,
    trendStrength: 'MODERATE',
    volatility: 'LOW',
    sentiment: 'BEARISH',
    indicators: { rsi: 38.5, macd: { macdLine: -0.0004, signalLine: -0.0001, histogram: -0.0003 }, ema20: 1.08450, sma50: 1.08510, bollingerBands: { upper: 1.08550, middle: 1.08430, lower: 1.08310 }, atr: 0.0014, vwap: 1.08425 },
    explanation: 'EUR/USD has broken beneath local trendline support under heavy spot-selling volumes. The 4-hour EMA20 has acted as solid overhead supply rejection. RSI is decelerating, validating further structural downside toward daily support targets.',
    marketStructure: 'Liquidity sweep complete at the 1.08500 psychological ceiling.'
  }
];

const initialRiskSettings: RiskSettings = {
  maxRiskPerTrade: 5.0, // 5% limit
  dailyLossLimit: 500.0,
  dailyProfitTarget: 1000.0,
  maxDrawdownPercent: 10.0,
  emergencyStopActive: false,
  duplicatePreventionActive: true,
  tradeCooldownSeconds: 30
};

const initialAutoTraderConfig: AutoTraderConfig = {
  enabled: false,
  confidenceThreshold: 80,
  maxTradesPerDay: 10,
  currentTradesTodayCount: 2
};

const defaultNotifications: SystemNotification[] = [
  { id: 'notif_1', timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'info', title: 'System Connected', message: 'Centralized Quantum high-frequency telemetry link online with Deriv.', isRead: false },
  { id: 'notif_2', timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'success', title: 'AI Automation Signal Won', message: 'Automated order for EUR/USD Forex Spot resolved successfully for +123.00 USD PnL.', isRead: true },
  { id: 'notif_3', timestamp: new Date(Date.now() - 86400000).toISOString(), type: 'warning', title: 'Daily Risk Guard Status', message: 'You have completed 64% of your daily profit goal. Standard auto-monitoring guards remain active.', isRead: true }
];

let state: DatabaseSchema = {
  profile: initialProfile,
  balance: initialBalance,
  positions: [],
  tradeHistory: seedTradeHistory,
  journals: seedJournals,
  riskSettings: initialRiskSettings,
  autoTraderConfig: initialAutoTraderConfig,
  notifications: defaultNotifications,
  logs: [],
  signalHistory: seedSignals
};

// IO helper to load data
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      state = { ...state, ...parsed };
      console.log('Quantum DB successfully loaded from filesystem.');
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Error reading Quantum DB file, using in-memory state.', err);
  }
}

// IO helper to save data
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file.', err);
  }
}

// Initialize on load
loadDb();

export const DbService = {
  getProfile: (): UserProfile => {
    return state.profile;
  },

  updateProfile: (profileUpdates: Partial<UserProfile>): UserProfile => {
    state.profile = { ...state.profile, ...profileUpdates };
    saveDb();
    return state.profile;
  },

  getBalance: (): AccountBalance => {
    return state.balance;
  },

  updateBalance: (balanceUpdates: Partial<AccountBalance>): AccountBalance => {
    state.balance = { ...state.balance, ...balanceUpdates };
    saveDb();
    return state.balance;
  },

  getPositions: (): TradePosition[] => {
    return state.positions;
  },

  addPosition: (pos: TradePosition): TradePosition[] => {
    state.positions.push(pos);
    saveDb();
    return state.positions;
  },

  updatePositionPrice: (id: string, currentPrice: number): TradePosition | null => {
    const pos = state.positions.find(p => p.id === id);
    if (pos) {
      pos.currentPrice = currentPrice;
      const profitMult = pos.action === 'BUY' ? 1 : -1;
      // High-precision percentage/contract based PnL computation
      const diffFrac = (currentPrice - pos.entryPrice) / pos.entryPrice;
      pos.pnl = Math.round((pos.stake * diffFrac * profitMult * 10) * 100) / 100;
      saveDb();
      return pos;
    }
    return null;
  },

  closePosition: (id: string, exitPrice: number): TradeHistoryItem | null => {
    const index = state.positions.findIndex(p => p.id === id);
    if (index !== -1) {
      const pos = state.positions[index];
      state.positions.splice(index, 1);

      // Settle PnL
      const profitMult = pos.action === 'BUY' ? 1 : -1;
      const diffFrac = (exitPrice - pos.entryPrice) / pos.entryPrice;
      const pnlSum = Math.round((pos.stake * diffFrac * profitMult * 10) * 100) / 100;
      
      const resItem: TradeHistoryItem = {
        id: 'tx_c' + Math.floor(Math.random() * 900000 + 100000),
        symbol: pos.symbol,
        displayName: pos.displayName,
        action: pos.action,
        entryPrice: pos.entryPrice,
        exitPrice: exitPrice,
        stake: pos.stake,
        pnl: pnlSum,
        result: pnlSum > 0 ? 'win' : pnlSum < 0 ? 'loss' : 'refund',
        timestamp: new Date().toISOString(),
        isAutoTraded: pos.isAutoTraded || false
      };

      state.tradeHistory.unshift(resItem);
      
      // Update running account balance
      state.balance.balance += pnlSum;
      state.balance.equity = state.balance.balance;
      state.balance.dailyPnL += pnlSum;
      state.balance.weeklyPnL += pnlSum;
      state.balance.monthlyPnL += pnlSum;

      // Recalculate User Profiles Win Rate Statistics dynamically
      const history = state.tradeHistory;
      const wins = history.filter(h => h.result === 'win').length;
      state.profile.totalTrades = history.length;
      state.profile.winningTrades = wins;
      state.profile.losingTrades = history.length - wins;
      state.profile.winRate = Math.round((wins / history.length) * 1000) / 10;
      state.profile.totalProfitLoss = Math.round(history.reduce((a, b) => a + b.pnl, 0) * 100) / 100;

      const winningPnl = history.filter(h => h.pnl > 0);
      const losingPnl = history.filter(h => h.pnl < 0);
      state.profile.averageProfit = winningPnl.length ? Math.round((winningPnl.reduce((a,b)=>a+b.pnl,0) / winningPnl.length) * 100) / 100 : 0;
      state.profile.averageLoss = losingPnl.length ? Math.round((losingPnl.reduce((a,b)=>a+b.pnl,0) / losingPnl.length) * 100) / 100 : 0;

      // Add a clean notification
      DbService.addNotification(
        pnlSum >= 0 ? 'success' : 'danger',
        'Trade Settle Resolved',
        `Completed ${pos.displayName} ${pos.action} order. Result: ${pnlSum >= 0 ? '+$' : '-$'}${Math.abs(pnlSum)} USD.`
      );

      saveDb();
      return resItem;
    }
    return null;
  },

  getTradeHistory: (): TradeHistoryItem[] => {
    return state.tradeHistory;
  },

  getJournals: (): JournalEntry[] => {
    return state.journals;
  },

  addJournal: (entry: Omit<JournalEntry, 'id' | 'timestamp'>): JournalEntry => {
    const fullEntry: JournalEntry = {
      ...entry,
      id: 'jr_' + (state.journals.length + 1),
      timestamp: new Date().toISOString()
    };
    state.journals.unshift(fullEntry);
    saveDb();
    return fullEntry;
  },

  getRiskSettings: (): RiskSettings => {
    return state.riskSettings;
  },

  updateRiskSettings: (updates: Partial<RiskSettings>): RiskSettings => {
    state.riskSettings = { ...state.riskSettings, ...updates };
    saveDb();
    return state.riskSettings;
  },

  getAutoTraderConfig: (): AutoTraderConfig => {
    return state.autoTraderConfig;
  },

  updateAutoTraderConfig: (updates: Partial<AutoTraderConfig>): AutoTraderConfig => {
    state.autoTraderConfig = { ...state.autoTraderConfig, ...updates };
    saveDb();
    return state.autoTraderConfig;
  },

  getNotifications: (): SystemNotification[] => {
    return state.notifications;
  },

  addNotification: (type: 'success' | 'warning' | 'info' | 'danger', title: string, message: string): SystemNotification => {
    const notif: SystemNotification = {
      id: 'notif_' + Date.now() + Math.floor(Math.random()*100),
      timestamp: new Date().toISOString(),
      type,
      title,
      message,
      isRead: false
    };
    state.notifications.unshift(notif);
    // Keep notification backlog capped to 50 items for clean performance
    if (state.notifications.length > 50) {
      state.notifications.pop();
    }
    saveDb();
    return notif;
  },

  markNotificationsRead: (): void => {
    state.notifications.forEach(n => n.isRead = true);
    saveDb();
  },

  clearNotifications: (): void => {
    state.notifications = [];
    saveDb();
  },

  getSignalHistory: (): AISignal[] => {
    return state.signalHistory;
  },

  addSignal: (signal: AISignal): void => {
    state.signalHistory.unshift(signal);
    if (state.signalHistory.length > 50) {
      state.signalHistory.pop();
    }
    saveDb();
  },

  getLogs: (): WebSocketLogEntry[] => {
    return state.logs;
  },

  addLogEntry: (direction: 'sent' | 'received', messageType: string, payload: string): void => {
    const entry: WebSocketLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random()*100),
      timestamp: new Date().toISOString(),
      direction,
      messageType,
      payload
    };
    state.logs.unshift(entry);
    if (state.logs.length > 100) {
      state.logs.pop();
    }
    saveDb();
  }
};
