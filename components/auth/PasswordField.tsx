"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: "password" | "confirmPassword";
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  minLength?: number;
};

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  minLength,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = `${id}-error`;

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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 pr-12 text-sm text-white outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
        />
        <button
          type="button"
          aria-label={isVisible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
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
    </div>
  );
}
