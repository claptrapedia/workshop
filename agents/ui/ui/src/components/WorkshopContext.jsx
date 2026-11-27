import { createContext, useContext, useMemo, useState } from "react";
import { AGENTS } from "@/data/workshop";

const WorkshopContext = createContext(null);

export function WorkshopProvider({ children }) {
  const [agentId, setAgentId] = useState("claude");

  const value = useMemo(() => {
    const agent = AGENTS.find((a) => a.id === agentId) || AGENTS[0];
    return { agent, agents: AGENTS, setAgentId };
  }, [agentId]);

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
}

export function useWorkshop() {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error("useWorkshop must be used inside WorkshopProvider");
  return ctx;
}