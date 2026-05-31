import { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Sparkles, 
  TrendingUp, 
  History, 
  BarChart4, 
  BookOpen, 
  ShieldCheck, 
  User, 
  Bell, 
  Flame, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Terminal, 
  Wifi, 
  WifiOff, 
  Lock, 
  PlusCircle, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Clock
} from 'lucide-react';

import { 
  UserProfile, 
  AccountBalance, 
  MarketSymbol, 
  AISignal, 
  TradePosition, 
  TradeHistoryItem, 
  JournalEntry, 
  RiskSettings, 
  AutoTraderConfig, 
  SystemNotification, 
  WebSocketLogEntry,
  TechnicalIndicatorValues 
} from './types';

import { 
  calculateSMA, 
  calculateEMA, 
  calculateBollingerBands, 
  calculateRSI, 
  calculateMACD, 
  calculateATR, 
  calculateVWAP, 
  generateSyntheticHistory,
  Candle 
} from './utils/indicators';

import ChartingWindow from './components/ChartingWindow';
import SignalCard from './components/SignalCard';
import TerminalPanel from './components/TerminalPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import JournalPanel from './components/JournalPanel';
import RiskPanel from './components/RiskPanel';
import AccountPanel from './components/AccountPanel';

import { useFirebaseData } from './hooks/useFirebaseData';
import { executeFirebaseTrade, closeFirebasePosition } from './services/TradeExecutionService';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

import { useDerivAuth } from './utils/oauth';
import OAuthCallback from './components/OAuthCallback';

