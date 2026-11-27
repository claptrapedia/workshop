import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Loader2, Radar } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import { Button } from "@/components/ui/button";
import { useWorkshop } from "@/components/WorkshopContext";
import { UPDATES } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/updates")({
  head: () => ({ meta: [{ title: "Check for updates · Claptrapedia Workshop" }] }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const { agent } = useWorkshop();
  const [status, setStatus] = useState("idle");

  const run = () => {
    if (status === "running") return;
    setStatus("running");
    setTimeout(() => setStatus("done"), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        step="Machine / Updates"
        title="Check for updates"
        description="Walk the saved URLs. An unchanged page is skipped without a download and without calling the agent. A changed page needs a new capture before any migration can be built from it."
        meta={
          <>
            <Chip tone="muted">4 saved pages</Chip>
            <Chip tone={status === "done" ? "signal" : "muted"}>{status === "done" ? "run complete" : "not run"}</Chip>
          </>
        }
        actions={
          <Button
            size="sm"
            className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={run}
            disabled={status === "running"}
          >
            {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            {status === "running" ? "Checking" : "Check for updates"}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          title="Saved sources"
          kicker="Signal first, then download"
          className="xl:col-span-8"
          accent="#00F0FF"
          dense
          actions={<Chip tone="muted">{agent.name}</Chip>}
        >
          {UPDATES.map((u, i) => (
            <div key={u.url} className="border-b border-border/40 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-foreground">{u.site}</span>
                    {status === "running" ? (
                      <Chip tone="ion">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> checking
                      </Chip>
                    ) : status === "done" ? (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                        <Chip tone={u.tone}>{u.outcome}</Chip>
                      </motion.span>
                    ) : (
                      <Chip tone="muted">waiting</Chip>
                    )}
                  </div>
                  <div className="mono mt-1 truncate text-[10px] text-muted-foreground">{u.url}</div>
                </div>
                <span className="mono hidden shrink-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70 sm:block">
                  {status === "done" ? u.detail : "—"}
                </span>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            A recapture whose facts changed writes a tested _DATA_ file with no further approval. A change in wording
            never reaches this step.
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-4">
          <Panel kicker="This run" title="Result" accent="#A5FF00">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["checked", "4", "text-foreground"],
                ["skipped", "2", "text-muted-foreground"],
                ["need capture", "1", "text-amber-300"],
                ["recaptured", "1", "text-signal"],
              ].map(([k, v, cls]) => (
                <div key={k} className="rounded-sm border border-border/60 bg-black/25 px-2.5 py-2">
                  <div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
                  <div className={`mono tnum mt-1 text-[18px] ${cls}`}>{status === "done" ? v : "—"}</div>
                </div>
              ))}
            </div>
            <div className="mono mt-3 space-y-1.5 text-[10px] text-muted-foreground">
              <div className="flex justify-between gap-2">
                <span>model</span>
                <span className="text-foreground/85">{agent.model} · {agent.effort}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>file written</span>
                <span className="break-all text-right text-foreground/85">
                  {status === "done" ? "…27143000_DATA_bl1_weapon_drops.sql" : "—"}
                </span>
              </div>
            </div>
          </Panel>

          <Panel kicker="Rule" title="Changed facts only" accent="#FF3DBE">
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              The agent rewrites only the fields a new capture affects, plus any description still null. Everything else
              stays where it is.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}