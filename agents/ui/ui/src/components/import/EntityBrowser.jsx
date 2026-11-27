import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function EntityBrowser({ entities, selectedId, onSelect }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All");

  const kinds = useMemo(() => ["All", ...Array.from(new Set(entities.map((e) => e.kind)))], [entities]);

  const rows = entities.filter((e) => {
    const matchesKind = kind === "All" || e.kind === kind;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || e.name.toLowerCase().includes(q) || e.id.includes(q) || e.detail.toLowerCase().includes(q);
    return matchesKind && matchesQuery;
  });

  return (
    <Panel
      title="Candidate entities"
      kicker="Grouped from the raw records"
      className="xl:col-span-7"
      accent="#A5FF00"
      dense
      actions={<span className="mono text-[10px] text-muted-foreground">{rows.length} shown</span>}
    >
      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or id"
            className="h-9 border-border/80 bg-black/30 pl-9 font-mono text-[12px] placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                kind === k
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {rows.map((e, i) => {
          const active = e.id === selectedId;
          return (
            <motion.button
              key={e.id}
              onClick={() => onSelect(e.id)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className={cn(
                "group relative flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors",
                active ? "bg-primary/[0.06]" : "hover:bg-white/[0.025]"
              )}
            >
              <span
                className={cn("absolute inset-y-2 left-0 w-[2px] rounded-full transition-opacity", active ? "opacity-100" : "opacity-60")}
                style={{ background: e.accent }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("truncate text-[13px] font-semibold", active ? "text-foreground" : "text-foreground/90")}>
                    {e.name}
                  </span>
                  <span
                    className="mono shrink-0 text-[9px] uppercase tracking-[0.12em]"
                    style={{ color: e.accent }}
                  >
                    {e.type}
                  </span>
                </span>
                <span className="mono mt-1 block truncate text-[10px] text-muted-foreground">
                  {e.id} · {e.detail}
                </span>
              </span>
              <span className="mono hidden shrink-0 text-[10px] tabular-nums text-muted-foreground sm:block">
                {e.records} rec
              </span>
              <Chip tone={e.tone}>{e.status}</Chip>
            </motion.button>
          );
        })}
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">No entity matches that filter.</div>
        )}
      </div>
    </Panel>
  );
}