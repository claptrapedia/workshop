import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FIELDS } from "@/data/workshop";

export default function DraftFields({ values, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {FIELDS.map((field) => {
        const editable = ["name", "slug", "manufacturer", "rarity", "element"].includes(field.key);
        return (
          <label key={field.key} className="block">
            <span className="mono flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {field.label}
              {field.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground/70" />}
            </span>
            <Input
              value={editable ? values[field.key] ?? field.value : field.value}
              onChange={editable ? (e) => onChange(field.key, e.target.value) : undefined}
              readOnly={!editable}
              className={cn(
                "mt-1 h-8 rounded-sm border-border/60 bg-black/25 font-mono text-[11px]",
                !editable && "cursor-default text-muted-foreground/80 focus-visible:border-border/60"
              )}
            />
            <span className="mono mt-1 block text-[9px] leading-tight text-muted-foreground/60">{field.hint}</span>
          </label>
        );
      })}
    </div>
  );
}