import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileCode2, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import PathList, { CopySummary } from "@/components/export/PathList";
import { Button } from "@/components/ui/button";
import { EXPORTS, TEST_RUN } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/export")({
  head: () => ({ meta: [{ title: "Export · Claptrapedia Workshop" }] }),
  component: ExportPage,
});

function ExportPage() {
  const [written, setWritten] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 06 / Export"
        title="Write the migration"
        description="The tested bytes go into the database checkout's migrations directory. The workshop never commits, never pushes, and never writes a structure file."
        meta={
          <>
            <Chip tone="signal">tested</Chip>
            <Chip tone="muted">11 statements</Chip>
            <Chip tone={written ? "signal" : "muted"}>{written ? "written" : "not written"}</Chip>
          </>
        }
        actions={
          <Button
            size="sm"
            className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setWritten(true);
              toast.success("Migration written", { description: "Not committed. Commit it in the database repo." });
            }}
          >
            <HardDriveDownload className="h-3.5 w-3.5" /> Write migration
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Panel kicker="Destination" title="Resolved before writing" accent="#00F0FF" actions={<Chip tone="signal">all resolved</Chip>}>
            <PathList />
          </Panel>

          <Panel kicker="Batch" title={TEST_RUN.migration} accent="#A855F7" actions={<Chip tone="muted">_DATA_</Chip>}>
            <div className="flex items-start gap-2.5 rounded-sm border border-border/60 bg-black/30 px-3 py-2.5">
              <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="mono break-all text-[10.5px] text-foreground/85">
                  database/db/migrations/{TEST_RUN.migration}
                </div>
                <div className="mono mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  written unchanged from the tested file
                </div>
              </div>
            </div>
            <div className="mt-3">
              <CopySummary count={1} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Existing migration files are left untouched. A correction to published data is a new _DATA_ file, never an
              edit of an old one.
            </p>
          </Panel>

          <AnimatePresence>
            {written && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
              >
                <Panel kicker="Done" title="File is on disk" accent="#A5FF00" className="border-signal/30">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                    <div className="text-[11.5px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">20261127143000_DATA_bl1_weapon_drops.sql</span> written to the
                      database checkout. Three revisions moved to exported. Nothing committed.
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="xl:col-span-5">
          <Panel kicker="History" title="Exported files" accent="#FF8A1F" dense>
            <div className="divide-y divide-border/40">
              {EXPORTS.map((e) => (
                <div key={e.file} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono truncate text-[10px] text-foreground/85">{e.file}</span>
                    <Chip tone={e.status === "Exported" ? "ion" : "muted"}>{e.status}</Chip>
                  </div>
                  <div className="mono mt-1 flex gap-3 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>{e.when}</span>
                    <span>{e.statements} stmt</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}