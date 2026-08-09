import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  cookieSetMock,
  cookiesMock,
  createClientMock,
  createRecoverySessionProofMock,
  getUserMock,
  headersMock,
  redirectMock,
  resetPasswordForEmailMock,
  signOutMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  cookieSetMock: vi.fn(),
  cookiesMock: vi.fn(),
  createClientMock: vi.fn(),
  createRecoverySessionProofMock: vi.fn(),
  getUserMock: vi.fn(),
  headersMock: vi.fn(),
  redirectMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth/recovery-session", () => ({
  clearRecoverySessionProof: vi.fn(),
  createRecoverySessionProof: createRecoverySessionProofMock,
  getRecoveryAuthContext: vi.fn(),
  RECOVERY_SESSION_COOKIE: "energy-monitor-recovery",
  RECOVERY_SESSION_MAX_AGE_SECONDS: 1800,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  resendRecoveryCodeAction,
  verifyRecoveryOtpAction,
  verifySignupOtpAction,
} from "@/app/auth/actions";
import {
  INITIAL_OTP_ACTION_STATE,
  INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
} from "@/lib/auth/state";

const validSession = {
  access_token: "synthetic-access-value",
  user: { id: "verified-user" },
};

function otpFormData() {
  const data = new FormData();

  data.append("email", "  PERSON@Example.COM ");
  data.append("token", "123456");

  return data;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  cookieSetMock.mockReset();
  cookiesMock.mockReset();
  createClientMock.mockReset();
  createRecoverySessionProofMock.mockReset();
  getUserMock.mockReset();
  headersMock.mockReset();
  redirectMock.mockReset();
  resetPasswordForEmailMock.mockReset();
  signOutMock.mockReset();
  verifyOtpMock.mockReset();

  createClientMock.mockResolvedValue({
    auth: {
      getUser: getUserMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      signOut: signOutMock,
      verifyOtp: verifyOtpMock,
    },
  });
  cookiesMock.mockResolvedValue({ set: cookieSetMock });
  headersMock.mockResolvedValue(
    new Headers({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    }),
  );
  verifyOtpMock.mockResolvedValue({
    data: {
      session: validSession,
      user: { id: "verified-user" },
    },
    error: null,
  });
  getUserMock.mockResolvedValue({
    data: { user: { id: "verified-user" } },
    error: null,
  });
  signOutMock.mockResolvedValue({ error: null });
  resetPasswordForEmailMock.mockResolvedValue({ error: null });
  createRecoverySessionProofMock.mockReturnValue("synthetic-signed-proof");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verificação OTP do cadastro", () => {
  it("verifica o código como email, confirma getUser e entra na dashboard", async () => {
    const data = otpFormData();
    data.append("$ACTION_ID_internal", "opaque-action-metadata");
    data.append("password", "ignored-extra-field");

    await verifySignupOtpAction(INITIAL_OTP_ACTION_STATE, data);

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "123456",
      type: "email",
    });
    expect(getUserMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("rejeita campos esperados duplicados e metadados não interferem", async () => {
    const duplicateEmail = otpFormData();
    duplicateEmail.append("email", "second@example.com");
    const duplicateToken = otpFormData();
    duplicateToken.append("token", "654321");

    const emailResult = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      duplicateEmail,
    );
    const tokenResult = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      duplicateToken,
    );

    expect(emailResult.fieldErrors?.email).toBeDefined();
    expect(tokenResult.fieldErrors?.token).toBeDefined();
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("rejeita e-mail ou código ausente e valor não textual", async () => {
    const missingEmail = new FormData();
    missingEmail.append("token", "123456");
    const missingToken = new FormData();
    missingToken.append("email", "person@example.com");
    const nonStringToken = new FormData();
    nonStringToken.append("email", "person@example.com");
    nonStringToken.append(
      "token",
      new Blob(["synthetic"]),
      "code.txt",
    );

    const missingEmailResult = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      missingEmail,
    );
    const missingTokenResult = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      missingToken,
    );
    const nonStringResult = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      nonStringToken,
    );

    expect(missingEmailResult.fieldErrors?.email).toBeDefined();
    expect(missingTokenResult.fieldErrors?.token).toBeDefined();
    expect(nonStringResult.fieldErrors?.token).toBeDefined();
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it.each(["12345", "1234567", "12A456"])(
    "rejeita código fora do formato esperado: %s",
    async (token) => {
      const data = otpFormData();
      data.set("token", token);

      const result = await verifySignupOtpAction(
        INITIAL_OTP_ACTION_STATE,
        data,
      );

      expect(result.fieldErrors?.token).toBeDefined();
      expect(verifyOtpMock).not.toHaveBeenCalled();
    },
  );

  it("não navega quando a identidade retornada diverge", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      data: {
        session: validSession,
        user: { id: "different-user" },
      },
      error: null,
    });

    const result = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      otpFormData(),
    );

    expect(result.status).toBe("error");
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each(["invalid_otp", "otp_expired"])(
    "trata %s sem autenticar nem expor o código",
    async (code) => {
      verifyOtpMock.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { code, message: "internal provider detail" },
      });

      const result = await verifySignupOtpAction(
        INITIAL_OTP_ACTION_STATE,
        otpFormData(),
      );

      expect(result.message).toBe(
        "O código é inválido ou expirou. Confira os números ou solicite outro.",
      );
      expect(JSON.stringify(result)).not.toMatch(
        /123456|person@example\.com|internal provider detail/i,
      );
      expect(getUserMock).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
    },
  );

  it("trata 429 com a mensagem pública do projeto", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { status: 429, message: "internal rate detail" },
    });

    const result = await verifySignupOtpAction(
      INITIAL_OTP_ACTION_STATE,
      otpFormData(),
    );

    expect(result.message).toBe(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    );
    expect(JSON.stringify(result)).not.toContain("internal rate detail");
  });
});

