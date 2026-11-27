import { cn } from "@/lib/utils";

export default function Panel({
  title,
  kicker,
  actions,
  children,
  className,
  bodyClassName,
  dense,
  accent,
}) {
  return (
    <section
      className={cn(
        "panel-sheen flex min-w-0 flex-col rounded-md border border-border/70 bg-card/50 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className
      )}
      style={
        accent
          ? { borderTopWidth: 2, borderTopColor: accent, boxShadow: `inset 0 1px 0 0 ${accent}33` }
          : undefined
      }
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            {kicker && (
              <div className="kicker mb-1" style={accent ? { color: accent } : undefined}>
                {kicker}
              </div>
            )}
            {title && (
              <h2 className="truncate font-heading text-[13px] font-bold uppercase tracking-[0.1em] text-foreground">
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(dense ? "p-0" : "p-4", "min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}