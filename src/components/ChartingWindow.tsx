import { useState, useRef, useEffect, MouseEvent } from 'react';
import { LucideIcon, TrendingUp, Eye, EyeOff, Settings, Crosshair, HelpCircle, Flame } from 'lucide-react';
import { Candle } from '../utils/indicators';

interface ChartingWindowProps {
  candles: Candle[];
  smaLine: number[];
  emaLine: number[];
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
  rsiLine: number[];
  macd: { macdLine: number[]; signalLine: number[]; histogram: number[] };
  symbol: string;
  category: string;
  timeframe: string;
  setTimeframe: (tf: string) => void;
}

export default function ChartingWindow({
  candles,
  smaLine,
  emaLine,
  bollinger,
  rsiLine,
  macd,
  symbol,
  category,
  timeframe,
  setTimeframe,
}: ChartingWindowProps) {
  // Configuration toggles
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [subChartMode, setSubChartMode] = useState<'rsi' | 'macd' | 'none'>('rsi');
  
  // Interactive Support & Resistance Line Drawings
  const [drawings, setDrawings] = useState<{ id: string; yPrice: number; color: string; label: string }[]>([]);
  const [activeDrawingColor, setActiveDrawingColor] = useState('#00f0ff');
  const [activeDrawingLabel, setActiveDrawingLabel] = useState('Support');
  
  // Crosshair tracking state
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number } | null>(null);
  const [crosshairInfo, setCrosshairInfo] = useState<{ price: number; date: string } | null>(null);

  // Auto-seeding initial horizontal support/resistance reference markers matching historical pricing nodes
  useEffect(() => {
    if (candles.length > 0) {
      const closes = candles.map(c => c.close);
      const min = Math.min(...closes);
      const max = Math.max(...closes);
      const mid = (min + max) / 2;
      
      setDrawings([
        { id: 'dr_1', yPrice: Math.round(min * 100) / 100, color: '#10b981', label: 'BOS Support' },
        { id: 'dr_2', yPrice: Math.round(max * 100) / 100, color: '#ef4444', label: 'Overhead Resistance' }
      ]);
    }
  }, [symbol]);

  if (candles.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-gray-900/30 border border-gray-800 rounded-xl" id="chart-vacant">
        <div className="animate-spin h-8 w-8 border-4 border-brand-cyan border-t-transparent rounded-full mb-3" />
        <span className="text-sm text-gray-400 font-mono">Syncing Quantum Telemetry Stream...</span>
      </div>
    );
  }

  // Mathematics: Find Min/Max prices to scale our dynamic drawing frame
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  // Incorporate technical indicator ranges if visible
  let maxPrice = Math.max(...highs);
  let minPrice = Math.min(...lows);
  
  if (showSMA && smaLine.length > 0) {
    maxPrice = Math.max(maxPrice, ...smaLine);
    minPrice = Math.min(minPrice, ...smaLine);
  }
  if (showEMA && emaLine.length > 0) {
    maxPrice = Math.max(maxPrice, ...emaLine);
    minPrice = Math.min(minPrice, ...emaLine);
  }
  if (showBB && bollinger.upper.length > 0) {
    maxPrice = Math.max(maxPrice, ...bollinger.upper);
    minPrice = Math.min(minPrice, ...bollinger.lower);
  }
  
  // Add 4% buffer margin above and below limits
  const priceRange = maxPrice - minPrice;
  const paddingOffset = priceRange * 0.05 || 1;
  const chartMax = maxPrice + paddingOffset;
  const chartMin = Math.max(0.00001, minPrice - paddingOffset);

  // Grid coordinates mapping parameters
  const svgWidth = 800;
  const mainChartHeight = 240;
  const subChartHeight = 80;
  const gapHeight = 20;
  const svgHeight = mainChartHeight + (subChartMode !== 'none' ? gapHeight + subChartHeight : 0) + 30; // 30 is timeline padding

  // Translate Price coordinate to SVG Y
  const priceToY = (price: number) => {
    return mainChartHeight - ((price - chartMin) / (chartMax - chartMin)) * mainChartHeight;
  };

  // Translate SVG Y to Price coordinate
  const yToPrice = (y: number) => {
    return chartMax - (y / mainChartHeight) * (chartMax - chartMin);
  };

  // Translate Index block to SVG X
  const getX = (idx: number) => {
    return (idx / (candles.length - 1)) * (svgWidth - 60) + 20; // 20 is left margin, 60 is padding for y-axis
  };

  // Timeline Mouse tracking handlers
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const y = ((e.clientY - rect.top) / rect.height) * svgHeight;
    
    setMouseCoord({ x, y });

    // Derive nearest pricing candle index
    const chartUsableWidth = svgWidth - 60;
    const clickXPercent = (x - 20) / chartUsableWidth;
    let idx = Math.round(clickXPercent * (candles.length - 1));
    idx = Math.max(0, Math.min(candles.length - 1, idx));

    const candle = candles[idx];
    if (candle) {
      const trackedPrice = yToPrice(y);
      setCrosshairInfo({
        price: y <= mainChartHeight ? trackedPrice : candle.close,
        date: new Date(candle.time).toLocaleTimeString()
      });
    }
  };

  const handleMouseLeave = () => {
    setMouseCoord(null);
    setCrosshairInfo(null);
  };

  // Click on SVG to stamp a Support or Resistance horizontal line
  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !mouseCoord) return;
    const yVal = mouseCoord.y;
    
    // Check if click bounds fall cleanly in primary chart coordinates
    if (yVal >= 0 && yVal <= mainChartHeight) {
      const clickedPrice = yToPrice(yVal);
      const newD = {
        id: 'dr_' + Date.now(),
        yPrice: Math.round(clickedPrice * 100000) / 100000,
        color: activeDrawingColor,
        label: activeDrawingLabel + ` ($${Math.round(clickedPrice * 100) / 100})`
      };
      setDrawings([...drawings, newD]);
    }
  };

  const clearDrawingLine = (id: string) => {
    setDrawings(drawings.filter(d => d.id !== id));
  };

  // Convert technical indicators curves to polygon string lines smoothly
  const buildSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  };

  return (
    <div className="w-full bg-glass rounded-xl p-5 border border-gray-800" id="unified-chart-window">
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4 mb-4">
        {/* Left indicators toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider pr-1">Indicators:</span>
          <button
            id="toggle-sma"
            onClick={() => setShowSMA(!showSMA)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              showSMA 
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                : 'bg-gray-800/20 border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            SMA 50
          </button>
          <button
            id="toggle-ema"
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              showEMA 
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' 
                : 'bg-gray-800/20 border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            EMA 20
          </button>
          <button
            id="toggle-bb"
            onClick={() => setShowBB(!showBB)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              showBB 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                : 'bg-gray-800/20 border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            BB (20, 2)
          </button>
          
          <div className="h-5 w-px bg-gray-800 mx-1" />
          
          <button
            id="toggle-rsi"
            onClick={() => setSubChartMode(subChartMode === 'rsi' ? 'none' : 'rsi')}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              subChartMode === 'rsi'
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' 
                : 'bg-gray-800/20 border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            RSI (14)
          </button>
          
          <button
            id="toggle-macd"
            onClick={() => setSubChartMode(subChartMode === 'macd' ? 'none' : 'macd')}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
              subChartMode === 'macd'
                ? 'bg-green-500/10 border-green-500/40 text-green-400' 
                : 'bg-gray-800/20 border-gray-800 text-gray-500 hover:border-gray-700'
            }`}
          >
            MACD (12, 26)
          </button>
        </div>

        {/* Dynamic timeframe & category indicators */}
        <div className="flex items-center gap-2">
          {['1m', '5m', '15m', '1H'].map((tf) => (
            <button
              id={`tf-${tf}`}
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-xs font-mono font-medium rounded-md transition-all ${
                timeframe === tf 
                  ? 'bg-brand-cyan text-gray-950 font-bold' 
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas and Interactive Charting */}
      <div className="relative select-none" id="chart-panel-canvas">
        {/* Render interactive coordinate values above cursor */}
        {mouseCoord && crosshairInfo && (
          <div className="absolute top-2 left-4 bg-gray-950/90 border border-gray-800 rounded px-2.5 py-1 text-[11px] font-mono text-gray-300 z-10 flex gap-4 pointer-events-none shadow-xl">
            <div>Price: <span className="text-brand-cyan">${crosshairInfo.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span></div>
            <div>Time: <span className="text-gray-400">{crosshairInfo.date}</span></div>
          </div>
        )}

        <svg
          id="deriv-candle-svg"
          ref={svgRef}
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="bg-gray-950/20 rounded-lg cursor-crosshair border border-gray-800/50"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleSvgClick}
        >
          {/* DEFINITIONS AND FILTERS */}
          <defs>
            <linearGradient id="bullGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="bearGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="glowArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* GRID LINES BACKGROUND (Y Price Axes) */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const hVal = mainChartHeight * ratio;
            const priceVal = chartMax - ratio * (chartMax - chartMin);
            return (
              <g key={`gridPrice-${i}`}>
                <line
                  x1="20"
                  y1={hVal}
                  x2={svgWidth - 60}
                  y2={hVal}
                  stroke="#1f2937"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={svgWidth - 56}
                  y={hVal + 4}
                  fill="#6b7280"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  ${priceVal.toLocaleString(undefined, { maximumFractionDigits: (symbol.includes('EUR') || symbol.includes('GBP')) ? 4 : 1 })}
                </text>
              </g>
            );
          })}

          {/* CHRONOS TIMELINE LABELS (X Date Axes) */}
          {candles.filter((_, idx) => idx % 12 === 0).map((candle, i) => {
            const idx = candle ? candles.indexOf(candle) : 0;
            const xPos = getX(idx);
            return (
              <g key={`gridTime-${i}`}>
                <line
                  x1={xPos}
                  y1={0}
                  x2={xPos}
                  y2={mainChartHeight}
                  stroke="#1f2937"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                />
                <text
                  x={xPos}
                  y={svgHeight - 14}
                  fill="#6b7280"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {new Date(candle.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </text>
              </g>
            );
          })}

          {/* OVERLAYS: BOLLINGER BANDS (Upper & Lower areas) */}
          {showBB && bollinger && bollinger.upper && bollinger.upper.length > 0 && (
            <g opacity="0.32">
              <path
                d={buildSvgPath(bollinger.upper.map((val, idx) => ({ x: getX(idx), y: priceToY(val) })))}
                fill="none"
                stroke="#00ffff"
                strokeWidth="1.2"
                strokeDasharray="1 1"
              />
              <path
                d={buildSvgPath(bollinger.lower.map((val, idx) => ({ x: getX(idx), y: priceToY(val) })))}
                fill="none"
                stroke="#00ffff"
                strokeWidth="1.2"
                strokeDasharray="1 1"
              />
            </g>
          )}

          {/* OVERLAYS: SIMPLE MOVING AVERAGE (SMA 50) */}
          {showSMA && smaLine && smaLine.length > 0 && (
            <path
              d={buildSvgPath(smaLine.map((val, idx) => ({ x: getX(idx), y: priceToY(val) })))}
              fill="none"
              stroke="#0066ff"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}

          {/* OVERLAYS: EXPONENTIAL MOVING AVERAGE (EMA 20) */}
          {showEMA && emaLine && emaLine.length > 0 && (
            <path
              d={buildSvgPath(emaLine.map((val, idx) => ({ x: getX(idx), y: priceToY(val) })))}
              fill="none"
              stroke="#bf55ec"
              strokeWidth="2.0"
              strokeLinecap="round"
              opacity="0.8"
            />
          )}

          {/* DRAW CANDLESTICKS (OHLC Bodies and Shadows) */}
          {candles.map((candle, idx) => {
            const x = getX(idx);
            const yOpen = priceToY(candle.open);
            const yClose = priceToY(candle.close);
            const yHigh = priceToY(candle.high);
            const yLow = priceToY(candle.low);
            
            const isBullish = candle.close >= candle.open;
            const strokeColor = isBullish ? '#10b981' : '#ef4444';
            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
            
            // Scaled candle space width based on dataset count
            const candleWidth = Math.max(1, (svgWidth - 60) / candles.length * 0.7);

            return (
              <g key={`candle-${idx}`}>
                {/* Wick shadow line */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                />
                {/* Candle body rect */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? strokeColor : strokeColor}
                  stroke={strokeColor}
                  strokeWidth="0.5"
                  rx="1"
                  opacity="0.9"
                />
              </g>
            );
          })}

          {/* DRAWINGS: Dynamic Support and Resistance Markers */}
          {drawings.map((draw) => {
            const yCoord = priceToY(draw.yPrice);
            if (yCoord < 0 || yCoord > mainChartHeight) return null;
            return (
              <g key={`userDraw-${draw.id}`}>
                <line
                  x1={20}
                  y1={yCoord}
                  x2={svgWidth - 60}
                  y2={yCoord}
                  stroke={draw.color}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={24}
                  y={yCoord - 4}
                  fill={draw.color}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {draw.label}
                </text>
              </g>
            );
          })}

          {/* SUB-CHART 1: RSI LOWER INDICATOR */}
          {subChartMode === 'rsi' && rsiLine && rsiLine.length > 0 && (
            <g transform={`translate(0, ${mainChartHeight + gapHeight})`}>
              {/* Box boundaries */}
              <rect
                x="20"
                y="0"
                width={svgWidth - 80}
                height={subChartHeight}
                fill="rgba(0, 0, 0, 0.3)"
                stroke="#374151"
                strokeWidth="0.5"
                rx="4"
              />
              
              {/* Overbought line (RSI 70) */}
              <line
                x1="20"
                y1={subChartHeight * 0.3}
                x2={svgWidth - 60}
                y2={subChartHeight * 0.3}
                stroke="#ef4444"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text x={svgWidth - 56} y={subChartHeight * 0.3 + 3} fill="#ef4444" fontSize="8" fontFamily="monospace">70</text>
              
              {/* Oversold line (RSI 30) */}
              <line
                x1="20"
                y1={subChartHeight * 0.7}
                x2={svgWidth - 60}
                y2={subChartHeight * 0.7}
                stroke="#10b981"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text x={svgWidth - 56} y={subChartHeight * 0.7 + 3} fill="#10b981" fontSize="8" fontFamily="monospace">30</text>
              
              {/* RSI Curve Plot */}
              <path
                d={buildSvgPath(rsiLine.map((val, idx) => ({
                  x: getX(idx),
                  y: subChartHeight - (val / 100) * subChartHeight
                })))}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.5"
              />
              
              {/* Sub-label */}
              <text
                x="25"
                y="12"
                fill="#f97316"
                fontSize="8"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                RSI (14): {rsiLine[rsiLine.length - 1]?.toFixed(1)}
              </text>
            </g>
          )}

          {/* SUB-CHART 2: MACD LOWER INDICATOR */}
          {subChartMode === 'macd' && macd && macd.macdLine && (
            <g transform={`translate(0, ${mainChartHeight + gapHeight})`}>
              <rect
                x="20"
                y="0"
                width={svgWidth - 80}
                height={subChartHeight}
                fill="rgba(0, 0, 0, 0.3)"
                stroke="#374151"
                strokeWidth="0.5"
                rx="4"
              />
              
              {/* Zero line */}
              <line
                x1="20"
                y1={subChartHeight / 2}
                x2={svgWidth - 60}
                y2={subChartHeight / 2}
                stroke="#6b7280"
                strokeWidth="0.5"
                opacity="0.5"
              />
              
              {/* Determine Macd Max boundaries for coordinate translation */}
              {(() => {
                const maxMacd = Math.max(
                  ...macd.macdLine,
                  ...macd.signalLine,
                  ...macd.histogram.map(Math.abs)
                ) || 0.1;
                
                const macdToY = (val: number) => {
                  return subChartHeight / 2 - (val / maxMacd) * (subChartHeight / 2.2);
                };

                return (
                  <g>
                    {/* Histogram Bars */}
                    {macd.histogram.map((val, idx) => {
                      const barX = getX(idx);
                      const barY1 = subChartHeight / 2;
                      const barY2 = macdToY(val);
                      const barColor = val >= 0 ? '#10b981' : '#ef4444';
                      
                      return (
                        <line
                          key={`macdBar-${idx}`}
                          x1={barX}
                          y1={barY1}
                          x2={barX}
                          y2={barY2}
                          stroke={barColor}
                          strokeWidth="1.2"
                          opacity="0.6"
                        />
                      );
                    })}

                    {/* MACD Signal Line (EMA 9) */}
                    <path
                      d={buildSvgPath(macd.signalLine.map((val, idx) => ({ x: getX(idx), y: macdToY(val) })))}
                      fill="none"
                      stroke="#bf55ec"
                      strokeWidth="1.2"
                    />

                    {/* MACD Line */}
                    <path
                      d={buildSvgPath(macd.macdLine.map((val, idx) => ({ x: getX(idx), y: macdToY(val) })))}
                      fill="none"
                      stroke="#00ffff"
                      strokeWidth="1.2"
                    />
                    
                    <text x="25" y="12" fill="#00ffff" fontSize="8" fontWeight="bold">
                      MACD: {macd.macdLine[macd.macdLine.length - 1]?.toFixed(3)}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* FLOATING CROSSHAIR RENDER */}
          {mouseCoord && mouseCoord.x >= 20 && mouseCoord.x <= svgWidth - 60 && (
            <g>
              {/* Vertical link line */}
              <line
                x1={mouseCoord.x}
                y1={0}
                x2={mouseCoord.x}
                y2={svgHeight - 25}
                stroke="#6b7280"
                strokeWidth="0.8"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              {/* Horizontal price line */}
              {mouseCoord.y >= 0 && mouseCoord.y <= mainChartHeight && (
                <line
                  x1={20}
                  y1={mouseCoord.y}
                  x2={svgWidth - 60}
                  y2={mouseCoord.y}
                  stroke="#ef4444"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  opacity="0.75"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* DRAWING TOOL SLIDERS */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800/60 bg-gray-900/10 p-3 rounded-lg" id="chart-panel-draw-panel">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-gray-400 font-medium">Click on chart area to add horizontal markers at target price.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveDrawingLabel('Support'); setActiveDrawingColor('#10b981'); }}
              className={`px-2.5 py-0.5 text-xs font-mono rounded ${activeDrawingLabel === 'Support' ? 'bg-brand-green/20 text-brand-green border border-brand-green/45' : 'bg-gray-800 text-gray-400'}`}
            >
              + Support (Green)
            </button>
            <button
              onClick={() => { setActiveDrawingLabel('Resistance'); setActiveDrawingColor('#ef4444'); }}
              className={`px-2.5 py-0.5 text-xs font-mono rounded ${activeDrawingLabel === 'Resistance' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-gray-800 text-gray-400'}`}
            >
              + Resistance (Red)
            </button>
          </div>
        </div>

        {drawings.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-gray-500">Active Lines:</span>
            {drawings.map((d) => (
              <span
                key={d.id}
                style={{ borderColor: d.color + '44' }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border bg-gray-950/40"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-300">{d.label}</span>
                <button
                  onClick={() => clearDrawingLine(d.id)}
                  className="text-gray-500 hover:text-white font-bold ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