describe("verificação OTP da recuperação", () => {
  it("verifica recovery, cria a prova e grava o cookie antes do redirect", async () => {
    await verifyRecoveryOtpAction(INITIAL_OTP_ACTION_STATE, otpFormData());

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "123456",
      type: "recovery",
    });
    expect(getUserMock).toHaveBeenCalledOnce();
    expect(createRecoverySessionProofMock).toHaveBeenCalledWith(
      validSession,
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      "energy-monitor-recovery",
      "synthetic-signed-proof",
      {
        httpOnly: true,
        maxAge: 1800,
        path: "/reset-password",
        sameSite: "lax",
        secure: false,
      },
    );
    expect(redirectMock).toHaveBeenCalledWith("/reset-password");
  });

  it("usa Secure quando a origem configurada é HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://energy.example");

    await verifyRecoveryOtpAction(INITIAL_OTP_ACTION_STATE, otpFormData());

    expect(cookieSetMock).toHaveBeenCalledWith(
      "energy-monitor-recovery",
      "synthetic-signed-proof",
      expect.objectContaining({ secure: true }),
    );
  });

  it.each(["invalid_otp", "otp_expired"])(
    "não cria prova ou cookie quando ocorre %s",
    async (code) => {
      verifyOtpMock.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { code, message: "internal recovery detail" },
      });

      const result = await verifyRecoveryOtpAction(
        INITIAL_OTP_ACTION_STATE,
        otpFormData(),
      );

      expect(result.message).toBe(
        "O código é inválido ou expirou. Confira os números ou solicite outro.",
      );
      expect(createRecoverySessionProofMock).not.toHaveBeenCalled();
      expect(cookieSetMock).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
    },
  );

  it("rejeita usuário atual divergente sem criar comprovante", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "different-user" } },
      error: null,
    });

    const result = await verifyRecoveryOtpAction(
      INITIAL_OTP_ACTION_STATE,
      otpFormData(),
    );

    expect(result.status).toBe("error");
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(createRecoverySessionProofMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("descarta a sessão se a criação do comprovante falhar", async () => {
    createRecoverySessionProofMock.mockImplementationOnce(() => {
      throw new Error("internal proof failure");
    });

    const result = await verifyRecoveryOtpAction(
      INITIAL_OTP_ACTION_STATE,
      otpFormData(),
    );

    expect(result.message).toBe(
      "Não foi possível validar o código agora. Solicite outro e tente novamente.",
    );
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(cookieSetMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("trata 429 da recuperação sem criar comprovante", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { status: 429, message: "internal rate detail" },
    });

    const result = await verifyRecoveryOtpAction(
      INITIAL_OTP_ACTION_STATE,
      otpFormData(),
    );

    expect(result.message).toBe(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    );
    expect(createRecoverySessionProofMock).not.toHaveBeenCalled();
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("reenvia o código com callback seguro e resposta genérica", async () => {
    const resendData = new FormData();
    resendData.append("email", "  PERSON@Example.COM ");

    const result = await resendRecoveryCodeAction(
      INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
      resendData,
    );

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      "person@example.com",
      {
        redirectTo:
          "http://localhost:3000/auth/callback?next=%2Freset-password",
      },
    );
    expect(result).toEqual({
      status: "recovery-code-resent",
      message:
        "Caso exista uma recuperação disponível para este endereço, enviaremos novas instruções. Verifique também a pasta de spam.",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /person@example\.com|123456/i,
    );
  });

  it("mantém o reenvio genérico para erros de estado da conta", async () => {
    const resendData = new FormData();
    resendData.append("email", "person@example.com");
    const successResult = await resendRecoveryCodeAction(
      INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
      resendData,
    );
    resetPasswordForEmailMock.mockResolvedValueOnce({
      error: {
        code: "user_not_found",
        message: "internal account state",
      },
    });
    const providerResult = await resendRecoveryCodeAction(
      INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
      resendData,
    );

    expect(providerResult).toEqual(successResult);
    expect(JSON.stringify(providerResult)).not.toContain("internal");
  });

  it("trata 429 no reenvio da recuperação", async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({
      error: { status: 429, message: "internal rate detail" },
    });
    const resendData = new FormData();
    resendData.append("email", "person@example.com");

    const result = await resendRecoveryCodeAction(
      INITIAL_RECOVERY_CODE_RESEND_ACTION_STATE,
      resendData,
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    });
    expect(JSON.stringify(result)).not.toContain("internal rate detail");
  });
});
