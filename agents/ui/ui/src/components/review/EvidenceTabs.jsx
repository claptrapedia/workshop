import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENTITIES, SOURCES } from "@/data/workshop";

const RAW = ENTITIES.find((e) => e.id === "hellfire").raw;

export default function EvidenceTabs() {
  return (
    <Tabs defaultValue="game" className="w-full">
      <TabsList className="grid h-8 w-full grid-cols-2 rounded-sm border border-border/70 bg-black/30 p-0.5">
        <TabsTrigger
          value="game"
          className="rounded-sm font-mono text-[9px] uppercase tracking-[0.14em] data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
        >
          Game data
        </TabsTrigger>
        <TabsTrigger
          value="captures"
          className="rounded-sm font-mono text-[9px] uppercase tracking-[0.14em] data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
        >
          Captures
        </TabsTrigger>
      </TabsList>

      <TabsContent value="game" className="mt-3 space-y-2">
        {RAW.map((rec) => (
          <div key={rec.path} className="rounded-sm border border-border/60 bg-black/25">
            <div className="mono truncate border-b border-border/50 px-2.5 py-1.5 text-[9px] text-primary/75">
              {rec.path}
            </div>
            <dl className="divide-y divide-border/25">
              {rec.fields.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 px-2.5 py-1">
                  <dt className="mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{k}</dt>
                  <dd className="mono truncate text-[10px] text-foreground/85">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="captures" className="mt-3 space-y-2">
        {SOURCES.filter((s) => s.captured).map((s) => (
          <div key={s.id} className="rounded-sm border border-border/60 bg-black/25">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1.5">
              <span className="text-[10px] font-semibold text-foreground/90">{s.site}</span>
              <span className="mono text-[8px] uppercase tracking-[0.14em] text-signal">captured</span>
            </div>
            <pre className="mono max-h-40 overflow-hidden whitespace-pre-wrap break-words px-2.5 py-2 text-[10px] leading-[1.8] text-muted-foreground">
              {s.capture.slice(0, 7).join("\n")}
            </pre>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}