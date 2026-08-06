"use client";

import { Menu, X, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  DataModeIndicator,
  resolveDataModeIndicatorContext,
} from "@/components/layout/DataModeIndicator";
import { NavigationLinks } from "@/components/layout/NavigationLinks";
import type { DashboardDataMode } from "@/lib/dashboard/types";

const FOCUSABLE_ELEMENTS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type MobileNavigationProps = {
  pathname: string;
  mode: DashboardDataMode;
};

export function MobileNavigation({
  pathname,
  mode,
}: MobileNavigationProps) {
  const shouldReduceMotion = useReducedMotion();
  const indicatorContext = resolveDataModeIndicatorContext(pathname);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [portalTarget, setPortalTarget] =
    useState<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          FOCUSABLE_ELEMENTS,
        ) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 1280px)");

    function closeDrawerOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsDrawerOpen(false);
      }
    }

    desktopMedia.addEventListener("change", closeDrawerOnDesktop);

    return () => {
      desktopMedia.removeEventListener("change", closeDrawerOnDesktop);
    };
  }, []);

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label="Abrir menu de navegação"
        aria-controls="mobile-navigation-drawer"
        aria-expanded={isDrawerOpen}
        onClick={() => {
          setPortalTarget(document.body);
          setIsDrawerOpen(true);
        }}
        className="group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-slate-300 hover:bg-white hover:shadow active:bg-slate-100 motion-reduce:transition-none xl:hidden"
      >
        <Menu
          aria-hidden="true"
          className="size-5 text-emerald-700 transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
        />
        <span>Menu</span>
      </button>

      {portalTarget
        ? createPortal(
            <AnimatePresence
              onExitComplete={() => {
                previouslyFocusedRef.current?.focus();
                previouslyFocusedRef.current = null;
              }}
            >
              {isDrawerOpen ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="Fechar menu de navegação"
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.2,
                    }}
                    onClick={() => setIsDrawerOpen(false)}
                    className="fixed inset-0 z-[90] cursor-default bg-slate-950/60 backdrop-blur-[2px] xl:hidden"
                  />

                  <motion.aside
                    ref={drawerRef}
                    id="mobile-navigation-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-navigation-title"
                    initial={
                      shouldReduceMotion
                        ? false
                        : { x: "-100%", opacity: 0.96 }
                    }
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "-100%", opacity: 0.96 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.22,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="fixed inset-y-0 left-0 z-[100] flex h-dvh max-h-dvh w-[min(19rem,85vw)] max-w-xs flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-950 text-slate-100 shadow-2xl xl:hidden"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-5 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/40">
                          <Zap
                            aria-hidden="true"
                            className="size-5"
                            strokeWidth={2.4}
                          />
                        </span>
                        <div className="min-w-0">
                          <p
                            id="mobile-navigation-title"
                            className="truncate text-base font-semibold text-white"
                          >
                            Energy Monitor
                          </p>
                          <p className="text-xs text-slate-400">
                            Navegação principal
                          </p>
                        </div>
                      </div>
                      <button
                        ref={closeButtonRef}
                        type="button"
                        aria-label="Fechar menu"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white active:bg-white/15 motion-reduce:transition-none"
                      >
                        <X aria-hidden="true" className="size-5" />
                      </button>
                    </div>

                    <nav
                      aria-label="Navegação principal no celular"
                      className="flex-1 px-3 py-6 sm:px-4"
                    >
                      <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Monitoramento
                      </p>
                      <NavigationLinks
                        pathname={pathname}
                        mode={mode}
                        onNavigate={() => setIsDrawerOpen(false)}
                      />
                    </nav>

                    <DataModeIndicator
                      mode={mode}
                      context={indicatorContext}
                    />

                    <div className="px-4 pb-5">
                      <LogoutButton variant="dark" />
                    </div>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>,
            portalTarget,
          )
        : null}
    </>
  );
}
