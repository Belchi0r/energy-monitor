import { createHash, createHmac } from "node:crypto";

import type { Session } from "@supabase/supabase-js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { cookiesMock, createClientMock, getSessionMock, getUserMock } =
  vi.hoisted(() => ({
    cookiesMock: vi.fn(),
    createClientMock: vi.fn(),
    getSessionMock: vi.fn(),
    getUserMock: vi.fn(),
  }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import {
  createRecoverySessionProof,
  getRecoveryAuthContext,
  isRecoverySessionProofValid,
  readAuthRedirectType,
  RecoveryProofConfigurationError,
  RECOVERY_SESSION_COOKIE,
  RECOVERY_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/recovery-session";

const TEST_RECOVERY_SECRET =
  "test-only-recovery-proof-secret-with-at-least-32-bytes";
const FIXED_TIME = new Date("2026-08-05T12:00:00.000Z");

const session = {
  access_token: "recovery-access-token",
  user: { id: "recovery-user" },
} as Session;

function accessTokenHash(accessToken = session.access_token) {
  return createHash("sha256").update(accessToken).digest("base64url");
}

function testPayload(
  overrides: Partial<{
    version: number;
    userId: string;
    accessTokenHash: string;
    issuedAt: number;
    expiresAt: number;
  }> = {},
) {
  const issuedAt = Math.floor(FIXED_TIME.getTime() / 1000);

  return {
    version: 1,
    userId: session.user.id,
    accessTokenHash: accessTokenHash(),
    issuedAt,
    expiresAt: issuedAt + RECOVERY_SESSION_MAX_AGE_SECONDS,
    ...overrides,
  };
}

function signTestPayload(payload: unknown) {
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", TEST_RECOVERY_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function signRawTestPayload(rawPayload: string) {
  const encodedPayload = Buffer.from(rawPayload, "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", TEST_RECOVERY_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

beforeEach(() => {
  vi.stubEnv("AUTH_RECOVERY_PROOF_SECRET", TEST_RECOVERY_SECRET);
  cookiesMock.mockReset();
  createClientMock.mockReset();
  getSessionMock.mockReset();
  getUserMock.mockReset();

  createClientMock.mockResolvedValue({
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
    },
  });
  getUserMock.mockResolvedValue({
    data: { user: session.user },
    error: null,
  });
  getSessionMock.mockResolvedValue({
    data: { session },
    error: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("contexto de recuperação", () => {
  it("lê redirectType recovery sem usar any e ignora outros valores", () => {
    expect(readAuthRedirectType({ redirectType: "recovery" })).toBe(
      "recovery",
    );
    expect(readAuthRedirectType({ redirectType: "signup" })).toBeNull();
    expect(readAuthRedirectType(null)).toBeNull();
  });

  it("cria e valida um comprovante assinado com validade interna", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    const proof = createRecoverySessionProof(session);
    const [encodedPayload, signature] = proof.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    expect(isRecoverySessionProofValid(proof, session)).toBe(true);
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload).toMatchObject({
      version: 1,
      userId: session.user.id,
      accessTokenHash: accessTokenHash(),
    });
    expect(payload.expiresAt - payload.issuedAt).toBe(
      RECOVERY_SESSION_MAX_AGE_SECONDS,
    );
    expect(JSON.stringify(payload)).not.toContain(session.access_token);
  });

  it("rejeita assinatura adulterada", () => {
    const proof = signTestPayload(testPayload());
    const [payload, signature] = proof.split(".");
    const lastCharacter = signature.at(-1);
    const tamperedSignature = `${signature.slice(0, -1)}${
      lastCharacter === "A" ? "B" : "A"
    }`;

    expect(
      isRecoverySessionProofValid(
        `${payload}.${tamperedSignature}`,
        session,
      ),
    ).toBe(false);
  });

  it("rejeita payload adulterado após a assinatura", () => {
    const proof = signTestPayload(testPayload());
    const [, signature] = proof.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify(testPayload({ userId: "attacker" })),
      "utf8",
    ).toString("base64url");

    expect(
      isRecoverySessionProofValid(
        `${tamperedPayload}.${signature}`,
        session,
      ),
    ).toBe(false);
  });

  it("rejeita payload malformado mesmo com assinatura válida", () => {
    expect(
      isRecoverySessionProofValid(
        signRawTestPayload("not-json"),
        session,
      ),
    ).toBe(false);
    expect(isRecoverySessionProofValid("invalid-format", session)).toBe(
      false,
    );
  });

  it("rejeita comprovante expirado pelo expiresAt assinado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      FIXED_TIME.getTime() +
        (RECOVERY_SESSION_MAX_AGE_SECONDS + 1) * 1000,
    );

    expect(
      isRecoverySessionProofValid(
        signTestPayload(testPayload()),
        session,
      ),
    ).toBe(false);
  });

  it("rejeita issuedAt inválido ou relevantemente no futuro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    const futureIssuedAt =
      Math.floor(FIXED_TIME.getTime() / 1000) + 61;

    expect(
      isRecoverySessionProofValid(
        signTestPayload(
          testPayload({
            issuedAt: futureIssuedAt,
            expiresAt:
              futureIssuedAt + RECOVERY_SESSION_MAX_AGE_SECONDS,
          }),
        ),
        session,
      ),
    ).toBe(false);
    expect(
      isRecoverySessionProofValid(
        signTestPayload(
          testPayload({
            issuedAt: 0,
            expiresAt: RECOVERY_SESSION_MAX_AGE_SECONDS,
          }),
        ),
        session,
      ),
    ).toBe(false);
  });

  it("rejeita usuário diferente", () => {
    expect(
      isRecoverySessionProofValid(
        signTestPayload(testPayload()),
        {
          ...session,
          user: { ...session.user, id: "another-user" },
        },
      ),
    ).toBe(false);
  });

  it("rejeita access token diferente", () => {
    expect(
      isRecoverySessionProofValid(
        signTestPayload(testPayload()),
        { ...session, access_token: "another-token" },
      ),
    ).toBe(false);
  });

  it("rejeita versão desconhecida", () => {
    expect(
      isRecoverySessionProofValid(
        signTestPayload(testPayload({ version: 2 })),
        session,
      ),
    ).toBe(false);
  });

  it("falha explicitamente quando o segredo está ausente", () => {
    vi.stubEnv("AUTH_RECOVERY_PROOF_SECRET", "");

    expect(() => createRecoverySessionProof(session)).toThrow(
      RecoveryProofConfigurationError,
    );
    expect(() =>
      isRecoverySessionProofValid("invalid", session),
    ).toThrow(RecoveryProofConfigurationError);
  });

  it("falha explicitamente quando o segredo possui menos de 32 bytes", () => {
    vi.stubEnv("AUTH_RECOVERY_PROOF_SECRET", "short-test-secret");

    expect(() => createRecoverySessionProof(session)).toThrow(
      "AUTH_RECOVERY_PROOF_SECRET deve possuir pelo menos 32 bytes.",
    );
  });

  it("não aceita comprovante legado criado somente com o access token", () => {
    const encodedPayload = Buffer.from(
      JSON.stringify(testPayload()),
      "utf8",
    ).toString("base64url");
    const accessTokenSignature = createHmac(
      "sha256",
      session.access_token,
    )
      .update(encodedPayload)
      .digest("base64url");
    const accessTokenOnlyProof =
      `${encodedPayload}.${accessTokenSignature}`;

    expect(
      isRecoverySessionProofValid(accessTokenOnlyProof, session),
    ).toBe(false);

    vi.stubEnv("AUTH_RECOVERY_PROOF_SECRET", "");
    expect(() => createRecoverySessionProof(session)).toThrow(
      RecoveryProofConfigurationError,
    );
  });

  it("aceita somente usuário validado com sessão e comprovante correspondentes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    const proof = createRecoverySessionProof(session);
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === RECOVERY_SESSION_COOKIE ? { value: proof } : undefined,
      ),
    });

    const context = await getRecoveryAuthContext();

    expect(context.status).toBe("valid");
    expect(getUserMock).toHaveBeenCalledOnce();
    expect(getSessionMock).toHaveBeenCalledOnce();
  });

  it("nega acesso útil quando não existe sessão autenticada", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("invalid session"),
    });

    const context = await getRecoveryAuthContext();

    expect(context).toEqual({ status: "missing" });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("não confunde uma sessão normal sem comprovante com recuperação", async () => {
    cookiesMock.mockResolvedValue({ get: vi.fn(() => undefined) });

    const context = await getRecoveryAuthContext();

    expect(context).toEqual({ status: "authenticated" });
  });
});
