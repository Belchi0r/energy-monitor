import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getRecoveryAuthContextMock, redirectMock } = vi.hoisted(() => ({
  getRecoveryAuthContextMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/auth/recovery-session", () => ({
  getRecoveryAuthContext: getRecoveryAuthContextMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import ResetPasswordPage from "@/app/reset-password/page";

beforeEach(() => {
  getRecoveryAuthContextMock.mockReset();
  redirectMock.mockReset();
  redirectMock.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  });
});

describe("página /reset-password", () => {
  it("redireciona para uma mensagem controlada quando não há sessão", async () => {
    getRecoveryAuthContextMock.mockResolvedValue({ status: "missing" });

    await expect(ResetPasswordPage()).rejects.toThrow(
      "NEXT_REDIRECT:/login?message=recovery-session-required",
    );
  });

  it("não oferece o formulário a uma sessão autenticada comum", async () => {
    getRecoveryAuthContextMock.mockResolvedValue({
      status: "authenticated",
    });

    await expect(ResetPasswordPage()).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("renderiza o fluxo quando o contexto de recuperação é válido", async () => {
    getRecoveryAuthContextMock.mockResolvedValue({
      status: "valid",
      supabase: {},
    });

    const page = await ResetPasswordPage();

    expect(page.type).toBeTypeOf("function");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
