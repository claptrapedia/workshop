import { Link } from "@tanstack/react-router";
import { GAME } from "@/data/workshop";
import AgentSwitch from "./AgentSwitch";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] rule-rainbow opacity-70" />
      <div className="flex h-16 w-full items-center gap-4 px-5 md:px-8 xl:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center rounded-sm border border-primary/45 bg-primary/10 ion-glow">
            <span className="font-heading text-[17px] font-black leading-none text-primary">C</span>
            <span className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 bg-signal" />
          </span>
          <span className="leading-none">
            <span className="block font-heading text-[13px] font-extrabold uppercase tracking-[0.2em] text-foreground">
              Claptrapedia
            </span>
            <span className="mono mt-1 block text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
              Workshop
            </span>
          </span>
        </Link>

        <span className="mx-1 hidden h-8 w-px bg-border/70 md:block" />

        <div className="hidden items-center gap-2 rounded-sm border border-border bg-card/60 px-2.5 py-1.5 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-rarity-legendary" />
          <span className="text-[12px] font-semibold text-foreground">{GAME.name}</span>
          <span className="mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            {GAME.release.replace(GAME.name, "").trim()}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="mono hidden items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground xl:flex">
            <span className="h-1.5 w-1.5 animate-ion-pulse rounded-full bg-signal" />
            extract loaded
          </div>
          <AgentSwitch />
        </div>
      </div>
    </header>
  );
}