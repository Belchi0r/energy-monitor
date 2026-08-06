import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isEmailOtpEnabled } from "@/lib/auth/email-otp-config";

export const metadata: Metadata = {
  title: "Recuperar senha | Energy Monitor",
  description: "Solicite instruções seguras para redefinir sua senha.",
};

export default function ForgotPasswordPage() {
  const emailOtpEnabled = isEmailOtpEnabled();

  return (
    <AuthFrame
      eyebrow="Recuperação de acesso"
      title="Redefina sua senha"
      description="Informe seu e-mail para receber as próximas instruções, caso exista uma conta associada."
    >
      <ForgotPasswordForm emailOtpEnabled={emailOtpEnabled} />
    </AuthFrame>
  );
}
