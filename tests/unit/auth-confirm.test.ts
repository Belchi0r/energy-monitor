import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getUserMock,
  signOutMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { GET } from "@/app/auth/confirm/route";

function request(query: string, origin = "http://localhost") {
  return new NextRequest(`${origin}/auth/confirm${query}`);
}

beforeEach(() => {
  createClientMock.mockReset();
  getUserMock.mockReset();
  signOutMock.mockReset();
  verifyOtpMock.mockReset();

  createClientMock.mockResolvedValue({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
      verifyOtp: verifyOtpMock,
    },
  });
  verifyOtpMock.mockResolvedValue({
    data: {
      session: {
        access_token: "token-hash-access-token",
        user: { id: "signup-user" },
      },
      user: { id: "signup-user" },
    },
    error: null,
  });
  getUserMock.mockResolvedValue({
    data: { user: { id: "signup-user" } },
    error: null,
  });
  signOutMock.mockResolvedValue({ error: null });
});

describe("GET /auth/confirm", () => {
  it("confirma TokenHash, valida getUser e redireciona para a área privada", async () => {
    const response = await GET(
      request(
        "?token_hash=token-hash-secreto&type=email&next=https%3A%2F%2Fevil.test",
      ),
    );

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "token-hash-secreto",
      type: "email",
    });
    expect(getUserMock).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(Array.from(response.headers.values()).join(" ")).not.toContain(
      "token-hash-secreto",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("trata TokenHash inválido sem expor token ou erro interno", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: new Error("detalhe interno sensível do Supabase"),
    });

    const response = await GET(
      request("?token_hash=token-hash-secreto&type=email"),
    );
    const publicResponse = Array.from(response.headers.values()).join(" ");

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=confirmation-error",
    );
    expect(publicResponse).not.toContain("token-hash-secreto");
    expect(publicResponse).not.toContain("detalhe interno sensível");
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it.each([
    ["sem token", "?type=email"],
    ["sem type", "?token_hash=token-hash-secreto"],
    ["com type diferente", "?token_hash=token-hash-secreto&type=recovery"],
  ])("rejeita %s antes de criar o cliente", async (_label, query) => {
    const response = await GET(request(query));

    expect(createClientMock).not.toHaveBeenCalled();
    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=confirmation-error",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("descarta sessão quando a identidade retornada diverge", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "token-hash-access-token",
          user: { id: "session-user" },
        },
        user: { id: "different-user" },
      },
      error: null,
    });

    const response = await GET(
      request("?token_hash=token-hash-secreto&type=email"),
    );

    expect(getUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?message=confirmation-error",
    );
  });
});
