import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { SignupForm } from "@/components/auth/SignupForm";
import { isEmailOtpEnabled } from "@/lib/auth/email-otp-config";

export const metadata: Metadata = {
  title: "Criar conta | Energy Monitor",
  description: "Crie seu acesso seguro ao Energy Monitor.",
};

export default function SignupPage() {
  const emailOtpEnabled = isEmailOtpEnabled();

  return (
    <AuthFrame
      eyebrow="Novo acesso"
      title="Crie sua conta"
      description="Cadastre seu e-mail e confirme o endereço para começar a usar o Energy Monitor."
    >
      <SignupForm emailOtpEnabled={emailOtpEnabled} />
    </AuthFrame>
  );
}
