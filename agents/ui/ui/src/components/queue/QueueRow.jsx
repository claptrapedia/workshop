import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Chip from "@/components/common/Chip";
import SqlBlock from "./SqlBlock";
import { cn } from "@/lib/utils";

export default function QueueRow({ item, selected, onToggle, expanded, onExpand }) {
  return (
    <div className={cn("border-b border-border/40 transition-colors", selected && "bg-primary/[0.04]")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(item.id)}
          className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          aria-label={`Include ${item.name}`}
        />
        <button onClick={() => onExpand(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-foreground">{item.name}</span>
              <Chip tone={item.tone}>{item.change}</Chip>
            </span>
            <span className="mono mt-1 block truncate text-[10px] text-muted-foreground">
              catalogue.{item.kind} · {item.source}
            </span>
          </span>
          <span className="mono hidden shrink-0 text-[10px] tabular-nums text-muted-foreground sm:block">
            {item.statements} stmt
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-[3.25rem]">
              <div className="mono mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                per-item preview
                <span className="h-px flex-1 rule-scan opacity-30" />
              </div>
              <SqlBlock sql={item.sql} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}