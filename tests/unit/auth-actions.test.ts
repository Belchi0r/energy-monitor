import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  INITIAL_AUTH_ACTION_STATE,
  INITIAL_LOGOUT_ACTION_STATE,
} from "@/lib/auth/state";
import { resetPasswordFormSchema } from "@/lib/auth/validation";

vi.mock("server-only", () => ({}));

const {
  clearRecoverySessionProofMock,
  createClientMock,
  getRecoveryAuthContextMock,
  headersMock,
  redirectMock,
  resendMock,
  resetPasswordForEmailMock,
  signInWithPasswordMock,
  signOutMock,
  signUpMock,
  updateUserMock,
} = vi.hoisted(() => ({
  clearRecoverySessionProofMock: vi.fn(),
  createClientMock: vi.fn(),
  getRecoveryAuthContextMock: vi.fn(),
  headersMock: vi.fn(),
  redirectMock: vi.fn(),
  resendMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  signUpMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth/recovery-session", () => ({
  clearRecoverySessionProof: clearRecoverySessionProofMock,
  getRecoveryAuthContext: getRecoveryAuthContextMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  forgotPasswordAction,
  loginAction,
  logoutAction,
  resendSignupConfirmationAction,
  signupAction,
  updatePasswordAction,
} from "@/app/auth/actions";

function formData(values: Record<string, string | undefined>) {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) {
      data.append(key, value);
    }
  });

  return data;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("AUTH_PUBLIC_SIGNUP_ENABLED", "true");
  createClientMock.mockReset();
  clearRecoverySessionProofMock.mockReset();
  getRecoveryAuthContextMock.mockReset();
  headersMock.mockReset();
  redirectMock.mockReset();
  resendMock.mockReset();
  resetPasswordForEmailMock.mockReset();
  signInWithPasswordMock.mockReset();
  signOutMock.mockReset();
  signUpMock.mockReset();
  updateUserMock.mockReset();

  createClientMock.mockResolvedValue({
    auth: {
      resend: resendMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      signUp: signUpMock,
      updateUser: updateUserMock,
    },
  });
  getRecoveryAuthContextMock.mockResolvedValue({
    status: "valid",
    supabase: {
      auth: {
        signOut: signOutMock,
        updateUser: updateUserMock,
      },
    },
  });
  headersMock.mockResolvedValue(
    new Headers({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    }),
  );
  signInWithPasswordMock.mockResolvedValue({ error: null });
  resendMock.mockResolvedValue({ error: null });
  resetPasswordForEmailMock.mockResolvedValue({ error: null });
  signOutMock.mockResolvedValue({ error: null });
  signUpMock.mockResolvedValue({ error: null });
  updateUserMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ações de autenticação", () => {
  it("aceita no schema duas senhas novas iguais com pelo menos 8 caracteres", () => {
    const result = resetPasswordFormSchema.safeParse({
      password: "valid-test-password",
      confirmPassword: "valid-test-password",
    });

    expect(result.success).toBe(true);
  });

  it("normaliza o e-mail, chama signInWithPassword e redireciona", async () => {
    await loginAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "  USER@Example.COM ",
        password: "senha-segura",
        next: "/history?period=30d",
      }),
    );

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "senha-segura",
    });
    expect(redirectMock).toHaveBeenCalledWith("/history?period=30d");
  });

  it("retorna erro controlado para credenciais inválidas", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: {
        code: "invalid_credentials",
        message: "AuthApiError: detalhes internos",
      },
    });

    const result = await loginAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "user@example.com",
        password: "segredo-do-teste",
        next: "/",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Não foi possível entrar com esses dados. Confira o e-mail e a senha.",
    });
    expect(JSON.stringify(result)).not.toContain("segredo-do-teste");
    expect(JSON.stringify(result)).not.toContain("detalhes internos");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("não diferencia conta não confirmada de outras credenciais inválidas", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: {
        code: "email_not_confirmed",
        message: "Email not confirmed",
      },
    });

    const result = await loginAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "user@example.com",
        password: "senha-segura",
        next: "/",
      }),
    );

    expect(result.message).toBe(
      "Não foi possível entrar com esses dados. Confira o e-mail e a senha.",
    );
    expect(JSON.stringify(result)).not.toMatch(/confirmad|not confirmed/i);
  });

  it("trata rate limit de login sem revelar a existência da conta", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { status: 429, message: "internal rate detail" },
    });

    const result = await loginAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "user@example.com",
        password: "senha-segura",
        next: "/",
      }),
    );

    expect(result.message).toBe(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    );
    expect(JSON.stringify(result)).not.toContain("internal rate detail");
  });

  it("chama signUp e retorna o estado de confirmação sem assumir sessão", async () => {
    const result = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "  NEW@Example.COM ",
        password: "senha-com-8",
        confirmPassword: "senha-com-8",
      }),
    );

    expect(signUpMock).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "senha-com-8",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(result.status).toBe("signup-success");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("não executa cadastro nem cria cliente quando o cadastro público está desativado", async () => {
    vi.stubEnv("AUTH_PUBLIC_SIGNUP_ENABLED", "false");

    const result = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "new@example.com",
        password: "senha-com-8",
        confirmPassword: "senha-com-8",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Novos cadastros estão temporariamente indisponíveis. Explore a demonstração ou entre em uma conta existente.",
    });
    expect(createClientMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejeita senhas diferentes antes de chamar o Supabase", async () => {
    const result = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "new@example.com",
        password: "senha-com-8",
        confirmPassword: "outra-senha",
      }),
    );

    expect(result.fieldErrors?.confirmPassword).toContain(
      "As senhas não coincidem.",
    );
    expect(createClientMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("não revela pelo resultado do cadastro que uma conta já existe", async () => {
    signUpMock.mockResolvedValueOnce({
      error: {
        code: "user_already_exists",
        message: "User already registered",
      },
    });

    const result = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "existing@example.com",
        password: "senha-com-8",
        confirmPassword: "senha-com-8",
      }),
    );

    expect(result.status).toBe("signup-success");
    expect(JSON.stringify(result)).not.toMatch(/already|existe|registrad/i);
  });

  it("produz a mesma resposta pública para cadastro novo e repetido", async () => {
    const newAccountResult = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "new@example.com",
        password: "valid-test-password",
        confirmPassword: "valid-test-password",
      }),
    );
    signUpMock.mockResolvedValueOnce({
      error: {
        code: "user_already_exists",
        message: "internal duplicate account detail",
      },
    });
    const repeatedAccountResult = await signupAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "existing@example.com",
        password: "valid-test-password",
        confirmPassword: "valid-test-password",
      }),
    );

    expect(repeatedAccountResult).toEqual(newAccountResult);
    expect(newAccountResult).toEqual({
      status: "signup-success",
      message:
        "Confira seu e-mail. Você pode já possuir uma conta; nesse caso, entre com sua senha ou recupere o acesso.",
    });
    expect(JSON.stringify(repeatedAccountResult)).not.toContain(
      "internal duplicate account detail",
    );
  });

  it("ignora metadados internos da Server Action no cadastro", async () => {
    const data = formData({
      email: "new@example.com",
      password: "valid-test-password",
      confirmPassword: "valid-test-password",
    });
    data.append("$ACTION_ID_internal", "opaque-action-reference");
    data.append("$ACTION_ID_internal", "opaque-action-metadata");

    await signupAction(INITIAL_AUTH_ACTION_STATE, data);

    expect(signUpMock).toHaveBeenCalledTimes(1);
  });

  it("reenvia confirmação com somente o e-mail e o callback interno", async () => {
    const data = formData({
      email: "  USER@Example.COM ",
      password: "ignored-test-value",
    });
    data.append("$ACTION_ID_internal", "opaque-action-reference");

    const result = await resendSignupConfirmationAction(
      { status: "idle" },
      data,
    );

    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(result).toEqual({
      status: "confirmation-resent",
      message:
        "Caso uma confirmação esteja pendente para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /user@example\.com|ignored-test-value/i,
    );
  });

  it("não envia reenvio de cadastro quando o cadastro público está desativado", async () => {
    vi.stubEnv("AUTH_PUBLIC_SIGNUP_ENABLED", "false");

    const result = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "pending@example.com" }),
    );

    expect(result.status).toBe("error");
    expect(createClientMock).not.toHaveBeenCalled();
    expect(resendMock).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("pending@example.com");
  });

  it("rejeita e-mail ausente, não textual ou duplicado no reenvio", async () => {
    const duplicate = formData({ email: "first@example.com" });
    duplicate.append("email", "second@example.com");
    const nonString = new FormData();
    nonString.append("email", new Blob(["synthetic"]), "email.txt");

    const missingResult = await resendSignupConfirmationAction(
      { status: "idle" },
      new FormData(),
    );
    const duplicateResult = await resendSignupConfirmationAction(
      { status: "idle" },
      duplicate,
    );
    const nonStringResult = await resendSignupConfirmationAction(
      { status: "idle" },
      nonString,
    );

    expect(missingResult.fieldErrors?.email).toBeDefined();
    expect(duplicateResult.fieldErrors?.email).toEqual([
      "Envie apenas um valor para o e-mail.",
    ]);
    expect(nonStringResult.fieldErrors?.email).toBeDefined();
    expect(resendMock).not.toHaveBeenCalled();
  });

  it("mantém a resposta pública de reenvio indistinguível", async () => {
    const success = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "new@example.com" }),
    );
    resendMock.mockResolvedValueOnce({
      error: {
        code: "email_not_confirmed",
        message: "internal account state",
      },
    });
    const providerError = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "existing@example.com" }),
    );
    resendMock.mockRejectedValueOnce(
      new Error("internal provider exception"),
    );
    const providerException = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "pending@example.com" }),
    );

    expect(providerError).toEqual(success);
    expect(providerException).toEqual(success);
    expect(JSON.stringify([success, providerError, providerException])).not.toMatch(
      /@example\.com|internal/i,
    );
  });

  it("trata 429 do reenvio sem expor detalhes internos", async () => {
    resendMock.mockResolvedValueOnce({
      error: {
        status: 429,
        message: "internal rate detail",
      },
    });

    const result = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "pending@example.com" }),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    });
    expect(JSON.stringify(result)).not.toContain("internal rate detail");
  });

  it("falha genericamente quando a origem do reenvio é inválida", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://external.example.com");

    const result = await resendSignupConfirmationAction(
      { status: "idle" },
      formData({ email: "pending@example.com" }),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Não foi possível processar o reenvio agora. Tente novamente em instantes.",
    });
    expect(JSON.stringify(result)).not.toContain("pending@example.com");
    expect(resendMock).not.toHaveBeenCalled();
  });

  it("envia recuperação com origem segura e retorna resposta genérica", async () => {
    const result = await forgotPasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({ email: "  USER@Example.COM " }),
    );

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      "user@example.com",
      {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Freset-password",
      },
    );
    expect(result).toEqual({
      status: "recovery-email-sent",
      message:
        "Caso exista uma recuperação disponível para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
    });
    expect(JSON.stringify(result)).not.toContain("user@example.com");
  });

  it("trata 429 na recuperação sem expor detalhes internos", async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({
      error: {
        code: "over_email_send_rate_limit",
        message: "Supabase secret rate detail",
      },
    });

    const result = await forgotPasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({ email: "user@example.com" }),
    );

    expect(result.message).toBe(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    );
    expect(JSON.stringify(result)).not.toContain("Supabase");
  });

  it("não diferencia publicamente erro de estado da conta na recuperação", async () => {
    const successResult = await forgotPasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({ email: "new@example.com" }),
    );
    resetPasswordForEmailMock.mockResolvedValueOnce({
      error: {
        code: "user_not_found",
        message: "internal account state",
      },
    });
    const providerResult = await forgotPasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({ email: "existing@example.com" }),
    );

    expect(providerResult).toEqual(successResult);
    expect(JSON.stringify(providerResult)).not.toMatch(
      /@example\.com|internal account state/i,
    );
  });

  it("atualiza uma senha válida e encerra a sessão de recuperação", async () => {
    await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        password: "nova-senha-segura",
        confirmPassword: "nova-senha-segura",
      }),
    );

    expect(updateUserMock).toHaveBeenCalledWith({
      password: "nova-senha-segura",
    });
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(clearRecoverySessionProofMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?message=password-updated",
    );
  });

  it("ignora metadados internos da Server Action sem invalidar as senhas", async () => {
    const data = formData({
      password: "valid-test-password",
      confirmPassword: "valid-test-password",
    });
    data.append("$ACTION_ID_internal", "opaque-action-reference");
    data.append("$ACTION_ID_internal", "opaque-action-metadata");

    await updatePasswordAction(INITIAL_AUTH_ACTION_STATE, data);

    expect(updateUserMock).toHaveBeenCalledTimes(1);
  });

  it("rejeita valores duplicados nos campos esperados", async () => {
    const data = formData({
      password: "valid-test-password",
      confirmPassword: "valid-test-password",
    });
    data.append("password", "another-test-value");

    const result = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      data,
    );

    expect(result.fieldErrors?.password).toEqual([
      "Envie apenas um valor para a nova senha.",
    ]);
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejeita nova senha curta e senhas diferentes antes do Supabase", async () => {
    const shortResult = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({ password: "curta", confirmPassword: "curta" }),
    );
    const mismatchResult = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        password: "nova-senha-segura",
        confirmPassword: "outra-senha-segura",
      }),
    );

    expect(shortResult.fieldErrors?.password).toContain(
      "A senha deve ter pelo menos 8 caracteres.",
    );
    expect(mismatchResult.fieldErrors?.confirmPassword).toContain(
      "As senhas não coincidem.",
    );
    expect(getRecoveryAuthContextMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("bloqueia updateUser sem contexto de recuperação válido", async () => {
    getRecoveryAuthContextMock.mockResolvedValueOnce({ status: "missing" });

    const result = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        password: "nova-senha-segura",
        confirmPassword: "nova-senha-segura",
      }),
    );

    expect(result.status).toBe("error");
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("trata erro de updateUser sem expor o Supabase nem redirecionar", async () => {
    updateUserMock.mockResolvedValueOnce({
      error: new Error("detalhe interno sensível do Supabase"),
    });

    const result = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        password: "nova-senha-segura",
        confirmPassword: "nova-senha-segura",
      }),
    );

    expect(result.status).toBe("error");
    expect(JSON.stringify(result)).not.toMatch(/Supabase|detalhe interno/i);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("associa same_password ao campo sem devolver a senha", async () => {
    updateUserMock.mockResolvedValueOnce({
      error: {
        code: "same_password",
        message: "internal same password detail",
      },
    });

    const result = await updatePasswordAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        password: "valid-test-password",
        confirmPassword: "valid-test-password",
      }),
    );

    expect(result).toEqual({
      status: "error",
      message: "A nova senha precisa ser diferente da senha atual.",
      fieldErrors: {
        password: [
          "A nova senha precisa ser diferente da senha atual.",
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("valid-test-password");
    expect(JSON.stringify(result)).not.toContain(
      "internal same password detail",
    );
    expect(signOutMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      action: "login",
      values: {
        email: "user@example.com",
        password: "senha-segura",
        next: "/",
        userId: "11111111-1111-4111-8111-111111111111",
      },
    },
    {
      action: "signup",
      values: {
        email: "new@example.com",
        password: "senha-com-8",
        confirmPassword: "senha-com-8",
        userId: "11111111-1111-4111-8111-111111111111",
      },
    },
  ])("não aceita userId no fluxo de $action", async ({ action, values }) => {
    const result =
      action === "login"
        ? await loginAction(INITIAL_AUTH_ACTION_STATE, formData(values))
        : await signupAction(INITIAL_AUTH_ACTION_STATE, formData(values));

    expect(result.status).toBe("error");
    expect(createClientMock).not.toHaveBeenCalled();
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("não registra nem devolve a senha quando o provedor falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    signInWithPasswordMock.mockRejectedValueOnce(
      new Error("falha com segredo-do-teste"),
    );

    const result = await loginAction(
      INITIAL_AUTH_ACTION_STATE,
      formData({
        email: "user@example.com",
        password: "segredo-do-teste",
        next: "/",
      }),
    );

    expect(result.message).toBe(
      "Não foi possível entrar com esses dados. Confira o e-mail e a senha.",
    );
    expect(JSON.stringify(result)).not.toContain("segredo-do-teste");
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("chama signOut local e redireciona para /login no sucesso", async () => {
    await logoutAction(INITIAL_LOGOUT_ACTION_STATE, new FormData());

    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("não redireciona quando signOut retorna erro", async () => {
    signOutMock.mockResolvedValueOnce({
      error: new Error("detalhe interno do Supabase"),
    });

    const result = await logoutAction(
      INITIAL_LOGOUT_ACTION_STATE,
      new FormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "Não foi possível sair agora. Tente novamente em instantes.",
    });
    expect(JSON.stringify(result)).not.toContain("detalhe interno");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("trata exceção no signOut sem fingir sucesso", async () => {
    signOutMock.mockRejectedValueOnce(
      new Error("falha técnica sensível do provedor"),
    );

    const result = await logoutAction(
      INITIAL_LOGOUT_ACTION_STATE,
      new FormData(),
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe(
      "Não foi possível sair agora. Tente novamente em instantes.",
    );
    expect(JSON.stringify(result)).not.toContain("falha técnica sensível");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
