import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { createClientMock, getUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import {
  AuthenticationRequiredError,
  requireUser,
} from "@/lib/supabase/require-user";

beforeEach(() => {
  createClientMock.mockReset();
  getUserMock.mockReset();
  createClientMock.mockResolvedValue({
    auth: {
      getUser: getUserMock,
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("requireUser", () => {
  it("valida no Supabase e retorna somente o id", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "nao-expor@example.com",
          user_metadata: { role: "test" },
        },
      },
      error: null,
    });

    await expect(requireUser()).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
    });
    expect(getUserMock).toHaveBeenCalledOnce();
  });

  it.each([
    { data: { user: null }, error: null },
    {
      data: { user: null },
      error: new Error("detalhe interno do Supabase"),
    },
  ])("falha de forma controlada sem usuário válido", async (result) => {
    getUserMock.mockResolvedValue(result);

    await expect(requireUser()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });
});
