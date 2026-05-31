import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DbService } from './server/db';
import { generateAISignal } from './server/ai';
import { AISignal, TechnicalIndicatorValues, TradePosition } from './src/types';
import { DerivApiService } from './server/derivApi';

const app = express();
const PORT = 3000;

app.use(express.json());

// Deriv OAuth endpoints
app.post('/api/oauth/token', async (req, res) => {
  try {
    const { code, code_verifier, redirect_uri, client_id } = req.body;
    
    // As native fetch is supported in modern Node
    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: client_id || '1089',
        code,
        code_verifier,
        redirect_uri
      }).toString()
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to extract token
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  req.token = authHeader.split(' ')[1];
  next();
};

app.get('/api/deriv/account', authMiddleware, async (req: any, res: any) => {
  try {
    const data = await DerivApiService.getAccount(req.token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deriv/balance', authMiddleware, async (req: any, res: any) => {
  try {
    const data = await DerivApiService.getBalance(req.token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deriv/profile', authMiddleware, async (req: any, res: any) => {
  try {
    const data = await DerivApiService.getProfile(req.token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deriv/history', authMiddleware, async (req: any, res: any) => {
  try {
    const data = await DerivApiService.getHistory(req.token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deriv/positions', authMiddleware, async (req: any, res: any) => {
  try {
    const data = await DerivApiService.getPositions(req.token);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  // Can destroy secure cookies if we used them, here we just return ok
  res.json({ success: true });
});

// API: Profile
app.get('/api/profile', (req, res) => {
  try {
    const profile = DbService.getProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile record.' });
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const updated = DbService.updateProfile(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile record.' });
  }
});

// API: Balance
app.get('/api/balance', (req, res) => {
  try {
    const balance = DbService.getBalance();
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve balance metrics.' });
  }
});

// API: Live Open Positions
app.get('/api/positions', (req, res) => {
  try {
    res.json(DbService.getPositions());
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve positions.' });
  }
});

app.post('/api/positions/buy', (req, res) => {
  try {
    const { symbol, displayName, action, stake, durationSeconds, entryPrice, stopLoss, takeProfit, isAutoTraded } = req.body;
    
    // Check risk rules
    const riskSettings = DbService.getRiskSettings();
    const balance = DbService.getBalance();

    // Max risk per trade threshold
    const maxStakeAllowed = (balance.balance * riskSettings.maxRiskPerTrade) / 100;
    if (stake > maxStakeAllowed) {
      return res.status(400).json({ 
        error: `Trade rejected by Risk Guard. Stake size $${stake} exceeds maximum risk limit per trade of $${maxStakeAllowed.toFixed(2)} (${riskSettings.maxRiskPerTrade}% of balance).` 
      });
    }

    // Daily loss check
    if (balance.dailyPnL <= -riskSettings.dailyLossLimit) {
      return res.status(400).json({ 
        error: `Trade rejected. Account is currently locked under daily loss threshold limit (-$${riskSettings.dailyLossLimit}).` 
      });
    }

    if (riskSettings.emergencyStopActive) {
      return res.status(400).json({ 
        error: `Terminal execution currently locked due to active emergency stop condition code.` 
      });
    }

    // Duplicate trade prevention
    const existing = DbService.getPositions().find(p => p.symbol === symbol && p.action === action);
    if (riskSettings.duplicatePreventionActive && existing) {
      return res.status(400).json({
        error: `Duplicate contract prevention is active. An existing ${action} position is already holding on ${symbol}.`
      });
    }

    // Deduct stake from balance margin and open position
    const deduct = Number(stake);
    DbService.updateBalance({
      balance: balance.balance - deduct,
      freeMargin: balance.freeMargin - deduct,
      margin: balance.margin + deduct,
      equity: balance.balance
    });

    const newPosition: TradePosition = {
      id: 'pos_' + Math.random().toString(36).substr(2, 9),
      symbol,
      displayName,
      action: action as 'BUY' | 'SELL',
      entryPrice: Number(entryPrice),
      currentPrice: Number(entryPrice),
      stake: Number(stake),
      pnl: 0,
      startTime: new Date().toISOString(),
      durationSeconds: Number(durationSeconds) || 60,
      timeRemaining: Number(durationSeconds) || 60,
      status: 'open',
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      isAutoTraded: !!isAutoTraded
    };

    const list = DbService.addPosition(newPosition);

    DbService.addNotification(
      'info',
      'Position Dispatched',
      `Executed ${newPosition.action} contract for ${newPosition.displayName}. Stake Amount: $${newPosition.stake} USD.`
    );

    res.json({ message: 'Position executed successfully', positions: list, position: newPosition });
  } catch (error) {
    res.status(500).json({ error: 'Trade dispatch procedure failed.' });
  }
});

// Update a position's current price (ticking)
app.post('/api/positions/:id/tick', (req, res) => {
  try {
    const { id } = req.params;
    const { currentPrice, timeRemaining } = req.body;
    
    const pos = DbService.updatePositionPrice(id, Number(currentPrice));
    if (pos) {
      if (typeof timeRemaining === 'number') {
        pos.timeRemaining = timeRemaining;
      }
      res.json(pos);
    } else {
      res.status(404).json({ error: 'Position not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Tick integration failed.' });
  }
});

// Settle / Close a position manually or on expiry
app.post('/api/positions/:id/close', (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice } = req.body;
    
    // Retrieve position to return stake margin
    const posList = DbService.getPositions();
    const pos = posList.find(p => p.id === id);
    if (!pos) {
      return res.status(404).json({ error: 'Active contract position was not located.' });
    }

    // Close position inside DB which calculates PnL and adds to history
    const historyItem = DbService.closePosition(id, Number(exitPrice));
    
    if (historyItem) {
      // Re-add stake back to margin pool
      const balance = DbService.getBalance();
      const returnStake = pos.stake;
      DbService.updateBalance({
        margin: Math.max(0, balance.margin - returnStake),
        freeMargin: balance.freeMargin + returnStake
      });

      res.json({ message: 'Position cleared', trade: historyItem });
    } else {
      res.status(404).json({ error: 'Position could not be fully liquidated.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Liquidator crash during position resolution.' });
  }
});

// API: Completed Trade History
app.get('/api/history', (req, res) => {
  try {
    res.json(DbService.getTradeHistory());
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// API: Trading Journal Logs
app.get('/api/journals', (req, res) => {
  try {
    res.json(DbService.getJournals());
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/journals', (req, res) => {
  try {
    const entry = DbService.addJournal(req.body);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Could not commit journal entry.' });
  }
});

// API: Risk Management profile settings
app.get('/api/risk', (req, res) => {
  try {
    res.json({
      riskSettings: DbService.getRiskSettings(),
      autoTraderConfig: DbService.getAutoTraderConfig()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/risk', (req, res) => {
  try {
    const updated = DbService.updateRiskSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Could not commit risk configuration.' });
  }
});

app.post('/api/autotrader', (req, res) => {
  try {
    const updated = DbService.updateAutoTraderConfig(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Could not commit automated trade configuration.' });
  }
});

// API: Signals History Logs
app.get('/api/signals', (req, res) => {
  try {
    res.json(DbService.getSignalHistory());
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// API: Client-trigger-able Dynamic AI Indicator Signal Analysis call containing Gemini API hook
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { symbol, displayName, price, indicators } = req.body;
    if (!symbol || !price || !indicators) {
      return res.status(400).json({ error: 'Parameter parameters missing from request body.' });
    }

    // Call quantitative AI builder (Gemini or local fallback)
    const signal: AISignal = await generateAISignal(
      symbol,
      displayName || symbol,
      Number(price),
      indicators as TechnicalIndicatorValues
    );

    // Save newly parsed signal into chronological records
    DbService.addSignal(signal);

    // If signal action matches high confidence auto-trade rules and autotrader is enabled, trigger positions buy automatically
    const autotrader = DbService.getAutoTraderConfig();
    const riskSettings = DbService.getRiskSettings();
    const balance = DbService.getBalance();

    const isBuySignal = signal.action === 'BUY';
    const isSellSignal = signal.action === 'SELL';

    if (
      autotrader.enabled && 
      (isBuySignal || isSellSignal) && 
      signal.confidence >= autotrader.confidenceThreshold &&
      autotrader.currentTradesTodayCount < autotrader.maxTradesPerDay &&
      !riskSettings.emergencyStopActive &&
      balance.dailyPnL > -riskSettings.dailyLossLimit
    ) {
      // Execute simulated automated order on the spot
      const autoStake = Math.round((balance.balance * 0.02) * 10) / 10; // Automatic 2% of capital per automated trade
      const isDuplicated = DbService.getPositions().some(p => p.symbol === symbol && p.action === signal.action);

      if (!isDuplicated || !riskSettings.duplicatePreventionActive) {
        // Increment auto trades today
        DbService.updateAutoTraderConfig({
          currentTradesTodayCount: autotrader.currentTradesTodayCount + 1
        });
        
        // Dispatch auto-trade positions
        const autoStakeVal = autoStake > 5 ? autoStake : 50; // default stake
        const autoDeduct = Number(autoStakeVal);
        
        DbService.updateBalance({
          balance: balance.balance - autoDeduct,
          freeMargin: balance.freeMargin - autoDeduct,
          margin: balance.margin + autoDeduct,
          equity: balance.balance
        });

        const autoPosition: TradePosition = {
          id: 'pos_auto_' + Math.random().toString(36).substr(2, 9),
          symbol,
          displayName: displayName || symbol,
          action: signal.action as 'BUY' | 'SELL',
          entryPrice: Number(price),
          currentPrice: Number(price),
          stake: autoStakeVal,
          pnl: 0,
          startTime: new Date().toISOString(),
          durationSeconds: 30, // 30-sec turbo options options
          timeRemaining: 30,
          status: 'open',
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          isAutoTraded: true
        };

        DbService.addPosition(autoPosition);
        
        DbService.addNotification(
          'success',
          '🤖 Auto-Trader Triggered',
          `Quantum automated engine successfully executed a ${signal.action} option order on ${displayName || symbol} based on a ${signal.confidence}% confidence signal.`
        );
      }
    }

    res.json(signal);
  } catch (error) {
    console.error('Core AI terminal analysis route collapsed.', error);
    res.status(500).json({ error: 'AI indicator compilation session aborted.' });
  }
});

// API: Notifications
app.get('/api/notifications', (req, res) => {
  res.json(DbService.getNotifications());
});

app.post('/api/notifications/read', (req, res) => {
  DbService.markNotificationsRead();
  res.json({ status: 'ok' });
});

app.delete('/api/notifications', (req, res) => {
  DbService.clearNotifications();
  res.json({ status: 'ok' });
});

// API: Central WS log analyzer logs
app.get('/api/ws/logs', (req, res) => {
  res.json(DbService.getLogs());
});

app.post('/api/ws/logs', (req, res) => {
  const { direction, messageType, payload } = req.body;
  DbService.addLogEntry(direction, messageType, JSON.stringify(payload));
  res.json({ status: 'ok' });
});

// Express startup with Vite dev server middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Serving with loaded Vite Development middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving with optimized compiled Static file directories.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quantum AI Trader server running locally on http://localhost:${PORT}`);
  });
}

startServer();
