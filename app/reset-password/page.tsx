import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getRecoveryAuthContext } from "@/lib/auth/recovery-session";

export const metadata: Metadata = {
  title: "Nova senha | Energy Monitor",
  description: "Defina uma nova senha para sua conta.",
};

export default async function ResetPasswordPage() {
  const recoveryContext = await getRecoveryAuthContext();

  if (recoveryContext.status === "missing") {
    redirect("/login?message=recovery-session-required");
  }

  if (recoveryContext.status !== "valid") {
    redirect("/");
  }

  return (
    <AuthFrame
      eyebrow="Acesso recuperado"
      title="Crie uma nova senha"
      description="Escolha uma senha com pelo menos 8 caracteres. As demais sugestões são apenas orientações de segurança."
    >
      <ResetPasswordForm />
    </AuthFrame>
  );
}
