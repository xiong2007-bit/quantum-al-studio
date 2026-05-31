import { useState, useEffect } from 'react';
import { 
  collection, query, getDocs, doc, setDoc, onSnapshot, updateDoc, deleteDoc,
  serverTimestamp, where, orderBy, getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

import { 
  UserProfile, AccountBalance, TradePosition, TradeHistoryItem, JournalEntry, RiskSettings, AutoTraderConfig, SystemNotification, AISignal
} from '../types';

export function useFirebaseData() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [positions, setPositions] = useState<TradePosition[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [autoTraderConfig, setAutoTraderConfig] = useState<AutoTraderConfig | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [alerts, setAlerts] = useState<AISignal[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Initialize Default User Data if Missing
        const profRef = doc(db, `users/${user.uid}/profile/default`);
        const balRef = doc(db, `users/${user.uid}/balance/default`);
        
        const profSnap = await getDoc(profRef);
        if (!profSnap.exists()) {
          const defaultProfile: UserProfile = {
            id: user.uid,
            name: user.displayName || 'Default User',
            email: user.email || '',
            derivAccountId: 'Awaiting Link',
            currency: 'USD',
            accountType: 'demo',
            country: 'US',
            joinDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            avatarUrl: user.photoURL || '',
            winRate: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            averageProfit: 0,
            averageLoss: 0,
            totalProfitLoss: 0,
            riskScore: 5
          };
          await setDoc(profRef, defaultProfile);
        }

        const balSnap = await getDoc(balRef);
        if (!balSnap.exists()) {
          const defaultBal: AccountBalance = {
            balance: 10000,
            equity: 10000,
            margin: 0,
            freeMargin: 10000,
            dailyPnL: 0,
            weeklyPnL: 0,
            monthlyPnL: 0
          };
          await setDoc(balRef, defaultBal);
        }

        // Keep local pseudo-state for Risk Config (since it's not strictly schema'ed in firebase blueprint)
        // Or store it alongside balance
        setRiskSettings({
          dailyLossLimit: 500,
          maxRiskPerTrade: 2.0,
          emergencyStopActive: false,
          duplicatePreventionActive: true
        });
        setAutoTraderConfig({
          enabled: false,
          confidenceThreshold: 80,
          maxTradesPerDay: 5,
          currentTradesTodayCount: 0
        });

        // Subscriptions
        const unsubProf = onSnapshot(profRef, (doc) => { if (doc.exists()) setProfile(doc.data() as UserProfile); });
        const unsubBal = onSnapshot(balRef, (doc) => { if (doc.exists()) setBalance(doc.data() as AccountBalance); });
        
        const unsubPos = onSnapshot(collection(db, `users/${user.uid}/positions`), (snap) => {
          setPositions(snap.docs.map(d => d.data() as TradePosition));
        });
        
        const unsubHist = onSnapshot(collection(db, `users/${user.uid}/history`), (snap) => {
          setTradeHistory(snap.docs.map(d => d.data() as TradeHistoryItem).sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
        });
        
        const unsubJournals = onSnapshot(collection(db, `users/${user.uid}/journals`), (snap) => {
          setJournals(snap.docs.map(d => d.data() as JournalEntry).sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
        });

        const unsubNotifs = onSnapshot(collection(db, `users/${user.uid}/notifications`), (snap) => {
          setNotifications(snap.docs.map(d => d.data() as SystemNotification).sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
        });

        return () => {
          unsubProf(); unsubBal(); unsubPos(); unsubHist(); unsubJournals(); unsubNotifs();
        };
      } else {
        setProfile(null);
        setBalance(null);
        setPositions([]);
        setTradeHistory([]);
        setJournals([]);
        setNotifications([]);
      }
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  return {
    currentUser, login, logout, profile, setProfile, balance, setBalance, positions, setPositions, tradeHistory, journals, riskSettings, autoTraderConfig, notifications, alerts
  };
}
