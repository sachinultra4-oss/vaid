import React from 'react';

interface DailyPoint {
  date: string;
  visitors: number;
  inquiries: number;
}

export function DualLineChart({ data }: { data: DailyPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center t-14 text-[#12201A]/60">
        No daily visit activity recorded in this date range yet.
      </div>
    );
  }

  const W = 720;
  const H = 220;
  const padL = 36;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxV = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.inquiries)));

  const xAt = (i: number) =>
    data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / maxV) * innerH;

  const visitorsPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(d.visitors).toFixed(1)}`)
    .join(' ');
  const inquiriesPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(d.inquiries).toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <div className="flex flex-wrap items-center gap-5 mb-3 t-14 font-bold">
        <span className="inline-flex items-center gap-2 text-[#0E3B26]">
          <span className="w-3 h-1.5 rounded-full bg-[#0E3B26]" />
          Visitors
        </span>
        <span className="inline-flex items-center gap-2 text-[#C46A3C]">
          <span className="w-3 h-1.5 rounded-full bg-[#C46A3C]" />
          Inquiries
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-52 overflow-visible" role="img" aria-label="Daily visitors and inquiries chart">
        {[0, 0.5, 1].map((frac) => {
          const y = padT + innerH - frac * innerH;
          const label = Math.round(frac * maxV);
          return (
            <g key={frac}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#12201A" strokeOpacity="0.1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#12201A" fillOpacity="0.6">
                {label}
              </text>
            </g>
          );
        })}

        <path d={visitorsPath} fill="none" stroke="#0E3B26" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={inquiriesPath} fill="none" stroke="#C46A3C" strokeWidth="2.5" strokeLinejoin="round" />

        {data.map((d, i) => (
          <g key={d.date}>
            <circle cx={xAt(i)} cy={yAt(d.visitors)} r="3.2" fill="#0E3B26">
              <title>{`${d.date}: ${d.visitors} visitors, ${d.inquiries} inquiries`}</title>
            </circle>
            <circle cx={xAt(i)} cy={yAt(d.inquiries)} r="3.2" fill="#C46A3C">
              <title>{`${d.date}: ${d.inquiries} inquiries`}</title>
            </circle>
            {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
              <text x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#12201A" fillOpacity="0.65">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function HorizontalBarList({
  items,
  color = '#0E3B26',
  emptyText = 'No recorded events yet.',
}: {
  items: Array<{ label: string; count: number }>;
  color?: string;
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return <p className="t-14 text-[#12201A]/60 py-3">{emptyText}</p>;
  }
  const maxVal = Math.max(1, ...items.map((x) => x.count));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((item.count / maxVal) * 100));
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between t-14 mb-1 gap-2">
              <span className="font-bold text-[#12201A] truncate">{item.label}</span>
              <span className="tabular-nums font-bold text-[#12201A]/80 shrink-0">{item.count}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#12201A]/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HourlyHeatmap({ grid }: { grid: number[][] }) {
  const flatMax = Math.max(1, ...(grid?.flat() || [1]));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[540px] space-y-1.5">
        {DAYS.map((dayLabel, dIdx) => (
          <div key={dayLabel} className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-1 items-center">
            <span className="text-xs font-bold text-[#12201A]/70">{dayLabel}</span>
            {Array.from({ length: 24 }).map((_, hIdx) => {
              const count = grid?.[dIdx]?.[hIdx] || 0;
              const ratio = count / flatMax;
              const bg =
                count === 0
                  ? 'rgba(18, 32, 26, 0.06)'
                  : ratio > 0.65
                  ? '#0E3B26'
                  : ratio > 0.3
                  ? '#3E7A4A'
                  : 'rgba(62, 122, 74, 0.45)';
              return (
                <div
                  key={hIdx}
                  title={`${dayLabel} ${String(hIdx).padStart(2, '0')}:00 — ${count} visits`}
                  className="h-5 rounded-sm"
                  style={{ backgroundColor: bg }}
                />
              );
            })}
          </div>
        ))}
        <div className="grid grid-cols-[44px_1fr] pt-1 text-[11px] text-[#12201A]/60">
          <span />
          <div className="flex justify-between">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