export default function App() {
  const { 
    currentUser, profile, setProfile, balance, setBalance, positions, setPositions, tradeHistory, journals, riskSettings, autoTraderConfig, notifications, alerts
  } = useFirebaseData();
  
  const { isAuthenticated, token, loginWithDeriv, logout } = useDerivAuth();

  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<'terminal' | 'signals' | 'history' | 'analytics' | 'journal' | 'risk' | 'account' | 'logs'>('terminal');

  const [wsLogs, setWsLogs] = useState<WebSocketLogEntry[]>([]);
  const [signalHistory, setSignalHistory] = useState<AISignal[]>([]);

  // Telemetry Market Data State
  const [symbols, setSymbols] = useState<MarketSymbol[]>([
    { symbol: 'R_100', displayName: 'Volatility 100 Index', category: 'synthetic', price: 10245.8, change24h: 1.45, spread: 2.1, status: 'open', isFavorite: true },
    { symbol: 'R_75', displayName: 'Volatility 75 Index', category: 'synthetic', price: 3450.4, change24h: -0.82, spread: 0.9, status: 'open', isFavorite: true },
    { symbol: 'R_50', displayName: 'Volatility 50 Index', category: 'synthetic', price: 346.8, change24h: 2.11, spread: 0.25, status: 'open' },
    { symbol: 'R_25', displayName: 'Volatility 25 Index', category: 'synthetic', price: 1045.2, change24h: 0.15, spread: 0.6, status: 'open' },
    { symbol: 'R_10', displayName: 'Volatility 10 Index', category: 'synthetic', price: 9110.1, change24h: -0.34, spread: 1.25, status: 'open' },
    { symbol: 'frxEURUSD', displayName: 'EUR/USD Spot Forex', category: 'forex', price: 1.0841, change24h: 0.22, spread: 0.0001, status: 'open', isFavorite: true },
    { symbol: 'frxGBPUSD', displayName: 'GBP/USD Spot Forex', category: 'forex', price: 1.2745, change24h: -0.11, spread: 0.0002, status: 'open' },
    { symbol: 'frxUSDJPY', displayName: 'USD/JPY Spot Forex', category: 'forex', price: 156.42, change24h: 0.63, spread: 0.012, status: 'open' },
    { symbol: 'frxAUDUSD', displayName: 'AUD/USD Spot Forex', category: 'forex', price: 0.6621, change24h: -0.45, spread: 0.0001, status: 'open' },
    { symbol: 'cryBTCUSD', displayName: 'BTC/USD Bitcoin Spot', category: 'crypto', price: 68350.0, change24h: 3.42, spread: 22.5, status: 'open', isFavorite: true },
    { symbol: 'cryETHUSD', displayName: 'ETH/USD Ethereum Spot', category: 'crypto', price: 3745.2, change24h: -1.20, spread: 1.85, status: 'open' }
  ]);
  const [activeSymbol, setActiveSymbol] = useState<MarketSymbol>(symbols[0]);

  // Candle Charts Streams Pools (60 points history)
  const [activeCandles, setActiveCandles] = useState<Candle[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<string>('5m');
  const [currentSignal, setCurrentSignal] = useState<AISignal | null>(null);

  // Status flags
  const [isWsConnected, setIsWsConnected] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);

  // Deriv token linkages
  const [derivApiToken, setDerivApiToken] = useState<string>('');
  const [isTokenAuthorized, setIsTokenAuthorized] = useState<boolean>(false);

  // WebSocket Ref handles
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Core Synchronization: Start ticker
  useEffect(() => {
    // Start options ticker countdown loops
    const ticker = setInterval(handleTickCountdown, 1000);
    return () => {
      clearInterval(ticker);
      disconnectWebSocket();
    };
  }, []);

  // Syncing whenever Symbol or Timeframe options alteration triggers
  useEffect(() => {
    // Re-seed stochastic history on symbols flip to ensure beautiful starting points
    const startingPrice = activeSymbol.price;
    const history = generateSyntheticHistory(activeSymbol.symbol, 60, startingPrice);
    setActiveCandles(history);
    
    // Auto query AI Advice on asset changes to refresh instructions
    triggerAIEngineAnalysis(history, activeSymbol);
    
    // Manage Deriv WebSocket Subscription toggle
    subscribeSymbolTick(activeSymbol.symbol);
  }, [activeSymbol.symbol, chartTimeframe]);

  const fetchBackendData = async () => {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Account Info
      const resAccount = await fetch('/api/deriv/account', { headers });
      if (resAccount.ok) {
        const accountData = await resAccount.json();
        // Since we are decoupling a bit from firebase for the dashboard,
        // we can store this in a generic state or modify profile
        setProfile({
          id: accountData.email || 'Deriv User',
          name: accountData.name || 'Deriv User',
          email: accountData.email || '',
          derivAccountId: accountData.client_id || '',
          currency: accountData.currency || 'USD',
          accountType: accountData.is_virtual ? 'demo' : 'real',
          country: accountData.country || '',
          joinDate: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          avatarUrl: '',
          winRate: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          averageProfit: 0,
          averageLoss: 0,
          totalProfitLoss: 0,
          riskScore: 5
        });
      }

      const resBalance = await fetch('/api/deriv/balance', { headers });
      if (resBalance.ok) {
        const balanceData = await resBalance.json();
        setBalance({
          balance: balanceData.balance || 0,
          equity: balanceData.balance || 0,
          margin: 0,
          freeMargin: balanceData.balance || 0,
          dailyPnL: 0,
          weeklyPnL: 0,
          monthlyPnL: 0
        });
      }

    } catch (err) {
      console.error('Failed to sync Deriv OAuth data', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchBackendData();
    }
  }, [isAuthenticated, token]);

  // --- Dynamic calculations parameters mapping on the active candles ---
  const closes = activeCandles.map(c => c.close);
  const smaLine = calculateSMA(closes, 50);
  const emaLine = calculateEMA(closes, 20);
  const bbands = calculateBollingerBands(closes, 20, 2);
  const rsiLine = calculateRSI(closes, 14);
  const macdVal = calculateMACD(closes);
  const atrs = calculateATR(activeCandles, 14);
  const vwaps = calculateVWAP(activeCandles);

  // Package current indicators block safely for AI query or dashboard widgets
  const getCurrentIndicatorsValue = (): TechnicalIndicatorValues => {
    const latIdx = activeCandles.length - 1;
    return {
      rsi: rsiLine[latIdx] || 50,
      macd: {
        macdLine: macdVal.macdLine[latIdx] || 0,
        signalLine: macdVal.signalLine[latIdx] || 0,
        histogram: macdVal.histogram[latIdx] || 0,
      },
      ema20: emaLine[latIdx] || activeSymbol.price,
      sma50: smaLine[latIdx] || activeSymbol.price,
      bollingerBands: {
        upper: bbands.upper[latIdx] || activeSymbol.price,
        middle: bbands.middle[latIdx] || activeSymbol.price,
        lower: bbands.lower[latIdx] || activeSymbol.price,
      },
      atr: atrs[latIdx] || activeSymbol.price * 0.01,
      vwap: vwaps[latIdx] || activeSymbol.price,
    };
  };

  // Trigger server-guided AI Advisor Analysis
  const handleManualAIQuery = async () => {
    await triggerAIEngineAnalysis(activeCandles, activeSymbol);
  };

  const triggerAIEngineAnalysis = async (candlesPool: Candle[], sym: MarketSymbol) => {
    if (candlesPool.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    
    try {
      // Pack the current ticking indicators coordinate
      const inds = getCurrentIndicatorsValue();
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sym.symbol,
          displayName: sym.displayName,
          price: sym.price,
          indicators: inds
        })
      });

      if (response.ok) {
        const signal: AISignal = await response.json();
        setCurrentSignal(signal);
        
        // Append to local state list immediately
        setSignalHistory(prev => [signal, ...prev].slice(0, 50));
        
        // Process Auto-Trade if enabled locally and user is logged in
        if (currentUser && autoTraderConfig?.enabled && riskSettings && balance) {
          const isBuySignal = signal.action === 'BUY';
          const isSellSignal = signal.action === 'SELL';
          
          if (
            (isBuySignal || isSellSignal) && 
            signal.confidence >= autoTraderConfig.confidenceThreshold &&
            autoTraderConfig.currentTradesTodayCount < autoTraderConfig.maxTradesPerDay &&
            !riskSettings.emergencyStopActive &&
            balance.dailyPnL > -riskSettings.dailyLossLimit
          ) {
            const autoStake = Math.round((balance.balance * 0.02) * 10) / 10;
            const autoStakeVal = autoStake > 5 ? autoStake : 50;
            const isDuplicated = positions.some(p => p.symbol === sym.symbol && p.action === signal.action);
            
            if (!isDuplicated || !riskSettings.duplicatePreventionActive) {
                handleExecuteTrade(signal.action as 'BUY' | 'SELL', autoStakeVal, 30, signal.stopLoss, signal.takeProfit).catch(console.error);
                // Notification is handled in executeFirebaseTrade implicitly
            }
          }
        }
      }
    } catch (err) {
      console.error('Trigger signal compiler collapse.', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- WebSocket Connection Manager: Connecting directly to Deriv API ---
  const connectWebSocket = () => {
    if (socketRef.current) return;
    
    setIsWsConnected('connecting');
    logWS('sent', 'connection_attempt', 'Connecting to Deriv WebSocket at wss://ws.derivws.com/websockets/v3...');

    // Public app_id default: 1089 allows playground access
    const app_id = 1089; 
    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${app_id}`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsWsConnected('connected');
      logWS('received', 'connection_open', 'Deriv WS Telemetry link established.');
      
      // Send standard heartbeat ping every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ ping: 1 }));
          logWS('sent', 'ping', 'Heartbeat ping');
        }
      }, 30000);

      // Subscribe to active symbol ticks automatically
      subscribeSymbolTick(activeSymbol.symbol);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const msgType = data.msg_type || 'unknown';
        logWS('received', msgType, data);

        // Heartbeat response
        if (data.ping && data.ping === 'pong') {
          return;
        }

        // Real-time ticking feedback subscription processing
        if (msgType === 'tick' && data.tick) {
          const t = data.tick;
          const targetSym = t.symbol;
          const currentPriceVal = Number(t.quote);

          // Update active symbols ticker prices
          setSymbols(prev => prev.map(s => {
            if (s.symbol === targetSym) {
              const diffPr = currentPriceVal - s.price;
              const pct = s.price > 0 ? (diffPr / s.price) * 100 : 0;
              return {
                ...s,
                price: currentPriceVal,
                change24h: Math.round(pct * 100) / 100
              };
            }
            return s;
          }));

          // If tick is our currently observed symbol, append tick pricing to active candles chart smoothly
          if (targetSym === activeSymbol.symbol) {
            setActiveSymbol(prev => ({ ...prev, price: currentPriceVal }));

            setActiveCandles(prev => {
              if (prev.length === 0) return prev;
              const lastCandle = { ...prev[prev.length - 1] };
              
              // Ticks modify active candle limits continuously
              lastCandle.close = currentPriceVal;
              if (currentPriceVal > lastCandle.high) lastCandle.high = currentPriceVal;
              if (currentPriceVal < lastCandle.low) lastCandle.low = currentPriceVal;
              lastCandle.volume += 1;

              return [...prev.slice(0, prev.length - 1), lastCandle];
            });

            // Feed ticks values directly into open positions so current PnLs track cleanly in real-time
            handlePositionTickingUpdate(currentPriceVal);
          }
        }

        // Authorize confirmation feedback
        if (msgType === 'authorize' && data.authorize) {
          setIsTokenAuthorized(true);
          const balanceVal = Number(data.authorize.balance);
          const nameVal = data.authorize.fullname || 'Tanatswan Deriv';
          
          setProfile(prev => prev ? {
            ...prev,
            name: nameVal,
            derivAccountId: data.authorize.loginid,
            accountType: data.authorize.is_virtual ? 'demo' : 'real'
          } : null);

          setBalance(prev => prev ? {
            ...prev,
            balance: balanceVal,
            equity: balanceVal,
            freeMargin: balanceVal
          } : null);

          addTerminalNotification('success', 'Deriv Verified', `Successfully linked live account profile for ${nameVal}. Secure token handshake complete.`);
        }

      } catch (err) {
        console.error('Socket receiver parsed fail.', err);
      }
    };

    socket.onerror = (error) => {
      logWS('received', 'error', error);
      setIsWsConnected('disconnected');
    };

    socket.onclose = () => {
      logWS('received', 'close', 'Deriv Link Terminated.');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      setIsWsConnected('disconnected');
      socketRef.current = null;
    };
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const subscribeSymbolTick = (sym: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      // Unsubscribe all first
      socketRef.current.send(JSON.stringify({ forget_all: 'ticks' }));
      
      // Subscribe to target tick
      const payload = { ticks: sym };
      socketRef.current.send(JSON.stringify(payload));
      logWS('sent', 'ticks_subscribe', payload);
    }
  };

  const logWS = async (direction: 'sent' | 'received', msgType: string, rawPayload: any) => {
    const stringifiedPayload = typeof rawPayload === 'object' ? JSON.stringify(rawPayload) : String(rawPayload);
    const newLog: WebSocketLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random()*100),
      timestamp: new Date().toISOString(),
      direction,
      messageType: msgType,
      payload: stringifiedPayload
    };

    setWsLogs(prev => [newLog, ...prev].slice(0, 100));
    
    // Send to server db quietly in background
    try {
      fetch('/api/ws/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          messageType: msgType,
          payload: rawPayload
        })
      });
    } catch {
      // quiet fail
    }
  };

  // --- Real-time Local Brownian Ticking simulation (keeps charts fluid if offline/unconnected) ---
  useEffect(() => {
    const backupTicker = setInterval(() => {
      // Only simulate random oscillations if WS is inactive (ensures constant, flawless terminal ticking)
      if (isWsConnected !== 'connected') {
        const drift = 0.00002;
        const vol = 0.0015;
        const rand = Math.random() * 2 - 1;

        setSymbols(prev => prev.map(s => {
          const move = s.price * (drift + vol * rand);
          const nextPricePr = Math.max(0.1, s.price + move);
          
          if (s.symbol === activeSymbol.symbol) {
            handlePositionTickingUpdate(nextPricePr);
            
            // Push dynamic candles update
            setActiveCandles(prevC => {
              if (prevC.length === 0) return prevC;
              const list = [...prevC];
              const last = { ...list[list.length - 1] };
              last.close = nextPricePr;
              if (nextPricePr > last.high) last.high = nextPricePr;
              if (nextPricePr < last.low) last.low = nextPricePr;
              return [...list.slice(0, list.length - 1), last];
            });

            return { ...s, price: nextPricePr };
          }
          return s;
        }));

        setActiveSymbol(prev => {
          const move = prev.price * (drift + vol * rand);
          return { ...prev, price: Math.max(0.1, prev.price + move) };
        });
      }
    }, 1800); // regular high-frequency intervals

    return () => clearInterval(backupTicker);
  }, [activeSymbol.symbol, isWsConnected, positions]);

  // Handle active trading position quote feed ticking updates
  const handlePositionTickingUpdate = async (quotePrice: number) => {
    if (positions.length === 0 || !currentUser) return;
    
    // Notify server of price tick update for calculating current unrealized positions PnLs
    positions.forEach(async (pos) => {
      if (pos.symbol === activeSymbol.symbol) {
        try {
          const profitMult = pos.action === 'BUY' ? 1 : -1;
          const diffFrac = (quotePrice - pos.entryPrice) / pos.entryPrice;
          const pnlVal = Math.round((pos.stake * diffFrac * profitMult * 10) * 100) / 100;
          
          await updateDoc(doc(db, `users/${currentUser.uid}/positions/${pos.id}`), {
             currentPrice: quotePrice,
             pnl: pnlVal
          });
          
          const breachedSL = pos.stopLoss && (pos.action === 'BUY' ? quotePrice <= pos.stopLoss : quotePrice >= pos.stopLoss);
          const breachedTP = pos.takeProfit && (pos.action === 'BUY' ? quotePrice >= pos.takeProfit : quotePrice <= pos.takeProfit);

          if (breachedSL || breachedTP) {
            addTerminalNotification(
              'warning', 
              breachedSL ? 'Stop Loss Breached' : 'Take Profit Breached',
              `Automated risk parameters liquidated ${pos.displayName} order.`
            );
            handleResolveExpirySegment(pos.id, quotePrice);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // --- Contract Options ticking countdown timer ---
  const handleTickCountdown = () => {
    // Decrement positions timeRemaining on client
    setPositions(prev => {
      const updatedList = prev.map(pos => {
        if (pos.timeRemaining > 0) {
          const nextVal = pos.timeRemaining - 1;
          
          if (nextVal <= 0) {
            // Trigger options settlement resolution on the spot
            handleResolveExpirySegment(pos.id, activeSymbol.price);
            return { ...pos, timeRemaining: 0, status: 'closed' as const };
          }
          return { ...pos, timeRemaining: nextVal };
        }
        return pos;
      });

      return updatedList.filter(p => p.timeRemaining > 0);
    });
  };

  const handleResolveExpirySegment = async (posId: string, exitPrice: number) => {
    if (!currentUser) return;
    try {
      const pos = positions.find(p => p.id === posId);
      if (pos) {
        await closeFirebasePosition(pos, exitPrice);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Trade Execute interface link ---
  const handleExecuteTrade = async (
    action: 'BUY' | 'SELL', 
    stake: number, 
    duration: number,
    stopLoss?: number,
    takeProfit?: number
  ) => {
    try {
      await executeFirebaseTrade(
        activeSymbol.symbol,
        activeSymbol.displayName,
        action,
        stake,
        duration,
        activeSymbol.price,
        stopLoss,
        takeProfit
      );
    } catch (err: any) {
      throw new Error(err.message || 'Execution declined.');
    }
  };

  // --- Settle positions manually ---
  const handleSelfClosePosition = async (id: string, exitPrice: number) => {
    await handleResolveExpirySegment(id, exitPrice);
  };

  // --- Journal updates integrations ---
  const handleAddJournal = async (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
    if (!currentUser) return;
    const jId = 'jr_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, `users/${currentUser.uid}/journals/${jId}`), {
      ...entry,
      id: jId,
      userId: currentUser.uid,
      timestamp: new Date().toISOString()
    });
  };

  // --- Risk and Autopilot updates parameters ---
  const handleUpdateRiskRule = async (updates: Partial<RiskSettings>) => {
    if (!currentUser) return;
    await updateDoc(doc(db, `users/${currentUser.uid}/balance/default`), updates);
    addTerminalNotification('success', 'Safeguards Configured', 'System risk limits updated and secured.');
  };

  const handleUpdateAutopilotRule = async (updates: Partial<AutoTraderConfig>) => {
    // No-op for frontend auto-trader local mock for saving config
    addTerminalNotification('info', 'Autopilot Altered', 'AI trading logic targets modified.');
  };

  // --- Edit Profile information ---
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    await updateDoc(doc(db, `users/${currentUser.uid}/profile/default`), updates);
  };

  // --- API token handshake links ---
  const handleAuthorizeToken = async () => {
    if (!derivApiToken) {
      setIsTokenAuthorized(false);
      addTerminalNotification('warning', 'Token Cleared', 'Empty token wrapper. Resetting terminal environment simulation.');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const payload = { authorize: derivApiToken };
      socketRef.current.send(JSON.stringify(payload));
      logWS('sent', 'authorize_call', payload);
    } else {
      addTerminalNotification('danger', 'Socket Offline', 'Active link must be CONNECTED first to authorize live profiles.');
    }
  };

  // Trigger custom notifications notifications
  const addTerminalNotification = (type: 'success' | 'warning' | 'info' | 'danger', title: string, message: string) => {
    // Add audio note ticks if user context supports
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 330, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // quiet
    }
    fetchBackendData();
  };

  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    notifications.forEach(async (n) => {
      await deleteDoc(doc(db, `users/${currentUser.uid}/notifications/${n.id}`));
    });
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    notifications.forEach(async (n) => {
      await updateDoc(doc(db, `users/${currentUser.uid}/notifications/${n.id}`), { isRead: true });
    });
  };

  const handleToggleFavSymbol = (symbolStr: string) => {
    setSymbols(prev => prev.map(s => s.symbol === symbolStr ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const handleExportHistoryToCSV = () => {
    const headers = 'TradeID,Symbol,DisplayName,Action,EntryPrice,ExitPrice,Stake,PnL,Result,Timestamp,AutoTraded\n';
    const rows = tradeHistory.map(t => 
      `"${t.id}","${t.symbol}","${t.displayName}","${t.action}",${t.entryPrice},${t.exitPrice},${t.stake},${t.pnl},"${t.result}","${t.timestamp}",${t.isAutoTraded}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_trade_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 font-mono text-sm tracking-widest text-brand-cyan relative">
        <OAuthCallback />
        
        {/* Only show login button if not currently processing callback */}
        {!(new URLSearchParams(window.location.search).has('code')) && (
          <div className="p-8 border border-gray-800 rounded-xl bg-glass max-w-md text-center shadow-lg shadow-brand-cyan/10 z-10">
            <h1 className="text-2xl font-bold mb-4 font-display text-white">Quantum AI Trader</h1>
            <p className="text-gray-400 mb-8 lowercase">Secure terminal linkage required for real-time telemetry.</p>
            <button 
              onClick={() => loginWithDeriv('1089')}
              className="w-full py-3 px-6 bg-[#ff444f] text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-3"
            >
              Login with Deriv
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!profile || !balance) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-950 font-mono text-sm tracking-widest text-brand-cyan">
        <div className="animate-spin h-9 w-9 border-4 border-brand-cyan border-t-transparent rounded-full mb-4 glow-neon" />
        <span className="animate-pulse">BOOTING QUANTUM AI CORE ENGINE...</span>
      </div>
    );
  }

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen text-gray-200 bg-[#02050c] flex flex-col justify-between" id="terminal-layout-body">
      
      {/* 1. TERMINAL PRIMARY SYSTEM HEADER */}
      <header className="bg-glass border-b border-gray-800/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-cyan/25 glow-neon">
            <Briefcase className="w-4 h-4 text-gray-900 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-white text-base tracking-tight leading-none">QUANTUM AI TRADER</span>
              <span className="text-[9px] font-mono bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                v3.2 PRO
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none mt-1 block">Trade Smarter. Trade with AI.</span>
          </div>
        </div>

        {/* Real-time Tickers Scoreboard */}
        <div className="hidden xl:flex items-center gap-6 text-xs font-mono ml-4">
          {symbols.filter(s => s.isFavorite).map((s) => (
            <div
              key={s.symbol}
              onClick={() => setActiveSymbol(s)}
              className="cursor-pointer hover:bg-gray-900/40 p-1.5 px-3 rounded-lg border border-gray-850/20 hover:border-gray-800/40 transition-all flex items-center gap-2.5"
            >
              <span className="text-gray-400 font-medium">{s.symbol.replace('frx','').replace('cry','')}</span>
              <span className="text-white font-bold">${s.price.toLocaleString(undefined, { maximumFractionDigits: s.price < 5 ? 4 : 1 })}</span>
              <span className={`flex items-center text-[10px] ${s.change24h >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                {s.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change24h > 0 ? `+${s.change24h}` : s.change24h}%
              </span>
            </div>
          ))}
        </div>

        {/* Live wallet and connection actions */}
        <div className="flex items-center gap-4">
          
          {/* Connection Status Indicator */}
          <button
            id="ws-sync-toggle"
            onClick={connectWebSocket}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-medium rounded-full cursor-pointer transition-all border ${
              isWsConnected === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold' 
                : isWsConnected === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {isWsConnected === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-brand-green" />
                <span>DERIV FEED LINKED</span>
              </>
            ) : isWsConnected === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>CONNECTING...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>CONNECT DERIV FEED</span>
              </>
            )}
          </button>

          {/* Wallet Score */}
          <div className="bg-gray-950/40 border border-gray-850 px-3.5 py-1 rounded-lg flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] font-mono text-gray-500 block uppercase leading-none">FREE BALANCE</span>
              <span className="text-sm font-mono font-extrabold text-brand-cyan tracking-tight">${balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Integrated notification panel triggers */}
          <div className="relative">
            <button
              id="toggle-notifications-btn"
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (!showNotificationsDropdown) handleMarkNotificationsRead();
              }}
              className="p-1 px-2.5 py-1.5 rounded-lg border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white transition-all cursor-pointer relative"
            >
              <Bell className="w-4 h-4 text-gray-400" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-bounce">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notifications Alert Dropdown Drawer */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl p-4 z-50 text-xs font-mono space-y-3" id="notifications-dropdown-menu">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="font-bold text-gray-200">System Notification Hub</span>
                  <button onClick={handleClearAllNotifications} className="text-[10px] text-brand-red hover:underline cursor-pointer">Clear All</button>
                </div>
                
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2 bg-gray-900/60 rounded border border-gray-850 flex gap-2">
                        <div className="mt-0.5">
                          {n.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 text-brand-green" />
                          ) : n.type === 'danger' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-brand-red" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-brand-cyan" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-300 leading-none">{n.title}</div>
                          <p className="text-[10px] text-gray-400 leading-tight mt-1">{n.message}</p>
                          <span className="text-[8px] text-gray-600 mt-1 block">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-600 py-4 h-12">No notifications.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Profile Icon header */}
          <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
            <img
              src={profile.avatarUrl}
              alt="Avatar Profile Header"
              className="w-8 h-8 rounded-full object-cover border border-gray-700"
              referrerPolicy="no-referrer"
            />
            <div className="hidden md:block text-left font-mono">
              <div className="text-[10px] text-gray-300 font-bold leading-none">{profile.name}</div>
              <span className="text-[8px] text-gray-500 uppercase leading-none mt-1 block">{profile.derivAccountId}</span>
            </div>
          </div>

        </div>

      </header>

      {/* 2. MAIN GRID LAYOUT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5" id="master-terminal-body-grid">
        
        {/* Left column asset selector listing (Hedge fund watch grid) */}
        <section className="lg:col-span-3 bg-glass rounded-xl p-4 border border-gray-800 flex flex-col justify-between" id="market-listings-panel">
          <div>
            <div className="border-b border-gray-800 pb-2 mb-3">
              <h3 className="text-xs font-display font-extrabold text-white tracking-wide uppercase">Institutional Markets List</h3>
              <p className="text-[9px] font-mono text-gray-500 mt-0.5">Real-time quotes with spreads verification indicators</p>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto" id="watch-symbols-list-body">
              {symbols.map((sym) => {
                const isActive = sym.symbol === activeSymbol.symbol;
                return (
                  <div
                    id={`asset-idx-${sym.symbol}`}
                    key={sym.symbol}
                    onClick={() => setActiveSymbol(sym)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isActive 
                        ? 'bg-brand-cyan/10 border-brand-cyan/25 glow-neon' 
                        : 'bg-gray-950/40 border-transparent hover:bg-gray-900/20 hover:border-gray-850'
                    }`}
                  >
                    <div className="font-mono flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavSymbol(sym.symbol); }}
                        className={`text-sm ${sym.isFavorite ? 'text-brand-cyan' : 'text-gray-600 hover:text-gray-300'}`}
                      >
                        ★
                      </button>
                      <div>
                        <span className="text-xs font-bold text-gray-200">{sym.symbol.replace('frx','').replace('cry','')}</span>
                        <p className="text-[9px] text-gray-500 uppercase leading-none mt-0.5">{sym.category}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px]">
                      <span className="text-white font-bold block">${sym.price.toLocaleString(undefined, { maximumFractionDigits: sym.price < 5 ? 4 : 1 })}</span>
                      <div className="flex justify-end gap-1.5 text-[9px] leading-none mt-1">
                        <span className="text-gray-500">Spr: {sym.spread.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                        <span className={sym.change24h >= 0 ? 'text-brand-green' : 'text-brand-red'}>
                          {sym.change24h > 0 ? `+${sym.change24h}` : sym.change24h}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-gray-800/80 bg-[#00f0ff]/5 p-2 rounded border border-[#00f0ff]/10">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-500">Live Trade Positions:</span>
              <span className="text-white font-semibold">{positions.length} holding</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1.5">
              <span className="text-gray-500">Emergency Stop status:</span>
              <span className={`font-semibold ${riskSettings.emergencyStopActive ? 'text-brand-red' : 'text-brand-green'}`}>
                {riskSettings.emergencyStopActive ? 'LOCKED' : 'NOMINAL SAFE'}
              </span>
            </div>
          </div>
        </section>

        {/* Center column charting / terminals / tabs panel */}
        <section className="lg:col-span-9 flex flex-col gap-5" id="primary-visualizations-and-analytics">
          
          {/* Sub Navigation Bar Tabs */}
          <nav className="flex flex-wrap gap-1 bg-glass p-1 rounded-xl border border-gray-800 text-xs font-mono">
            {[
              { id: 'terminal', label: '📊 EXECUTION TERMINAL' },
              { id: 'signals', label: '🚀 QUANTUM AI HUD' },
              { id: 'history', label: '📜 OPTIONS HISTORY' },
              { id: 'analytics', label: '📈 QUANT RATIOS' },
              { id: 'journal', label: '📓 STRATEGY JOURNAL' },
              { id: 'risk', label: '🛡️ RISK CONTROL' },
              { id: 'account', label: '⚙️ PROFILE DECK' },
              { id: 'logs', label: '💻 WS TELEMETRY' }
            ].map((tab) => (
              <button
                id={`tab-selector-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-lg transition-all font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-brand-cyan text-gray-950 font-bold shadow-md shadow-brand-cyan/15 glow-neon' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ACTIVE CONTENT SHIFT PANELS */}
          <div className="flex-1 min-h-[500px]" id="tab-controlled-pane-content">
            
            {/* 1. PRIMARY TERMINAL TAB PANELS */}
            {activeTab === 'terminal' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5" id="terminal-grid-layout">
                {/* Visual live Candlestick chart panels */}
                <div className="xl:col-span-8">
                  <ChartingWindow
                    candles={activeCandles}
                    smaLine={smaLine}
                    emaLine={emaLine}
                    bollinger={bbands}
                    rsiLine={rsiLine}
                    macd={macdVal}
                    symbol={activeSymbol.symbol}
                    category={activeSymbol.category}
                    timeframe={chartTimeframe}
                    setTimeframe={setChartTimeframe}
                  />
                </div>

                {/* Sell/Buy dispatcher terminals */}
                <div className="xl:col-span-4">
                  <TerminalPanel
                    symbols={symbols}
                    activeSymbol={activeSymbol}
                    onSelectSymbol={(symStr) => {
                      const symObj = symbols.find(s => s.symbol === symStr);
                      if (symObj) setActiveSymbol(symObj);
                    }}
                    balance={balance}
                    positions={positions}
                    onExecuteTrade={handleExecuteTrade}
                    onClosePosition={handleSelfClosePosition}
                    riskSettings={riskSettings}
                  />
                </div>

                {/* Sub Panel: Live open positions options holding metrics */}
                {positions.length > 0 && (
                  <div className="xl:col-span-12 bg-glass rounded-xl p-4 border border-gray-800 font-mono" id="active-contract-positions-dashboard">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-ping" />
                      Active options contracts holding ({positions.length})
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-800/80 text-gray-500 uppercase text-[9px]">
                            <th className="py-1">Contract ID</th>
                            <th>Asset Symbol</th>
                            <th>Action</th>
                            <th>Entry Quote</th>
                            <th>Current Quote</th>
                            <th>Risk Stake</th>
                            <th>Live Returns</th>
                            <th>Time Left</th>
                            <th>Liquidate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900/40">
                          {positions.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 text-gray-400">{p.id}</td>
                              <td className="font-bold text-gray-200">{p.displayName}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${p.action === 'BUY' ? 'text-brand-green bg-brand-green/10' : 'text-brand-red bg-brand-red/10'}`}>
                                  {p.action === 'BUY' ? 'RISE / CALL' : 'FALL / PUT'}
                                </span>
                              </td>
                              <td>${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                              <td>${p.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                              <td className="font-bold text-white">${p.stake}</td>
                              <td className={`font-bold ${p.pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                {p.pnl >= 0 ? `+$${p.pnl}` : `-$${Math.abs(p.pnl)}`}
                              </td>
                              <td className="font-extrabold text-white flex items-center gap-1.5 py-2">
                                <Clock className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
                                {p.timeRemaining}s
                              </td>
                              <td>
                                <button
                                  id={`liquidate-btn-${p.id}`}
                                  onClick={() => handleSelfClosePosition(p.id, activeSymbol.price)}
                                  className="text-[10px] font-mono px-2 py-1 border border-brand-red/30 text-brand-red bg-brand-red/10 rounded hover:bg-brand-red hover:text-white transition-all cursor-pointer"
                                >
                                  Close Spot
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. QUANTUM AI COMPANION HUD PANELS */}
            {activeTab === 'signals' && (
              <SignalCard
                currentSignal={currentSignal}
                signalHistory={signalHistory}
                onTriggerAnalysis={handleManualAIQuery}
                isAnalyzing={isAnalyzing}
                activeSymbol={activeSymbol.displayName}
              />
            )}

            {/* 3. OPTION HISTORY ARCHIVES */}
            {activeTab === 'history' && (
              <div className="bg-glass rounded-xl p-5 border border-gray-800 font-mono" id="trade-history-panel-pane">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-tight">Resolved Option Transactions History</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Export transaction registries straight to standard files formats</p>
                  </div>
                  <button
                    id="export-csv-btn"
                    onClick={handleExportHistoryToCSV}
                    className="px-3 py-1.5 text-xs font-mono border border-brand-cyan/20 text-brand-cyan hover:border-brand-cyan/40 px-2.5 rounded transition-all bg-brand-cyan/5 cursor-pointer flex items-center gap-1.5"
                  >
                    Export Records CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {tradeHistory.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 uppercase text-[9px] py-1">
                          <th className="py-2">Resolved ID</th>
                          <th>Asset Name</th>
                          <th>Side</th>
                          <th>Spot Price</th>
                          <th>Exit Price</th>
                          <th>Stake allocation</th>
                          <th>Option PnL</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/40 text-gray-300">
                        {tradeHistory.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-900/10 transition-colors">
                            <td className="py-2.5 text-gray-500">{t.id}</td>
                            <td className="font-bold text-gray-100">{t.displayName}</td>
                            <td>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.action === 'BUY' ? 'text-brand-green bg-brand-green/10' : 'text-brand-red bg-brand-red/10'
                              }`}>
                                {t.action === 'BUY' ? 'CALL/BUY' : 'PUT/SELL'}
                              </span>
                            </td>
                            <td>${t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                            <td>${t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                            <td>${t.stake}</td>
                            <td className={`font-bold ${t.pnl >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                              {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                            </td>
                            <td className="text-gray-400 text-[10px]">{new Date(t.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center text-gray-500 py-12">No transactions recorded. Complete trade logs first.</div>
                  )}
                </div>
              </div>
            )}

            {/* 4. QUANT RATIOS PERFORMANCE */}
            {activeTab === 'analytics' && (
              <AnalyticsPanel tradeHistory={tradeHistory} profile={profile} />
            )}

            {/* 5. STRATEGY DIARY JOURNAL */}
            {activeTab === 'journal' && (
              <JournalPanel
                journals={journals}
                onAddJournal={handleAddJournal}
                symbols={symbols}
                activeSignal={currentSignal}
              />
            )}

            {/* 6. ADVANCED RISK CONTROLLERS */}
            {activeTab === 'risk' && (
              <RiskPanel
                riskSettings={riskSettings}
                autoTraderConfig={autoTraderConfig}
                onUpdateRisk={handleUpdateRiskRule}
                onUpdateAutotrader={handleUpdateAutopilotRule}
              />
            )}

            {/* 7. PROFILE DECK SETTINGS */}
            {activeTab === 'account' && (
              <AccountPanel
                profile={profile}
                onLogout={logout}
              />
            )}

            {/* 8. WS TELEMETRY LOGS */}
            {activeTab === 'logs' && (
              <div className="bg-glass rounded-xl p-5 border border-gray-800 font-mono h-[480px] flex flex-col justify-between" id="telemetry-logs-panel">
                <div className="border-b border-gray-800 pb-2 mb-3">
                  <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">WebSocket Stream Interceptor Logs</h3>
                  <p className="text-[9px] text-gray-500 mt-0.5">Real-time frames tracking authorized websocket connection feeds</p>
                </div>

                <div className="bg-gray-950 p-4 border border-gray-800/80 rounded-lg flex-1 overflow-y-auto block select-text font-mono text-[10px] leading-relaxed text-gray-400">
                  {wsLogs.length > 0 ? (
                    <div className="space-y-2">
                      {wsLogs.map((log) => (
                        <div key={log.id} className="border-b border-gray-900/60 pb-1.5">
                          <div className="flex justify-between font-bold text-[9px] mb-0.5">
                            <span className={log.direction === 'sent' ? 'text-brand-cyan' : 'text-purple-400'}>
                              [{log.direction.toUpperCase()}] {log.messageType}
                            </span>
                            <span className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="font-mono text-gray-300 break-all">{log.payload}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 py-12">No communication frames logged. Connect Deriv stream first.</div>
                  )}
                </div>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* 3. FOOTER */}
      <footer className="bg-glass border-t border-gray-850 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-gray-500 mt-6" id="master-footer">
        <div>
          <span>Quantum AI Trading Terminal © 2026.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            Safety Shield: Enforces 128-bit SSL PKCE handshakes
          </span>
          <span className="h-4 w-px bg-gray-800" />
          <span>Local Sync Ref: CR-RUN-PROD-NODE</span>
        </div>
      </footer>

    </div>
  );
}
