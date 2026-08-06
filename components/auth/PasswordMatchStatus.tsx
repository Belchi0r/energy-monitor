import { CheckCircle2, CircleAlert } from "lucide-react";

type PasswordMatchStatusProps = {
  id: string;
  password: string;
  confirmation: string;
  hasStarted: boolean;
  serverError?: string;
};

export function PasswordMatchStatus({
  id,
  password,
  confirmation,
  hasStarted,
  serverError,
}: PasswordMatchStatusProps) {
  if (!hasStarted || serverError) {
    return (
      <p id={id} role="status" aria-live="polite" className="sr-only" />
    );
  }

  const passwordsMatch = confirmation === password;

  if (passwordsMatch && password.length < 8) {
    return (
      <p id={id} role="status" aria-live="polite" className="sr-only" />
    );
  }

  return (
    <p
      id={id}
      role="status"
      aria-live="polite"
      className={`mt-2 flex items-center gap-2 text-xs font-medium ${
        passwordsMatch ? "text-emerald-300" : "text-amber-300"
      }`}
    >
      {passwordsMatch ? (
        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      )}
      {passwordsMatch
        ? "As senhas coincidem."
        : "As senhas ainda não coincidem."}
    </p>
  );
}
