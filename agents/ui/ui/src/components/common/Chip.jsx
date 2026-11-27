import { cn } from "@/lib/utils";

const TONES = {
  ion: "border-primary/40 bg-primary/10 text-primary",
  signal: "border-signal/40 bg-signal/10 text-signal",
  warn: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  danger: "border-destructive/50 bg-destructive/10 text-destructive",
  violet: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  muted: "border-border bg-white/[0.03] text-muted-foreground",
};

export default function Chip({ tone = "muted", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap",
        TONES[tone] || TONES.muted,
        className
      )}
    >
      {children}
    </span>
  );
}

export function DataChip({ color, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}