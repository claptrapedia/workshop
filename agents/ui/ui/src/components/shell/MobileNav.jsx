import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Import" },
  { to: "/research", label: "Research" },
  { to: "/review", label: "Review" },
  { to: "/queue", label: "Queue" },
  { to: "/build", label: "Build" },
  { to: "/export", label: "Export" },
  { to: "/updates", label: "Updates" },
  { to: "/settings", label: "Config" },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  return (
    <div className="sticky top-16 z-30 -mx-5 mb-2 border-b border-border/60 bg-background/90 px-5 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "shrink-0 rounded-sm border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              pathname === item.to
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}