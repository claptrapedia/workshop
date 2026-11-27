import { Check, FolderTree } from "lucide-react";
import Chip from "@/components/common/Chip";
import { PATHS } from "@/data/workshop";

export default function PathList() {
  return (
    <div className="divide-y divide-border/30">
      {PATHS.map((p) => (
        <div key={p.name} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <FolderTree className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <div className="min-w-0 flex-1">
            <div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{p.name}</div>
            <div className="mono mt-1 break-all text-[10.5px] text-foreground/85">{p.value}</div>
          </div>
          <Chip tone={p.tone}>{p.state}</Chip>
        </div>
      ))}
    </div>
  );
}

export function CopySummary({ count }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-signal/25 bg-signal/[0.05] px-2.5 py-2">
      <Check className="h-3 w-3 text-signal" />
      <span className="mono text-[10px] text-foreground/85">
        {count} card image{count === 1 ? "" : "s"} copied to site/public/img
      </span>
    </div>
  );
}