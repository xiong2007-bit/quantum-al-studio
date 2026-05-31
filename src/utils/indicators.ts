export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateSMA(closes: number[], period: number): number[] {
  const smas: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      smas.push(closes[i]); // Hold values
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smas.push(sum / period);
    }
  }
  return smas;
}

export function calculateEMA(closes: number[], period: number): number[] {
  const emas: number[] = [];
  if (closes.length === 0) return emas;
  
  const k = 2 / (period + 1);
  let ema = closes[0];
  emas.push(ema);
  
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

export function calculateBollingerBands(closes: number[], period: number = 20, multiplier: number = 2) {
  const uppers: number[] = [];
  const middles = calculateSMA(closes, period);
  const lowers: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      uppers.push(closes[i]);
      lowers.push(closes[i]);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middles[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      uppers.push(mean + multiplier * stdDev);
      lowers.push(mean - multiplier * stdDev);
    }
  }
  return { upper: uppers, middle: middles, lower: lowers };
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsis: number[] = [];
  if (closes.length < 2) {
    return Array(closes.length).fill(50);
  }
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial averages
  for (let i = 1; i <= period && i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Fill initial values
  for (let i = 0; i < period; i++) {
    rsis.push(50);
  }
  
  if (closes.length >= period) {
    const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsis.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + initialRs));
    
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      let currentGain = 0;
      let currentLoss = 0;
      if (diff > 0) currentGain = diff;
      else currentLoss = -diff;
      
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsis.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
    }
  }
  
  return rsis;
}

export function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  
  const signalLine = calculateEMA(macdLine, 9);
  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  
  return { macdLine, signalLine, histogram };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atrs: number[] = [];
  if (candles.length === 0) return [];
  
  const trs: number[] = [];
  trs.push(candles[0].high - candles[0].low);
  
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }
  
  // Exponential average of True Ranges
  const k = 2 / (period + 1);
  let atr = trs[0];
  atrs.push(atr);
  for (let i = 1; i < trs.length; i++) {
    atr = trs[i] * k + atr * (1 - k);
    atrs.push(atr);
  }
  return atrs;
}

export function calculateVWAP(candles: Candle[]): number[] {
  const vwaps: number[] = [];
  let cumPV = 0;
  let cumVol = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumPV += typicalPrice * candles[i].volume;
    cumVol += candles[i].volume;
    
    if (cumVol === 0) {
      vwaps.push(candles[i].close);
    } else {
      vwaps.push(cumPV / cumVol);
    }
  }
  return vwaps;
}

// Generate a mock trading chart structure starting with GBM (Geometric Brownian Motion)
export function generateSyntheticHistory(
  symbol: string,
  numPoints: number = 60,
  basePrice: number = 100
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const timeStep = 60000; // 1 minute intervals
  
  // Drift standard deviation parameter controls
  const drift = 0.0001; 
  const volatility = 0.003; 
  
  for (let i = numPoints - 1; i >= 0; i--) {
    const timeString = new Date(now - i * timeStep).toISOString();
    
    // Geometric Brownian Motion step
    const rand = Math.random() * 2 - 1 + (Math.random() * 2 - 1); // pseudo Gaussian
    const priceChange = currentPrice * (drift + volatility * rand);
    const open = currentPrice;
    const close = Math.max(0.1, currentPrice + priceChange);
    
    const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0015);
    const volume = Math.floor(Math.random() * 5000) + 1200;
    
    candles.push({
      time: timeString,
      open: Math.round(open * 100000) / 100000,
      high: Math.round(high * 100000) / 100000,
      low: Math.round(low * 100000) / 100000,
      close: Math.round(close * 100000) / 100000,
      volume
    });
    
    currentPrice = close;
  }
  
  return candles;
}
