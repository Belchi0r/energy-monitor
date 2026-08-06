"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
} from "react";

type ModifierStateReader = {
  getModifierState: (key: string) => boolean;
};

function hasModifierStateReader(
  value: unknown,
): value is ModifierStateReader {
  return (
    typeof value === "object" &&
    value !== null &&
    "getModifierState" in value &&
    typeof value.getModifierState === "function"
  );
}

export function readCapsLockState(event: unknown) {
  return hasModifierStateReader(event)
    ? event.getModifierState("CapsLock")
    : null;
}

export function CapsLockNotice({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={
        isActive
          ? "mt-2 text-xs font-medium text-amber-300"
          : "sr-only"
      }
    >
      {isActive ? "Caps Lock está ativado." : null}
    </p>
  );
}

type PasswordFieldProps = {
  id: string;
  name: "password" | "confirmPassword";
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  minLength?: number;
  describedBy?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  value?: string;
};

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  minLength,
  describedBy,
  onChange,
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const errorId = `${id}-error`;
  const capsLockId = `${id}-caps-lock`;
  const descriptionIds = [
    describedBy,
    capsLockId,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const updateCapsLock: KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    setIsCapsLockOn(readCapsLockState(event) ?? false);
  };
  const updateCapsLockOnFocus: FocusEventHandler<
    HTMLInputElement
  > = (event) => {
    const capsLockState = readCapsLockState(event.nativeEvent);

    if (capsLockState !== null) {
      setIsCapsLockOn(capsLockState);
    }
  };
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          onChange={onChange}
          onKeyDown={updateCapsLock}
          onKeyUp={updateCapsLock}
          onFocus={updateCapsLockOnFocus}
          onBlur={() => setIsCapsLockOn(false)}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds || undefined}
          className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 pr-12 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
        />
        <button
          type="button"
          aria-label={
            isVisible
              ? `Ocultar ${label.toLowerCase()}`
              : `Mostrar ${label.toLowerCase()}`
          }
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-offset-[-4px] motion-reduce:transition-none"
        >
          {isVisible ? (
            <EyeOff aria-hidden="true" className="size-4.5" />
          ) : (
            <Eye aria-hidden="true" className="size-4.5" />
          )}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <CapsLockNotice id={capsLockId} isActive={isCapsLockOn} />
    </div>
  );
}
