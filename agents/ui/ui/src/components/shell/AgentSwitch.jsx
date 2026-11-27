import { Check, ChevronDown, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkshop } from "@/components/WorkshopContext";
import { cn } from "@/lib/utils";

export default function AgentSwitch() {
  const { agent, agents, setAgentId } = useWorkshop();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-2.5 rounded-sm border border-border bg-card/70 px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-card"
          aria-label="Switch primary agent"
        >
          <span
            className="grid h-6 w-6 place-items-center rounded-sm border"
            style={{ borderColor: `${agent.accent}66`, background: `${agent.accent}1f`, color: agent.accent }}
          >
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-[12px] font-semibold text-foreground">{agent.name}</span>
            <span className="mono block text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {agent.model} · {agent.effort}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 border-border bg-popover">
        <DropdownMenuLabel className="kicker">Primary agent · remembered</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {agents.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onSelect={() => setAgentId(a.id)}
            className="flex cursor-pointer items-start gap-3 py-2.5 focus:bg-white/[0.04]"
          >
            <span
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm border"
              style={{ borderColor: `${a.accent}66`, background: `${a.accent}1f`, color: a.accent }}
            >
              <Cpu className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[13px] font-semibold">{a.name}</span>
                <span
                  className={cn("mono text-[9px] uppercase tracking-[0.16em]")}
                  style={{ color: a.accent }}
                >
                  {a.role}
                </span>
              </span>
              <span className="mono mt-0.5 block truncate text-[10px] text-muted-foreground">
                {a.model} · {a.effort} · {a.cli}
              </span>
            </span>
            {a.id === agent.id && <Check className="mt-1 h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Codex takes over when a Claude Code run fails.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}