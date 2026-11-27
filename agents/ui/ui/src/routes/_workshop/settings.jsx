import { createFileRoute } from "@tanstack/react-router";
import { Check, Cpu, Database } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Panel from "@/components/common/Panel";
import Chip from "@/components/common/Chip";
import PathList from "@/components/export/PathList";
import { useWorkshop } from "@/components/WorkshopContext";
import { PROOFS, TEST_RUN } from "@/data/workshop";

export const Route = createFileRoute("/_workshop/settings")({
  head: () => ({ meta: [{ title: "Configuration · Claptrapedia Workshop" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { agent, agents } = useWorkshop();

  return (
    <div className="space-y-6">
      <PageHeader
        step="Machine / Configuration"
        title="Configuration"
        description="Paths, agents and the two proofs that must exist before the first item is researched. Everything here is read from the workshop environment on this machine."
        meta={
          <>
            <Chip tone="signal">6 resolved</Chip>
            <Chip tone="muted">loopback only</Chip>
            <Chip tone="muted">single operator</Chip>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel kicker="Environment" title="Resolved paths" accent="#00F0FF" className="xl:col-span-7">
          <PathList />
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            A missing path is a configuration error that names the path the workshop expected. Nothing is cloned or
            initialised here.
          </p>
        </Panel>

        <div className="space-y-4 xl:col-span-5">
          <Panel kicker="Agents" title="Local CLIs" accent="#A855F7" actions={<Chip tone="muted">no API keys</Chip>}>
            <div className="space-y-2">
              {agents.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-sm border px-3 py-2.5"
                  style={{
                    borderColor: a.id === agent.id ? `${a.accent}55` : "hsl(var(--border))",
                    background: a.id === agent.id ? `${a.accent}0f` : "transparent",
                  }}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border"
                    style={{ borderColor: `${a.accent}55`, color: a.accent, background: `${a.accent}14` }}
                  >
                    <Cpu className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{a.name}</span>
                      <span className="mono text-[9px] uppercase tracking-[0.14em]" style={{ color: a.accent }}>
                        {a.role}
                      </span>
                    </div>
                    <div className="mono mt-0.5 truncate text-[10px] text-muted-foreground">
                      {a.model} · {a.effort} · {a.cli}
                    </div>
                  </div>
                  {a.id === agent.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Switch the primary agent from the header. Codex takes over when a Claude Code run fails.
            </p>
          </Panel>

          <Panel kicker="Test database" title="Disposable container" accent="#A5FF00">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="mono space-y-1 text-[10.5px] text-foreground/85">
                <div>{TEST_RUN.image}</div>
                <div className="text-muted-foreground">{TEST_RUN.host} · own volume</div>
                <div className="text-muted-foreground">never the catalogue container on 5432</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROOFS.map((p) => (
          <Panel
            key={p.id}
            kicker="Source proof"
            title={p.title}
            accent={p.id === "wiki" ? "#3EC8FF" : "#FFD400"}
            actions={<Chip tone={p.tone}>saved</Chip>}
          >
            <dl className="space-y-2">
              {p.lines.map(([k, v]) => (
                <div key={k} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                  <dt className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                  <dd className="mono mt-1 break-words text-[10.5px] text-foreground/85">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  );
}