import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { SignupForm } from "@/components/auth/SignupForm";
import { isPublicSignupEnabled } from "@/lib/auth/public-signup-config";

export const metadata: Metadata = {
  title: "Criar conta | Energy Monitor",
  description: "Crie seu acesso seguro ao Energy Monitor.",
};

export default function SignupPage() {
  const publicSignupEnabled = isPublicSignupEnabled();

  return (
    <AuthFrame
      eyebrow={publicSignupEnabled ? "Novo acesso" : "Demonstração pública"}
      title={publicSignupEnabled ? "Crie sua conta" : "Explore o Energy Monitor"}
      description={
        publicSignupEnabled
          ? "Cadastre seu e-mail e confirme o endereço para começar a usar o Energy Monitor."
          : "Novos cadastros estão temporariamente indisponíveis. Você pode explorar uma demonstração completa com dados simulados ou entrar em uma conta existente."
      }
    >
      <SignupForm
        publicSignupEnabled={publicSignupEnabled}
      />
    </AuthFrame>
  );
}
