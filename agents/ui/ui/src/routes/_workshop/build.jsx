import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileCode2, FlaskConical, Play } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import TestRunPanel from "@/components/build/TestRunPanel";
import SqlBlock from "@/components/queue/SqlBlock";
import { Button } from "@/components/ui/button";
import { QUEUE, TEST_RUN } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/build")({
  head: () => ({ meta: [{ title: "Build & test · Claptrapedia Workshop" }] }),
  component: BuildPage,
});

function BuildPage() {
  const [status, setStatus] = useState("idle");
  const [step, setStep] = useState(-1);

  const run = () => {
    if (status === "running") return;
    setStatus("running");
    setStep(0);
    TEST_RUN.steps.forEach((_, i) => {
      setTimeout(() => setStep(i + 1), 700 * (i + 1));
    });
    setTimeout(() => setStatus("passed"), 700 * TEST_RUN.steps.length + 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 05 / Build & test"
        title="Assemble the migration"
        description="One timestamped dbmate file from the selected revisions, applied to a disposable PostgreSQL 17.2 database before anything is exported."
        meta={
          <>
            <Chip tone="ion">{QUEUE.length} revisions</Chip>
            <Chip tone="muted">11 statements</Chip>
            <Chip tone={status === "passed" ? "signal" : "muted"}>{status === "passed" ? "tested" : "untested"}</Chip>
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={run}
              disabled={status === "running"}
            >
              <Play className="h-3.5 w-3.5" /> Run test
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 border-border bg-transparent text-[12px] hover:bg-white/[0.04]">
              <Link to="/export">
                Export <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Panel
            kicker="Candidate file"
            title={TEST_RUN.migration}
            accent="#A855F7"
            actions={<Chip tone="muted">_DATA_</Chip>}
          >
            <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-black/30 px-3 py-2">
              <FileCode2 className="h-3.5 w-3.5 text-primary" />
              <span className="mono truncate text-[10px] text-foreground/85">
                database/db/migrations/{TEST_RUN.migration}
              </span>
            </div>

            <div className="mt-3 space-y-1">
              {QUEUE.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-3 border-b border-border/30 py-1.5 last:border-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1 w-1 shrink-0" style={{ background: q.tone === "ion" ? "#00F0FF" : q.tone === "violet" ? "#A855F7" : "#A5FF00" }} />
                    <span className="truncate text-[11.5px] text-foreground/90">{q.name}</span>
                    <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{q.change}</span>
                  </div>
                  <span className="mono shrink-0 text-[9px] text-muted-foreground">{q.statements} stmt</span>
                </div>
              ))}
            </div>

            <div className="mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>-- migrate:up</span>
              <span>single transaction</span>
              <span>rolled back on error</span>
            </div>
          </Panel>

          <Panel kicker="Excerpt" title="Head of the file" accent="#3EC8FF" dense>
            <div className="p-3">
              <SqlBlock sql={QUEUE[0].sql} className="max-h-72 overflow-y-auto" />
            </div>
          </Panel>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <TestRunPanel status={status} step={step} onRun={run} />

          <Panel kicker="Reminder" title="A test is tied to its inputs" accent="#FF3DBE">
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Change the selected revisions, the generated SQL or the migration history and the batch needs a new test.
              Export writes the tested bytes unchanged, or refuses.
            </p>
            <div className="mono mt-3 flex items-center gap-2 rounded-sm border border-border/60 bg-black/25 px-2.5 py-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <FlaskConical className="h-3 w-3 text-primary" />
              17.2 · 127.0.0.1:5433 · disposable
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}