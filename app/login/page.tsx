import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Entrar | Energy Monitor",
  description: "Acesse com segurança o painel do Energy Monitor.",
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    message?: string | string[];
  }>;
};

const publicMessages = {
  "session-required": {
    text: "Sua sessão expirou ou é necessário entrar para acessar essa página.",
    tone: "info",
  },
  "confirmation-error": {
    text: "O link de confirmação é inválido ou expirou. Solicite um novo cadastro ou tente novamente.",
    tone: "error",
  },
} as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeRedirectPath(firstValue(params.next));
  const messageCode = firstValue(params.message);
  const notice =
    messageCode && Object.hasOwn(publicMessages, messageCode)
      ? publicMessages[messageCode as keyof typeof publicMessages]
      : undefined;

  return (
    <AuthFrame
      eyebrow="Bem-vindo de volta"
      title="Entre na sua conta"
      description="Use suas credenciais para acessar o painel e continuar acompanhando seu consumo."
    >
      <LoginForm
        nextPath={nextPath}
        notice={notice?.text}
        noticeTone={notice?.tone}
      />
    </AuthFrame>
  );
}
