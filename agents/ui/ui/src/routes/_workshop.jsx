import { createFileRoute } from "@tanstack/react-router";
import { WorkshopProvider } from "@/components/WorkshopContext";
import WorkshopShell from "@/components/shell/WorkshopShell";

export const Route = createFileRoute("/_workshop")({
  component: WorkshopLayout,
});

function WorkshopLayout() {
  return (
    <WorkshopProvider>
      <WorkshopShell />
    </WorkshopProvider>
  );
}