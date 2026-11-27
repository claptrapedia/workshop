import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Chip from "@/components/common/Chip";

export default function CaptureDialog({ source, onClose }) {
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl border-border bg-card">
        {source && (
          <>
            <DialogHeader>
              <div className="kicker text-primary">Stored capture</div>
              <DialogTitle className="font-heading text-lg font-bold uppercase tracking-wide">
                {source.site}
              </DialogTitle>
              <DialogDescription className="mono break-all text-[10px] text-muted-foreground">
                {source.url}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="signal">captured</Chip>
              <Chip tone="muted">{source.method}</Chip>
              <Chip tone="muted">{source.captured}</Chip>
              <Chip tone="muted">{source.bytes}</Chip>
            </div>

            <div className="max-h-[46vh] overflow-y-auto rounded-sm border border-border/70 bg-black/45 p-4">
              <pre className="mono whitespace-pre-wrap break-words text-[11px] leading-[1.85] text-foreground/85">
                {source.capture.join("\n")}
              </pre>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The capture is evidence, not prose. There is no editor here: run Fetch again, or send a new capture from
              the extension, to replace the stored text.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}