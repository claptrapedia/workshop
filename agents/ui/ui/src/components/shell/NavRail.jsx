import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME } from "@/data/workshop";

const STEPS = [
  { to: "/", n: "01", label: "Import", tally: "1,402 seeds", hue: "#00F0FF" },
  { to: "/research", n: "02", label: "Research", tally: "2 sources", hue: "#A5FF00" },
  { to: "/review", n: "03", label: "Review draft", tally: "2 conflicts", hue: "#FF8A1F" },
  { to: "/queue", n: "04", label: "Queue", tally: "3 revisions", hue: "#FF3DBE" },
  { to: "/build", n: "05", label: "Build & test", tally: "untested", hue: "#A855F7" },
  { to: "/export", n: "06", label: "Export", tally: "12 files", hue: "#FFD400" },
];

const MACHINE = [
  { to: "/updates", label: "Check for updates", icon: Activity, hue: "#3EC8FF" },
  { to: "/settings", label: "Configuration", icon: Settings2, hue: "#7DD3FC" },
];

function RailLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors",
        active
          ? "bg-white/[0.06] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          className="absolute inset-y-1 left-0 w-[2px] rounded-full"
          style={{ background: item.hue }}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span className="mono text-[10px] tabular-nums tracking-[0.14em]" style={{ color: item.hue }}>
        {item.n}
      </span>
      <span className="flex-1 text-[13px] font-medium">{item.label}</span>
      <span className="mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
        {item.tally}
      </span>
    </Link>
  );
}

export default function NavRail() {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[288px] shrink-0 flex-col border-r border-border/60 bg-sidebar/80 px-3 py-5 lg:flex">
      <div className="kicker px-3 pb-2">Workbench</div>
      <nav className="flex flex-col gap-0.5">
        {STEPS.map((item) => (
          <RailLink key={item.to} item={item} active={pathname === item.to} />
        ))}
      </nav>

      <div className="kicker mt-7 px-3 pb-2">Machine</div>
      <nav className="flex flex-col gap-0.5">
        {MACHINE.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors",
                active
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute inset-y-1 left-0 w-[2px] rounded-full"
                  style={{ background: item.hue }}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <Icon className="h-3.5 w-3.5" style={{ color: item.hue }} />
              <span className="flex-1 text-[13px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-sm border border-border/70 bg-black/30 p-3">
        <div className="kicker">Extract</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-ion-pulse rounded-full bg-signal" />
          <span className="mono text-[10px] text-foreground">complete</span>
        </div>
        <div className="mono mt-1 truncate text-[9px] text-muted-foreground">
          extract-20261110-124546
        </div>
        <div className="mono mt-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {GAME.name} · {GAME.releaseId}
        </div>
      </div>
    </aside>
  );
}