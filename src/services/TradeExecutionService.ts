import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MarketSymbol, TradePosition, AccountBalance, RiskSettings, TradeHistoryItem } from '../types';

export const executeFirebaseTrade = async (
  symbol: string,
  displayName: string,
  action: 'BUY' | 'SELL',
  stake: number,
  durationSeconds: number,
  entryPrice: number,
  stopLoss?: number,
  takeProfit?: number,
  isAutoTraded?: boolean
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to execute trades.");

  const uid = user.uid;
  const balRef = doc(db, `users/${uid}/balance/default`);
  const balSnap = await getDoc(balRef);
  if (!balSnap.exists()) throw new Error("Balance missing.");
  
  const balance = balSnap.data() as AccountBalance;
  
  // NOTE: Simple risk checks could be implemented here as well.
  
  const deduct = Number(stake);
  await setDoc(balRef, {
    ...balance,
    balance: balance.balance - deduct,
    freeMargin: balance.freeMargin - deduct,
    margin: balance.margin + deduct,
    equity: balance.balance
  });

  const posId = 'pos_' + Math.random().toString(36).substr(2, 9);
  const newPosition: TradePosition = {
    id: posId,
    userId: uid,
    symbol,
    displayName,
    action,
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
    isAutoTraded: !!isAutoTraded,
    timestamp: new Date().toISOString()
  };

  const posRef = doc(db, `users/${uid}/positions/${posId}`);
  await setDoc(posRef, newPosition);
  
  // Create notification
  const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
  await setDoc(doc(db, `users/${uid}/notifications/${notifId}`), {
    userId: uid,
    timestamp: new Date().toISOString(),
    type: 'success',
    title: 'Position Dispatched',
    message: `Executed ${action} contract for ${displayName}. Stake: $${stake} USD.`,
    isRead: false
  });
  
  return newPosition;
};

export const closeFirebasePosition = async (pos: TradePosition, exitPrice: number) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to close trades.");
  const uid = user.uid;

  const profitMult = pos.action === 'BUY' ? 1 : -1;
  const diffFrac = (exitPrice - pos.entryPrice) / pos.entryPrice;
  const pnlSum = Math.round((pos.stake * diffFrac * profitMult * 10) * 100) / 100;

  const histId = 'tx_c' + Math.floor(Math.random() * 900000 + 100000);
  const historyItem: TradeHistoryItem = {
    id: histId,
    userId: uid,
    symbol: pos.symbol,
    displayName: pos.displayName,
    action: pos.action,
    entryPrice: pos.entryPrice,
    exitPrice: exitPrice,
    stake: pos.stake,
    pnl: pnlSum,
    result: pnlSum > 0 ? 'win' : pnlSum < 0 ? 'loss' : 'refund',
    timestamp: new Date().toISOString(),
    isAutoTraded: pos.isAutoTraded
  };

  const histRef = doc(db, `users/${uid}/history/${histId}`);
  await setDoc(histRef, historyItem);

  const posRef = doc(db, `users/${uid}/positions/${pos.id}`);
  await deleteDoc(posRef);

  const balRef = doc(db, `users/${uid}/balance/default`);
  const balSnap = await getDoc(balRef);
  if (balSnap.exists()) {
    const b = balSnap.data() as AccountBalance;
    await setDoc(balRef, {
      ...b,
      balance: b.balance + pnlSum,
      equity: b.balance + pnlSum,
      margin: Math.max(0, b.margin - pos.stake),
      freeMargin: b.freeMargin + pos.stake + pnlSum,
      dailyPnL: b.dailyPnL + pnlSum,
      weeklyPnL: b.weeklyPnL + pnlSum,
      monthlyPnL: b.monthlyPnL + pnlSum
    });
  }

  // Create notification
  const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
  await setDoc(doc(db, `users/${uid}/notifications/${notifId}`), {
    userId: uid,
    timestamp: new Date().toISOString(),
    type: pnlSum >= 0 ? 'success' : 'danger',
    title: 'Trade Settle Resolved',
    message: `Completed ${pos.displayName} ${pos.action} order. Result: ${pnlSum >= 0 ? '+$' : '-$'}${Math.abs(pnlSum)} USD.`,
    isRead: false
  });
};
