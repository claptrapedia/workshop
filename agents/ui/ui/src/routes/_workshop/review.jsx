import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Save } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip, { DataChip } from "@/components/common/Chip";
import DraftFields from "@/components/review/DraftFields";
import EvidenceTabs from "@/components/review/EvidenceTabs";
import PublishedColumn from "@/components/review/PublishedColumn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DRAFT, ENTITY } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/review")({
  head: () => ({ meta: [{ title: "Review · Claptrapedia Workshop" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const [values, setValues] = useState({ name: "Hellfire", slug: "hellfire" });
  const [summary, setSummary] = useState(DRAFT.summary);
  const [description, setDescription] = useState(DRAFT.description);
  const [flavour, setFlavour] = useState(DRAFT.flavour);
  const [approved, setApproved] = useState(false);

  const onChange = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 03 / Review"
        title={`${ENTITY.name} draft`}
        description="The agent's proposal, the evidence behind it and the published row, side by side. Edit anything, then approve the revision that goes into the queue."
        meta={
          <>
            <DataChip color={ENTITY.rarityColor}>{ENTITY.rarity}</DataChip>
            <DataChip color={ENTITY.elementColor}>{ENTITY.element}</DataChip>
            <Chip tone="muted">{ENTITY.type}</Chip>
            <Chip tone="warn">2 conflicts</Chip>
            {approved && <Chip tone="signal">approved</Chip>}
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border bg-transparent text-[12px] hover:bg-white/[0.04]"
              onClick={() => toast("Draft saved locally", { description: "Survives a restart, even with no agent available." })}
            >
              <Save className="h-3.5 w-3.5" /> Save draft
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setApproved(true);
                toast.success("Revision approved", { description: "Added to the migration queue." });
              }}
            >
              <Check className="h-3.5 w-3.5" /> {approved ? "Approved" : "Approve revision"}
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
              <Link to="/queue">
                Queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-6">
          <Panel kicker="Proposed row" title="Identity & card facts" accent="#00F0FF" actions={<Chip tone="ion">agent</Chip>}>
            <DraftFields values={values} onChange={onChange} />
          </Panel>

          <Panel kicker="Catalogue prose" title="Written by the agent" accent="#A855F7" actions={<Chip tone="violet">unique to this catalogue</Chip>}>
            <div className="space-y-3">
              <label className="block">
                <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">summary · one line</span>
                <Input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="mt-1 h-9 rounded-sm border-border/60 bg-black/25 text-[12px]"
                />
              </label>
              <label className="block">
                <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">description</span>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="mt-1 resize-none rounded-sm border-border/60 bg-black/25 text-[12px] leading-[1.618]"
                />
              </label>
              <label className="block">
                <span className="mono flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  flavour · red text
                  <span className="rounded-sm border border-rarity-legendary/40 bg-rarity-legendary/10 px-1.5 py-[1px] text-[8px] text-rarity-legendary">
                    as printed
                  </span>
                </span>
                <Input
                  value={flavour}
                  onChange={(e) => setFlavour(e.target.value)}
                  className="mt-1 h-9 rounded-sm border-border/60 bg-black/25 font-mono text-[11px] italic"
                />
              </label>
              <div>
                <div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">abilities</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DRAFT.abilities.map((a) => (
                    <span key={a} className="rounded-sm border border-border/70 bg-white/[0.03] px-2 py-1 text-[11px] text-foreground/85">
                      {a}
                    </span>
                  ))}
                  {DRAFT.tags.map((t) => (
                    <span key={t} className="mono rounded-sm border border-primary/25 bg-primary/[0.07] px-2 py-1 text-[10px] text-primary/90">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel kicker="Behind the draft" title="Evidence" accent="#A5FF00" actions={<Chip tone="muted">read only</Chip>}>
            <EvidenceTabs />
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel kicker="In the database" title="Published row" accent="#FF8A1F" actions={<Chip tone="muted">live</Chip>}>
            <PublishedColumn />
          </Panel>
        </div>
      </div>
    </div>
  );
}