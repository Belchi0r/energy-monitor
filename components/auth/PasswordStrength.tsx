type PasswordStrengthProps = {
  id: string;
  password: string;
};

const PREDICTABLE_PASSWORD_PATTERN =
  /(123456|abcdef|password|qwerty|senha)/i;

export function assessPasswordStrength(password: string) {
  if (!password) {
    return { label: "Ainda não avaliada", score: 0 } as const;
  }

  let score = 0;
  const characterGroups = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (characterGroups >= 2) score += 1;
  if (characterGroups >= 3) score += 1;
  if (PREDICTABLE_PASSWORD_PATTERN.test(password)) score -= 1;

  const normalizedScore = Math.max(1, Math.min(4, score));

  if (normalizedScore <= 1) {
    return { label: "Fraca", score: normalizedScore } as const;
  }

  if (normalizedScore <= 3) {
    return { label: "Razoável", score: normalizedScore } as const;
  }

  return { label: "Forte", score: normalizedScore } as const;
}

export function PasswordStrength({
  id,
  password,
}: PasswordStrengthProps) {
  const strength = assessPasswordStrength(password);

  return (
    <div id={id} className="mt-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">Força da senha</span>
        <span className="font-medium text-slate-300">{strength.label}</span>
      </div>
      <div
        role="meter"
        aria-label="Força estimada da senha"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.score}
        aria-valuetext={strength.label}
        className="mt-2 grid grid-cols-4 gap-1.5"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`h-1.5 rounded-full ${
              index < strength.score ? "bg-emerald-400" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        O mínimo obrigatório é 8 caracteres. Mais tamanho, variedade e menos
        sequências previsíveis ajudam, mas são apenas orientações.
      </p>
    </div>
  );
}
