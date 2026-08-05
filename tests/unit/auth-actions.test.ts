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

const {
  createClientMock,
  headersMock,
  redirectMock,
  signInWithPasswordMock,
  signOutMock,
  signUpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  headersMock: vi.fn(),
  redirectMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  signUpMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  loginAction,
  logoutAction,
  signupAction,
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
  createClientMock.mockReset();
  headersMock.mockReset();
  redirectMock.mockReset();
  signInWithPasswordMock.mockReset();
  signOutMock.mockReset();
  signUpMock.mockReset();

  createClientMock.mockResolvedValue({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      signUp: signUpMock,
    },
  });
  headersMock.mockResolvedValue(
    new Headers({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    }),
  );
  signInWithPasswordMock.mockResolvedValue({ error: null });
  signOutMock.mockResolvedValue({ error: null });
  signUpMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ações de autenticação", () => {
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
      message: "E-mail ou senha inválidos.",
    });
    expect(JSON.stringify(result)).not.toContain("segredo-do-teste");
    expect(JSON.stringify(result)).not.toContain("detalhes internos");
    expect(redirectMock).not.toHaveBeenCalled();
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
