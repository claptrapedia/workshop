import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import QueueRow from "@/components/queue/QueueRow";
import { Button } from "@/components/ui/button";
import { QUEUE } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/queue")({
  head: () => ({ meta: [{ title: "Queue · Claptrapedia Workshop" }] }),
  component: QueuePage,
});

function QueuePage() {
  const [selected, setSelected] = useState(QUEUE.map((q) => q.id));
  const [expanded, setExpanded] = useState("hellfire");

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const statements = QUEUE.filter((q) => selected.includes(q.id)).reduce((n, q) => n + q.statements, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 04 / Queue"
        title="Migration queue"
        description="Approved revisions wait here until the batch is built. Each row shows its own contribution to the file, so nothing enters the migration unseen."
        meta={
          <>
            <Chip tone="ion">{QUEUE.length} revisions</Chip>
            <Chip tone="muted">{statements} statements selected</Chip>
            <Chip tone="signal">one _DATA_ file</Chip>
          </>
        }
        actions={
          <Button asChild size="sm" className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90">
            <Link to="/build">
              <FlaskConical className="h-3.5 w-3.5" /> Build batch <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          title="Selected changes"
          kicker="Ready to assemble"
          className="xl:col-span-8"
          accent="#FF3DBE"
          dense
          actions={
            <button
              onClick={() => setSelected(selected.length === QUEUE.length ? [] : QUEUE.map((q) => q.id))}
              className="mono text-[9px] uppercase tracking-[0.14em] text-primary hover:underline"
            >
              {selected.length === QUEUE.length ? "clear" : "select all"}
            </button>
          }
        >
          {QUEUE.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              onToggle={toggle}
              expanded={expanded === item.id}
              onExpand={(id) => setExpanded(expanded === id ? null : id)}
            />
          ))}
        </Panel>

        <div className="space-y-4 xl:col-span-4">
          <Panel kicker="Batch" title="What gets written" accent="#00F0FF">
            <dl className="space-y-2.5">
              {[
                ["file", "20261127143000_DATA_bl1_weapon_drops.sql"],
                ["format", "dbmate · -- migrate:up"],
                ["transaction", "single, rolled back on error"],
                ["statements", `${statements}`],
                ["conflicts", "none in this batch"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/30 pb-2 last:border-0">
                  <dt className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                  <dd className="mono max-w-[62%] break-all text-right text-[10px] text-foreground/85">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel kicker="Guard rails" title="Before it leaves" accent="#FFD400">
            <ul className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-primary" />
                Order statements so a referenced row exists before the row that points at it.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-primary" />
                A published sentence stays out of the file unless the facts behind it changed.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber-400" />
                Removing a drop is an explicit relationship removal, never an omission.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}