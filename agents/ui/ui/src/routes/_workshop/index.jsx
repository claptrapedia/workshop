import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import EntityBrowser from "@/components/import/EntityBrowser";
import RawRecords from "@/components/import/RawRecords";
import { Button } from "@/components/ui/button";
import { ENTITIES, EXTRACT, GAME } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/")({
  head: () => ({ meta: [{ title: "Import · Claptrapedia Workshop" }] }),
  component: ImportPage,
});

const STATS = [
  { label: "Seeds", value: EXTRACT.seeds, hint: "catalogue identity", hue: "#00F0FF" },
  { label: "Groups", value: EXTRACT.groups, hint: "candidate entities", hue: "#A5FF00" },
  { label: "Records", value: EXTRACT.records, hint: "object + bindings", hue: "#A855F7" },
  { label: "Unmatched", value: EXTRACT.unmatched, hint: "need an operator", hue: "#FF8A1F" },
];

function ImportPage() {
  const [selectedId, setSelectedId] = useState("hellfire");
  const selected = ENTITIES.find((e) => e.id === selectedId) || ENTITIES[0];

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 01 / Import"
        title="Game extract"
        description="One Borderlands 1 Enhanced capture, read from disk. The workshop groups the raw records into candidate entities; nothing is written until an operator approves it."
        meta={
          <>
            <Chip tone="signal">complete</Chip>
            <Chip tone="muted">extractor {EXTRACT.extractor}</Chip>
            <Chip tone="muted">format {EXTRACT.formatVersion}</Chip>
            <Chip tone="ion">{GAME.release}</Chip>
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border bg-transparent text-[12px] hover:bg-white/[0.04]"
              onClick={() => toast("Extract re-read · 8,940 records", { description: "Approved work and manual corrections kept." })}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-read extract
            </Button>
            <Button asChild size="sm" className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90">
              <Link to="/research">
                Open workbench <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="panel-sheen rounded-md border border-border/70 bg-card/50 px-4 py-3"
            style={{ borderTopWidth: 2, borderTopColor: s.hue, boxShadow: `inset 0 1px 0 0 ${s.hue}33` }}
          >
            <div className="kicker" style={{ color: s.hue }}>{s.label}</div>
            <div className="mono tnum mt-2 text-[22px] font-medium leading-none" style={{ color: s.hue }}>
              {s.value}
            </div>
            <div className="mono mt-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">{s.hint}</div>
          </div>
        ))}
      </div>

      <Panel
        kicker="Capture"
        title="Borderlands 1 Enhanced"
        accent="#00F0FF"
        actions={<Chip tone="muted">read only</Chip>}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mono break-all text-[11px] leading-relaxed text-foreground/85">{EXTRACT.path}</div>
            <div className="mono mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
              <span>captured {EXTRACT.captured}</span>
              <span>extract id {EXTRACT.id}</span>
              <span>{GAME.releaseId}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono rounded-sm border border-signal/40 bg-signal/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-signal">
              complete
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-12">
        <EntityBrowser entities={ENTITIES} selectedId={selectedId} onSelect={setSelectedId} />
        <RawRecords entity={selected} />
      </div>
    </div>
  );
}