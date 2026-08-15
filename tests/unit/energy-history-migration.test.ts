import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260810120000_add_daily_energy_snapshots/migration.sql",
  ),
  "utf8",
);

describe("migration do histórico energético", () => {
  it("cria agregados e detalhes com unicidade diária e cascata controlada", () => {
    expect(migration).toContain('CREATE TABLE public."DailyEnergySnapshot"');
    expect(migration).toContain(
      'CREATE TABLE public."DailyDeviceEnergySnapshot"',
    );
    expect(migration).toContain(
      '"DailyEnergySnapshot_userId_snapshotDate_key"',
    );
    expect(migration).toContain(
      '"DailyDeviceEnergySnapshot_snapshotId_deviceId_key"',
    );
    expect(migration).toMatch(/FOREIGN KEY \("snapshotId"\)[\s\S]*ON DELETE CASCADE/);
    expect(migration).toMatch(/CHECK \("totalConsumptionKwh" >= 0\)/);
    expect(migration).toMatch(/CHECK \("estimatedCost" >= 0\)/);
  });

  it("habilita RLS e restringe as duas tabelas ao usuário autenticado", () => {
    expect(migration).toContain(
      'ALTER TABLE public."DailyEnergySnapshot" ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'ALTER TABLE public."DailyDeviceEnergySnapshot" ENABLE ROW LEVEL SECURITY',
    );
    expect(migration.match(/CREATE POLICY/g)).toHaveLength(8);
    expect(migration).toContain('(SELECT auth.uid()) = "userId"');
    expect(migration).toContain(
      'snapshot."userId" = (SELECT auth.uid())',
    );
    expect(migration).toContain("TO authenticated");
  });

  it("não contém operação destrutiva de dados ou schema existente", () => {
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});
