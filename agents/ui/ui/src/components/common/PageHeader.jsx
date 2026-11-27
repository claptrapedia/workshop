export default function PageHeader({ step, title, description, actions, meta }) {
  return (
    <div className="flex flex-col gap-5 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {step && (
          <div className="flex items-center gap-2.5">
            <span className="h-[2px] w-7 rule-rainbow" />
            <span className="kicker text-primary">{step}</span>
          </div>
        )}
        <h1 className="mt-2.5 font-heading text-[30px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-foreground md:text-[42px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}