import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("texto das configurações", () => {
  it("usa preferências locais sem mensagem antiga de login ou banner demonstrativo", async () => {
    const preferencesSource = await readFile(
      new URL("../../components/dashboard/SettingsPreferences.tsx", import.meta.url),
      "utf8",
    );
    const pageSource = await readFile(
      new URL("../../app/settings/page.tsx", import.meta.url),
      "utf8",
    );

    const outdatedMessage = [
      "Enquanto o login",
      "não está disponível",
    ].join(" ");

    expect(preferencesSource).not.toContain(outdatedMessage);
    expect(preferencesSource).toMatch(
      /não\s+são salvas no PostgreSQL/,
    );
    expect(preferencesSource).toContain(
      "dados demonstrativos não alteram",
    );
    expect(pageSource).toContain('noticeTitle="Preferências locais"');
    expect(pageSource).not.toContain('noticeTitle="Dados demonstrativos"');
  });
});
