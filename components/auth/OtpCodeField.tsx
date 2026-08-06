"use client";

import type {
  ChangeEventHandler,
  ClipboardEventHandler,
} from "react";

import {
  AUTH_EMAIL_OTP_LENGTH,
  AUTH_EMAIL_OTP_PATTERN,
  normalizeEmailOtp,
} from "@/lib/auth/otp";

type OtpCodeFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function OtpCodeField({
  id,
  value,
  onChange,
  error,
}: OtpCodeFieldProps) {
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(normalizeEmailOtp(event.currentTarget.value));
  };
  const handlePaste: ClipboardEventHandler<HTMLInputElement> = (event) => {
    event.preventDefault();
    onChange(normalizeEmailOtp(event.clipboardData.getData("text")));
  };

  return (
    <div className="text-left">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-200"
      >
        Código de verificação
      </label>
      <input
        id={id}
        name="token"
        type="text"
        required
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        enterKeyHint="done"
        pattern={AUTH_EMAIL_OTP_PATTERN}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-center font-mono text-lg tracking-[0.32em] text-white tabular-nums outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-600 focus:border-emerald-400 focus:bg-slate-950 focus:ring-3 focus:ring-emerald-400/15 motion-reduce:transition-none"
      />
      <p id={helpId} className="mt-2 text-xs leading-5 text-slate-500">
        Digite os {AUTH_EMAIL_OTP_LENGTH} números exibidos no e-mail.
      </p>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
