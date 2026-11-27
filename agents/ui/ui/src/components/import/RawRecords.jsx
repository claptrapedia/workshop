import { motion } from "framer-motion";
import { ExternalLink, FileJson2 } from "lucide-react";
import Panel from "@/components/common/Panel";
import Chip, { DataChip } from "@/components/common/Chip";
import { Button } from "@/components/ui/button";

export default function RawRecords({ entity }) {
  if (!entity) return null;

  return (
    <Panel
      title="Raw game records"
      kicker="Behind the selected entity"
      className="xl:col-span-5"
      accent="#FF8A1F"
      dense
      actions={
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3 w-3" /> Extract file
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entity.accent }} />
          <span className="truncate text-[13px] font-semibold">{entity.name}</span>
          <DataChip color={entity.accent}>{entity.kind}</DataChip>
        </div>
        <span className="mono shrink-0 text-[10px] text-muted-foreground">{entity.records} records</span>
      </div>

      <div className="space-y-2.5 p-3">
        {entity.raw.map((rec, i) => (
          <motion.div
            key={rec.path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.32, ease: [0.19, 1, 0.22, 1] }}
            className="rounded-sm border border-border/70 bg-black/30"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileJson2 className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="truncate font-mono text-[10px] text-foreground/90">{rec.path}</span>
              </div>
              <Chip tone="muted">{rec.kind}</Chip>
            </div>
            <dl className="divide-y divide-border/30">
              {rec.fields.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-[7px]">
                  <dt className="mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{k}</dt>
                  <dd className="mono truncate text-[11px] text-foreground/90">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        ))}
        <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Raw records stay attached to the draft, so any claim can be traced back to the capture that produced it.
        </p>
      </div>
    </Panel>
  );
}