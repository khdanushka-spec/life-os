import { formatCurrency } from "@/lib/finance";

export type NetWorthPoint = { date: string; netWorth: number };

const WIDTH = 600;
const HEIGHT = 140;
const PADDING = 8;

// Single-series trend line - sequential blue hue per the dataviz skill
// (one hue for magnitude/trend, not a categorical palette).
export function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Net worth trend will appear here once there&apos;s a few days of history.
      </p>
    );
  }

  const values = points.map((p) => p.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.netWorth - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PADDING} L${coords[0].x.toFixed(1)},${HEIGHT - PADDING} Z`;

  const first = points[0].netWorth;
  const last = points[points.length - 1].netWorth;
  const change = last - first;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold tabular-nums">{formatCurrency(last)}</p>
        <p className={`text-sm tabular-nums ${change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {change >= 0 ? "+" : ""}
          {formatCurrency(change)} over this period
        </p>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-32 w-full" preserveAspectRatio="none">
        <path d={areaPath} className="fill-[#2a78d6]/10 dark:fill-[#3987e5]/15" />
        <path d={path} className="stroke-[#2a78d6] dark:stroke-[#3987e5]" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r={2.5} className="fill-[#2a78d6] dark:fill-[#3987e5]">
            <title>
              {new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {formatCurrency(c.netWorth)}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
