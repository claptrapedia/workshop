import { cn } from "@/lib/utils";

const TOKEN = /('[^']*')|\b(catalogue\.[a-z_]+)\b|\b(INSERT INTO|VALUES|ON CONFLICT|DO UPDATE SET|DO NOTHING|SET)\b|\b(\d+(?:\.\d+)?)\b/g;

function highlight(line) {
  const out = [];
  let last = 0;
  let m;
  while ((m = TOKEN.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span key={`s${m.index}`} className="text-signal">{m[1]}</span>);
    else if (m[2]) out.push(<span key={`t${m.index}`} className="text-violet-400">{m[2]}</span>);
    else if (m[3]) out.push(<span key={`k${m.index}`} className="text-primary">{m[3]}</span>);
    else out.push(<span key={`n${m.index}`} className="text-rarity-legendary">{m[4]}</span>);
    last = TOKEN.lastIndex;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export default function SqlBlock({ sql, className }) {
  const lines = sql.split("\n");
  return (
    <div className={cn("overflow-x-auto rounded-sm border border-border/70 bg-black/50 p-3", className)}>
      {lines.map((line, i) => {
        const comment = line.trim().startsWith("--");
        return (
          <div key={i} className="code-line">
            <span className="mono select-none text-right text-[9px] leading-[1.85] text-muted-foreground/35">
              {i + 1}
            </span>
            <span
              className={cn(
                "mono whitespace-pre-wrap break-words text-[10.5px] leading-[1.85]",
                comment ? "text-muted-foreground/70" : "text-foreground/85"
              )}
            >
              {comment || line === "" ? line : highlight(line)}
            </span>
          </div>
        );
      })}
    </div>
  );
}