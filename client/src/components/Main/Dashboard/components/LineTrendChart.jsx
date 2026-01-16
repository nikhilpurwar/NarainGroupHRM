import React, { useState, useRef } from 'react';

const LineTrendChart = ({ data = [], height = 120, stroke = '#2563eb' }) => {
  const [hover, setHover] = useState(null);
  const chartRef = useRef(null);

  if (!data || !data.length) return <div className="text-sm text-gray-500">No trend data</div>;

  const width = 600;
  const paddingLeft = 36;
  const paddingRight = 12;

  const max = Math.max(...data.map(d => d.value || 0), 1);
  const min = Math.min(...data.map(d => d.value || 0), 0);
  const range = max - min || 1;

  // map data to SVG coordinates
  const pointsArr = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * (width - paddingLeft - paddingRight);
    const y = 10 + (1 - (d.value - min) / range) * (height - 20);
    return { x, y, label: d.date || d.label || '', value: d.value || 0 };
  });

  const points = pointsArr.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${paddingLeft},${height - 8} ${points} ${width - paddingRight},${height - 8}`;

  return (
    <div className="w-full overflow-x-auto relative" ref={chartRef}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Attendance trend chart">
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.12" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid lines and Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
          const yy = 10 + (1 - t) * (height - 20);
          const val = Math.round(min + t * range);
          return (
            <g key={idx}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={6} y={yy + 4} fontSize={10} fill="#6b7280">{val}</text>
            </g>
          );
        })}

        {/* area fill under the line */}
        <polygon points={areaPoints} fill="url(#trendGrad)" />

        {/* line strokes */}
        <polyline fill="none" stroke="#eef2ff" strokeWidth="6" points={points} opacity="0.6" />
        <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />

        {/* data points */}
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
              setHover({ x: offsetX, y: offsetY, label: p.label, value: p.value });
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {/* tooltip */}
      {hover && (() => {
        const containerW = chartRef.current ? chartRef.current.clientWidth : width;
        const tooltipW = 140;
        const left = Math.min(Math.max(hover.x - 6, 8), Math.max(8, containerW - tooltipW - 8));
        const top = Math.max(hover.y - 66, 8);
        const triangleLeft = Math.max(8, Math.min(tooltipW - 12, Math.round(hover.x - left - 6)));
        return (
          <div style={{ position: 'absolute', left: left + 'px', top: top + 'px', zIndex: 9999, pointerEvents: 'none' }}>
            <div className="bg-white text-xs text-gray-800 shadow-lg rounded-md border px-3 py-2 flex flex-col items-start" style={{ width: tooltipW }}>
              <div className="font-semibold text-sm">{hover.label}</div>
              <div className="text-gray-600">{String(hover.value)}</div>
            </div>
            <div style={{ position: 'absolute', left: triangleLeft + 'px', top: '100%', width: 0, height: 0 }}>
              
              <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(17,24,39,0.95)' }} />
          </div>
          </div>
        );
      })()}

      <div className="mt-2 text-xs text-gray-500">Hover points to see exact values. Y-axis shows counts.</div>
    </div>
  );
};

export default LineTrendChart;
