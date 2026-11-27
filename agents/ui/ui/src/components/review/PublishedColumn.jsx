import { TriangleAlert } from "lucide-react";
import { PUBLISHED, CONFLICTS } from "@/data/workshop";

const DOT = { changed: "bg-amber-400", empty: "bg-muted-foreground/40", same: "bg-signal" };

export default function PublishedColumn() {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {PUBLISHED.map((row) => (
          <div key={row.label} className="rounded-sm border border-border/60 bg-black/25 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{row.label}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[row.state]}`} />
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-foreground/80">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-amber-400/30 bg-amber-400/[0.05] p-2.5">
        <div className="flex items-center gap-1.5">
          <TriangleAlert className="h-3 w-3 text-amber-300" />
          <span className="mono text-[9px] uppercase tracking-[0.14em] text-amber-300">2 open conflicts</span>
        </div>
        <div className="mt-2 space-y-2">
          {CONFLICTS.map((c) => (
            <div key={c.field} className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="mono text-[9px] uppercase tracking-[0.12em] text-foreground/80">{c.field}</span>
              <p className="mt-0.5">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}