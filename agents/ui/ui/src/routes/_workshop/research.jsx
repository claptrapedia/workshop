import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip, { DataChip } from "@/components/common/Chip";
import SourceCard from "@/components/research/SourceCard";
import CaptureDialog from "@/components/research/CaptureDialog";
import { Button } from "@/components/ui/button";
import { ENTITY, SOURCES } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/research")({
  head: () => ({ meta: [{ title: "Research · Claptrapedia Workshop" }] }),
  component: ResearchPage,
});

const FACTS = {
  wiki: ["rarity · legendary", "element · incendiary x3–x4", "magazine · 60", "drop · Bone Head"],
  lootlemon: ["parts · 4 named", "damage · 41–76", "accuracy · 88.5", "fire rate · 8.3", "drop · Crimson Lance chest"],
  "wiki-drops": [],
};

function ResearchPage() {
  const [selectedId, setSelectedId] = useState("wiki");
  const [viewing, setViewing] = useState(null);
  const [fetchingId, setFetchingId] = useState(null);

  const selected = SOURCES.find((s) => s.id === selectedId) || SOURCES[0];

  const fetchSource = (source) => {
    setFetchingId(source.id);
    setTimeout(() => {
      setFetchingId(null);
      toast("Capture refreshed", { description: `${source.site} · rendered article stored.` });
    }, 1400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        step="Step 02 / Research"
        title="Sources & capture"
        description="The agent finds the direct page for the entity. A page only counts as evidence once Fetch or the browser extension has stored it."
        meta={
          <>
            <DataChip color={ENTITY.rarityColor}>{ENTITY.rarity}</DataChip>
            <DataChip color={ENTITY.elementColor}>{ENTITY.element}</DataChip>
            <Chip tone="muted">{ENTITY.manufacturer}</Chip>
            <Chip tone="signal">2 captured</Chip>
            <Chip tone="warn">1 needs capture</Chip>
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border bg-transparent text-[12px] hover:bg-white/[0.04]"
              onClick={() => toast("Agent suggested 1 page", { description: "Bone Head drop table added to the list." })}
            >
              <Sparkles className="h-3.5 w-3.5" /> Find pages
            </Button>
            <Button asChild size="sm" className="gap-2 bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary/90">
              <Link to="/review">
                Review draft <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          title="Saved sources"
          kicker={`${SOURCES.length} for ${ENTITY.name}`}
          className="xl:col-span-5"
          accent="#A855F7"
          dense
          actions={<Chip tone="muted">per entity</Chip>}
        >
          {SOURCES.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              active={source.id === selectedId}
              fetching={fetchingId === source.id}
              onSelect={() => setSelectedId(source.id)}
              onFetch={fetchSource}
              onView={setViewing}
            />
          ))}
          <div className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            A URL with no capture is not ready. The agent never invents one, and the operator drops a page that points at
            the wrong thing.
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-7">
          <Panel
            kicker="Selected source"
            title={selected.site}
            accent="#00F0FF"
            actions={<Chip tone={selected.tone}>{selected.status}</Chip>}
          >
            <div className="mono break-all text-[10px] text-primary/80">{selected.url}</div>

            {selected.captured ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["method", selected.method],
                    ["captured", selected.captured],
                    ["size", selected.bytes],
                    ["facts", `${selected.facts} found`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-sm border border-border/60 bg-black/25 px-2.5 py-2">
                      <div className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
                      <div className="mono mt-1 truncate text-[10px] text-foreground/90">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto rounded-sm border border-border/70 bg-black/40 p-3">
                  <pre className="mono whitespace-pre-wrap break-words text-[11px] leading-[1.85] text-foreground/80">
                    {selected.capture.slice(0, 12).join("\n")}
                  </pre>
                </div>

                <div className="mt-3">
                  <div className="kicker mb-2">Facts this capture supports</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(FACTS[selected.id] || []).map((f) => (
                      <span
                        key={f}
                        className="mono rounded-sm border border-border/70 bg-white/[0.03] px-2 py-[3px] text-[10px] text-foreground/80"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-sm border border-dashed border-amber-400/30 bg-amber-400/[0.04] px-4 py-8 text-center">
                <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber-300">no capture stored</div>
                <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                  Run Fetch to store the rendered article, or press Open and send the page back with the extension.
                </p>
              </div>
            )}
          </Panel>

          <Panel kicker="Operator rule" title="Evidence, then prose" accent="#A5FF00">
            <ul className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-primary" />
                A migration is built from the extract and from captures. Never from a bare URL.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-primary" />
                Finding a page and capturing it are separate steps, and the capture is never edited.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-signal" />
                The agent writes the catalogue sentences from these facts, not from this text.
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <CaptureDialog source={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}