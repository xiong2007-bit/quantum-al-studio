/**
 * Quantum AI Trader - Core Types
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  derivAccountId: string;
  currency: string;
  accountType: 'demo' | 'real';
  country: string;
  joinDate: string;
  lastLogin: string;
  avatarUrl: string;
  // Stats
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageProfit: number;
  averageLoss: number;
  totalProfitLoss: number;
  riskScore: number;
}

export interface AccountBalance {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
}

export interface MarketSymbol {
  symbol: string;
  displayName: string;
  category: 'synthetic' | 'forex' | 'crypto';
  price: number;
  change24h: number; // percentage
  spread: number;
  status: 'open' | 'closed';
  isFavorite?: boolean;
}

export interface TechnicalIndicatorValues {
  rsi: number;
  macd: { macdLine: number; signalLine: number; histogram: number };
  ema20: number;
  sma50: number;
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
  vwap: number;
}

export interface AISignal {
  id: string;
  symbol: string;
  timestamp: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // percentage (0 - 100)
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskScore: number; // 1 - 10 scale
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  indicators: TechnicalIndicatorValues;
  explanation: string;
  marketStructure: string; // e.g. "Break of Structure (BOS) detected at key demand node."
}

export interface TradePosition {
  id: string;
  userId?: string;
  symbol: string;
  displayName: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  stake: number;
  pnl: number;
  startTime: string;
  durationSeconds: number;
  timeRemaining: number; // counts down to zero
  status: 'open' | 'won' | 'lost' | 'closed';
  stopLoss?: number;
  takeProfit?: number;
  isAutoTraded?: boolean;
  timestamp?: string;
}

export interface TradeHistoryItem {
  id: string;
  userId?: string;
  symbol: string;
  displayName: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  stake: number;
  pnl: number;
  result: 'win' | 'loss' | 'refund';
  timestamp: string;
  isAutoTraded: boolean;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  title: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entryReason: string;
  exitReason: string;
  aiRecommendation: string;
  notes: string;
  performanceReview: 'excellent' | 'good' | 'poor' | 'room-to-improve';
  pnl: number;
}

export interface RiskSettings {
  maxRiskPerTrade: number; // e.g., 5% of balance
  dailyLossLimit: number; // e.g., $500
  dailyProfitTarget: number; // e.g., $1000
  maxDrawdownPercent: number; // e.g., 10%
  emergencyStopActive: boolean;
  duplicatePreventionActive: boolean;
  tradeCooldownSeconds: number; // cooldown between consecutive orders
}

export interface AutoTraderConfig {
  enabled: boolean;
  confidenceThreshold: number; // e.g., 75%
  maxTradesPerDay: number;
  currentTradesTodayCount: number;
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  message: string;
  isRead: boolean;
}

export interface WebSocketLogEntry {
  id: string;
  timestamp: string;
  direction: 'sent' | 'received';
  messageType: string;
  payload: string;
}
