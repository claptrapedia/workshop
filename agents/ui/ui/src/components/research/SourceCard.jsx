import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Chip from "@/components/common/Chip";
import { cn } from "@/lib/utils";

const SITE_COLOR = { "Borderlands Wiki": "#3EC8FF", LootLemon: "#A5FF00" };

export default function SourceCard({ source, active, fetching, onSelect, onFetch, onView }) {
  const color = SITE_COLOR[source.site] || "#00F0FF";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-border/40 p-4 transition-colors",
        active ? "bg-primary/[0.05]" : "hover:bg-white/[0.025]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[13px] font-semibold text-foreground">{source.site}</span>
            <Chip tone={source.tone}>{source.status}</Chip>
          </div>
          <div className="mono mt-1.5 truncate text-[10px] text-primary/75">{source.url}</div>
        </div>
      </div>

      <div className="mono mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>{source.signal}</span>
        <span className="text-muted-foreground/60">{source.signalDetail}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-border bg-transparent px-2 text-[11px] hover:bg-white/[0.05]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(source.url, "_blank", "noopener,noreferrer");
          }}
        >
          <ExternalLink className="h-3 w-3" /> Open
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-border bg-transparent px-2 text-[11px] hover:bg-white/[0.05]"
          onClick={(e) => {
            e.stopPropagation();
            onFetch(source);
          }}
          disabled={fetching}
        >
          {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {fetching ? "Fetching" : "Fetch"}
        </Button>
        {source.captured ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(source);
            }}
            className="mono ml-1 text-[10px] uppercase tracking-[0.14em] text-signal underline-offset-4 hover:underline"
          >
            View capture
          </button>
        ) : (
          <span className="mono ml-1 text-[10px] uppercase tracking-[0.14em] text-amber-300">no capture yet</span>
        )}
      </div>
    </div>
  );
}