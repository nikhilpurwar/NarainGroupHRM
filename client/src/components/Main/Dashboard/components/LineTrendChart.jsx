import React, { useState, useRef } from "react";

const LineTrendChart = ({ data = [], loading, height = 120, stroke = "#2563eb" }) => {
  const [hover, setHover] = useState(null);
  const chartRef = useRef(null);

if (loading) {
  return (
    <div className="w-full h-[160px] relative overflow-hidden bg-gradient-to-b from-emerald-50/30 to-white">
      {/* Shimmer overlay animation with green tint */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/60 to-transparent animate-shimmer z-10"></div>

      {/* Chart area skeleton */}
      <div className="absolute inset-0 flex flex-col">
        {/* Horizontal grid lines with subtle animation */}
        <div className="flex-1 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div
                className="w-8 h-2 bg-gradient-to-r from-emerald-200 via-emerald-300/80 to-emerald-200 rounded mr-2 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-100/60 via-emerald-200/40 to-emerald-100/60"></div>
            </div>
          ))}
        </div>

        {/* Chart line with animated wave */}
        <div className="absolute left-8 right-4 bottom-8 top-8">
          <div className="relative h-full">
            {/* Wave line with animation */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a7f3d0"> {/* emerald-200 */}
                    <animate
                      attributeName="stop-color"
                      values="#a7f3d0; #6ee7b7; #a7f3d0" /* emerald-200 to emerald-300 to emerald-200 */
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="50%" stopColor="#10b981"> {/* emerald-500 */}
                    <animate
                      attributeName="stop-color"
                      values="#10b981; rgb(22, 163, 74); #10b981" /* emerald-500 to your green to emerald-500 */
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="100%" stopColor="#a7f3d0"> {/* emerald-200 */}
                    <animate
                      attributeName="stop-color"
                      values="#a7f3d0; #6ee7b7; #a7f3d0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                
                {/* Glow effect */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Animated wave path */}
              <path
                d="M0,50 Q25,30 50,50 T100,50"
                fill="none"
                stroke="url(#waveGradient)"
                strokeWidth="3"
                filter="url(#glow)"
              >
                <animate
                  attributeName="d"
                  values="M0,50 Q25,30 50,50 T100,50;
                          M0,50 Q25,70 50,50 T100,50;
                          M0,50 Q25,40 50,50 T100,40;
                          M0,50 Q25,30 50,50 T100,50"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>
              
              {/* Additional glow line */}
              <path
                d="M0,50 Q25,30 50,50 T100,50"
                fill="none"
                stroke="rgba(22, 163, 74, 0.2)"
                strokeWidth="5"
                strokeLinecap="round"
              >
                <animate
                  attributeName="d"
                  values="M0,50 Q25,30 50,50 T100,50;
                          M0,50 Q25,70 50,50 T100,50;
                          M0,50 Q25,30 50,50 T100,50"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>

            {/* Pulsing dots at data points with wave effect */}
            {[0, 20, 40, 60, 80, 100].map((position, i) => {
              const waveOffset = Math.sin(i * 0.8) * 20;
              const greenIntensity = Math.max(0.2, Math.sin(i * 0.5) * 0.3 + 0.5);
              const color = `rgba(22, 163, 74, ${greenIntensity})`;
              
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-pulse"
                  style={{
                    left: `${position}%`,
                    bottom: `calc(30% + ${waveOffset}px)`,
                    animationDelay: `${i * 0.2}s`,
                    background: `radial-gradient(circle, ${color}, rgb(167, 243, 208))`,
                    boxShadow: `0 0 12px ${color}`,
                    transition: 'bottom 2s ease-in-out, transform 0.3s ease',
                  }}
                  onAnimationIteration={(e) => {
                    e.currentTarget.style.transform = `scale(${1 + Math.random() * 0.2})`;
                  }}
                >
                  {/* Ring effect around dots */}
                  <div
                    className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping"
                    style={{ 
                      animationDelay: `${i * 0.3}s`,
                      borderColor: `rgba(22, 163, 74, 0.4)`
                    }}
                  ></div>
                  
                  {/* Inner glow */}
                  <div className="absolute inset-1 rounded-full bg-white/30"></div>
                </div>
              );
            })}
            
            {/* Floating particles */}
            <div className="absolute inset-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-emerald-300/60 animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random() * 2}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* X-axis labels with wave animation */}
        <div className="flex justify-between mt-2 px-2">
          {[...Array(7)].map((_, i) => {
            const opacity = 0.5 + Math.sin(i * 0.5) * 0.2;
            return (
              <div
                key={i}
                className="relative group"
              >
                <div
                  className="w-6 h-2 bg-gradient-to-r from-emerald-200/80 via-emerald-300/70 to-emerald-200/80 rounded animate-pulse"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animation: `waveHeight 2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: opacity
                  }}
                />
                {/* Subtle wave effect under labels */}
                <div
                  className="absolute -bottom-1 left-1/2 w-4 h-1 bg-emerald-100/50 rounded-full transform -translate-x-1/2 group-hover:bg-emerald-200/70 transition-colors"
                  style={{
                    animation: `waveWidth 1.5s ease-in-out ${i * 0.15}s infinite`,
                  }}
                ></div>
                
                {/* Hover effect */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-4 bg-emerald-500/90 rounded flex items-center justify-center">
                    <div className="w-4 h-1 bg-white/80 rounded"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Animated Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-6">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="flex items-center"
            >
              <div 
                className="w-6 h-2 bg-gradient-to-r from-emerald-200 to-emerald-300/80 rounded animate-pulse ml-1"
                style={{ 
                  animationDelay: `${i * 0.05}s`,
                  transform: `scale(${0.8 + i * 0.05})`
                }}
              />
              <div className="ml-1 w-2 h-px bg-emerald-100/40"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Background gradient pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(22, 163, 74)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="rgb(167, 243, 208)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="rgb(22, 163, 74)" stopOpacity="0.1" />
            </linearGradient>
            <pattern id="wavePattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M0,30 Q15,15 30,30 T60,30"
                fill="none"
                stroke="rgb(22, 163, 74)"
                strokeWidth="0.8"
                strokeOpacity="0.2"
              />
              <path
                d="M0,40 Q15,55 30,40 T60,40"
                fill="none"
                stroke="rgb(167, 243, 208)"
                strokeWidth="0.8"
                strokeOpacity="0.2"
              />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#bgGradient)"></rect>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#wavePattern)" fillOpacity="0.3"></rect>
        </svg>
      </div>
      
      {/* Pulse effect overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-2 border-emerald-200/20 rounded-lg animate-pulse" style={{ animationDuration: '3s' }}></div>
      </div>
    </div>
  );
}

  if (!data || !data.length)
    return <div className="text-sm text-gray-500">No trend data</div>;

  const width = 600;
  const paddingLeft = 36;
  const paddingRight = 12;

  const max = Math.max(...data.map((d) => d.value || 0), 1);
  const min = Math.min(...data.map((d) => d.value || 0), 0);
  const range = max - min || 1;

  const pointsArr = data.map((d, i) => {
    const x =
      paddingLeft +
      (i / (data.length - 1)) * (width - paddingLeft - paddingRight);
    const y = 10 + (1 - (d.value - min) / range) * (height - 20);
    return { x, y, label: d.date || d.label || "", value: d.value || 0 };
  });

  const points = pointsArr.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${paddingLeft},${height - 8} ${points} ${width - paddingRight
    },${height - 8}`;

  return (
    <div className="w-full overflow-x-auto relative" ref={chartRef}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Attendance trend chart"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.14" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const yy = 10 + (1 - t) * (height - 20);
          const val = Math.round(min + t * range);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={yy}
                y2={yy}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
              <text x={6} y={yy + 4} fontSize={10} fill="#6b7280">
                {val}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill="url(#trendGrad)" />
        <polyline
          fill="none"
          stroke="#e0e7ff"
          strokeWidth="6"
          points={points}
          opacity="0.6"
        />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {pointsArr.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={stroke}
            onMouseEnter={(e) => {
              const rect = chartRef.current?.getBoundingClientRect();
              const offsetX = rect ? e.clientX - rect.left : p.x;
              const offsetY = rect ? e.clientY - rect.top : p.y;
              setHover({
                x: offsetX,
                y: offsetY,
                label: p.label,
                value: p.value,
              });
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover && (() => {
        const containerW = chartRef.current
          ? chartRef.current.clientWidth
          : width;
        const tooltipW = 140;
        const left = Math.min(
          Math.max(hover.x - 6, 8),
          Math.max(8, containerW - tooltipW - 8)
        );
        const top = Math.max(hover.y - 66, 8);
        const triangleLeft = Math.max(
          8,
          Math.min(tooltipW - 12, Math.round(hover.x - left - 6))
        );

        return (
          <div
            style={{
              position: "absolute",
              left: left + "px",
              top: top + "px",
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            <div className="bg-white text-xs text-gray-800 shadow-xl rounded-lg border border-gray-200 px-3 py-2">
              <div className="font-semibold text-s">{hover.label}</div>
              <div className="text-gray-600 font-medium text-11px">
                {hover.value}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                left: triangleLeft + "px",
                top: "100%",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid rgba(17,24,39,0.9)",
                }}
              />
            </div>
          </div>
        );
      })()}

      <div className="mt-3 text-xs text-gray-400 tracking-wide">
        Hover points to see exact values
      </div>
    </div>
  );
};

export default React.memo(LineTrendChart);
