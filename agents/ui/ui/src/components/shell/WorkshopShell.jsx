import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "@tanstack/react-router";
import AppHeader from "./AppHeader";
import NavRail from "./NavRail";
import MobileNav from "./MobileNav";

const EASE = [0.19, 1, 0.22, 1];

export default function WorkshopShell() {
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 grid-veil" />
      <AppHeader />
      <div className="flex w-full">
        <NavRail />
        <main className="min-w-0 flex-1">
          <MobileNav />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="w-full px-5 pb-24 pt-6 md:px-8 md:pt-8 xl:px-10 2xl:px-14"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}