"use client";

import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

const FOCUSABLE_ELEMENTS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "small" | "medium";
};

export function Modal({
  title,
  description,
  children,
  onClose,
  size = "medium",
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      const preferredElement =
        panelRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      const firstElement =
        preferredElement ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_ELEMENTS);

      firstElement?.focus();
    });

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
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
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  function handleBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <motion.div
      role="presentation"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6"
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        initial={
          shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`my-auto flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] ${
          size === "small" ? "max-w-md" : "max-w-2xl"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-slate-950"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-5 text-slate-500"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fechar janela"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 motion-reduce:transition-none"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}
